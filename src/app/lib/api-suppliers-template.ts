/**
 * SUPPLIERS API TEMPLATE
 * 
 * Add these types and functions to src/app/lib/api.ts
 * This template assumes you're using fetch() and your backend is at the same URL
 * 
 * Adjust baseUrl, endpoint paths, and response handling based on your backend
 */

// ============================================================================
// TYPE DEFINITIONS (Add to src/app/lib/api.ts)
// ============================================================================

export interface SuppliedFlower {
  flowerId: string;        // Foreign key to Flower.id
  flowerName: string;
  category: string;
}

export interface PurchaseHistory {
  id: string;
  date: string;           // ISO date string (2026-04-18)
  dateLabel: string;      // Formatted (2026年4月18日)
  flowerId: string;       // Foreign key to Flower.id
  flowerName: string;
  quantity: number;
  unitPrice: number;
  unitPriceDisplay: string;    // "$8.50"
  lineTotal: number;
  lineTotalDisplay: string;    // "$850.00"
}

export interface Supplier {
  id: string;
  companyName: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  suppliedFlowers: SuppliedFlower[];
  status: "Active" | "Inactive";
  statusLabel: string;
  notes: string;
  purchaseHistory: PurchaseHistory[];
  createdAt: string;      // ISO date string
}

export interface SupplierPage {
  items: Supplier[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  total: number;
}

// ============================================================================
// API FUNCTIONS (Add to src/app/lib/api.ts)
// ============================================================================

const API_BASE_URL = "http://127.0.0.1:8000";  // Adjust based on your backend

/**
 * Get paginated list of suppliers
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @param search - Search query (company name, contact person, phone)
 * @param status - Filter by status ("Active" or "Inactive"), undefined for all
 */
export async function getSuppliers(
  page: number = 1,
  pageSize: number = 10,
  search: string = "",
  status?: "Active" | "Inactive"
): Promise<SupplierPage> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const response = await fetch(`${API_BASE_URL}/api/suppliers?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch suppliers: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get a single supplier with all details and purchase history
 * @param supplierId - Supplier ID
 */
export async function getSupplier(supplierId: string): Promise<Supplier> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplierId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch supplier: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create a new supplier
 * @param supplier - Supplier data (without id and createdAt)
 */
export async function createSupplier(
  supplier: Omit<Supplier, "id" | "createdAt">
): Promise<Supplier> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(supplier),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create supplier");
  }
  return response.json();
}

/**
 * Update an existing supplier
 * @param supplierId - Supplier ID to update
 * @param updates - Partial supplier data to update
 */
export async function updateSupplier(
  supplierId: string,
  updates: Partial<Supplier>
): Promise<Supplier> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update supplier");
  }
  return response.json();
}

/**
 * Delete a supplier
 * @param supplierId - Supplier ID to delete
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplierId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete supplier");
  }
}

/**
 * Record a new purchase from a supplier
 * @param supplierId - Supplier ID
 * @param purchase - Purchase record to add (without id)
 */
export async function recordSupplierPurchase(
  supplierId: string,
  purchase: Omit<PurchaseHistory, "id">
): Promise<PurchaseHistory> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplierId}/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(purchase),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to record purchase");
  }
  return response.json();
}

/**
 * Get purchase history for a supplier
 * @param supplierId - Supplier ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 */
export async function getSupplierPurchaseHistory(
  supplierId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: PurchaseHistory[]; hasNextPage: boolean; hasPreviousPage: boolean }> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  const response = await fetch(
    `${API_BASE_URL}/api/suppliers/${supplierId}/purchases?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch purchase history: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get suppliers that supply a specific flower
 * @param flowerId - Flower ID to find suppliers for
 */
export async function getSuppliersByFlower(flowerId: string): Promise<Supplier[]> {
  const response = await fetch(`${API_BASE_URL}/api/flowers/${flowerId}/suppliers`);
  if (!response.ok) {
    throw new Error(`Failed to fetch suppliers for flower: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Add a flower to a supplier's supply list
 * @param supplierId - Supplier ID
 * @param flowerId - Flower ID to add
 */
export async function addSuppliedFlower(
  supplierId: string,
  flowerId: string
): Promise<SuppliedFlower> {
  const response = await fetch(`${API_BASE_URL}/api/suppliers/${supplierId}/flowers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flowerId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add supplied flower");
  }
  return response.json();
}

/**
 * Remove a flower from a supplier's supply list
 * @param supplierId - Supplier ID
 * @param flowerId - Flower ID to remove
 */
export async function removeSuppliedFlower(
  supplierId: string,
  flowerId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/suppliers/${supplierId}/flowers/${flowerId}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to remove supplied flower");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a date for display (e.g., 2026年4月18日)
 */
export function formatSupplierDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format a price for display (e.g., $8.50)
 * Adjust currency and decimal places as needed
 */
export function formatSupplierPrice(price: number, currency: string = "$"): string {
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Translate supplier status to display label
 */
export function translateSupplierStatus(status: "Active" | "Inactive"): string {
  const labels: Record<"Active" | "Inactive", string> = {
    Active: "啟用中",
    Inactive: "停用",
  };
  return labels[status];
}

// ============================================================================
// EXPECTED BACKEND ENDPOINTS
// ============================================================================

/**
 * Expected REST API endpoints on your backend:
 * 
 * GET    /api/suppliers                           - List suppliers (pagination, search, filter)
 * GET    /api/suppliers/:id                       - Get single supplier with history
 * POST   /api/suppliers                           - Create supplier
 * PATCH  /api/suppliers/:id                       - Update supplier
 * DELETE /api/suppliers/:id                       - Delete supplier
 * 
 * GET    /api/suppliers/:id/purchases             - Get purchase history
 * POST   /api/suppliers/:id/purchases             - Record new purchase
 * 
 * GET    /api/flowers/:id/suppliers               - Get suppliers for a flower
 * POST   /api/suppliers/:id/flowers               - Add flower to supplier
 * DELETE /api/suppliers/:id/flowers/:flowerId     - Remove flower from supplier
 * 
 * Query Parameters:
 * - page: number (1-indexed)
 * - pageSize: number (default 10)
 * - search: string (search query)
 * - status: string ("Active" or "Inactive")
 */

// ============================================================================
// EXAMPLE: Integrating with useShopData()
// ============================================================================

/**
 * In src/app/lib/shop-data.tsx, add to ShopDataContext:
 * 
 * export interface ShopData {
 *   // ... existing fields ...
 *   
 *   // Suppliers
 *   suppliers: Supplier[];
 *   suppliersLoading: boolean;
 *   suppliersError: string | null;
 *   
 *   // Methods
 *   createSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => Promise<Supplier>;
 *   updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<Supplier>;
 *   deleteSupplier: (supplierId: string) => Promise<void>;
 *   recordSupplierPurchase: (supplierId: string, purchase: Omit<PurchaseHistory, "id">) => Promise<PurchaseHistory>;
 * }
 */

// ============================================================================
// EXAMPLE: Using in Suppliers.tsx
// ============================================================================

/**
 * Replace MOCK_SUPPLIERS with API calls:
 * 
 * export function Suppliers() {
 *   const { suppliers, suppliersLoading, createSupplier, updateSupplier } = useShopData();
 *   
 *   useEffect(() => {
 *     // Load suppliers on component mount
 *     loadSuppliers();
 *   }, []);
 *   
 *   const handleAddSupplier = async (newSupplier) => {
 *     try {
 *       await createSupplier(newSupplier);
 *       // suppliers list auto-updates from context
 *     } catch (error) {
 *       toast.error("Failed to create supplier");
 *     }
 *   };
 * }
 */
