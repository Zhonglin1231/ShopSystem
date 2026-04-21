import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SupplierDetailsPanel } from "../components/SupplierDetailsPanel";
import { AddSupplierModal } from "../components/AddSupplierModal";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================


interface PurchaseHistory {
  id: string;
  date: string;           // ISO date string
  dateLabel: string;      // Formatted display date
  flowerId: string;       // Reference to Flower.id
  flowerName: string;
  quantity: number;
  unitPrice: number;
  unitPriceDisplay: string;
  lineTotal: number;
  lineTotalDisplay: string;
}

interface Supplier {
  id: string;
  companyName: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  status: "Active" | "Inactive";      // Simple status for filtering
  statusLabel: string;
  notes: string;
  purchaseHistory: PurchaseHistory[];
  createdAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "supplier-001",
    companyName: "青葉花卉有限公司",
    address: "香港九龍長沙灣道 123 號",
    contactPerson: "李先生",
    phone: "+852-2234-5678",
    email: "contact@aoyeflowers.hk",
    status: "Active",
    statusLabel: "啟用中",
    notes: "主要供應商，質量穩定，交貨準時。",
    purchaseHistory: [
      {
        id: "purchase-001",
        date: "2026-04-18",
        dateLabel: "2026年4月18日",
        flowerId: "flower-001",
        flowerName: "玫瑰",
        quantity: 100,
        unitPrice: 8.5,
        unitPriceDisplay: "$8.50",
        lineTotal: 850,
        lineTotalDisplay: "$850.00",
      },
      {
        id: "purchase-002",
        date: "2026-04-15",
        dateLabel: "2026年4月15日",
        flowerId: "flower-002",
        flowerName: "向日葵",
        quantity: 50,
        unitPrice: 6.0,
        unitPriceDisplay: "$6.00",
        lineTotal: 300,
        lineTotalDisplay: "$300.00",
      },
    ],
    createdAt: "2025-01-10",
  },
  {
    id: "supplier-002",
    companyName: "花季進出口有限公司",
    address: "香港灣仔軒尼詩道 456 號",
    contactPerson: "王女士",
    phone: "+852-2527-1234",
    email: "sales@huajijimport.hk",
    status: "Active",
    statusLabel: "啟用中",
    notes: "進口鮮花專家，提供高質素花卉。",
    purchaseHistory: [
      {
        id: "purchase-003",
        date: "2026-04-10",
        dateLabel: "2026年4月10日",
        flowerId: "flower-004",
        flowerName: "蘭花",
        quantity: 30,
        unitPrice: 12.0,
        unitPriceDisplay: "$12.00",
        lineTotal: 360,
        lineTotalDisplay: "$360.00",
      },
    ],
    createdAt: "2025-02-15",
  },
  {
    id: "supplier-003",
    companyName: "綠薇花藝中心",
    address: "香港沙田新城市廣場 789 號",
    contactPerson: "陳先生",
    phone: "+852-2692-8888",
    email: "admin@lvweifloralart.hk",
    status: "Inactive",
    statusLabel: "停用",
    notes: "暫停合作，尋找其他供應商。",
    purchaseHistory: [],
    createdAt: "2024-06-20",
  },
];

// Helper function to format dates (integrate with your existing format.ts if available)
function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function statusStyles(status: string) {
  if (status === "Active") {
    return {
      backgroundColor: "var(--c-accent-green-light)",
      color: "var(--c-accent-green)",
    };
  }
  return {
    backgroundColor: "#F0F0F0",
    color: "#666666",
  };
}

// ============================================================================
// LOCAL STORAGE UTILITIES
// ============================================================================

const SUPPLIERS_STORAGE_KEY = "shop-system-suppliers";

// Load suppliers from localStorage
function loadSuppliersFromStorage(): Supplier[] {
  try {
    const stored = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that it's an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load suppliers from localStorage:", error);
  }
  // Return mock data if nothing in storage or error
  return MOCK_SUPPLIERS;
}

// Save suppliers to localStorage
function saveSuppliersToStorage(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
  } catch (error) {
    console.error("Failed to save suppliers to localStorage:", error);
    toast.error("無法保存供應商數據到本地存儲");
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Suppliers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Load suppliers from localStorage on component mount
  useEffect(() => {
    const storedSuppliers = loadSuppliersFromStorage();
    setSuppliers(storedSuppliers);
  }, []);

  // Save suppliers to localStorage whenever suppliers change
  useEffect(() => {
    if (suppliers.length > 0) {
      saveSuppliersToStorage(suppliers);
    }
  }, [suppliers]);

  // Filter suppliers based on search and status
  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      supplier.companyName.toLowerCase().includes(query) ||
      supplier.contactPerson.toLowerCase().includes(query) ||
      supplier.phone.includes(query);

    const matchesStatus = statusFilter === "All" || supplier.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) ?? null;

  const statusFilterOptions = [
    { value: "All", label: "全部" },
    { value: "Active", label: "啟用中" },
    { value: "Inactive", label: "停用" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--s-4)",
        height: "100%",
      }}
    >
      {/* Main Table/List Section */}
      <div style={{ flex: 1 }}>
        <div
          className="border"
          style={{
            backgroundColor: "var(--c-bg-card)",
            borderColor: "var(--c-border)",
            padding: "var(--s-4)",
          }}
        >
          {/* Header with Search and Add Button */}
          <div
            className="flex border-b"
            style={{
              gap: "var(--s-3)",
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-4)",
              borderColor: "var(--c-border)",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜尋供應商名稱或聯絡人…"
              className="flex-1 border"
              style={{
                padding: "8px 12px",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
              }}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border"
              style={{
                padding: "0 var(--s-3)",
                height: "32px",
                backgroundColor: "transparent",
                borderColor: "var(--c-border)",
                color: "var(--c-text-primary)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsAddingSupplier(true)}
              style={{
                padding: "0 var(--s-4)",
                height: "40px",
                backgroundColor: "var(--c-accent-black)",
                color: "white",
                fontFamily: "var(--f-sans)",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
              }}
            >
              新增供應商
            </button>
          </div>

          {/* Suppliers Table */}
          <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                {["公司名稱", "聯絡人", "電話", "狀態", "操作"].map((header) => (
                  <th
                    key={header}
                    className="text-left"
                    style={{
                      padding: "var(--s-2) var(--s-3)",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--c-text-secondary)",
                      borderBottom: "2px solid var(--c-border)",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "var(--s-4)",
                      color: "var(--c-text-secondary)",
                      textAlign: "center",
                    }}
                  >
                    沒有符合目前篩選條件的供應商。
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier, index) => {
                  const badgeStyle = statusStyles(supplier.status);

                  return (
                    <tr key={supplier.id}>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom:
                            index === filteredSuppliers.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                          fontFamily: "var(--f-serif)",
                        }}
                      >
                        <div>{supplier.companyName}</div>
                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "0.75rem",
                            color: "var(--c-text-secondary)",
                          }}
                        >
                          {supplier.address}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom:
                            index === filteredSuppliers.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        <div>{supplier.contactPerson}</div>
                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "0.8rem",
                            color: "var(--c-text-secondary)",
                          }}
                        >
                          {supplier.email}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom:
                            index === filteredSuppliers.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        {supplier.phone}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom:
                            index === filteredSuppliers.length - 1 ? "none" : "1px solid var(--c-border)",
                        }}
                      >
                        <span
                          className="inline-flex items-center"
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            ...badgeStyle,
                          }}
                        >
                          {supplier.statusLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom:
                            index === filteredSuppliers.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        <button
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          className="border"
                          style={{
                            padding: "0 var(--s-3)",
                            height: "32px",
                            backgroundColor: "transparent",
                            borderColor: "var(--c-border)",
                            color: "var(--c-text-primary)",
                            fontFamily: "var(--f-sans)",
                            fontSize: "0.7rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          詳情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel (Right Sidebar) */}
      {selectedSupplier && (
        <SupplierDetailsPanel
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplierId(null)}
          onUpdate={(updatedSupplier) => {
            setSuppliers((current) =>
              current.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s))
            );
          }}
        />
      )}

      {/* Add Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddingSupplier}
        onClose={() => setIsAddingSupplier(false)}
        onAddSupplier={async (newSupplierData) => {
          try {
            // Create new supplier with mock ID and createdAt
            const newSupplier: Supplier = {
              id: `supplier-${Date.now()}`,
              ...newSupplierData,
              statusLabel: newSupplierData.status === "Active" ? "啟用中" : "停用",
              purchaseHistory: [],
              createdAt: new Date().toISOString(),
            };
            
            setSuppliers((current) => [newSupplier, ...current]);
            toast.success("已成功新增供應商");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "無法新增供應商");
            throw error;
          }
        }}
      />
    </div>
  );
}
