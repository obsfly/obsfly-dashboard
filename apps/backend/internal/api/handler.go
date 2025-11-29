package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/namlabs/obsfly/backend/internal/store"
)

type Handler struct {
	store *store.Store
}

func NewHandler(store *store.Store) *Handler {
	return &Handler{store: store}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Use(middleware.Logger)
	r.Use(corsMiddleware) // Simple CORS for dev

	r.Get("/api/dashboard/summary", h.GetSummary)
	r.Get("/api/dashboard/health", h.GetInfraHealth)
	r.Get("/api/dashboard/performance", h.GetServicePerformance)
	r.Get("/api/dashboard/logs", h.GetLogVolume)
	r.Get("/api/dashboard/traces", h.GetSlowTraces)
	r.Get("/api/dashboard/patterns", h.GetLogPatterns)
	r.Get("/api/dashboard/hotspots", h.GetInfraHotspots)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Helper to extract query parameters
func getQueryParams(r *http.Request) (accountId uint64, minutesAgo int) {
	accountId = 1 // default account
	if aid := r.URL.Query().Get("account_id"); aid != "" {
		if parsed, err := strconv.ParseUint(aid, 10, 64); err == nil {
			accountId = parsed
		}
	}

	minutesAgo = 15 // default 15 minutes
	if mins := r.URL.Query().Get("minutes"); mins != "" {
		if parsed, err := strconv.Atoi(mins); err == nil && parsed > 0 {
			minutesAgo = parsed
		}
	}

	return accountId, minutesAgo
}

func (h *Handler) GetSummary(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetDashboardSummary(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetInfraHealth(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetInfraHealth(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetSlowTraces(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetSlowTraces(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetLogPatterns(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetLogPatterns(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetInfraHotspots(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetInfraHotspots(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetServicePerformance(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetServicePerformance(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetLogVolume(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetLogVolume(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
