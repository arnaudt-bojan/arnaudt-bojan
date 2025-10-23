-- Application Audit Log (production)
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(255),
  entity_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Security Events Audit
CREATE TABLE IF NOT EXISTS security_audit (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  ip_address VARCHAR(45),
  success BOOLEAN,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_event ON security_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit(created_at);
