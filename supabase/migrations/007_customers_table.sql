-- ============================================================================
-- F3.4: Master Data Hub - Customers Table
-- ============================================================================
-- CRM data, contact, preferences for mycustomer app
-- RLS: staff see branch customers, branch_manager sees own branch, super_admin sees all
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Branch assignment (customers belong to specific branch)
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  
  -- CRM details
  address TEXT,
  city TEXT,
  
  -- Classification
  customer_type TEXT CHECK (customer_type IN ('retail', 'wholesale', 'corporate')),
  segment TEXT, -- e.g., "premium", "regular", "inactive"
  credit_limit DECIMAL(12, 2), -- For wholesale/corporate
  
  -- Contact preferences
  preferred_contact TEXT CHECK (preferred_contact IN ('phone', 'email', 'sms', 'whatsapp')),
  do_not_contact BOOLEAN DEFAULT FALSE,
  
  -- Activity tracking
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  total_purchases INT DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);

-- ============================================================================
-- CUSTOMER CONTACT LOG
-- ============================================================================
-- Track interactions for CRM follow-up

CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Contact details
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'email', 'sms', 'whatsapp', 'in_person')),
  notes TEXT,
  
  -- Metadata
  contacted_by UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_contacted_at ON customer_contacts(contacted_at DESC);

-- ============================================================================
-- AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Change details
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Old & new values
  old_values JSONB,
  new_values JSONB
);

CREATE INDEX IF NOT EXISTS idx_customers_audit_customer_id ON customers_audit(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_audit_changed_at ON customers_audit(changed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admin sees all customers
DROP POLICY IF EXISTS customers_admin_all ON customers;
CREATE POLICY customers_admin_all
  ON customers FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policy 2: Branch manager sees own branch customers
DROP POLICY IF EXISTS customers_branch_manager_see_branch ON customers;
CREATE POLICY customers_branch_manager_see_branch
  ON customers FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'branch_manager'
    AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
  );

-- Policy 3: Staff sees own branch customers
DROP POLICY IF EXISTS customers_staff_see_branch ON customers;
CREATE POLICY customers_staff_see_branch
  ON customers FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'staff'
    AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
  );

-- Policy 4: Only branch_manager+ can insert in own branch
DROP POLICY IF EXISTS customers_manager_insert ON customers;
CREATE POLICY customers_manager_insert
  ON customers FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'super_admin')
    OR (
      (auth.jwt() ->> 'role' IN ('branch_manager', 'staff'))
      AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
    )
  );

-- Policy 5: Only branch_manager+ can update own branch customers
DROP POLICY IF EXISTS customers_manager_update ON customers;
CREATE POLICY customers_manager_update
  ON customers FOR UPDATE
  USING (
    (auth.jwt() ->> 'role' = 'super_admin')
    OR (
      (auth.jwt() ->> 'role' IN ('branch_manager', 'staff'))
      AND branch_id = (auth.jwt() ->> 'branch_id')::UUID
    )
  );

-- Policy 6: Only super_admin can delete
DROP POLICY IF EXISTS customers_admin_delete ON customers;
CREATE POLICY customers_admin_delete
  ON customers FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- RLS for customer_contacts
ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_contacts_admin_all ON customer_contacts;
CREATE POLICY customer_contacts_admin_all
  ON customer_contacts FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS customer_contacts_user_own_branch ON customer_contacts;
CREATE POLICY customer_contacts_user_own_branch
  ON customer_contacts FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE branch_id = (auth.jwt() ->> 'branch_id')::UUID
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE customers IS 'Master data: Customer records with CRM data for mycustomer app';
COMMENT ON COLUMN customers.customer_type IS 'retail | wholesale | corporate';
COMMENT ON COLUMN customers.segment IS 'Customer segmentation for targeting (e.g., premium, regular, inactive)';
COMMENT ON TABLE customer_contacts IS 'CRM contact log: track all customer interactions';
