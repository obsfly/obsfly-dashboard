package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/namlabs/obsfly/license-server/internal/db"
	"github.com/namlabs/obsfly/license-server/internal/models"
)

type UsageHandler struct {
	db *db.Database
}

func NewUsageHandler(database *db.Database) *UsageHandler {
	return &UsageHandler{db: database}
}

// IngestUsage receives usage reports from ObsFly backend
func (h *UsageHandler) IngestUsage(w http.ResponseWriter, r *http.Request) {
	var req models.UsageIngestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Insert into usage_events table
	query := `
		INSERT INTO usage_events (account_id, sub_account_id, metric_count, storage_bytes)
		VALUES ($1, $2, $3, $4)
	`

	err := h.db.Exec(query, req.AccountID, req.SubAccountID, req.MetricCount, req.StorageBytes)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to ingest usage: %v", err), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

// GetCurrentUsage returns current period usage
func (h *UsageHandler) GetCurrentUsage(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	id, err := strconv.ParseInt(accountID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	subAccountIDStr := r.URL.Query().Get("sub_account_id")
	var subAccountID *int64
	if subAccountIDStr != "" {
		subID, err := strconv.ParseInt(subAccountIDStr, 10, 64)
		if err == nil {
			subAccountID = &subID
		}
	}

	// Get current month usage
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	usageQuery := `
		SELECT COALESCE(SUM(metric_count), 0), COALESCE(SUM(storage_gb), 0)
		FROM usage_daily
		WHERE account_id = $1
		  AND ($2::BIGINT IS NULL OR sub_account_id = $2)
		  AND day_bucket >= $3
		  AND day_bucket <= $4
	`

	var metricCount int64
	var storageGB float64
	err = h.db.QueryRow(usageQuery, id, subAccountID, startOfMonth, endOfMonth).Scan(&metricCount, &storageGB)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get usage: %v", err), http.StatusInternalServerError)
		return
	}

	// Get quota limits
	quotaQuery := `
		SELECT metric_count_limit, storage_gb_limit
		FROM quotas
		WHERE (account_id = $1 AND sub_account_id IS NULL)
		   OR (sub_account_id = $2)
		ORDER BY sub_account_id NULLS LAST
		LIMIT 1
	`

	var metricLimit int64
	var storageLimit float64
	err = h.db.QueryRow(quotaQuery, id, subAccountID).Scan(&metricLimit, &storageLimit)
	if err != nil {
		// Use defaults
		metricLimit = 1000000
		storageLimit = 1.0
	}

	summary := models.UsageSummary{
		AccountID:          id,
		SubAccountID:       subAccountID,
		MetricCountUsed:    metricCount,
		MetricCountLimit:   metricLimit,
		MetricCountPercent: float64(metricCount) / float64(metricLimit) * 100,
		StorageGBUsed:      storageGB,
		StorageGBLimit:     storageLimit,
		StorageGBPercent:   storageGB / storageLimit * 100,
		PeriodStart:        startOfMonth.Format("2006-01-02"),
		PeriodEnd:          endOfMonth.Format("2006-01-02"),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// GetUsageHistory returns historical usage data
func (h *UsageHandler) GetUsageHistory(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	id, err := strconv.ParseInt(accountID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	// Get query parameters
	days := 30 // default
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil {
			days = d
		}
	}

	subAccountIDStr := r.URL.Query().Get("sub_account_id")
	var subAccountID *int64
	if subAccountIDStr != "" {
		subID, err := strconv.ParseInt(subAccountIDStr, 10, 64)
		if err == nil {
			subAccountID = &subID
		}
	}

	startDate := time.Now().AddDate(0, 0, -days)

	query := `
		SELECT day_bucket, metric_count, storage_gb
		FROM usage_daily
		WHERE account_id = $1
		  AND ($2::BIGINT IS NULL OR sub_account_id = $2)
		  AND day_bucket >= $3
		ORDER BY day_bucket ASC
	`

	rows, err := h.db.Query(query, id, subAccountID, startDate)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get usage history: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var history []models.UsageDaily
	for rows.Next() {
		var usage models.UsageDaily
		usage.AccountID = id
		usage.SubAccountID = subAccountID
		err := rows.Scan(&usage.DayBucket, &usage.MetricCount, &usage.StorageGB)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to scan usage: %v", err), http.StatusInternalServerError)
			return
		}
		history = append(history, usage)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}
