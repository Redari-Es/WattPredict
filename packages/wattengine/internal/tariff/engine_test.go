package tariff

import "testing"

func req(meterType MeterType, kwh float64) *SimulateRequest {
	return &SimulateRequest{Province: "GD", City: "广州", MeterType: meterType, MonthlyKwh: kwh}
}

func TestCalculateCost_Residential_Tiers(t *testing.T) {
	tests := []struct {
		name      string
		kwh       float64
		wantCost  float64
		wantTiers int
	}{
		{"within first tier", 100, 58.89, 1},
		{"crosses into second tier", 420, 255.34, 2},
		{"crosses into third tier", 700, 459.23, 3},
		{"zero usage", 0, 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := CalculateCost(req(MeterResidential, tt.kwh))
			if err != nil {
				t.Fatalf("CalculateCost: %v", err)
			}
			if resp.TotalCost != tt.wantCost {
				t.Errorf("total cost = %v, want %v", resp.TotalCost, tt.wantCost)
			}
			if len(resp.Breakdown) != tt.wantTiers {
				t.Errorf("tiers = %d, want %d", len(resp.Breakdown), tt.wantTiers)
			}
		})
	}
}

func TestCalculateCost_Residential_TOU(t *testing.T) {
	r := req(MeterResidential, 420)
	r.HasTOU = true
	resp, err := CalculateCost(r)
	if err != nil {
		t.Fatalf("CalculateCost: %v", err)
	}
	// 默认画像 峰0.25 平0.55 谷0.2：105×0.9889 + 231×0.6389 + 84×0.2889
	want := 103.83 + 147.59 + 24.27
	if resp.TotalCost != want {
		t.Errorf("total cost = %v, want %v", resp.TotalCost, want)
	}
	if len(resp.Tou) != 3 {
		t.Errorf("tou periods = %d, want 3", len(resp.Tou))
	}
	if resp.Savings == nil || resp.Savings.SaveCost <= 0 {
		t.Error("expected positive peak-to-valley savings suggestion")
	}
}

func TestCalculateCost_Commercial(t *testing.T) {
	// 单一制
	resp, err := CalculateCost(req(MeterCommercial, 2800))
	if err != nil {
		t.Fatalf("CalculateCost: %v", err)
	}
	if resp.TotalCost != 2194.64 {
		t.Errorf("flat total = %v, want 2194.64", resp.TotalCost)
	}

	// 分时
	r := req(MeterCommercial, 2800)
	r.HasTOU = true
	resp, err = CalculateCost(r)
	if err != nil {
		t.Fatalf("CalculateCost TOU: %v", err)
	}
	if len(resp.Tou) != 3 {
		t.Errorf("tou periods = %d, want 3", len(resp.Tou))
	}
}

func TestCalculateCost_Industrial_TwoPart(t *testing.T) {
	r := req(MeterIndustrial, 46000)
	r.HasTOU = true
	r.TransformerKva = 250 // 250×23 = 5750
	r.DemandKw = 180       // 180×32 = 5760 → 取低 5750
	resp, err := CalculateCost(r)
	if err != nil {
		t.Fatalf("CalculateCost: %v", err)
	}
	if resp.BasicFee != 5750 {
		t.Errorf("basic fee = %v, want 5750 (min of kva/demand)", resp.BasicFee)
	}
	if resp.TotalCost != round2(resp.EnergyCost+resp.BasicFee) {
		t.Errorf("total %v != energy %v + basic %v", resp.TotalCost, resp.EnergyCost, resp.BasicFee)
	}
}

func TestCalculateCost_Errors(t *testing.T) {
	bad := req(MeterResidential, -1)
	if _, err := CalculateCost(bad); err == nil {
		t.Error("expected error for negative kwh")
	}
	unknown := req(MeterResidential, 100)
	unknown.Province = "XX"
	if _, err := CalculateCost(unknown); err == nil {
		t.Error("expected error for unknown province")
	}
}
