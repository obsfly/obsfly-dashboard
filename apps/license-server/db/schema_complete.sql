-- ==================================================================
-- ObsFly License Server - Complete PostgreSQL Schema
-- Version: 2.0 (Enterprise Edition)
-- Features: Multi-tenant, Authentication, RBAC, Per-Product Quotas,
--           Trial Management, Billing, Audit Logging
-- ==================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'expired', 'cancelled')),
    plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise', 'custom')),
    
    -- Trial management
    is_trial BOOLEAN DEFAULT TRUE,
    trial_days_remaining INT DEFAULT 14,
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    trial_extended_times INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Billing
    billing_email VARCHAR(255),
    tax_id VARCHAR(100),
    address TEXT
);

-- Sub-accounts (teams/projects within an organization)
CREATE TABLE sub_accounts (
    sub_account_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(account_id, name)
);

-- ===========================================
-- AUTHENTICATION & USERS
-- ===========================================

-- Users table (for login and access control)
CREATE TABLE users (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for OAuth-only users
    name VARCHAR(255) NOT NULL,
    
    -- Role-based access control
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('super_admin', 'admin', 'owner', 'member', 'viewer')),
    account_id BIGINT REFERENCES accounts(account_id) ON DELETE CASCADE,
    
    -- OAuth integration
    oauth_provider VARCHAR(50), -- google, github, microsoft
    oauth_id VARCHAR(255),
    oauth_access_token TEXT,
    oauth_refresh_token TEXT,
    
    -- Email verification
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verified_at TIMESTAMPTZ,
    
    -- Password reset
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Activity tracking
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    last_activity_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional data
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Sessions table (JWT tokens with Redis backup)
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PERMISSIONS & RBAC
-- ===========================================

-- Permissions table
CREATE TABLE permissions (
    permission_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Resource access
    resource_type VARCHAR(50) NOT NULL, -- account, sub_account, product, dashboard
    resource_id BIGINT,
    
    -- Permission level
    permission VARCHAR(50) NOT NULL, -- read, write, admin, delete
    
    -- Grant tracking
    granted_by BIGINT REFERENCES users(user_id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, resource_type, resource_id, permission)
);

-- Team memberships
CREATE TABLE team_members (
    team_member_id BIGSERIAL PRIMARY KEY,
    sub_account_id BIGINT NOT NULL REFERENCES sub_accounts(sub_account_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    added_by BIGINT REFERENCES users(user_id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sub_account_id, user_id)
);

-- ===========================================
-- QUOTAS & LIMITS (Enhanced with Per-Product)
-- ===========================================

CREATE TABLE quotas (
    quota_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(account_id) ON DELETE CASCADE,
    sub_account_id BIGINT REFERENCES sub_accounts(sub_account_id) ON DELETE CASCADE,
    
    -- Legacy combined limits
    metric_count_limit BIGINT DEFAULT 1000000,
    storage_gb_limit NUMERIC(10,2) DEFAULT 10.00,
    
    -- Per-product metric limits
    metrics_count_limit BIGINT,
    logs_count_limit BIGINT,
    traces_count_limit BIGINT,
    
    -- Per-product storage limits (GB)
    metrics_storage_gb NUMERIC(10,2),
    logs_storage_gb NUMERIC(10,2),
    traces_storage_gb NUMERIC(10,2),
    
    -- Per-product blocking flags
    block_metrics BOOLEAN DEFAULT FALSE,
    block_logs BOOLEAN DEFAULT FALSE,
    block_traces BOOLEAN DEFAULT FALSE,
    
    -- Rate limits
    requests_per_minute INT DEFAULT 1000,
    requests_per_day INT DEFAULT 1000000,
    
    -- Feature flags
    custom_dashboards_enabled BOOLEAN DEFAULT TRUE,
    api_access_enabled BOOLEAN DEFAULT TRUE,
    alerting_enabled BOOLEAN DEFAULT TRUE,
    sso_enabled BOOLEAN DEFAULT FALSE,
    
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
-- USAGE TRACKING (Enhanced with Product Type)
-- ===========================================

-- Raw usage events (high-throughput ingestion)
CREATE TABLE usage_events (
    event_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    
    -- Product type
    product_type VARCHAR(20), -- metrics, logs, traces, all
    
    -- Usage metrics
    metric_count BIGINT DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    
    -- Timestamp
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Batch metadata
    batch_id UUID,
    source VARCHAR(100) -- api, agent, UI
);

-- Hourly aggregated usage
CREATE TABLE usage_hourly (
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    product_type VARCHAR(20),
    hour_bucket TIMESTAMPTZ NOT NULL,
    metric_count BIGINT DEFAULT 0,
    storage_gb NUMERIC(15,6) DEFAULT 0,
    PRIMARY KEY (account_id, COALESCE(sub_account_id, 0), COALESCE(product_type, 'all'), hour_bucket)
);

-- Daily aggregated usage
CREATE TABLE usage_daily (
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    product_type VARCHAR(20),
    day_bucket DATE NOT NULL,
    metric_count BIGINT DEFAULT 0,
    storage_gb NUMERIC(15,6) DEFAULT 0,
    PRIMARY KEY (account_id, COALESCE(sub_account_id, 0), COALESCE(product_type, 'all'), day_bucket)
);

-- Monthly usage summary
CREATE TABLE usage_monthly (
    account_id BIGINT NOT NULL,
    sub_account_id BIGINT,
    product_type VARCHAR(20),
    month_bucket DATE NOT NULL,
    metric_count BIGINT DEFAULT 0,
    storage_gb NUMERIC(15,6) DEFAULT 0,
    base_cost NUMERIC(10,2) DEFAULT 0,
    overage_cost NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(10,2) DEFAULT 0,
    PRIMARY KEY (account_id, COALESCE(sub_account_id, 0), COALESCE(product_type, 'all'), month_bucket)
);

-- ===========================================
-- ALERTS & NOTIFICATIONS
-- ===========================================

-- Alert configuration rules
CREATE TABLE alert_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT REFERENCES accounts(account_id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'quota_warning', 'quota_exceeded', 'quota_critical',
        'license_expiring', 'license_expired',
        'trial_expiring', 'trial_expired',
        'payment_failed', 'invoice_overdue'
    )),
    
    -- Threshold configuration
    threshold_pct INTEGER, -- For quota alerts: 80, 90, 100
    days_before INTEGER, -- For expiry alerts: 30, 7, 1
    
    -- Product-specific alerts
    product_type VARCHAR(20), -- metrics, logs, traces
    
    -- Notification channels
    notification_channels JSONB DEFAULT '["email", "ui"]'::jsonb,
    webhook_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history
CREATE TABLE alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    sub_account_id BIGINT REFERENCES sub_accounts(sub_account_id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES users(user_id),
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical', 'error')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Product context
    product_type VARCHAR(20),
    
    -- Additional data
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Acknowledgment
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by BIGINT REFERENCES users(user_id),
    
    -- Timestamps
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
    
    -- Base pricing
    base_price NUMERIC(10,2) DEFAULT 0,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    
    -- Included quotas
    metric_count_included BIGINT DEFAULT 0,
    storage_gb_included NUMERIC(10,2) DEFAULT 0,
    
    -- Per-product included
    metrics_included BIGINT,
    logs_included BIGINT,
    traces_included BIGINT,
    
    -- Overage pricing
    price_per_million_metrics NUMERIC(10,2) DEFAULT 0,
    price_per_gb NUMERIC(10,2) DEFAULT 0,
    
    -- Per-product overage
    price_per_million_metrics_overage NUMERIC(10,2),
    price_per_million_logs_overage NUMERIC(10,2),
    price_per_million_traces_overage NUMERIC(10,2),
    
    -- Features
    features JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
    invoice_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Billing period
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Usage breakdown (combined)
    metric_count_used BIGINT DEFAULT 0,
    metric_count_included BIGINT DEFAULT 0,
    metric_count_overage BIGINT DEFAULT 0,
    storage_gb_used NUMERIC(15,6) DEFAULT 0,
    storage_gb_included NUMERIC(10,2) DEFAULT 0,
    storage_gb_overage NUMERIC(15,6) DEFAULT 0,
    
    -- Per-product usage
    metrics_used BIGINT,
    logs_used BIGINT,
    traces_used BIGINT,
    
    -- Costs
    base_cost NUMERIC(10,2) DEFAULT 0,
    metric_overage_cost NUMERIC(10,2) DEFAULT 0,
    storage_overage_cost NUMERIC(10,2) DEFAULT 0,
    
    -- Per-product costs
    metrics_cost NUMERIC(10,2),
    logs_cost NUMERIC(10,2),
    traces_cost NUMERIC(10,2),
    
    -- Totals
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_cost NUMERIC(10,2) NOT NULL,
    
    -- Payment
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    
    -- PDF
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    
    -- Timestamps
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    
    -- Additional data
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Payment transactions
CREATE TABLE payments (
    payment_id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    
    -- Payment details
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    
    -- Gateway integration
    gateway VARCHAR(50), -- stripe, paypal, etc.
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Additional
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ===========================================
-- AUDIT LOG & SECURITY
-- ===========================================

-- Comprehensive audit trail
CREATE TABLE audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    
    -- Actor
    user_id BIGINT REFERENCES users(user_id),
    account_id BIGINT REFERENCES accounts(account_id),
    sub_account_id BIGINT,
    
    -- Action
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    
    -- Details
    changes JSONB, -- before/after values
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    
    -- Result
    status VARCHAR(20) DEFAULT 'success', -- success, failure, error
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys (for programmatic access)
CREATE TABLE api_keys (
    api_key_id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(user_id),
    
    -- Key details
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Permissions
    scopes JSONB DEFAULT '[]'::jsonb,
    
    -- Security
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by BIGINT REFERENCES users(user_id)
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Accounts
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_plan_type ON accounts(plan_type);
CREATE INDEX idx_accounts_expires_at ON accounts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_is_trial ON accounts(is_trial) WHERE is_trial = TRUE;

-- Sub-accounts
CREATE INDEX idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX idx_sub_accounts_api_key ON sub_accounts(api_key);
CREATE INDEX idx_sub_accounts_status ON sub_accounts(status);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_oauth_provider_id ON users(oauth_provider, oauth_id);

-- Sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_active ON sessions(is_active) WHERE is_active = TRUE;

-- Permissions
CREATE INDEX idx_permissions_user_id ON permissions(user_id);
CREATE INDEX idx_permissions_resource ON permissions(resource_type, resource_id);

-- Quotas
CREATE INDEX idx_quotas_account_id ON quotas(account_id);
CREATE INDEX idx_quotas_sub_account_id ON quotas(sub_account_id);
CREATE INDEX idx_quotas_is_default ON quotas(is_default) WHERE is_default = TRUE;

-- Usage events
CREATE INDEX idx_usage_events_account_id ON usage_events(account_id);
CREATE INDEX idx_usage_events_recorded_at ON usage_events(recorded_at);
CREATE INDEX idx_usage_events_product_type ON usage_events(product_type);
CREATE INDEX idx_usage_events_composite ON usage_events(account_id, sub_account_id, product_type, recorded_at);

-- Usage hourly
CREATE INDEX idx_usage_hourly_account ON usage_hourly(account_id, hour_bucket);
CREATE INDEX idx_usage_hourly_product ON usage_hourly(product_type, hour_bucket);

-- Usage daily
CREATE INDEX idx_usage_daily_account ON usage_daily(account_id, day_bucket);
CREATE INDEX idx_usage_daily_product ON usage_daily(product_type, day_bucket);

-- Alerts
CREATE INDEX idx_alerts_account_id ON alerts(account_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_acknowledged ON alerts(is_acknowledged) WHERE is_acknowledged = FALSE;
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- Invoices
CREATE INDEX idx_invoices_account_id ON invoices(account_id);
CREATE INDEX idx_invoices_period ON invoices(billing_period_start, billing_period_end);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('pending', 'sent');

-- Audit log
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_account_id ON audit_log(account_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- API keys
CREATE INDEX idx_api_keys_account_id ON api_keys(account_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = TRUE;

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

-- Apply to relevant tables
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_accounts_updated_at BEFORE UPDATE ON sub_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotas_updated_at BEFORE UPDATE ON quotas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(NEW.invoice_id::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ===========================================
-- DEFAULT DATA
-- ===========================================

-- Default pricing plans
INSERT INTO pricing_plans (plan_type, name, description, base_price, metric_count_included, storage_gb_included, price_per_million_metrics, price_per_gb) VALUES
('free', 'Free Trial', '14-day free trial for testing', 0, 1000000, 1, 0, 0),
('starter', 'Starter', 'For small teams getting started', 29.00, 10000000, 10, 5.00, 2.00),
('pro', 'Professional', 'For growing businesses', 99.00, 100000000, 100, 3.00, 1.00),
('enterprise', 'Enterprise', 'For large organizations', 499.00, 1000000000, 1000, 1.00, 0.50)
ON CONFLICT (plan_type) DO NOTHING;

-- Default quota (fallback for all accounts)
INSERT INTO quotas (is_default, metric_count_limit, storage_gb_limit, requests_per_minute, metrics_count_limit, logs_count_limit, traces_count_limit) VALUES
(TRUE, 1000000, 1.0, 100, 500000, 300000, 200000)
ON CONFLICT DO NOTHING;

-- Super admin user (default password: change-me-immediately)
INSERT INTO users (email, password_hash, name, role, is_email_verified) VALUES
('admin@obsfly.local', crypt('change-me-immediately', gen_salt('bf')), 'Super Admin', 'super_admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ===========================================
-- COMMENTS
-- ===========================================

COMMENT ON TABLE accounts IS 'Main account/organization table with trial management';
COMMENT ON TABLE users IS 'User authentication and authorization';
COMMENT ON TABLE sessions IS 'JWT session tokens with Redis backup';
COMMENT ON TABLE permissions IS 'Fine-grained RBAC permissions';
COMMENT ON TABLE quotas IS 'Per-product usage limits and blocking';
COMMENT ON TABLE usage_events IS 'High-throughput usage ingestion with product type';
COMMENT ON TABLE invoices IS 'Billing invoices with per-product breakdown';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for compliance';
