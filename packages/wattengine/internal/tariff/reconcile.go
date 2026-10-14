package tariff

import (
	"fmt"
	"math"
)

// Reconcile 账单核对：用真实账单反推用电画像，与推演结果比对并给出诊断。
//
// 数据飞轮的核心一环——账单是用户真实用电行为的锚点：
// 有分时明细 → 反推真实画像（校准推演滑块）；无明细 → 用实际均价校验推演偏差。
func Reconcile(req *ReconcileRequest) (*ReconcileResponse, error) {
	if req.TotalKwh <= 0 {
		return nil, fmt.Errorf("total_kwh must be positive: %f", req.TotalKwh)
	}
	if req.TotalCost < 0 {
		return nil, fmt.Errorf("total_cost cannot be negative: %f", req.TotalCost)
	}
	if err := loadRules(); err != nil {
		return nil, err
	}
	rule, ok := rules[ruleKey(req.Province, req.MeterType)]
	if !ok {
		return nil, fmt.Errorf("no tariff rule for %s", ruleKey(req.Province, req.MeterType))
	}

	resp := &ReconcileResponse{
		ImpliedAvgPrice: round4(req.TotalCost / req.TotalKwh),
		Diagnosis:       []string{},
	}

	// 反推分时画像（账单含峰平谷明细时）
	hasTouDetail := req.PeakKwh != nil && req.FlatKwh != nil && req.ValleyKwh != nil &&
		*req.PeakKwh+*req.FlatKwh+*req.ValleyKwh > 0
	if hasTouDetail {
		total := *req.PeakKwh + *req.FlatKwh + *req.ValleyKwh
		resp.ImpliedProfile = map[string]float64{
			"峰": round2(*req.PeakKwh / total * 100),
			"平": round2(*req.FlatKwh / total * 100),
			"谷": round2(*req.ValleyKwh / total * 100),
		}
	}

	// 按账单电量推演：有反推画像走分时，否则走现行（阶梯/单一制）
	simReq := &SimulateRequest{
		Province:       req.Province,
		MeterType:      req.MeterType,
		MonthlyKwh:     req.TotalKwh,
		TransformerKva: req.TransformerKva,
		DemandKw:       req.DemandKw,
		HasTOU:         hasTouDetail,
	}
	if hasTouDetail {
		simReq.TouProfile = map[string]float64{
			"峰": *req.PeakKwh,
			"平": *req.FlatKwh,
			"谷": *req.ValleyKwh,
		}
	}
	sim, err := CalculateCost(simReq)
	if err != nil {
		return nil, err
	}
	resp.Simulated = sim

	resp.DeviationCost = round2(req.TotalCost - sim.TotalCost)
	if req.TotalCost > 0 {
		resp.DeviationPct = round2(resp.DeviationCost / req.TotalCost * 100)
	}

	resp.Diagnosis = diagnose(req, rule, resp, hasTouDetail)
	return resp, nil
}

// diagnose 生成人话诊断结论
func diagnose(req *ReconcileRequest, rule Rule, resp *ReconcileResponse, hasTouDetail bool) []string {
	var out []string

	// 1. 偏差总评
	absPct := math.Abs(resp.DeviationPct)
	switch {
	case absPct <= 3:
		out = append(out, fmt.Sprintf(
			"账单与推演高度吻合（偏差 %+.2f%%），当前用电画像可信", resp.DeviationPct))
	case resp.DeviationCost > 0:
		out = append(out, fmt.Sprintf(
			"实缴比推演多 ¥%.2f（%+.1f%%）——推演偏乐观，实际用电习惯可能比默认画像更偏向高电价时段/档位",
			resp.DeviationCost, resp.DeviationPct))
	default:
		out = append(out, fmt.Sprintf(
			"实缴比推演少 ¥%.2f（%+.1f%%）——你的实际用电比默认画像更省，画像偏保守",
			-resp.DeviationCost, resp.DeviationPct))
	}

	// 2. 偏差来源提示（偏差较大时）
	if absPct > 3 {
		if req.MeterType == MeterIndustrial {
			out = append(out, "工业账单通常还包含力调电费（功率因数奖惩）与代征基金，这两项暂未计入推演，是偏差的常见来源")
		} else if len(rule.Tiers) > 0 {
			out = append(out, "居民偏差常见来源：非夏季阶梯分档（200/400 度，MVP 暂用夏季档 260/600）、合租分摊或抄表周期跨月")
		} else {
			out = append(out, "偏差常见来源：代理购电价格每月浮动（规则文件为上月公告值）、代征基金及附加费")
		}
	}

	// 3. 画像洞察（有分时明细时）
	if hasTouDetail && rule.Tou != nil {
		valley := resp.ImpliedProfile["谷"]
		defValley := rule.Tou.DefaultProfile["谷"] * 100
		if valley+5 < defValley {
			out = append(out, fmt.Sprintf(
				"你的谷段用电占比 %.0f%%，低于同类默认画像（%.0f%%）——洗衣机/热水器/充电等可定时设备移到 0:00-8:00 还有空间",
				valley, defValley))
		} else if valley > defValley+10 {
			out = append(out, fmt.Sprintf(
				"谷段用电占比 %.0f%%，显著高于同类默认画像（%.0f%%）——移峰填谷做得很好",
				valley, defValley))
		}
		if resp.Simulated.Savings != nil {
			out = append(out, resp.Simulated.Savings.Text)
		}
	} else if rule.Tou != nil {
		out = append(out, "本账单未含峰平谷明细——若已开通分时电价，补充三项电量即可反推你的真实用电画像")
	}

	return out
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}
