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
	// 默认画像 峰0.25 平0.55 谷0.2，2025 核价（峰1.0011/平0.5889/谷0.2238）
	want := 105*1.0011 + 231*0.5889 + 84*0.2238
	if resp.TotalCost != round2(want) {
		t.Errorf("total cost = %v, want %v", resp.TotalCost, round2(want))
	}
	if len(resp.Tou) != 3 {
		t.Errorf("tou periods = %d, want 3", len(resp.Tou))
	}
	if resp.Savings == nil || resp.Savings.SaveCost <= 0 {
		t.Error("expected positive peak-to-valley savings suggestion")
	}
}

func TestCalculateCost_Commercial(t *testing.T) {
	// 单一制（0.78 元/度）
	resp, err := CalculateCost(req(MeterCommercial, 2800))
	if err != nil {
		t.Fatalf("CalculateCost: %v", err)
	}
	if resp.TotalCost != 2184.00 {
		t.Errorf("flat total = %v, want 2184.00", resp.TotalCost)
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
	r.TransformerKva = 250 // 250×22.6 = 5650
	r.DemandKw = 180       // 180×36.1 = 6498 → 取低 5650
	resp, err := CalculateCost(r)
	if err != nil {
		t.Fatalf("CalculateCost: %v", err)
	}
	if resp.BasicFee != 5650 {
		t.Errorf("basic fee = %v, want 5650 (min of kva/demand)", resp.BasicFee)
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

func TestReconcile_WithTouDetail(t *testing.T) {
	peak, flat, valley := 105.0, 231.0, 84.0
	total := peak + flat + valley // 420
	// 按 2025 核价推演金额作为"账单金额" → 偏差应≈0
	cost := 105*1.0011 + 231*0.5889 + 84*0.2238
	req := &ReconcileRequest{
		Province: "GD", MeterType: MeterResidential,
		TotalKwh: total, TotalCost: cost,
		PeakKwh: &peak, FlatKwh: &flat, ValleyKwh: &valley,
	}
	resp, err := Reconcile(req)
	if err != nil {
		t.Fatalf("Reconcile: %v", err)
	}
	if resp.ImpliedProfile == nil {
		t.Fatal("expected implied profile from tou detail")
	}
	if resp.ImpliedProfile["峰"] != 25 || resp.ImpliedProfile["平"] != 55 || resp.ImpliedProfile["谷"] != 20 {
		t.Errorf("implied profile = %v, want 峰25 平55 谷20", resp.ImpliedProfile)
	}
	if resp.DeviationCost != 0 {
		t.Errorf("deviation = %v, want 0 (bill matches simulation)", resp.DeviationCost)
	}
	if len(resp.Diagnosis) == 0 {
		t.Error("expected diagnosis text")
	}
}

func TestReconcile_WithoutTouDetail(t *testing.T) {
	// 420 度阶梯 = 255.34 元；账单报 290 元 → 偏差 +34.66（+12.0%）
	req := &ReconcileRequest{
		Province: "GD", MeterType: MeterResidential,
		TotalKwh: 420, TotalCost: 290,
	}
	resp, err := Reconcile(req)
	if err != nil {
		t.Fatalf("Reconcile: %v", err)
	}
	if resp.ImpliedProfile != nil {
		t.Error("no tou detail → implied profile should be nil")
	}
	if resp.Simulated.TotalCost != 255.34 {
		t.Errorf("simulated = %v, want 255.34", resp.Simulated.TotalCost)
	}
	if resp.DeviationCost != 34.66 {
		t.Errorf("deviation = %v, want 34.66", resp.DeviationCost)
	}
	if resp.ImpliedAvgPrice != round4(290.0/420.0) {
		t.Errorf("avg price = %v, want %v", resp.ImpliedAvgPrice, round4(290.0/420.0))
	}
}

func TestReconcile_Errors(t *testing.T) {
	if _, err := Reconcile(&ReconcileRequest{Province: "GD", MeterType: MeterResidential, TotalKwh: 0, TotalCost: 10}); err == nil {
		t.Error("expected error for zero kwh")
	}
	if _, err := Reconcile(&ReconcileRequest{Province: "XX", MeterType: MeterResidential, TotalKwh: 100, TotalCost: 60}); err == nil {
		t.Error("expected error for unknown province")
	}
}
