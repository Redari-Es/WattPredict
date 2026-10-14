package tariff

import (
	"embed"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
)

//go:embed rules/*.json
var rulesFS embed.FS

var (
	rulesOnce sync.Once
	rules     map[string]Rule
	rulesErr  error
)

// ruleKey 规则索引：省份 + 电表类型，如 "GD:residential"
func ruleKey(province string, meterType MeterType) string {
	return fmt.Sprintf("%s:%s", province, meterType)
}

// loadRules 启动时一次性加载全部内嵌规则文件（支持热更新时改为按需读取磁盘）
func loadRules() error {
	rulesOnce.Do(func() {
		rules = make(map[string]Rule)
		entries, err := rulesFS.ReadDir("rules")
		if err != nil {
			rulesErr = fmt.Errorf("read rules dir: %w", err)
			return
		}
		for _, e := range entries {
			data, err := rulesFS.ReadFile("rules/" + e.Name())
			if err != nil {
				rulesErr = fmt.Errorf("read rule %s: %w", e.Name(), err)
				return
			}
			var r Rule
			if err := json.Unmarshal(data, &r); err != nil {
				rulesErr = fmt.Errorf("parse rule %s: %w", e.Name(), err)
				return
			}
			rules[ruleKey(r.Province, r.MeterType)] = r
		}
	})
	return rulesErr
}

// CalculateCost 计算月度电费：阶梯（居民）/ 单一制 / 分时（TOU）+ 两部制基本电费
func CalculateCost(req *SimulateRequest) (*SimulateResponse, error) {
	if req.MonthlyKwh < 0 {
		return nil, fmt.Errorf("monthly_kwh cannot be negative: %f", req.MonthlyKwh)
	}
	if err := loadRules(); err != nil {
		return nil, err
	}

	rule, ok := rules[ruleKey(req.Province, req.MeterType)]
	if !ok {
		return nil, fmt.Errorf("no tariff rule for %s", ruleKey(req.Province, req.MeterType))
	}

	resp := &SimulateResponse{Breakdown: []TierResult{}}

	// 电度电费：分时 > 阶梯 > 单一制
	switch {
	case req.HasTOU && rule.Tou != nil:
		computeTOU(resp, rule.Tou, req)
	case len(rule.Tiers) > 0:
		computeTiers(resp, tiersForMonth(rule, req.Month), req.MonthlyKwh)
	case rule.FlatPrice > 0:
		cost := req.MonthlyKwh * rule.FlatPrice
		resp.EnergyCost = cost
		resp.Breakdown = append(resp.Breakdown, TierResult{
			Tier:  "单一制电价",
			Kwh:   round2(req.MonthlyKwh),
			Price: rule.FlatPrice,
			Cost:  round2(cost),
		})
	default:
		return nil, fmt.Errorf("rule %s defines no pricing", ruleKey(req.Province, req.MeterType))
	}
	resp.EnergyCost = round2(resp.EnergyCost)

	// 两部制基本电费（工业）：按容量与按需量取低者
	if rule.BasicFee != nil {
		resp.BasicFee = round2(basicFee(rule.BasicFee, req))
	}

	resp.TotalCost = round2(resp.EnergyCost + resp.BasicFee)
	resp.Recommendations = recommend(req, rule, resp)
	return resp, nil
}

// tiersForMonth 按月份选择阶梯档：非夏季月使用 tiers_winter（若规则提供）
func tiersForMonth(rule Rule, month int) []Tier {
	if len(rule.TiersWinter) == 0 || len(rule.SummerMonths) == 0 || month < 1 || month > 12 {
		return rule.Tiers
	}
	for _, m := range rule.SummerMonths {
		if m == month {
			return rule.Tiers
		}
	}
	return rule.TiersWinter
}

// recommend 生成行动建议：从"算电费"升级为"给方案"
func recommend(req *SimulateRequest, rule Rule, resp *SimulateResponse) []string {
	var out []string

	// 居民阶梯预警（非分时）
	if len(rule.Tiers) > 0 && !req.HasTOU {
		// 第三档电量 > 0 说明已进最高档
		if len(resp.Breakdown) > 0 && resp.Breakdown[len(resp.Breakdown)-1].Price == rule.Tiers[len(rule.Tiers)-1].Price && len(resp.Breakdown) == len(rule.Tiers) {
			top := resp.Breakdown[len(resp.Breakdown)-1]
			out = append(out, fmt.Sprintf(
				"已进入第三档（%s），超档%s按 %.4f 元/度计费——削减高耗设备或评估光伏发电可显著降费",
				top.Tier, formatKwh(top.Kwh), top.Price))
		}
	}

	// 商业：未开通分时 → 提示测算
	if req.MeterType == MeterCommercial && !req.HasTOU && rule.Tou != nil {
		var peakP, valleyP float64
		for _, p := range rule.Tou.Periods {
			if p.Price > peakP {
				peakP = p.Price
			}
			if valleyP == 0 || p.Price < valleyP {
				valleyP = p.Price
			}
		}
		out = append(out, fmt.Sprintf(
			"商业用电峰谷价差大（峰 %.4f / 谷 %.4f 元/度）——若谷段用电占比可超过约 25%%（如夜间营业、可定时设备），转分时计价更划算，可在推演页验证",
			peakP, valleyP))
	}

	// 工业：容需申报建议
	if rule.BasicFee != nil {
		var byKva, byDemand float64
		if req.TransformerKva > 0 {
			byKva = req.TransformerKva * rule.BasicFee.PerKva
		}
		if req.DemandKw > 0 {
			byDemand = req.DemandKw * rule.BasicFee.PerKwDemand
		}
		switch {
		case byKva > 0 && byDemand > 0 && byKva > byDemand:
			out = append(out, fmt.Sprintf(
				"按需量计费 ¥%.2f 低于按容量 ¥%.2f——若当前按容量缴费，改为按实际最大需量申报可月省 ¥%.2f",
				byDemand, byKva, byKva-byDemand))
		case byKva > 0 && byDemand > 0 && byDemand > byKva:
			out = append(out, fmt.Sprintf(
				"按容量计费 ¥%.2f 低于按需量 ¥%.2f——若当前按需量缴费，改为按变压器容量申报可月省 ¥%.2f",
				byKva, byDemand, byDemand-byKva))
		case byKva > 0 && byDemand == 0:
			breakEven := byKva / rule.BasicFee.PerKwDemand
			out = append(out, fmt.Sprintf(
				"当前按容量计费 ¥%.2f/月——若实际最大需量长期低于 %.0f kW（容量的 %.0f%%），改按需量申报更省",
				byKva, breakEven, breakEven/req.TransformerKva*100))
		}
	}

	return out
}

func formatKwh(v float64) string {
	if v >= 10000 {
		return fmt.Sprintf("%.1f 万度", v/10000)
	}
	return fmt.Sprintf("%.0f 度", v)
}

// computeTiers 阶梯电价
func computeTiers(resp *SimulateResponse, tiers []Tier, kwh float64) {
	remaining := kwh
	prevLimit := 0.0
	for _, t := range tiers {
		if remaining <= 0 {
			break
		}
		tierKwh := remaining
		if t.Limit >= 0 {
			tierKwh = math.Min(remaining, t.Limit-prevLimit)
		}
		cost := tierKwh * t.Price
		resp.Breakdown = append(resp.Breakdown, TierResult{
			Tier:  t.Name,
			Kwh:   round2(tierKwh),
			Price: t.Price,
			Cost:  round2(cost),
		})
		resp.EnergyCost += cost
		remaining -= tierKwh
		if t.Limit >= 0 {
			prevLimit = t.Limit
		}
	}
}

// computeTOU 分时电价：按用电画像拆分各时段电量，并给出移峰填谷建议
func computeTOU(resp *SimulateResponse, tou *TouRule, req *SimulateRequest) {
	profile := req.TouProfile
	if len(profile) == 0 {
		profile = tou.DefaultProfile
	}

	var totalFrac float64
	for _, p := range tou.Periods {
		totalFrac += profile[p.Name]
	}
	if totalFrac <= 0 {
		totalFrac = 1
	}

	resp.Tou = make([]TouPeriodResult, 0, len(tou.Periods))
	for _, p := range tou.Periods {
		kwh := req.MonthlyKwh * profile[p.Name] / totalFrac
		cost := kwh * p.Price
		resp.Tou = append(resp.Tou, TouPeriodResult{
			Name:  p.Name,
			Hours: formatHours(p.Hours),
			Price: p.Price,
			Kwh:   round2(kwh),
			Cost:  round2(cost),
		})
		resp.EnergyCost += cost
	}

	// 移峰填谷建议：把峰段 20% 用电移到谷段
	var peak, valley *TouPeriodResult
	for i := range resp.Tou {
		t := &resp.Tou[i]
		if peak == nil || t.Price > peak.Price {
			peak = t
		}
		if valley == nil || t.Price < valley.Price {
			valley = t
		}
	}
	if peak != nil && valley != nil && peak != valley {
		shiftKwh := peak.Kwh * 0.2
		save := shiftKwh * (peak.Price - valley.Price)
		if save > 0.005 {
			resp.Savings = &SavingsSuggestion{
				Text: fmt.Sprintf(
					"将峰段 20%% 用电（%.0f 度）移至谷段（%s），约可省 %.2f 元/月",
					shiftKwh, valley.Hours, save,
				),
				SaveCost: round2(save),
			}
		}
	}
}

// basicFee 两部制基本电费：容量与需量两种方式取低
func basicFee(rule *BasicFeeRule, req *SimulateRequest) float64 {
	var byKva, byDemand float64
	if req.TransformerKva > 0 {
		byKva = req.TransformerKva * rule.PerKva
	}
	if req.DemandKw > 0 {
		byDemand = req.DemandKw * rule.PerKwDemand
	}
	switch {
	case byKva > 0 && byDemand > 0:
		return math.Min(byKva, byDemand)
	case byKva > 0:
		return byKva
	default:
		return byDemand
	}
}

// formatHours 把 [[10,12],[14,19]] 格式化为 "10:00-12:00, 14:00-19:00"
func formatHours(hours [][2]int) string {
	parts := make([]string, 0, len(hours))
	for _, h := range hours {
		parts = append(parts, fmt.Sprintf("%02d:00-%02d:00", h[0], h[1]))
	}
	return strings.Join(parts, ", ")
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
