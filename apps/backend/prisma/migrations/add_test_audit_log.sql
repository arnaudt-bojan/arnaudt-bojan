-- Test Audit Log Table and Trigger System
-- This migration creates an audit logging system for tracking database changes during tests

-- Create the audit log table
CREATE TABLE IF NOT EXISTS test_audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  row_id VARCHAR(255) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS test_audit_log_table_name_idx ON test_audit_log(table_name);
CREATE INDEX IF NOT EXISTS test_audit_log_operation_idx ON test_audit_log(operation);
CREATE INDEX IF NOT EXISTS test_audit_log_changed_at_idx ON test_audit_log(changed_at);

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO test_audit_log (table_name, operation, row_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END,
    CASE 
      WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb
      ELSE NULL
    END
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to critical tables
DROP TRIGGER IF EXISTS products_audit_trigger ON products;
CREATE TRIGGER products_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;
CREATE TRIGGER orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS carts_audit_trigger ON carts;
CREATE TRIGGER carts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON carts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS cart_items_audit_trigger ON cart_items;
CREATE TRIGGER cart_items_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Note: Apply this migration manually with:
-- psql $DATABASE_URL -f prisma/migrations/add_test_audit_log.sql
