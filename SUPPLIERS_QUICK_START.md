# Suppliers Feature - Quick Start Guide

## What Was Created

✅ **Page Component** → `src/app/pages/Suppliers.tsx` (510 lines)
  - Full supplier listing with search & filter
  - Table layout matching Orders page design
  - Add Supplier button
  - Detail panel trigger

✅ **Detail Panel Component** → `src/app/components/SupplierDetailsPanel.tsx` (380 lines)
  - View/Edit supplier information
  - Supplied flowers list with integration points
  - Purchase history display
  - Status management
  - Save/Cancel functionality

✅ **Updated Routes** → `src/app/routes.tsx`
  - Added `/suppliers` route
  - Imported Suppliers component

✅ **Updated Navigation** → `src/app/components/Sidebar.tsx`
  - Added "供應商" menu item
  - Positioned between Flowers and Wrappings

✅ **Documentation** → `SUPPLIERS_IMPLEMENTATION.md`
  - Complete integration guide
  - API endpoint specifications
  - Data model reference
  - Extensibility patterns

## Key Features

| Feature | Details |
|---------|---------|
| **Search** | By company name, contact person, or phone |
| **Filter** | By status (All, Active, Inactive) |
| **Table** | Company info, contact, phone, flowers, status |
| **Detail Panel** | Editable supplier information |
| **Purchase History** | Track purchases with date, flower, qty, price |
| **Flower Links** | References existing flowers via flowerId |
| **UI Language** | Traditional Chinese (香港) |

## Integration Checklist

### ❌ Still TODO:

- [ ] **Connect to Backend API** - Replace mock data with API calls
- [ ] **Link Supplied Flowers** - Add navigation from supplier → flower details
- [ ] **Implement Add Modal** - Currently shows placeholder
- [ ] **Add Delete Functionality** - For suppliers and purchases
- [ ] **Connect useShopData() Hook** - Integrate with state management
- [ ] **Add Validations** - Email, phone number format checking
- [ ] **Implement Pagination** - For large supplier lists
- [ ] **Add Toast Notifications** - Success/error feedback

### 🟢 Already Ready:

- ✅ Full UI/UX matching existing system
- ✅ Type-safe interfaces
- ✅ Mock data for testing
- ✅ Responsive detail panel
- ✅ Edit/Save functionality
- ✅ Status management (Active/Inactive)
- ✅ Purchase history display
- ✅ Search & filter logic

## How to Use Now

### View the Suppliers Page
```
1. Start your app (./start.sh)
2. Navigate to http://127.0.0.1:8000
3. Click "供應商" in the sidebar
4. See mock suppliers (3 samples)
```

### Test the Features
- **Search**: Type in search box to filter by company name
- **Filter**: Select "啟用中" or "停用" to filter by status
- **View Details**: Click "詳情" button to open the detail panel
- **Edit Supplier**: Click "編輯" button in the panel, modify fields, click "保存"
- **Close Panel**: Click "關閉" button or the X icon

### Supplied Flowers Section
Currently shows:
- Flower name
- Category
- Placeholder link "連結到花卉詳情 →"

To implement flower navigation:
```typescript
// In SupplierDetailsPanel.tsx, add onClick to the "連結到花卉詳情" link:
onClick={() => navigate(`/flowers#${flower.flowerId}`)}

// Or show a flower preview/tooltip on hover
```

## Data Structure (Quick Reference)

```typescript
// Minimum supplier record
{
  id: "supplier-001",
  companyName: "Company Name",
  address: "123 Main Street",
  contactPerson: "Name Person",
  phone: "+852-2234-5678",
  email: "contact@example.com",
  suppliedFlowers: [
    { flowerId: "flower-001", flowerName: "Rose", category: "Rose" }
  ],
  status: "Active",
  statusLabel: "啟用中",
  notes: "Any notes here",
  purchaseHistory: [
    {
      id: "purchase-001",
      date: "2026-04-18",
      dateLabel: "2026年4月18日",
      flowerId: "flower-001",
      flowerName: "Rose",
      quantity: 100,
      unitPrice: 8.5,
      unitPriceDisplay: "$8.50",
      lineTotal: 850,
      lineTotalDisplay: "$850.00"
    }
  ],
  createdAt: "2025-01-10"
}
```

## Next Steps (Implementation Order)

### Phase 1: Basic Backend Integration (Easy)
1. Create backend endpoints (GET /suppliers, GET /suppliers/:id)
2. Replace MOCK_SUPPLIERS with API calls
3. Connect to existing Flowers data

### Phase 2: Full CRUD (Medium)
1. Implement POST /suppliers (create)
2. Implement PATCH /suppliers/:id (update)
3. Implement DELETE /suppliers/:id
4. Add form validation

### Phase 3: Purchase Tracking (Medium)
1. Implement POST /suppliers/:id/purchases
2. Display purchase history from DB
3. Add purchase date formatting

### Phase 4: Advanced Features (Hard)
1. Supplier performance analytics
2. Price trend tracking
3. Bulk purchase orders
4. Automated reordering logic

## File Locations for Reference

```
ShopSystem/
├── src/app/
│   ├── pages/Suppliers.tsx              ← Main list page (510 lines)
│   ├── components/
│   │   └── SupplierDetailsPanel.tsx    ← Detail panel (380 lines)
│   ├── routes.tsx                       ← Updated with /suppliers
│   └── components/Sidebar.tsx           ← Updated navigation
├── SUPPLIERS_IMPLEMENTATION.md          ← Full integration guide
└── SUPPLIERS_QUICK_START.md            ← This file
```

## Design System Used

The Suppliers page matches your existing design through:

**Colors:**
- Active status: Green (--c-accent-green)
- Inactive status: Gray (#666666)
- Borders: --c-border
- Text: --c-text-primary / --c-text-secondary

**Typography:**
- Titles: var(--f-serif) - serif font
- UI: var(--f-sans) - sans font

**Components:**
- Table with standard header/row styling
- Primary button: Black background, white text
- Secondary button: Bordered, transparent fill

## Common Tasks

### Show a different status color
```typescript
// In Suppliers.tsx, modify statusStyles():
function statusStyles(status: string) {
  if (status === "Active") return { backgroundColor: "green", color: "darkgreen" };
  if (status === "Pending") return { backgroundColor: "orange", color: "darkorange" };
  return { backgroundColor: "gray", color: "darkgray" };
}
```

### Change table column headers
```typescript
// In Suppliers.tsx table header:
{["公司名稱", "聯絡人", "電話", "供應的鮮花", "狀態", "操作"].map(...)}
// Just modify the strings in this array
```

### Add a new field to supplier details
```typescript
// 1. Add to Supplier interface in both files
interface Supplier {
  // ... existing fields
  paymentTerms?: string;  // NEW FIELD
}

// 2. Add input in SupplierDetailsPanel.tsx edit section
<input
  value={editedSupplier.paymentTerms}
  onChange={(e) => setEditedSupplier({
    ...editedSupplier,
    paymentTerms: e.target.value
  })}
/>
```

## Troubleshooting

**Q: Suppliers page shows but 404 error**
A: Check that routes.tsx has been updated with the Suppliers import and route

**Q: "SupplierDetailsPanel is not defined"  
A: Verify SupplierDetailsPanel.tsx exists in src/app/components/

**Q: Styles look different from rest of app**
A: Ensure you have the CSS variables defined in styles/theme.css

**Q: Mock data doesn't appear**
A: Check browser console for errors, verify no typos in component names

## Questions?

Refer to:
1. **Integration details** → SUPPLIERS_IMPLEMENTATION.md
2. **Similar patterns** → src/app/pages/Orders.tsx
3. **API examples** → src/app/lib/api.ts
4. **State management** → src/app/lib/shop-data.tsx
