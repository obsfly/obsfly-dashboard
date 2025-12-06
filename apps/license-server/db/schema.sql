-- ObsFly License Server Database Schema
-- PostgreSQL database for multi-tenant account and license management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- ACCOUNTS & ORGANIZATIONS
-- ===========================================

-- Main accounts (organizations/companies)
CREATE TABLE accounts (
    account_id BIGSERIAL PRIMARY KEY,
    license_key VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    company VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'cancelled')),
    plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise', 'custom')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Sub-accounts (teams/projects within an organization)
CREATE TABLE sub_accounts (
    sub_account_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(account_id, name)
);

-- ===========================================
-- QUOTAS & LIMITS
-- ===========================================

-- Configurable quotas for accounts and sub-accounts
CREATE TABLE quotas (
    quota_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(account_id) ON DELETE CASCADE,
    sub_account_id BIGINT REFERENCES sub_accounts(sub_account_id) ON DELETE CASCADE,
    -- Metric limits
    metric_count_limit BIGINT DEFAULT 1000000, -- 1M metrics per month
    storage_gb_limit NUMERIC(10,2) DEFAULT 10.00, -- 10 GB per month
    -- Rate limits
    requests_per_minute INT DEFAULT 1000,
    -- Feature flags
    custom_dashboards_enabled BOOLEAN DEFAULT TRUE,
    api_access_enabled BOOLEAN DEFAULT TRUE,
    -- Metadata
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT quota_target_check CHECK (
        (account_id IS NOT NULL AND sub_account_id IS NULL) OR
        (account_id IS NULL AND sub_account_id IS NOT NULL) OR
        (is_default = TRUE AND account_id IS NULL AND sub_account_id IS NULL)
    )
);

-- ===========================================
-- USAGE TRACKING
-- ===========================================

-- Raw usage events (high-throughput ingestion)
CREATE TABLE usage_events (
    event_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    metric_count BIGINT DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hourly aggregated usage (for fast queries)
CREATE TABLE usage_hourly (
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    hour_bucket TIMESTAMPTZ NOT NULL,
    metric_count BIGINT DEFAULT 0,
    storage_gb NUMERIC(15,6) DEFAULT 0,
    PRIMARY KEY (account_id, COALESCE(sub_account_id, 0), hour_bucket)
);

-- Daily aggregated usage (for billing and reporting)
CREATE TABLE usage_daily (
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    day_bucket DATE NOT NULL,
    metric_count BIGINT DEFAULT 0,
    storage_gb NUMERIC(15,6) DEFAULT 0,
    PRIMARY KEY (account_id, COALESCE(sub_account_id, 0), day_bucket)
);

-- Monthly usage summary (for invoicing)
CREATE TABLE usage_monthly (
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    month_bucket DATE NOT NULL, -- First day of month
    metric_count BIGINT DEFAULT 0,
    storage_gb NUMERIC(15,6) DEFAULT 0,
    base_cost NUMERIC(10,2) DEFAULT 0,
    overage_cost NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(10,2) DEFAULT 0,
    PRIMARY KEY (account_id, COALESCE(sub_account_id, 0), month_bucket)
);

-- ===========================================
-- ALERTS
-- ===========================================

-- Alert configuration
CREATE TABLE alert_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(account_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('quota_warning', 'quota_exceeded', 'license_expiring', 'license_expired')),
    threshold_pct INTEGER, -- For quota alerts: 80, 90, 100
    days_before INTEGER, -- For license expiring: 30, 7, 1
    notification_channels JSONB DEFAULT '["email", "ui"]'::jsonb, -- email, slack, webhook, ui
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history
CREATE TABLE alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    sub_account_id BIGINT REFERENCES sub_accounts(sub_account_id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- BILLING & INVOICES
-- ===========================================

-- Pricing plans (configurable)
CREATE TABLE pricing_plans (
    plan_id BIGSERIAL PRIMARY KEY,
    plan_type VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price NUMERIC(10,2) DEFAULT 0,
    metric_count_included BIGINT DEFAULT 0,
    storage_gb_included NUMERIC(10,2) DEFAULT 0,
    price_per_million_metrics NUMERIC(10,2) DEFAULT 0,
    price_per_gb NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    invoice_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    -- Usage breakdown
    metric_count_used BIGINT DEFAULT 0,
    metric_count_included BIGINT DEFAULT 0,
    metric_count_overage BIGINT DEFAULT 0,
    storage_gb_used NUMERIC(15,6) DEFAULT 0,
    storage_gb_included NUMERIC(10,2) DEFAULT 0,
    storage_gb_overage NUMERIC(15,6) DEFAULT 0,
    -- Costs
    base_cost NUMERIC(10,2) DEFAULT 0,
    metric_overage_cost NUMERIC(10,2) DEFAULT 0,
    storage_overage_cost NUMERIC(10,2) DEFAULT 0,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(10,2) NOT NULL,
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ===========================================
-- AUDIT LOG
-- ===========================================

-- Audit trail for important actions
CREATE TABLE audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT,
    sub_account_id BIGINT,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL, -- license_activated, quota_changed, account_suspended, etc.
    resource_type VARCHAR(50), -- account, sub_account, quota, invoice
    resource_id BIGINT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Accounts
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_expires_at ON accounts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_accounts_email ON accounts(email);

-- Sub-accounts
CREATE INDEX idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX idx_sub_accounts_api_key ON sub_accounts(api_key);
CREATE INDEX idx_sub_accounts_status ON sub_accounts(status);

-- Quotas
CREATE INDEX idx_quotas_account_id ON quotas(account_id);
CREATE INDEX idx_quotas_sub_account_id ON quotas(sub_account_id);
CREATE INDEX idx_quotas_is_default ON quotas(is_default) WHERE is_default = TRUE;

-- Usage events
CREATE INDEX idx_usage_events_account_id ON usage_events(account_id);
CREATE INDEX idx_usage_events_recorded_at ON usage_events(recorded_at);
CREATE INDEX idx_usage_events_composite ON usage_events(account_id, sub_account_id, recorded_at);

-- Usage hourly
CREATE INDEX idx_usage_hourly_account ON usage_hourly(account_id, hour_bucket);

-- Usage daily
CREATE INDEX idx_usage_daily_account ON usage_daily(account_id, day_bucket);

-- Alerts
CREATE INDEX idx_alerts_account_id ON alerts(account_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_acknowledged ON alerts(is_acknowledged) WHERE is_acknowledged = FALSE;

-- Invoices
CREATE INDEX idx_invoices_account_id ON invoices(account_id);
CREATE INDEX idx_invoices_period ON invoices(billing_period_start, billing_period_end);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Audit log
CREATE INDEX idx_audit_log_account_id ON audit_log(account_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ===========================================
-- DEFAULT DATA
-- ===========================================

-- Default pricing plans
INSERT INTO pricing_plans (plan_type, name, description, base_price, metric_count_included, storage_gb_included, price_per_million_metrics, price_per_gb) VALUES
('free', 'Free', 'Free tier for testing', 0, 1000000, 1, 0, 0),
('starter', 'Starter', 'For small teams', 29.00, 10000000, 10, 5.00, 2.00),
('pro', 'Pro', 'For growing businesses', 99.00, 100000000, 100, 3.00, 1.00),
('enterprise', 'Enterprise', 'For large organizations', 499.00, 1000000000, 1000, 1.00, 0.50);

-- Default quota (fallback for all accounts without custom quota)
INSERT INTO quotas (is_default, metric_count_limit, storage_gb_limit, requests_per_minute) VALUES
(TRUE, 1000000, 1.0, 100);

-- Default alert rules template
-- (These will be copied when new accounts are created)

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_accounts_updated_at BEFORE UPDATE ON sub_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON quotas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEW.invoice_id::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
