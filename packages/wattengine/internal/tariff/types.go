package tariff

// MeterType 电表类型：家庭 / 商业 / 工业
type MeterType string

const (
	MeterResidential MeterType = "residential"
	MeterCommercial  MeterType = "commercial"
	MeterIndustrial  MeterType = "industrial"
)

// SimulateRequest 推演请求（与前端 Scenario 对齐）
type SimulateRequest struct {
	Name       string    `json:"name"`
	Province   string    `json:"province"`
	City       string    `json:"city"`
	MeterType  MeterType `json:"meter_type"`
	HasTOU     bool      `json:"has_tou"`
	MonthlyKwh float64   `json:"monthly_kwh"`
	// 工业两部制参数
	TransformerKva float64 `json:"transformer_kva,omitempty"`
	DemandKw       float64 `json:"demand_kw,omitempty"`
	// 分时用电占比（如 {"峰":0.35,"平":0.5,"谷":0.15}），缺省时用规则的默认画像
	TouProfile map[string]float64 `json:"tou_profile,omitempty"`
}

// TierResult 阶梯/单段费用明细
type TierResult struct {
	Tier  string  `json:"tier"`
	Kwh   float64 `json:"kwh"`
	Price float64 `json:"price"`
	Cost  float64 `json:"cost"`
}

// TouPeriodResult 分时时段费用明细
type TouPeriodResult struct {
	Name  string  `json:"name"`
	Hours string  `json:"hours"` // 如 "10:00-12:00, 14:00-19:00"
	Price float64 `json:"price"`
	Kwh   float64 `json:"kwh"`
	Cost  float64 `json:"cost"`
}

// SavingsSuggestion 节省建议
type SavingsSuggestion struct {
	Text     string  `json:"text"`
	SaveCost float64 `json:"save_cost"`
}

// SimulateResponse 推演响应
type SimulateResponse struct {
	TotalCost  float64            `json:"total_cost"`          // 总电费（电度电费 + 基本电费）
	EnergyCost float64            `json:"energy_cost"`         // 电度电费
	BasicFee   float64            `json:"basic_fee,omitempty"` // 基本电费（工业两部制）
	Breakdown  []TierResult       `json:"breakdown"`           // 阶梯/单一制明细
	Tou        []TouPeriodResult  `json:"tou,omitempty"`       // 分时明细（has_tou 时）
	Savings    *SavingsSuggestion `json:"savings,omitempty"`
}

// Rule 电价规则：阶梯 / 单一制 / 分时 / 两部制按需组合
type Rule struct {
	Province  string        `json:"province"`
	MeterType MeterType     `json:"meter_type"`
	Tiers     []Tier        `json:"tiers,omitempty"`      // 阶梯电价（居民）
	FlatPrice float64       `json:"flat_price,omitempty"` // 单一制电价（非分时）
	Tou       *TouRule      `json:"tou,omitempty"`        // 分时电价
	BasicFee  *BasicFeeRule `json:"basic_fee,omitempty"`  // 两部制基本电费（工业）
}

// Tier 阶梯电价：上限电量（kwh，-1 表示无上限）与单价（元/kWh）
type Tier struct {
	Name  string  `json:"name"`
	Limit float64 `json:"limit"`
	Price float64 `json:"price"`
}

// TouRule 分时电价规则
type TouRule struct {
	Periods        []TouPeriod        `json:"periods"`
	DefaultProfile map[string]float64 `json:"default_profile"` // 默认各时段用电占比
}

// TouPeriod 一个分时时段（峰/平/谷）
type TouPeriod struct {
	Name  string   `json:"name"`
	Hours [][2]int `json:"hours"` // 如 [[10,12],[14,19]]
	Price float64  `json:"price"`
}

// BasicFeeRule 两部制基本电费：按变压器容量（元/kVA·月）或最大需量（元/kW·月），取低者
type BasicFeeRule struct {
	PerKva      float64 `json:"per_kva"`
	PerKwDemand float64 `json:"per_kw_demand"`
}
