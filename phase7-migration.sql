-- Phase 7: Monetization, Scale & Global Expansion Migrations
-- Run these migrations to add Phase 7 features

-- ============================================================================
-- 7.1 Monetization & Billing Tables
-- ============================================================================

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'pro', 'school', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_type);
CREATE UNIQUE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Subscription Usage Tracking
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    feature TEXT NOT NULL, -- 'ai_queries', 'storage_gb', 'lms_syncs', 'students'
    used_count INT DEFAULT 0,
    limit_count INT,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscription_id, feature, period_start)
);

CREATE INDEX idx_subscription_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX idx_subscription_usage_period ON subscription_usage(period_start, period_end);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    provider TEXT CHECK (provider IN ('stripe', 'paypal')),
    provider_payment_method_id TEXT,
    card_brand TEXT,
    card_last4 TEXT,
    card_exp_month INT,
    card_exp_year INT,
    is_default BOOLEAN DEFAULT FALSE,
    billing_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    amount_cents INT NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'void')),
    stripe_invoice_id TEXT,
    stripe_charge_id TEXT,
    pdf_url TEXT,
    hosted_invoice_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE UNIQUE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_cents INT NOT NULL,
    quantity INT DEFAULT 1,
    period_start DATE,
    period_end DATE
);

CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'trial')),
    discount_value INT NOT NULL,
    max_uses INT,
    used_count INT DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    applicable_plans TEXT[],
    created_by UUID REFERENCES "User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_valid ON promo_codes(valid_from, valid_until);

-- Promo Code Redemptions
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(promo_code_id, user_id)
);

CREATE INDEX idx_promo_redemptions_promo ON promo_code_redemptions(promo_code_id);
CREATE INDEX idx_promo_redemptions_user ON promo_code_redemptions(user_id);

-- ============================================================================
-- 7.2 White-label Platform Tables
-- ============================================================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    custom_domain TEXT UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',
    favicon_url TEXT,
    support_email TEXT,
    support_phone TEXT,
    settings JSONB DEFAULT '{}',
    billing_email TEXT,
    tax_id TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(custom_domain);

-- Organization Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('school', 'enterprise')),
    seat_count INT NOT NULL,
    used_seats INT DEFAULT 0,
    billing_contact_id UUID REFERENCES "User"(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE UNIQUE INDEX idx_org_subscriptions_stripe ON organization_subscriptions(stripe_subscription_id);

-- Organization Users
CREATE TABLE IF NOT EXISTS organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'admin', 'teacher', 'student', 'parent', 'viewer')),
    invited_by UUID REFERENCES "User"(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_users_org ON organization_users(organization_id);
CREATE INDEX idx_org_users_user ON organization_users(user_id);
CREATE INDEX idx_org_users_role ON organization_users(role);

-- Organization Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'viewer')),
    invited_by UUID REFERENCES "User"(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);
CREATE UNIQUE INDEX idx_org_invitations_token ON organization_invitations(token);

-- Custom Domains
CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL,
    ssl_status TEXT CHECK (ssl_status IN ('pending', 'active', 'failed', 'renewing')),
    ssl_certificate TEXT,
    ssl_key TEXT,
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    dns_records JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_domains_org ON custom_domains(organization_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);

-- Organization Branding
CREATE TABLE IF NOT EXISTS organization_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email_template_id TEXT,
    login_page_background TEXT,
    login_page_logo TEXT,
    dashboard_logo TEXT,
    email_from_name TEXT,
    email_from_email TEXT,
    terms_url TEXT,
    privacy_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_org_branding_org ON organization_branding(organization_id);

-- ============================================================================
-- 7.4 Global Expansion (i18n) Tables
-- ============================================================================

-- User Language Preferences
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Curriculum Standards by Country
CREATE TABLE IF NOT EXISTS country_curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2
    name TEXT NOT NULL,
    education_system TEXT, -- 'K-12', 'GCSE', 'IB', etc.
    grade_levels JSONB,
    academic_year_start_month INT,
    academic_year_end_month INT,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_country_curricula_code ON country_curricula(country_code);

-- Localized Content
CREATE TABLE IF NOT EXISTS content_localizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_library(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    title TEXT,
    description TEXT,
    translated_content JSONB,
    translation_status TEXT CHECK (translation_status IN ('pending', 'in_progress', 'completed', 'reviewed')),
    translator_id UUID REFERENCES "User"(id),
    reviewed_by UUID REFERENCES "User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(content_id, language)
);

CREATE INDEX idx_content_localizations_content ON content_localizations(content_id);
CREATE INDEX idx_content_localizations_language ON content_localizations(language);
CREATE INDEX idx_content_localizations_status ON content_localizations(translation_status);

-- Translation Memory
CREATE TABLE IF NOT EXISTS translation_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_text TEXT NOT NULL,
    source_language TEXT NOT NULL,
    target_language TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    context TEXT,
    usage_count INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_text, source_language, target_language)
);

CREATE INDEX idx_translation_memory_source ON translation_memory(source_text);
CREATE INDEX idx_translation_memory_target ON translation_memory(target_language, source_language);

-- ============================================================================
-- 7.5 Security & Compliance Tables
-- ============================================================================

-- Audit Logs (immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id),
    action TEXT NOT NULL,
    resource TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- Data Processing Consent (GDPR)
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- 'data_processing', 'marketing', 'third_party', 'analytics'
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT
);

CREATE INDEX idx_user_consents_user ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);

-- Parental Consents (COPPA)
CREATE TABLE IF NOT EXISTS parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES "User"(id),
    child_id UUID REFERENCES "User"(id),
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parent_email TEXT,
    verification_method TEXT, -- 'email', 'sms', 'credit_card', 'government_id'
    verification_token TEXT,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(parent_id, child_id, consent_type)
);

CREATE INDEX idx_parental_consents_parent ON parental_consents(parent_id);
CREATE INDEX idx_parental_consents_child ON parental_consents(child_id);

-- Data Export Requests (GDPR Right to Access)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    export_format TEXT DEFAULT 'json', -- 'json', 'csv', 'pdf'
    export_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_data_export_user ON data_export_requests(user_id);
CREATE INDEX idx_data_export_status ON data_export_requests(status);

-- Data Deletion Requests (GDPR Right to be Forgotten)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id),
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES "User"(id)
);

CREATE INDEX idx_data_deletion_user ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_status ON data_deletion_requests(status);

-- ============================================================================
-- 7.6 Performance & Scaling Tables
-- ============================================================================

-- Database Shard Configuration
CREATE TABLE IF NOT EXISTS shard_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shard_name TEXT UNIQUE NOT NULL,
    database_url TEXT NOT NULL,
    read_replicas JSONB DEFAULT '[]',
    school_id_range_start BIGINT,
    school_id_range_end BIGINT,
    status TEXT CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shard_config_name ON shard_configurations(shard_name);
CREATE INDEX idx_shard_config_status ON shard_configurations(status);

-- Query Performance Metrics
CREATE TABLE IF NOT EXISTS query_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL,
    query_template TEXT,
    execution_time_ms FLOAT,
    rows_affected INT,
    database_name TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_query_metrics_hash ON query_metrics(query_hash);
CREATE INDEX idx_query_metrics_created ON query_metrics(created_at);

-- API Rate Limits
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id),
    endpoint TEXT NOT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_end TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, endpoint, window_start)
);

CREATE INDEX idx_api_rate_limits_user ON api_rate_limits(user_id);
CREATE INDEX idx_api_rate_limits_endpoint ON api_rate_limits(endpoint);
CREATE INDEX idx_api_rate_limits_window ON api_rate_limits(window_start, window_end);

-- ============================================================================
-- Functions & Triggers for Phase 7
-- ============================================================================

-- Function to check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
    p_subscription_id UUID,
    p_feature TEXT,
    p_usage INT
) RETURNS BOOLEAN AS $$
DECLARE
    v_limit INT;
    v_current INT;
BEGIN
    SELECT limit_count, used_count
    INTO v_limit, v_current
    FROM subscription_usage
    WHERE subscription_id = p_subscription_id
      AND feature = p_feature
      AND period_start <= CURRENT_DATE
      AND period_end >= CURRENT_DATE;
    
    IF v_limit IS NULL THEN
        RETURN TRUE; -- No limit set
    END IF;
    
    RETURN (v_current + p_usage) <= v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_subscription_usage(
    p_subscription_id UUID,
    p_feature TEXT,
    p_amount INT DEFAULT 1
) RETURNS VOID AS $$
BEGIN
    INSERT INTO subscription_usage (subscription_id, feature, used_count, period_start, period_end)
    VALUES (p_subscription_id, p_feature, p_amount, DATE_TRUNC('month', CURRENT_DATE), (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') - INTERVAL '1 day')
    ON CONFLICT (subscription_id, feature, period_start) DO UPDATE
    SET used_count = subscription_usage.used_count + p_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action TEXT,
    p_resource TEXT,
    p_metadata JSONB
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, resource, metadata, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_resource, p_metadata, 
            COALESCE(current_setting('app.current_ip', TRUE), '0.0.0.0'),
            COALESCE(current_setting('app.user_agent', TRUE), 'unknown'))
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire old data
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS VOID AS $$
BEGIN
    -- Delete old audit logs (keep 7 years for compliance)
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '7 years';
    
    -- Delete old rate limit windows
    DELETE FROM api_rate_limits WHERE window_end < NOW() - INTERVAL '1 day';
    
    -- Delete expired invitations
    DELETE FROM organization_invitations WHERE expires_at < NOW() AND accepted_at IS NULL;
    
    -- Delete expired data exports
    DELETE FROM data_export_requests WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data
-- ============================================================================

-- Sample Promo Codes
INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_plans) VALUES
    ('LAUNCH50', 'percentage', 50, 1000, NOW(), NOW() + INTERVAL '3 months', ARRAY['basic', 'pro']),
    ('EDU20', 'percentage', 20, NULL, NOW(), NOW() + INTERVAL '1 year', ARRAY['school', 'enterprise']),
    ('TRIAL30', 'trial', 30, 500, NOW(), NOW() + INTERVAL '6 months', ARRAY['basic', 'pro'])
ON CONFLICT (code) DO NOTHING;

-- Sample Countries/Curricula
INSERT INTO country_curricula (country_code, name, education_system, grade_levels, academic_year_start_month, academic_year_end_month, language) VALUES
    ('US', 'United States', 'K-12', '[{"grade": "K", "age": 5}, {"grade": "1", "age": 6}, {"grade": "12", "age": 18}]', 8, 6, 'en'),
    ('VN', 'Vietnam', 'K-12', '[{"grade": "1", "age": 6}, {"grade": "12", "age": 18}]', 9, 5, 'vi'),
    ('GB', 'United Kingdom', 'GCSE', '[{"year": "1", "age": 5}, {"year": "13", "age": 18}]', 9, 7, 'en'),
    ('AU', 'Australia', 'K-12', '[{"year": "K", "age": 5}, {"year": "12", "age": 18}]', 1, 12, 'en')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'User subscription plans and billing';
COMMENT ON TABLE subscription_usage IS 'Track feature usage against subscription limits';
COMMENT ON TABLE invoices IS 'Billing invoices and payment records';
COMMENT ON TABLE organizations IS 'White-label organization accounts';
COMMENT ON TABLE organization_users IS 'Users belonging to organizations';
COMMENT ON TABLE custom_domains IS 'Custom domain configurations for white-label';
COMMENT ON TABLE content_localizations IS 'Localized versions of content';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance';
COMMENT ON TABLE user_consents IS 'GDPR consent tracking';
COMMENT ON TABLE parental_consents IS 'COPPA parental consent tracking';
COMMENT ON TABLE data_export_requests IS 'GDPR right to access requests';
COMMENT ON TABLE data_deletion_requests IS 'GDPR right to be forgotten requests';
COMMENT ON TABLE shard_configurations IS 'Database sharding configuration';
