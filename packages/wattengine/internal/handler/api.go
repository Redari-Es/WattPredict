package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/shonh/WattPredict/packages/wattengine/internal/tariff"
)

// Simulate 处理 POST /api/simulate
func Simulate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req tariff.SimulateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if req.MonthlyKwh <= 0 {
		writeError(w, http.StatusBadRequest, "monthly_kwh must be positive")
		return
	}
	if req.Province == "" || req.MeterType == "" {
		writeError(w, http.StatusBadRequest, "province and meter_type are required")
		return
	}

	result, err := tariff.CalculateCost(&req)
	if err != nil {
		log.Printf("simulate error: %v", err)
		writeError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(result); err != nil {
		log.Printf("encode response: %v", err)
	}
}

// Health 处理 GET /healthz
func Health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
