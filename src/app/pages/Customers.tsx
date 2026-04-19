import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useShopData } from "../lib/shop-data";
import { CustomerDetailsPanel } from "../components/CustomerDetailsPanel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: "Active" | "Inactive";
  statusLabel: string;
  notes: string;
  totalOrders: number;
  totalSpent: number;
  totalSpentDisplay: string;
  createdAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "customer-001",
    name: "張小明",
    phone: "+852-9123-4567",
    email: "zhang@example.com",
    address: "香港中環德輔道中 123 號",
    status: "Active",
    statusLabel: "活躍",
    notes: "喜歡玫瑰花束",
    totalOrders: 15,
    totalSpent: 2500,
    totalSpentDisplay: "$2,500.00",
    createdAt: "2025-01-15",
  },
  {
    id: "customer-002",
    name: "李小姐",
    phone: "+852-9876-5432",
    email: "li@example.com",
    address: "香港銅鑼灣軒尼詩道 456 號",
    status: "Active",
    statusLabel: "活躍",
    notes: "經常訂購婚禮花束",
    totalOrders: 8,
    totalSpent: 1800,
    totalSpentDisplay: "$1,800.00",
    createdAt: "2025-03-20",
  },
  {
    id: "customer-003",
    name: "王先生",
    phone: "+852-5555-1234",
    email: "wang@example.com",
    address: "香港九龍旺角彌敦道 789 號",
    status: "Inactive",
    statusLabel: "不活躍",
    notes: "已一年未下單",
    totalOrders: 3,
    totalSpent: 450,
    totalSpentDisplay: "$450.00",
    createdAt: "2024-08-10",
  },
];

// ============================================================================
// LOCAL STORAGE UTILITIES
// ============================================================================

const CUSTOMERS_STORAGE_KEY = "shop-system-customers";

function loadCustomersFromStorage(): Customer[] {
  try {
    const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load customers from localStorage:", error);
  }
  return MOCK_CUSTOMERS;
}

function saveCustomersToStorage(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  } catch (error) {
    console.error("Failed to save customers to localStorage:", error);
    toast.error("無法保存客戶數據到本地存儲");
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Customers() {
  const { customers: sharedCustomers, orders } = useShopData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const storedCustomers = loadCustomersFromStorage();
    setCustomers(storedCustomers);

    // Check if we should open a specific customer's details
    const selectedCustomerName = sessionStorage.getItem("selectedCustomerName");
    if (selectedCustomerName) {
      sessionStorage.removeItem("selectedCustomerName");
      const customer = storedCustomers.find(c => c.name === selectedCustomerName);
      if (customer) {
        setSelectedCustomerId(customer.id);
      }
    }
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      saveCustomersToStorage(customers);
    }
  }, [customers]);

  const filteredCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.email.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "All" || customer.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusFilterOptions = [
    { value: "All", label: "全部" },
    { value: "Active", label: "活躍" },
    { value: "Inactive", label: "不活躍" },
  ];

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

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;

  // Get customer's orders
  const customerOrders = orders.filter((order) => order.customerName === selectedCustomer?.name);

  return (
    <div
      style={{
        display: "flex",
        gap: "var(--s-4)",
        height: "100%",
      }}
    >
      <div
        style={{
          flex: 1,
          padding: "var(--s-4)",
          height: "100%",
          overflow: "auto",
        }}
      >
      {/* Header */}
      <div
        style={{
          marginBottom: "var(--s-4)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "var(--c-text-primary)",
            marginBottom: "var(--s-2)",
          }}
        >
          客戶管理
        </h1>
        <p
          style={{
            fontFamily: "var(--f-sans)",
            fontSize: "0.875rem",
            color: "var(--c-text-secondary)",
          }}
        >
          查看和管理您的客戶信息
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "var(--s-3)",
          marginBottom: "var(--s-4)",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="搜索客戶姓名、電話或電郵..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "0 var(--s-3)",
            height: "40px",
            border: "1px solid var(--c-border)",
            borderRadius: "4px",
            fontFamily: "var(--f-sans)",
            fontSize: "0.875rem",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0 var(--s-3)",
            height: "40px",
            border: "1px solid var(--c-border)",
            borderRadius: "4px",
            fontFamily: "var(--f-sans)",
            fontSize: "0.875rem",
            backgroundColor: "white",
          }}
        >
          {statusFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Table */}
      <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr>
            {["姓名", "聯絡方式", "地址", "狀態", "訂單數量", "總消費", "操作"].map((header) => (
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
          {filteredCustomers.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                style={{
                  padding: "var(--s-4)",
                  color: "var(--c-text-secondary)",
                  textAlign: "center",
                }}
              >
                沒有符合目前篩選條件的客戶。
              </td>
            </tr>
          ) : (
            filteredCustomers.map((customer, index) => {
              const badgeStyle = statusStyles(customer.status);

              return (
                <tr key={customer.id}>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                      fontFamily: "var(--f-serif)",
                    }}
                  >
                    <div>{customer.name}</div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "0.75rem",
                        color: "var(--c-text-secondary)",
                      }}
                    >
                      {customer.notes}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    <div>{customer.phone}</div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "0.8rem",
                        color: "var(--c-text-secondary)",
                      }}
                    >
                      {customer.email}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {customer.address}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
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
                      {customer.statusLabel}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                      textAlign: "center",
                    }}
                  >
                    {customer.totalOrders}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                      fontFamily: "var(--f-mono)",
                    }}
                  >
                    {customer.totalSpentDisplay}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom:
                        index === filteredCustomers.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    <button
                      onClick={() => setSelectedCustomerId(customer.id)}
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

    {/* Customer Details Panel */}
    {selectedCustomer && (
      <CustomerDetailsPanel
        customer={selectedCustomer}
        orders={customerOrders}
        onClose={() => setSelectedCustomerId(null)}
      />
    )}
  </div>
  );
}