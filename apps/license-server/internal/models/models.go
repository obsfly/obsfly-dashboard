package models

import "time"

// Account represents an organization with a license
type Account struct {
	AccountID  int64      `json:"account_id"`
	LicenseKey string     `json:"license_key"`
	Name       string     `json:"name"`
	Email      string     `json:"email"`
	Company    string     `json:"company,omitempty"`
	Status     string     `json:"status"`    // active, suspended, expired, cancelled
	PlanType   string     `json:"plan_type"` // free, starter, pro, enterprise, custom
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
	Metadata   string     `json:"metadata,omitempty"` // JSONB as string
}

// SubAccount represents a team/project within an organization
type SubAccount struct {
	SubAccountID int64     `json:"sub_account_id"`
	AccountID    int64     `json:"account_id"`
	Name         string    `json:"name"`
	APIKey       string    `json:"api_key"`
	Status       string    `json:"status"` // active, suspended, deleted
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Metadata     string    `json:"metadata,omitempty"`
}

// Quota represents usage limits
type Quota struct {
	QuotaID                 int64     `json:"quota_id"`
	AccountID               *int64    `json:"account_id,omitempty"`
	SubAccountID            *int64    `json:"sub_account_id,omitempty"`
	MetricCountLimit        int64     `json:"metric_count_limit"`
	StorageGBLimit          float64   `json:"storage_gb_limit"`
	RequestsPerMinute       int       `json:"requests_per_minute"`
	CustomDashboardsEnabled bool      `json:"custom_dashboards_enabled"`
	APIAccessEnabled        bool      `json:"api_access_enabled"`
	IsDefault               bool      `json:"is_default"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

// UsageEvent represents a single usage report
type UsageEvent struct {
	EventID      int64     `json:"event_id"`
	AccountID    int64     `json:"account_id"`
	SubAccountID *int64    `json:"sub_account_id,omitempty"`
	MetricCount  int64     `json:"metric_count"`
	StorageBytes int64     `json:"storage_bytes"`
	RecordedAt   time.Time `json:"recorded_at"`
}

// UsageHourly represents aggregated hourly usage
type UsageHourly struct {
	AccountID    int64     `json:"account_id"`
	SubAccountID *int64    `json:"sub_account_id,omitempty"`
	HourBucket   time.Time `json:"hour_bucket"`
	MetricCount  int64     `json:"metric_count"`
	StorageGB    float64   `json:"storage_gb"`
}

// UsageDaily represents daily aggregated usage
type UsageDaily struct {
	AccountID    int64   `json:"account_id"`
	SubAccountID *int64  `json:"sub_account_id,omitempty"`
	DayBucket    string  `json:"day_bucket"` // DATE format
	MetricCount  int64   `json:"metric_count"`
	StorageGB    float64 `json:"storage_gb"`
}

// UsageSummary provides current usage vs quota
type UsageSummary struct {
	AccountID          int64   `json:"account_id"`
	SubAccountID       *int64  `json:"sub_account_id,omitempty"`
	MetricCountUsed    int64   `json:"metric_count_used"`
	MetricCountLimit   int64   `json:"metric_count_limit"`
	MetricCountPercent float64 `json:"metric_count_percent"`
	StorageGBUsed      float64 `json:"storage_gb_used"`
	StorageGBLimit     float64 `json:"storage_gb_limit"`
	StorageGBPercent   float64 `json:"storage_gb_percent"`
	PeriodStart        string  `json:"period_start"`
	PeriodEnd          string  `json:"period_end"`
}

// Alert represents a system alert
type Alert struct {
	AlertID        int64      `json:"alert_id"`
	AccountID      int64      `json:"account_id"`
	SubAccountID   *int64     `json:"sub_account_id,omitempty"`
	AlertType      string     `json:"alert_type"`
	Severity       string     `json:"severity"` // info, warning, critical
	Title          string     `json:"title"`
	Message        string     `json:"message"`
	Metadata       string     `json:"metadata,omitempty"`
	IsAcknowledged bool       `json:"is_acknowledged"`
	AcknowledgedAt *time.Time `json:"acknowledged_at,omitempty"`
	AcknowledgedBy string     `json:"acknowledged_by,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// Invoice represents a billing invoice
type Invoice struct {
	InvoiceID           int64      `json:"invoice_id"`
	AccountID           int64      `json:"account_id"`
	InvoiceNumber       string     `json:"invoice_number"`
	BillingPeriodStart  string     `json:"billing_period_start"` // DATE
	BillingPeriodEnd    string     `json:"billing_period_end"`   // DATE
	MetricCountUsed     int64      `json:"metric_count_used"`
	MetricCountIncluded int64      `json:"metric_count_included"`
	MetricCountOverage  int64      `json:"metric_count_overage"`
	StorageGBUsed       float64    `json:"storage_gb_used"`
	StorageGBIncluded   float64    `json:"storage_gb_included"`
	StorageGBOverage    float64    `json:"storage_gb_overage"`
	BaseCost            float64    `json:"base_cost"`
	MetricOverageCost   float64    `json:"metric_overage_cost"`
	StorageOverageCost  float64    `json:"storage_overage_cost"`
	Subtotal            float64    `json:"subtotal"`
	TaxAmount           float64    `json:"tax_amount"`
	TotalCost           float64    `json:"total_cost"`
	Status              string     `json:"status"` // pending, sent, paid, overdue, cancelled
	DueDate             *string    `json:"due_date,omitempty"`
	PaidAt              *time.Time `json:"paid_at,omitempty"`
	GeneratedAt         time.Time  `json:"generated_at"`
	Metadata            string     `json:"metadata,omitempty"`
}

// PricingPlan represents a subscription plan
type PricingPlan struct {
	PlanID                 int64     `json:"plan_id"`
	PlanType               string    `json:"plan_type"`
	Name                   string    `json:"name"`
	Description            string    `json:"description"`
	BasePrice              float64   `json:"base_price"`
	MetricCountIncluded    int64     `json:"metric_count_included"`
	StorageGBIncluded      float64   `json:"storage_gb_included"`
	PricePerMillionMetrics float64   `json:"price_per_million_metrics"`
	PricePerGB             float64   `json:"price_per_gb"`
	IsActive               bool      `json:"is_active"`
	CreatedAt              time.Time `json:"created_at"`
}

// LicenseValidationRequest for validating API keys
type LicenseValidationRequest struct {
	APIKey string `json:"api_key"`
}

// LicenseValidationResponse returns validation result
type LicenseValidationResponse struct {
	Valid        bool         `json:"valid"`
	AccountID    int64        `json:"account_id,omitempty"`
	SubAccountID *int64       `json:"sub_account_id,omitempty"`
	Status       string       `json:"status,omitempty"`
	Message      string       `json:"message,omitempty"`
	QuotaStatus  *QuotaStatus `json:"quota_status,omitempty"`
}

// QuotaStatus provides quota information
type QuotaStatus struct {
	MetricCountRemaining int64   `json:"metric_count_remaining"`
	StorageGBRemaining   float64 `json:"storage_gb_remaining"`
	IsBlocked            bool    `json:"is_blocked"`
	BlockReason          string  `json:"block_reason,omitempty"`
}

// UsageIngestRequest for reporting usage
type UsageIngestRequest struct {
	AccountID    int64  `json:"account_id"`
	SubAccountID *int64 `json:"sub_account_id,omitempty"`
	MetricCount  int64  `json:"metric_count"`
	StorageBytes int64  `json:"storage_bytes"`
}
