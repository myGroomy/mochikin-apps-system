-- ============================================================================
-- F3.3: Master Data Hub - Items Table
-- ============================================================================
-- Products/SKU, kategori, pricing
-- RLS: all authenticated users can read, only super_admin can write
-- ============================================================================

CREATE TABLE IF NOT EXISTS item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_item_categories_is_active ON item_categories(is_active);

-- ============================================================================
-- ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Category
  category_id UUID NOT NULL REFERENCES item_categories(id) ON DELETE RESTRICT,
  
  -- Pricing
  price_cost DECIMAL(12, 2), -- Harga beli
  price_retail DECIMAL(12, 2) NOT NULL, -- Harga jual
  
  -- Inventory
  unit TEXT NOT NULL DEFAULT 'pcs', -- pcs, box, liter, kg, etc.
  stock_qty INT DEFAULT 0,
  reorder_level INT, -- Alert when stock below this
  
  -- Classification
  is_taxable BOOLEAN DEFAULT FALSE,
  barcode TEXT UNIQUE,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);

-- ============================================================================
-- AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS items_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  -- Change details
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Old & new values
  old_values JSONB,
  new_values JSONB
);

CREATE INDEX IF NOT EXISTS idx_items_audit_item_id ON items_audit(item_id);
CREATE INDEX IF NOT EXISTS idx_items_audit_changed_at ON items_audit(changed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read items
DROP POLICY IF EXISTS items_all_read ON items;
CREATE POLICY items_all_read
  ON items FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS item_categories_all_read ON item_categories;
CREATE POLICY item_categories_all_read
  ON item_categories FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Policy: Only super_admin can write items
DROP POLICY IF EXISTS items_admin_write ON items;
CREATE POLICY items_admin_write
  ON items FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS items_admin_update ON items;
CREATE POLICY items_admin_update
  ON items FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS items_admin_delete ON items;
CREATE POLICY items_admin_delete
  ON items FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Policy: Only super_admin can write categories
DROP POLICY IF EXISTS item_categories_admin_write ON item_categories;
CREATE POLICY item_categories_admin_write
  ON item_categories FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS item_categories_admin_update ON item_categories;
CREATE POLICY item_categories_admin_update
  ON item_categories FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

DROP POLICY IF EXISTS item_categories_admin_delete ON item_categories;
CREATE POLICY item_categories_admin_delete
  ON item_categories FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE items IS 'Master data: Products/SKU with pricing and inventory';
COMMENT ON COLUMN items.price_cost IS 'Cost price (harga beli)';
COMMENT ON COLUMN items.price_retail IS 'Selling price (harga jual)';
COMMENT ON COLUMN items.unit IS 'Unit of measure (pcs, box, liter, kg, etc.)';
COMMENT ON TABLE item_categories IS 'Item categories for organization and filtering';
