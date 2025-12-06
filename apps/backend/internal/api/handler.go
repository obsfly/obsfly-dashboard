package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

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
	r.Get("/api/dashboard/system", h.GetSystemPerformance)
	r.Get("/api/dashboard/latency-trend", h.GetLatencyTrend)
	r.Get("/api/infrastructure/nodes", h.GetInfrastructureNodes)
	r.Get("/api/infrastructure/node/{nodeId}", h.GetNodeMetrics)
	r.Get("/api/infrastructure/node/{nodeId}/metrics/timeseries", h.GetNodeMetricsTimeSeries)
	r.Get("/api/infrastructure/node/{nodeId}/metrics/change", h.GetNodeMetricsChangePercentage)

	// APM endpoints
	r.Get("/api/apm/services", h.GetAPMServices)

	// Logs endpoints
	r.Get("/api/logs", h.GetLogs)
	r.Get("/api/logs/detail", h.GetLogDetail)

	// Profiling endpoints
	r.Get("/api/profiling/profiles", h.GetProfiles)
	r.Get("/api/profiling/flamegraph", h.GetFlamegraph)
	r.Get("/api/profiling/cost", h.GetProfilingCost)

	// Service-specific endpoints
	r.Get("/api/service/{serviceName}/metrics", h.GetServiceMetrics)
	r.Get("/api/service/{serviceName}/traces", h.GetServiceTraces)

	// Metric discovery endpoints
	r.Get("/api/metrics/names", h.GetMetricNames)
	r.Get("/api/metrics/{metricName}/labels", h.GetMetricLabels)
	r.Get("/api/metrics/{metricName}/labels/{labelKey}/values", h.GetLabelValues)
	r.Post("/api/metrics/query", h.QueryMetrics)

	// Dashboard management endpoints
	r.Get("/api/dashboards", h.ListDashboards)
	r.Get("/api/dashboards/{dashboardId}", h.GetDashboard)
	r.Post("/api/dashboards", h.SaveDashboard)
	r.Put("/api/dashboards/{dashboardId}", h.UpdateDashboard)
	r.Delete("/api/dashboards/{dashboardId}", h.DeleteDashboard)

	// Health check endpoint
	r.Get("/health", h.HealthCheck)
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

func (h *Handler) GetSystemPerformance(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetSystemPerformance(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetLatencyTrend(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)
	data, err := h.store.GetLatencyTrend(r.Context(), accountId, minutesAgo)
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

// Service-specific handlers
func (h *Handler) GetServiceMetrics(w http.ResponseWriter, r *http.Request) {
	serviceName := chi.URLParam(r, "serviceName")
	accountId, minutesAgo := getQueryParams(r)

	data, err := h.store.GetServiceMetrics(r.Context(), accountId, serviceName, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// ========== METRIC DISCOVERY HANDLERS ==========

func (h *Handler) GetMetricNames(w http.ResponseWriter, r *http.Request) {
	accountId, _ := getQueryParams(r)
	data, err := h.store.GetMetricNames(r.Context(), accountId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetMetricLabels(w http.ResponseWriter, r *http.Request) {
	metricName := chi.URLParam(r, "metricName")
	accountId, _ := getQueryParams(r)

	data, err := h.store.GetMetricLabels(r.Context(), accountId, metricName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetLabelValues(w http.ResponseWriter, r *http.Request) {
	metricName := chi.URLParam(r, "metricName")
	labelKey := chi.URLParam(r, "labelKey")
	accountId, _ := getQueryParams(r)

	data, err := h.store.GetLabelValues(r.Context(), accountId, metricName, labelKey)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) QueryMetrics(w http.ResponseWriter, r *http.Request) {
	var req store.MetricQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set default account if not provided
	if req.AccountId == 0 {
		req.AccountId = 1
	}

	data, err := h.store.QueryMetrics(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// ========== DASHBOARD HANDLERS ==========

func (h *Handler) ListDashboards(w http.ResponseWriter, r *http.Request) {
	accountId, _ := getQueryParams(r)

	data, err := h.store.ListDashboards(r.Context(), accountId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	dashboardId := chi.URLParam(r, "dashboardId")
	accountId, _ := getQueryParams(r)

	data, err := h.store.GetDashboard(r.Context(), accountId, dashboardId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) SaveDashboard(w http.ResponseWriter, r *http.Request) {
	var dashboard store.Dashboard
	if err := json.NewDecoder(r.Body).Decode(&dashboard); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set default account if not provided
	if dashboard.AccountId == 0 {
		dashboard.AccountId = 1
	}

	// Generate UUID if not provided
	if dashboard.DashboardId == "" {
		dashboard.DashboardId = generateUUID()
	}

	err := h.store.SaveDashboard(r.Context(), &dashboard)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dashboard)
}

func (h *Handler) UpdateDashboard(w http.ResponseWriter, r *http.Request) {
	dashboardId := chi.URLParam(r, "dashboardId")

	var dashboard store.Dashboard
	if err := json.NewDecoder(r.Body).Decode(&dashboard); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	dashboard.DashboardId = dashboardId

	// Set default account if not provided
	if dashboard.AccountId == 0 {
		dashboard.AccountId = 1
	}

	err := h.store.SaveDashboard(r.Context(), &dashboard)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dashboard)
}

func (h *Handler) DeleteDashboard(w http.ResponseWriter, r *http.Request) {
	dashboardId := chi.URLParam(r, "dashboardId")
	accountId, _ := getQueryParams(r)

	err := h.store.DeleteDashboard(r.Context(), accountId, dashboardId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Simple UUID generator (in production, use a proper UUID library)
func generateUUID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func (h *Handler) GetServiceTraces(w http.ResponseWriter, r *http.Request) {
	serviceName := chi.URLParam(r, "serviceName")
	accountId, minutesAgo := getQueryParams(r)

	data, err := h.store.GetServiceTraces(r.Context(), accountId, serviceName, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetNodeMetrics(w http.ResponseWriter, r *http.Request) {
	nodeId := chi.URLParam(r, "nodeId")
	accountId, _ := getQueryParams(r)

	data, err := h.store.GetNodeMetrics(r.Context(), accountId, nodeId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetInfrastructureNodes(w http.ResponseWriter, r *http.Request) {
	accountId, _ := getQueryParams(r)

	data, err := h.store.GetInfrastructureNodes(r.Context(), accountId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// ========== APM HANDLERS ==========

func (h *Handler) GetAPMServices(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)

	// Parse additional query parameters
	language := r.URL.Query().Get("language")
	host := r.URL.Query().Get("host")
	status := r.URL.Query().Get("status")
	sloCompliance := r.URL.Query().Get("slo_compliance")
	search := r.URL.Query().Get("search")
	sortBy := r.URL.Query().Get("sort_by")
	sortOrder := r.URL.Query().Get("sort_order")
	if sortOrder == "" {
		sortOrder = "asc"
	}

	// Parse pagination
	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 20
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	req := store.ServicesListRequest{
		AccountId:     accountId,
		TimeRangeMin:  minutesAgo,
		Language:      language,
		Host:          host,
		Status:        status,
		SLOCompliance: sloCompliance,
		Search:        search,
		SortBy:        sortBy,
		SortOrder:     sortOrder,
		Page:          page,
		PageSize:      pageSize,
	}

	data, err := h.store.GetServicesList(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// ========== LOGS HANDLERS ==========

func (h *Handler) GetLogs(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)

	// Parse additional query parameters
	serviceName := r.URL.Query().Get("service")
	hostName := r.URL.Query().Get("host")
	severity := r.URL.Query().Get("severity")
	environment := r.URL.Query().Get("env")
	namespace := r.URL.Query().Get("namespace")
	pod := r.URL.Query().Get("pod")
	search := r.URL.Query().Get("search")
	traceId := r.URL.Query().Get("trace_id")

	// Parse pagination
	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 50
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 1000 {
			pageSize = parsed
		}
	}

	req := store.LogsListRequest{
		AccountId:    accountId,
		TimeRangeMin: minutesAgo,
		ServiceName:  serviceName,
		HostName:     hostName,
		Severity:     severity,
		Environment:  environment,
		Namespace:    namespace,
		Pod:          pod,
		Search:       search,
		TraceId:      traceId,
		Page:         page,
		PageSize:     pageSize,
	}

	data, err := h.store.GetLogsList(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetLogDetail(w http.ResponseWriter, r *http.Request) {
	accountId, _ := getQueryParams(r)

	timestampStr := r.URL.Query().Get("timestamp")
	serviceName := r.URL.Query().Get("service")

	if timestampStr == "" || serviceName == "" {
		http.Error(w, "timestamp and service are required", http.StatusBadRequest)
		return
	}

	timestamp, err := time.Parse(time.RFC3339Nano, timestampStr)
	if err != nil {
		http.Error(w, "invalid timestamp format", http.StatusBadRequest)
		return
	}

	data, err := h.store.GetLogDetail(r.Context(), accountId, timestamp, serviceName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// ========== PROFILING HANDLERS ==========

func (h *Handler) GetProfiles(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)

	serviceName := r.URL.Query().Get("service")
	profileType := r.URL.Query().Get("profile_type")
	runtime := r.URL.Query().Get("runtime")
	hostName := r.URL.Query().Get("host")

	page := 1
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 20
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	req := store.ProfilesListRequest{
		AccountId:    accountId,
		TimeRangeMin: minutesAgo,
		ServiceName:  serviceName,
		ProfileType:  profileType,
		Runtime:      runtime,
		HostName:     hostName,
		Page:         page,
		PageSize:     pageSize,
	}

	data, err := h.store.GetProfilesList(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetFlamegraph(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)

	serviceName := r.URL.Query().Get("service")
	profileType := r.URL.Query().Get("profile_type")

	if serviceName == "" || profileType == "" {
		http.Error(w, "service and profile_type are required", http.StatusBadRequest)
		return
	}

	data, err := h.store.GetFlamegraphData(r.Context(), accountId, serviceName, profileType, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetProfilingCost(w http.ResponseWriter, r *http.Request) {
	accountId, minutesAgo := getQueryParams(r)

	data, err := h.store.GetCostEstimation(r.Context(), accountId, minutesAgo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// HealthCheck returns a simple health status
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// GetNodeMetricsTimeSeries returns time-series data for node metrics
func (h *Handler) GetNodeMetricsTimeSeries(w http.ResponseWriter, r *http.Request) {
	nodeId := chi.URLParam(r, "nodeId")
	accountId, _ := getQueryParams(r)

	// Get minutes parameter (default 60)
	minutesAgo := 60
	if mins := r.URL.Query().Get("minutes"); mins != "" {
		if parsed, err := strconv.Atoi(mins); err == nil && parsed > 0 {
			minutesAgo = parsed
		}
	}

	// Get groupBy parameter
	groupBy := r.URL.Query().Get("group_by")

	data, err := h.store.GetNodeMetricsTimeSeries(r.Context(), accountId, nodeId, minutesAgo, groupBy)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// GetNodeMetricsChangePercentage returns change percentages for node metrics
func (h *Handler) GetNodeMetricsChangePercentage(w http.ResponseWriter, r *http.Request) {
	nodeId := chi.URLParam(r, "nodeId")
	accountId, _ := getQueryParams(r)

	data, err := h.store.GetNodeMetricsChangePercentage(r.Context(), accountId, nodeId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
