import { z } from 'zod';

// ============================================================================
// Master Data Schemas — Zod Validators
// ============================================================================
// Used for API validation, type safety, and database constraint enforcement

// ============================================================================
// PEOPLE SCHEMA
// ============================================================================

export const PeopleRoleSchema = z.enum(['super_admin', 'branch_manager', 'staff', 'guest']);
export const PeopleStatusSchema = z.enum(['active', 'inactive', 'suspended']);

export const PeopleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  role: PeopleRoleSchema,
  branch_id: z.string().uuid('Invalid branch ID'),
  status: PeopleStatusSchema.default('active'),
  created_by: z.string().uuid(),
  created_at: z.date().optional(),
  updated_by: z.string().uuid().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().optional(),
});

export type People = z.infer<typeof PeopleSchema>;

// For creation (without timestamps)
export const CreatePeopleSchema = PeopleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export type CreatePeople = z.infer<typeof CreatePeopleSchema>;

// For updates (all fields optional)
export const UpdatePeopleSchema = CreatePeopleSchema.partial().omit({
  created_by: true,
});

export type UpdatePeople = z.infer<typeof UpdatePeopleSchema>;

// ============================================================================
// BRANCHES SCHEMA
// ============================================================================

export const BranchStatusSchema = z.enum(['active', 'inactive', 'closed']);

export const BranchSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Branch name is required'),
  code: z.string().min(2).max(10, 'Code must be 2-10 characters'),
  description: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  parent_branch_id: z.string().uuid().optional().nullable(),
  settings: z.record(z.unknown()).default({}),
  status: BranchStatusSchema.default('active'),
  created_by: z.string().uuid(),
  created_at: z.date().optional(),
  updated_by: z.string().uuid().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().optional(),
});

export type Branch = z.infer<typeof BranchSchema>;

export const CreateBranchSchema = BranchSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export type CreateBranch = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = CreateBranchSchema.partial().omit({
  created_by: true,
});

export type UpdateBranch = z.infer<typeof UpdateBranchSchema>;

// ============================================================================
// ITEMS SCHEMA
// ============================================================================

export const ItemCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type ItemCategory = z.infer<typeof ItemCategorySchema>;

export const CreateItemCategorySchema = ItemCategorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateItemCategory = z.infer<typeof CreateItemCategorySchema>;

export const ItemSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1).max(50, 'SKU must be 1-50 characters'),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  category_id: z.string().uuid('Invalid category ID'),
  price_cost: z.number().positive().optional(),
  price_retail: z.number().positive('Retail price must be positive'),
  unit: z.string().default('pcs'),
  stock_qty: z.number().int().default(0),
  reorder_level: z.number().int().optional(),
  is_taxable: z.boolean().default(false),
  barcode: z.string().optional(),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid(),
  created_at: z.date().optional(),
  updated_by: z.string().uuid().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().optional(),
});

export type Item = z.infer<typeof ItemSchema>;

export const CreateItemSchema = ItemSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export type CreateItem = z.infer<typeof CreateItemSchema>;

export const UpdateItemSchema = CreateItemSchema.partial().omit({
  created_by: true,
  sku: true, // Don't allow SKU changes
});

export type UpdateItem = z.infer<typeof UpdateItemSchema>;

// ============================================================================
// CUSTOMERS SCHEMA
// ============================================================================

export const CustomerTypeSchema = z.enum(['retail', 'wholesale', 'corporate']);
export const CustomerStatusSchema = z.enum(['active', 'inactive', 'blacklisted']);
export const PreferredContactSchema = z.enum(['phone', 'email', 'sms', 'whatsapp']);

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  branch_id: z.string().uuid('Invalid branch ID'),
  address: z.string().optional(),
  city: z.string().optional(),
  customer_type: CustomerTypeSchema.optional(),
  segment: z.string().optional(),
  credit_limit: z.number().optional(),
  preferred_contact: PreferredContactSchema.optional(),
  do_not_contact: z.boolean().default(false),
  last_purchase_at: z.date().optional(),
  total_purchases: z.number().int().default(0),
  total_spent: z.number().default(0),
  status: CustomerStatusSchema.default('active'),
  created_by: z.string().uuid(),
  created_at: z.date().optional(),
  updated_by: z.string().uuid().optional(),
  updated_at: z.date().optional(),
  deleted_at: z.date().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
  last_purchase_at: true,
  total_purchases: true,
  total_spent: true,
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial().omit({
  created_by: true,
  branch_id: true, // Don't allow branch reassignment without special handling
});

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

// ============================================================================
// JWT CUSTOM CLAIMS
// ============================================================================
// Used for RLS policy enforcement

export const JWTClaimsSchema = z.object({
  person_id: z.string().uuid('Invalid person ID'),
  branch_id: z.string().uuid('Invalid branch ID'),
  role: PeopleRoleSchema,
  email: z.string().email(),
});

export type JWTClaims = z.infer<typeof JWTClaimsSchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const MasterDataResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type MasterDataResponse = z.infer<typeof MasterDataResponseSchema>;

// Paginated response
export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.unknown()),
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number(),
});

export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;
