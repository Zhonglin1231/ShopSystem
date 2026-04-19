# Suppliers Page Implementation Guide

## Overview

The Suppliers page provides comprehensive supplier management for your flower shop system. It features:
- Supplier listing with search and filter capabilities
- Supplier detail panel with editable information
- Purchase history tracking
- Flower supply references
- Traditional Chinese interface (香港用語)

## File Structure

```
src/app/
├── pages/
│   └── Suppliers.tsx          # Main supplier list page component
├── components/
│   └── SupplierDetailsPanel.tsx # Right-side detail panel
├── routes.tsx                  # Updated with /suppliers route
└── components/Sidebar.tsx      # Updated with Suppliers navigation
```

## Data Models

### Supplier Interface

```typescript
interface Supplier {
  id: string;                    // Unique identifier
  companyName: string;          // Supplier company name
  address: string;              // Full address
  contactPerson: string;        // Primary contact name
  phone: string;                // Phone number (e.g., +852-2234-5678)
  email: string;                // Email address
  suppliedFlowers: SuppliedFlower[];  // Array of flowers supplied
  status: "Active" | "Inactive"; // Simple enable/disable status
  statusLabel: string;          // Display label (啟用中 / 停用)
  notes: string;                // Internal notes
  purchaseHistory: PurchaseHistory[];  // Historical purchases
  createdAt: string;            // ISO date when created
}
```

### SuppliedFlower Interface

```typescript
interface SuppliedFlower {
  flowerId: string;            // References Flower.id - LINK TO FLOWERS PAGE
  flowerName: string;          // Display name of flower
  category: string;            // Flower category/type
}
```

### PurchaseHistory Interface

```typescript
interface PurchaseHistory {
  id: string;                  // Unique transaction ID
  date: string;                // ISO date string
  dateLabel: string;           // Formatted display date (e.g., 2026年4月18日)
  flowerId: string;            // References Flower.id
  flowerName: string;          // Display name
  quantity: number;            // Number of stems/units purchased
  unitPrice: number;           // Price per unit
  unitPriceDisplay: string;     // Formatted price (e.g., "$8.50")
  lineTotal: number;           // quantity × unitPrice
  lineTotalDisplay: string;    // Formatted total (e.g., "$850.00")
}
```

## Feature Breakdown

### 1. Supplier Listing (Main Table)
- **Search**: Filters by company name, contact person, or phone number
- **Status Filter**: All / Active / Inactive
- **Columns**:
  - Company name + address
  - Contact person + email
  - Phone number
  - Supplied flowers (count and names)
  - Status badge
  - Detail button

### 2. Detail Panel (Right Sidebar)
- **View Mode**: Read-only display of all supplier information
- **Edit Mode**: Inline editing of supplier details
- **Sections**:
  - Basic Info (company name, address, contact, phone, email, status)
  - Supplied Flowers (list with flower links)
  - Notes
  - Purchase History (transactions with dates and amounts)

### 3. Add Supplier Modal
Currently a placeholder. Ready to connect to your backend API or state management.

## Integration Points

### 🔗 Connecting to Existing Flower Records

**Location**: `SupplierDetailsPanel.tsx`, Supplied Flowers section

The `flowerId` field in `SuppliedFlower` acts as a foreign key to your `Flower` records:

```typescript
// Example: Link to existing Flowers page for a supplier's flower
const flowerRecord = flowers.find(f => f.id === suppliedFlower.flowerId);

// Current implementation shows:
// - flower.flowerName
// - flower.category
// - "Connect to flower details →" link (placeholder)

// TODO: Implement navigation:
// onClick={() => navigate(`/flowers#${flower.flowerId}`)}
// or
// onClick={() => navigate(`/flowers/${flower.flowerId}`)}
```

**Recommendations**:
1. Store `flowerId` as a direct reference to `Flower.id`
2. When fetching supplier data from backend, populate `suppliedFlowers` by joining with Flower table
3. Add a link in the Supplied Flowers section to navigate to the Flowers page
4. Alternatively, show a preview/tooltip of the flower details

### 📊 Backend API Integration

When connecting to your backend, implement these endpoints:

```typescript
// In src/app/lib/api.ts

// Get all suppliers (with pagination and search)
export async function getSuppliers(
  page: number = 1,
  pageSize: number = 10,
  search: string = "",
  status?: "Active" | "Inactive"
): Promise<{ items: Supplier[]; page: number; hasNextPage: boolean }> {
  // Call your backend API
  // GET /api/suppliers?page=page&pageSize=pageSize&search=search&status=status
}

// Get single supplier with purchase history
export async function getSupplier(supplierId: string): Promise<Supplier> {
  // GET /api/suppliers/{supplierId}
}

// Create supplier
export async function createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  // POST /api/suppliers
}

// Update supplier
export async function updateSupplier(supplierId: string, updates: Partial<Supplier>): Promise<Supplier> {
  // PATCH /api/suppliers/{supplierId}
}

// Delete supplier
export async function deleteSupplier(supplierId: string): Promise<void> {
  // DELETE /api/suppliers/{supplierId}
}

// Record purchase
export async function recordPurchase(
  supplierId: string,
  purchase: Omit<PurchaseHistory, 'id'>
): Promise<PurchaseHistory> {
  // POST /api/suppliers/{supplierId}/purchases
}
```

### 🔄 State Management Integration

Connect to your existing `useShopData()` hook:

```typescript
// In src/app/lib/shop-data.tsx

// Add to ShopData context:
export interface ShopData {
  // ... existing fields ...
  suppliers: Supplier[];
  suppliersLoading: boolean;
  suppliersError: string | null;
  createSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>;
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  recordPurchase: (supplierId: string, purchase: Omit<PurchaseHistory, 'id'>) => Promise<PurchaseHistory>;
}
```

## Design System Compliance

The Suppliers page follows your existing design system:

### Colors & Styling
- **Active Status**: `--c-accent-green-light` background, `--c-accent-green` text
- **Inactive Status**: Gray (#F0F0F0 background, #666666 text)
- **Borders**: `var(--c-border)` color with consistent 1px width
- **Typography**: 
  - Serif font for titles/company names: `var(--f-serif)`
  - Sans font for labels/UI: `var(--f-sans)`
- **Spacing**: Uses CSS variables (`var(--s-2)` through `var(--s-6)`)

### Components Matching
- **Table layout**: Same structure as Orders page with header, rows, borders
- **Buttons**: Black background for primary actions, bordered for secondary
- **Input fields**: Bordered, consistent padding (8px 12px)
- **Badges**: Inline-flex with 4px 8px padding, uppercase text

## Usage Examples

### Basic Usage
```typescript
import { Suppliers } from "./pages/Suppliers";

// In your routes configuration (already done in routes.tsx)
{ path: "suppliers", Component: Suppliers }
```

### Accessing Current Data
```typescript
// In Suppliers.tsx
const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);

// Add suppliers from context when integrated:
const { suppliers, suppliersLoading } = useShopData();
```

### Adding a New Supplier
```typescript
const handleAddSupplier = async (newSupplier: Omit<Supplier, 'id' | 'createdAt'>) => {
  try {
    const created = await createSupplier(newSupplier);
    setSuppliers([...suppliers, created]);
    setIsAddingSupplier(false);
  } catch (error) {
    console.error("Failed to add supplier:", error);
  }
};
```

### Recording a Purchase
```typescript
const handleRecordPurchase = async (
  supplierId: string,
  purchase: Omit<PurchaseHistory, 'id'>
) => {
  try {
    const recorded = await recordPurchase(supplierId, purchase);
    // Update supplier's purchaseHistory
    setSuppliers(current => 
      current.map(s => 
        s.id === supplierId 
          ? { ...s, purchaseHistory: [...s.purchaseHistory, recorded] }
          : s
      )
    );
  } catch (error) {
    console.error("Failed to record purchase:", error);
  }
};
```

## Extensibility

### Future Enhancements

1. **Supplier Categories**: Add supplier types (local, import, wholesale, etc.)
2. **Payment Terms**: Add payment terms (net-30, net-60, COD, etc.)
3. **Quality Ratings**: Track supplier reliability and quality scores
4. **Bulk Operations**: Select multiple suppliers for batch actions
5. **Purchase Analytics**: Charts showing purchase trends by supplier
6. **Automatic Reordering**: Trigger purchase orders when stock is low
7. **Supplier Performance**: Calculate metrics (on-time delivery %, price trends)
8. **Document Management**: Attach contracts, invoices, certifications

### Adding Custom Fields

To extend the `Supplier` interface:

```typescript
// Custom field example
interface Supplier extends SupplierBase {
  paymentTerms?: string;           // e.g., "Net-30"
  averageDeliveryDays?: number;
  qualityRating?: number;          // 1-5 stars
  totalPurchaseAmount?: number;
  lastPurchaseDate?: string;
  tags?: string[];                 // For categorization
}

// Update the SupplierDetailsPanel to show/edit these fields
// Add corresponding table columns if needed
```

## Troubleshooting

### Issue: Supplier links to flowers don't work

**Solution**: The `flowerId` field needs to be fully populated when fetching supplier data from your database. Implement a JOIN query:

```sql
SELECT 
    s.*,
    json_agg(json_build_object(
        'flowerId', f.id,
        'flowerName', f.name,
        'category', f.category
    )) as suppliedFlowers
FROM suppliers s
LEFT JOIN supplier_flowers sf ON s.id = sf.supplier_id
LEFT JOIN flowers f ON sf.flower_id = f.id
GROUP BY s.id;
```

### Issue: Purchase history not showing

**Solution**: Ensure `PurchaseHistory` records are:
1. Properly formatted with ISO dates
2. Include all required fields (flowerId, quantity, unitPrice, etc.)
3. Joined from a `supplier_purchases` or similar table

### Issue: Styles don't match the rest of the app

**Solution**: Check that CSS variables are defined in your `styles/theme.css`:
- `--c-basis-green-light`
- `--c-accent-green`
- `--c-border`
- `--c-text-primary`
- `--c-text-secondary`
- `--f-sans`
- `--f-serif`

## Mock Data Reference

The `MOCK_SUPPLIERS` array in `Suppliers.tsx` provides sample data with:
- 3 suppliers (2 active, 1 inactive)
- Various flower associations
- Purchase history examples
- Complete contact information

To use real data, replace with API calls or state management integration.

## Language & Localization

All labels use Traditional Chinese (香港用語):
- 供應商 (Suppliers)
- 啟用中 (Active)
- 停用 (Inactive)
- 供應的鮮花 (Supplied flowers)
- 採購紀錄 (Purchase history)
- 基本資訊 (Basic information)
- 編輯 (Edit)
- 保存 (Save)

To localize to another language, search for Chinese text in both component files and replace with appropriate translations.

## Performance Considerations

1. **Pagination**: Implement server-side pagination for large supplier lists
2. **Lazy Loading**: Load purchase history on-demand when panel opens
3. **Debounced Search**: Already implemented with 250ms delay
4. **Memoization**: Consider useMemo() for filtered suppliers if list is large (1000+)
5. **Virtual Scrolling**: For very large supplier lists (5000+), implement virtualization

## Support & Questions

For integration support, refer to:
- Orders.tsx - Similar table and detail panel patterns
- api.ts - Existing API call examples
- shop-data.tsx - State management patterns
- Flowers.tsx - Alternative UI patterns (card grid vs table)
