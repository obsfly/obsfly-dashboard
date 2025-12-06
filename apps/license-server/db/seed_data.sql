-- ==================================================================
-- ObsFly License Server - Sample/Dummy Data
-- For testing and development
-- ==================================================================

-- ===========================================
-- SAMPLE ACCOUNTS
-- ===========================================

-- Enterprise account (active, paid)
INSERT INTO accounts (license_key, name, email, company, plan_type, status, is_trial, expires_at) VALUES
('LIC-ENT-ACME-2024-001', 'Acme Corporation', 'admin@acme-demo.com', 'Acme Corp', 'enterprise', 'active', FALSE, NOW() + INTERVAL '365 days');

-- Pro account (active, paid)
INSERT INTO accounts (license_key, name, email, company, plan_type, status, is_trial, expires_at) VALUES
('LIC-PRO-TECH-2024-002', 'TechStartup Inc', 'admin@techstartup-demo.com', 'TechStartup', 'pro', 'active', FALSE, NOW() + INTERVAL '365 days');

-- Starter account (trial ending soon)
INSERT INTO accounts (license_key, name, email, company, plan_type, status, is_trial, trial_days_remaining, trial_started_at, expires_at) VALUES
('LIC-TRIAL-NEW-2024-003', 'NewUser Trial', 'trial@newuser-demo.com', 'Trial User Co', 'starter', 'trial', TRUE, 5, NOW() - INTERVAL '9 days', NOW() + INTERVAL '5 days');

-- Free account (expired trial)
INSERT INTO accounts (license_key, name, email, company, plan_type, status, is_trial, trial_days_remaining, expires_at) VALUES
('LIC-EXP-OLD-2024-004', 'Expired User', 'expired@olduser-demo.com', 'Old User Inc', 'free', 'expired', TRUE, 0, NOW() - INTERVAL '1 day');

-- ===========================================
-- SAMPLE SUB-ACCOUNTS
-- ===========================================

-- Acme Corp teams
INSERT INTO sub_accounts (account_id, name, api_key, description) VALUES
(1, 'Engineering Team', 'API-ACME-ENG-2024-001', 'Backend and frontend engineering'),
(1, 'DevOps Team', 'API-ACME-DEVOPS-2024-002', 'Infrastructure and deployment'),
(1, 'Data Team', 'API-ACME-DATA-2024-003', 'Analytics and data science');

-- TechStartup teams
INSERT INTO sub_accounts (account_id, name, api_key, description) VALUES
(2, 'Backend Services', 'API-TECH-BACKEND-2024-004', 'Microservices team'),
(2, 'Mobile Team', 'API-TECH-MOBILE-2024-005', 'iOS and Android apps');

-- ===========================================
-- SAMPLE USERS
-- ===========================================

-- Super Admin (password: Admin@2024!)
INSERT INTO users (email, password_hash, name, role, is_email_verified, account_id) VALUES
('superadmin@obsfly.local', crypt('Admin@2024!', gen_salt('bf')), 'Super Administrator', 'super_admin', TRUE, NULL);

-- Acme Corp users
INSERT INTO users (email, password_hash, name, role, account_id, is_email_verified) VALUES
('john.admin@acme-demo.com', crypt('Acme@2024!', gen_salt('bf')), 'John Admin', 'admin', 1, TRUE),
('jane.owner@acme-demo.com', crypt('Acme@2024!', gen_salt('bf')), 'Jane Owner', 'owner', 1, TRUE),
('bob.member@acme-demo.com', crypt('Acme@2024!', gen_salt('bf')), 'Bob Member', 'member', 1, TRUE),
('alice.viewer@acme-demo.com', crypt('Acme@2024!', gen_salt('bf')), 'Alice Viewer', 'viewer', 1, TRUE);

-- TechStartup users
INSERT INTO users (email, password_hash, name, role, account_id, is_email_verified) VALUES
('admin@techstartup-demo.com', crypt('Tech@2024!', gen_salt('bf')), 'Tech Admin', 'admin', 2, TRUE),
('dev@techstartup-demo.com', crypt('Tech@2024!', gen_salt('bf')), 'Developer', 'member', 2, TRUE);

-- Trial user
INSERT INTO users (email, password_hash, name, role, account_id, is_email_verified) VALUES
('trial@newuser-demo.com', crypt('Trial@2024!', gen_salt('bf')), 'Trial User', 'owner', 3, TRUE);

-- ===========================================
-- SAMPLE QUOTAS
-- ===========================================

-- Acme Corp (Enterprise) - Custom high limits
INSERT INTO quotas (account_id, metric_count_limit, storage_gb_limit, 
    metrics_count_limit, logs_count_limit, traces_count_limit,
    metrics_storage_gb, logs_storage_gb, traces_storage_gb,
    requests_per_minute) VALUES
(1, 1000000000, 1000, 500000000, 300000000, 200000000, 500, 300, 200, 10000);

-- TechStartup (Pro) - Standard pro limits
INSERT INTO quotas (account_id, metric_count_limit, storage_gb_limit,
    metrics_count_limit, logs_count_limit, traces_count_limit,
    metrics_storage_gb, logs_storage_gb, traces_storage_gb,
    requests_per_minute) VALUES
(2, 100000000, 100, 50000000, 30000000, 20000000, 50, 30, 20, 1000);

-- Trial account - Limited
INSERT INTO quotas (account_id, metric_count_limit, storage_gb_limit,
    metrics_count_limit, logs_count_limit, traces_count_limit,
    metrics_storage_gb, logs_storage_gb, traces_storage_gb,
    requests_per_minute) VALUES
(3, 10000000, 10, 5000000, 3000000, 2000000, 5, 3, 2, 100);

-- ===========================================
-- SAMPLE USAGE DATA (Last 30 Days)
-- ===========================================

-- Acme Corp - Combined usage
INSERT INTO usage_daily (account_id, sub_account_id, product_type, day_bucket, metric_count, storage_gb)
SELECT 
    1,
    NULL,
    'all',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    (RANDOM() * 30000000 + 10000000)::BIGINT,
    (RANDOM() * 30 + 10)::NUMERIC(15,6)
FROM generate_series(0, 29) n;

-- Acme Corp - Per product
INSERT INTO usage_daily (account_id, product_type, day_bucket, metric_count, storage_gb)
SELECT 
    1,
    'metrics',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    (RANDOM() * 15000000 + 5000000)::BIGINT,
    (RANDOM() * 15 + 5)::NUMERIC(15,6)
FROM generate_series(0, 29) n;

INSERT INTO usage_daily (account_id, product_type, day_bucket, metric_count, storage_gb)
SELECT 
    1,
    'logs',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    (RANDOM() * 10000000 + 3000000)::BIGINT,
    (RANDOM() * 10 + 3)::NUMERIC(15,6)
FROM generate_series(0, 29) n;

INSERT INTO usage_daily (account_id, product_type, day_bucket, metric_count, storage_gb)
SELECT 
    1,
    'traces',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    (RANDOM() * 5000000 + 2000000)::BIGINT,
    (RANDOM() * 5 + 2)::NUMERIC(15,6)
FROM generate_series(0, 29) n;

-- TechStartup usage
INSERT INTO usage_daily (account_id, product_type, day_bucket, metric_count, storage_gb)
SELECT 
    2,
    'all',
    CURRENT_DATE - (n || ' days')::INTERVAL,
    (RANDOM() * 5000000 + 1000000)::BIGINT,
    (RANDOM() * 5 + 1)::NUMERIC(15,6)
FROM generate_series(0, 29) n;

-- ===========================================
-- SAMPLE ALERTS
-- ===========================================

INSERT INTO alerts (account_id, alert_type, severity, title, message, product_type) VALUES
(1, 'quota_warning', 'warning', 'Approaching Metrics Quota', 'You have used 85% of your metrics quota (425M / 500M)', 'metrics'),
(2, 'quota_critical', 'critical', 'Critical: Storage Quota', 'You have used 95% of your storage quota (95 GB / 100 GB)', 'all'),
(3, 'trial_expiring', 'warning', 'Trial Expiring Soon', 'Your trial expires in 5 days. Upgrade to continue service.', NULL),
(4, 'license_expired', 'critical', 'License Expired', 'Your license has expired. Please renew to restore access.', NULL);

-- ===========================================
-- SAMPLE INVOICES
-- ===========================================

-- Acme Corp - Last month invoice (paid)
INSERT INTO invoices (
    account_id, billing_period_start, billing_period_end,
    metric_count_used, metric_count_included, metric_count_overage,
    storage_gb_used, storage_gb_included, storage_gb_overage,
    metrics_used, logs_used, traces_used,
    base_cost, metric_overage_cost, storage_overage_cost,
    subtotal, total_cost, status, paid_at
) VALUES (
    1,
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'),
    DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day',
    850000000, 1000000000, 0,
    750.50, 1000, 0,
    425000000, 255000000, 170000000,
    499.00, 0, 0,
    499.00, 499.00, 'paid', NOW() - INTERVAL '5 days'
);

-- TechStartup - Current month invoice (pending)
INSERT INTO invoices (
    account_id, billing_period_start, billing_period_end,
    metric_count_used, metric_count_included, metric_count_overage,
    storage_gb_used, storage_gb_included, storage_gb_overage,
    base_cost, metric_overage_cost, storage_overage_cost,
    subtotal, total_cost, status, due_date
) VALUES (
    2,
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    120000000, 100000000, 20000000,
    105.25, 100, 5.25,
    99.00, 60.00, 5.25,
    164.25, 164.25, 'pending', CURRENT_DATE + INTERVAL '15 days'
);

-- ===========================================
-- SAMPLE PERMISSIONS
-- ===========================================

-- Grant permissions to users
INSERT INTO permissions (user_id, resource_type, resource_id, permission, granted_by) VALUES
-- Acme users
(3, 'sub_account', 1, 'admin', 2),  -- John can admin Engineering team
(4, 'sub_account', 1, 'write', 2),  -- Bob can write to Engineering
(5, 'sub_account', 1, 'read', 2),   -- Alice can read Engineering
(3, 'product', NULL, 'admin', 2);   -- John has product admin access

-- ===========================================
-- SAMPLE AUDIT LOG
-- ===========================================

INSERT INTO audit_log (user_id, account_id, action, resource_type, resource_id, details, ip_address) VALUES
(2, 1, 'user_created', 'user', 3, '{"email": "john.admin@acme-demo.com"}', '192.168.1.100'),
(2, 1, 'sub_account_created', 'sub_account', 1, '{"name": "Engineering Team"}', '192.168.1.100'),
(3, 1, 'quota_updated', 'quota', 1, '{"old_limit": 500000000, "new_limit": 1000000000}', '192.168.1.101'),
(6, 2, 'invoice_paid', 'invoice', 1, '{"amount": 499.00}', '192.168.2.50');

-- ===========================================
-- SAMPLE API KEYS
-- ===========================================

INSERT INTO api_keys (account_id, user_id, key_hash, key_prefix, name, scopes) VALUES
(1, 2, encode(digest('acme-prod-key-001', 'sha256'), 'hex'), 'apk_acme', 'Production API Key', '["metrics:write", "logs:write", "traces:write"]'),
(2, 6, encode(digest('tech-dev-key-001', 'sha256'), 'hex'), 'apk_tech', 'Development API Key', '["metrics:read", "metrics:write"]');

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Verify accounts
-- SELECT account_id, name, email, plan_type, status, is_trial FROM accounts;

-- Verify users
-- SELECT user_id, email, name, role, account_id FROM users;

-- Verify usage
-- SELECT account_id, product_type, SUM(metric_count), SUM(storage_gb) 
-- FROM usage_daily 
-- WHERE day_bucket >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY account_id, product_type;

-- Verify quotas vs usage
-- SELECT a.name, q.metric_count_limit, SUM(u.metric_count) as used
-- FROM accounts a
-- JOIN quotas q ON a.account_id = q.account_id
-- LEFT JOIN usage_daily u ON a.account_id = u.account_id
-- WHERE u.day_bucket >= DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY a.name, q.metric_count_limit;
