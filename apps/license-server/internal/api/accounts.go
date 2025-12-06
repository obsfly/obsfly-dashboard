package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/namlabs/obsfly/license-server/internal/db"
	"github.com/namlabs/obsfly/license-server/internal/models"
)

type AccountHandler struct {
	db *db.Database
}

func NewAccountHandler(database *db.Database) *AccountHandler {
	return &AccountHandler{db: database}
}

// CreateAccount creates a new account with license key
func (h *AccountHandler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Company  string `json:"company"`
		PlanType string `json:"plan_type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Generate license key
	licenseKey := generateLicenseKey()

	// Calculate expiration (1 year from now)
	expiresAt := time.Now().AddDate(1, 0, 0)

	query := `
		INSERT INTO accounts (license_key, name, email, company, plan_type, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING account_id, created_at
	`

	var account models.Account
	account.LicenseKey = licenseKey
	account.Name = req.Name
	account.Email = req.Email
	account.Company = req.Company
	account.PlanType = req.PlanType
	account.Status = "active"
	account.ExpiresAt = &expiresAt

	err := h.db.QueryRow(query, licenseKey, req.Name, req.Email, req.Company, req.PlanType, expiresAt).
		Scan(&account.AccountID, &account.CreatedAt)

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create account: %v", err), http.StatusInternalServerError)
		return
	}

	account.UpdatedAt = account.CreatedAt

	// Create default quotas for this account based on plan
	h.createDefaultQuotas(account.AccountID, req.PlanType)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(account)
}

// GetAccount retrieves account details
func (h *AccountHandler) GetAccount(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	id, err := strconv.ParseInt(accountID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT account_id, license_key, name, email, company, status, plan_type,
		       created_at, updated_at, expires_at
		FROM accounts
		WHERE account_id = $1
	`

	var account models.Account
	err = h.db.QueryRow(query, id).Scan(
		&account.AccountID, &account.LicenseKey, &account.Name, &account.Email,
		&account.Company, &account.Status, &account.PlanType,
		&account.CreatedAt, &account.UpdatedAt, &account.ExpiresAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get account: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(account)
}

// CreateSubAccount creates a sub-account
func (h *AccountHandler) CreateSubAccount(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	id, err := strconv.ParseInt(accountID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Name string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Generate API key for sub-account
	apiKey := generateAPIKey()

	query := `
		INSERT INTO sub_accounts (account_id, name, api_key)
		VALUES ($1, $2, $3)
		RETURNING sub_account_id, created_at
	`

	var subAccount models.SubAccount
	subAccount.AccountID = id
	subAccount.Name = req.Name
	subAccount.APIKey = apiKey
	subAccount.Status = "active"

	err = h.db.QueryRow(query, id, req.Name, apiKey).
		Scan(&subAccount.SubAccountID, &subAccount.CreatedAt)

	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to create sub-account: %v", err), http.StatusInternalServerError)
		return
	}

	subAccount.UpdatedAt = subAccount.CreatedAt

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(subAccount)
}

// ListSubAccounts lists all sub-accounts for an account
func (h *AccountHandler) ListSubAccounts(w http.ResponseWriter, r *http.Request) {
	accountID := chi.URLParam(r, "accountId")
	id, err := strconv.ParseInt(accountID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid account ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT sub_account_id, account_id, name, api_key, status, created_at, updated_at
		FROM sub_accounts
		WHERE account_id = $1 AND status != 'deleted'
		ORDER BY created_at DESC
	`

	rows, err := h.db.Query(query, id)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to list sub-accounts: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var subAccounts []models.SubAccount
	for rows.Next() {
		var sa models.SubAccount
		err := rows.Scan(&sa.SubAccountID, &sa.AccountID, &sa.Name, &sa.APIKey,
			&sa.Status, &sa.CreatedAt, &sa.UpdatedAt)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to scan sub-account: %v", err), http.StatusInternalServerError)
			return
		}
		subAccounts = append(subAccounts, sa)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subAccounts)
}

// Helper functions
func generateLicenseKey() string {
	return "LIC-" + uuid.New().String()
}

func generateAPIKey() string {
	return "API-" + uuid.New().String()
}

func (h *AccountHandler) createDefaultQuotas(accountID int64, planType string) error {
	// Get plan limits
	var metricLimit int64
	var storageLimit float64

	switch planType {
	case "free":
		metricLimit = 1000000 // 1M
		storageLimit = 1.0    // 1 GB
	case "starter":
		metricLimit = 10000000 // 10M
		storageLimit = 10.0    // 10 GB
	case "pro":
		metricLimit = 100000000 // 100M
		storageLimit = 100.0    // 100 GB
	case "enterprise":
		metricLimit = 1000000000 // 1B
		storageLimit = 1000.0    // 1 TB
	default:
		metricLimit = 1000000
		storageLimit = 1.0
	}

	query := `
		INSERT INTO quotas (account_id, metric_count_limit, storage_gb_limit)
		VALUES ($1, $2, $3)
	`

	return h.db.Exec(query, accountID, metricLimit, storageLimit)
}
