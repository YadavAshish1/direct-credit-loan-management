-- DirectCredit Loan Management System
-- Database Migration Script
-- Run this file to set up the complete schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE (Customer Accounts)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  pan_number VARCHAR(10) UNIQUE,
  aadhaar_number VARCHAR(12),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  employment_type VARCHAR(50), -- salaried, self_employed, business
  employer_name VARCHAR(255),
  monthly_income NUMERIC(15, 2),
  employment_years INTEGER,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CREDIT REPORTS TABLE (Simulated Bureau Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_score INTEGER NOT NULL,
  total_accounts INTEGER DEFAULT 0,
  active_accounts INTEGER DEFAULT 0,
  closed_accounts INTEGER DEFAULT 0,
  overdue_accounts INTEGER DEFAULT 0,
  total_outstanding NUMERIC(15, 2) DEFAULT 0,
  total_limit NUMERIC(15, 2) DEFAULT 0,
  payment_history VARCHAR(20) DEFAULT 'good', -- excellent, good, fair, poor
  credit_utilization NUMERIC(5, 2) DEFAULT 0,
  oldest_account_years INTEGER DEFAULT 0,
  enquiries_last_6months INTEGER DEFAULT 0,
  report_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOAN APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_type VARCHAR(50) NOT NULL, -- personal, home, vehicle, education, business
  loan_amount NUMERIC(15, 2) NOT NULL,
  loan_tenure_months INTEGER NOT NULL,
  purpose TEXT,
  interest_rate NUMERIC(5, 2),
  emi_amount NUMERIC(15, 2),
  
  -- Applicant snapshot at time of application
  monthly_income NUMERIC(15, 2),
  employment_type VARCHAR(50),
  employer_name VARCHAR(255),
  employment_years INTEGER,
  existing_emis NUMERIC(15, 2) DEFAULT 0,
  
  -- Status workflow
  status VARCHAR(50) DEFAULT 'submitted', 
  -- submitted, under_review, eligible, ineligible, approved, rejected, disbursed
  
  -- Timestamps for each stage
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  
  -- Admin tracking
  reviewed_by UUID REFERENCES admins(id),
  admin_remarks TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ELIGIBILITY CHECKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS eligibility_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Input parameters
  credit_score INTEGER,
  monthly_income NUMERIC(15, 2),
  loan_amount NUMERIC(15, 2),
  loan_tenure_months INTEGER,
  employment_type VARCHAR(50),
  employment_years INTEGER,
  existing_emis NUMERIC(15, 2),
  age INTEGER,
  
  -- Computed values
  debt_to_income_ratio NUMERIC(5, 2),
  emi_amount NUMERIC(15, 2),
  max_eligible_amount NUMERIC(15, 2),
  
  -- Rule results (JSON array of {rule, passed, reason})
  rules_evaluated JSONB,
  
  -- Overall result
  is_eligible BOOLEAN,
  eligibility_score INTEGER, -- 0-100
  remarks TEXT,
  
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOAN DISBURSEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_disbursements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disbursed_by UUID REFERENCES admins(id),
  
  disbursed_amount NUMERIC(15, 2) NOT NULL,
  disbursement_mode VARCHAR(50) DEFAULT 'NEFT', -- NEFT, RTGS, IMPS
  bank_account VARCHAR(20),
  ifsc_code VARCHAR(11),
  transaction_reference VARCHAR(50),
  
  first_emi_date DATE,
  last_emi_date DATE,
  
  disbursed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_type VARCHAR(20), -- user, admin, system
  actor_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- application, user, disbursement
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REFRESH TOKENS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(500) NOT NULL,
  user_id UUID,
  admin_id UUID,
  actor_type VARCHAR(10) NOT NULL, -- user, admin
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_number ON loan_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_eligibility_application_id ON eligibility_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_user_id ON credit_reports(user_id);

-- ============================================================
-- DEFAULT ADMIN ACCOUNT
-- Password: Admin@123 (bcrypt hashed)
-- ============================================================
INSERT INTO admins (full_name, email, password_hash, role)
VALUES (
  'Super Admin',
  'admin@directcredit.in',
  '$2b$12$LgvWn8A4hR.V5oAEuZ9qJeOrmWA3FpME5EcA4DOnf6d1P6Gn3Lp3m',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Second admin account
INSERT INTO admins (full_name, email, password_hash, role)
VALUES (
  'Loan Officer',
  'officer@directcredit.in',
  '$2b$12$LgvWn8A4hR.V5oAEuZ9qJeOrmWA3FpME5EcA4DOnf6d1P6Gn3Lp3m',
  'admin'
) ON CONFLICT (email) DO NOTHING;
