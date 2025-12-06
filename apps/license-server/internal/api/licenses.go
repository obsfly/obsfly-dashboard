package api

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/namlabs/obsfly/license-server/internal/db"
	"github.com/namlabs/obsfly/license-server/internal/models"
)

type LicenseHandler struct {
	db *db.Database
}

func NewLicenseHandler(database *db.Database) *LicenseHandler {
	return &LicenseHandler{db: database}
}

// ValidateLicense validates an API key and returns account/quota status
func (h *LicenseHandler) ValidateLicense(w http.ResponseWriter, r *http.Request) {
	var req models.LicenseValidationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Check if it's a sub-account API key or account license key
	var accountID int64
	var subAccountID *int64
	var status string
	var expiresAt *time.Time

	// Try to find as sub-account API key first
	subQuery := `
		SELECT sa.account_id, sa.sub_account_id, sa.status, a.expires_at
		FROM sub_accounts sa
		JOIN accounts a ON sa.account_id = a.account_id
		WHERE sa.api_key = $1
	`

	var tempSubID int64
	err := h.db.QueryRow(subQuery, req.APIKey).Scan(&accountID, &tempSubID, &status, &expiresAt)

	if err == nil {
		subAccountID = &tempSubID
	} else if err == sql.ErrNoRows {
		// Try as account license key
		accQuery := `
			SELECT account_id, status, expires_at
			FROM accounts
			WHERE license_key = $1
		`
		err = h.db.QueryRow(accQuery, req.APIKey).Scan(&accountID, &status, &expiresAt)
		if err != nil {
			// Invalid key
			resp := models.LicenseValidationResponse{
				Valid:   false,
				Message: "Invalid license key or API key",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(resp)
			return
		}
	} else {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}

	// Check status
	if status != "active" {
		resp := models.LicenseValidationResponse{
			Valid:     false,
			AccountID: accountID,
			Status:    status,
			Message:   fmt.Sprintf("Account status: %s", status),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Check expiration
	if expiresAt != nil && expiresAt.Before(time.Now()) {
		resp := models.LicenseValidationResponse{
			Valid:     false,
			AccountID: accountID,
			Status:    "expired",
			Message:   "License has expired",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Check quota status
	quotaStatus := h.checkQuotaStatus(accountID, subAccountID)

	resp := models.LicenseValidationResponse{
		Valid:        true,
		AccountID:    accountID,
		SubAccountID: subAccountID,
		Status:       status,
		QuotaStatus:  quotaStatus,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetLicenseStatus checks license status
func (h *LicenseHandler) GetLicenseStatus(w http.ResponseWriter, r *http.Request) {
	licenseKey := r.URL.Query().Get("key")
	if licenseKey == "" {
		http.Error(w, "License key required", http.StatusBadRequest)
		return
	}

	query := `
		SELECT account_id, name, status, plan_type, expires_at, created_at
		FROM accounts
		WHERE license_key = $1
	`

	var account struct {
		AccountID     int64      `json:"account_id"`
		Name          string     `json:"name"`
		Status        string     `json:"status"`
		PlanType      string     `json:"plan_type"`
		ExpiresAt     *time.Time `json:"expires_at,omitempty"`
		CreatedAt     time.Time  `json:"created_at"`
		DaysRemaining *int       `json:"days_remaining,omitempty"`
	}

	err := h.db.QueryRow(query, licenseKey).Scan(
		&account.AccountID, &account.Name, &account.Status,
		&account.PlanType, &account.ExpiresAt, &account.CreatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Invalid license key", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}

	// Calculate days remaining
	if account.ExpiresAt != nil {
		days := int(time.Until(*account.ExpiresAt).Hours() / 24)
		account.DaysRemaining = &days
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(account)
}

// checkQuotaStatus checks if account/sub-account has exceeded quotas
func (h *LicenseHandler) checkQuotaStatus(accountID int64, subAccountID *int64) *models.QuotaStatus {
	// Get quota limits
	var metricLimit int64
	var storageLimit float64

	quotaQuery := `
		SELECT metric_count_limit, storage_gb_limit
		FROM quotas
		WHERE (account_id = $1 AND sub_account_id IS NULL)
		   OR (sub_account_id = $2)
		ORDER BY sub_account_id NULLS LAST
		LIMIT 1
	`

	err := h.db.QueryRow(quotaQuery, accountID, subAccountID).Scan(&metricLimit, &storageLimit)
	if err != nil {
		// Use defaults if no quota found
		metricLimit = 1000000
		storageLimit = 1.0
	}

	// Get current month usage
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	usageQuery := `
		SELECT COALESCE(SUM(metric_count), 0), COALESCE(SUM(storage_gb), 0)
		FROM usage_daily
		WHERE account_id = $1
		  AND ($2::BIGINT IS NULL OR sub_account_id = $2)
		  AND day_bucket >= $3
	`

	var metricUsed int64
	var storageUsed float64
	h.db.QueryRow(usageQuery, accountID, subAccountID, startOfMonth).Scan(&metricUsed, &storageUsed)

	metricRemaining := metricLimit - metricUsed
	if metricRemaining < 0 {
		metricRemaining = 0
	}

	storageRemaining := storageLimit - storageUsed
	if storageRemaining < 0 {
		storageRemaining = 0
	}

	isBlocked := false
	blockReason := ""

	if metricUsed >= metricLimit {
		isBlocked = true
		blockReason = "Metric count quota exceeded"
	} else if storageUsed >= storageLimit {
		isBlocked = true
		blockReason = "Storage quota exceeded"
	}

	return &models.QuotaStatus{
		MetricCountRemaining: metricRemaining,
		StorageGBRemaining:   storageRemaining,
		IsBlocked:            isBlocked,
		BlockReason:          blockReason,
	}
}

// secureCompare performs constant-time string comparison
func secureCompare(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
