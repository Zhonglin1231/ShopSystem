import { Customer } from "./Customers";
import { Order } from "../lib/api";

interface CustomerDetailsPanelProps {
  customer: Customer;
  orders: Order[];
  onClose: () => void;
}

export function CustomerDetailsPanel({ customer, orders, onClose }: CustomerDetailsPanelProps) {
  return (
    <div
      style={{
        width: "400px",
        height: "100%",
        backgroundColor: "var(--c-bg-card)",
        borderLeft: "1px solid var(--c-border)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--s-4)",
          borderBottom: "1px solid var(--c-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: "1.25rem",
            color: "var(--c-text-primary)",
            margin: 0,
          }}
        >
          客戶詳情
        </h3>
        <button
          onClick={onClose}
          style={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            border: "1px solid var(--c-border)",
            color: "#D66D75",
            cursor: "pointer",
            borderRadius: "4px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Customer Info */}
      <div style={{ padding: "var(--s-4)", borderBottom: "1px solid var(--c-border)" }}>
        <div style={{ marginBottom: "var(--s-3)" }}>
          <h4
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: "1.1rem",
              color: "var(--c-text-primary)",
              margin: "0 0 var(--s-2) 0",
            }}
          >
            {customer.name}
          </h4>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "4px 8px",
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              backgroundColor: customer.status === "Active" ? "var(--c-accent-green-light)" : "#F0F0F0",
              color: customer.status === "Active" ? "var(--c-accent-green)" : "#666666",
            }}
          >
            {customer.statusLabel}
          </div>
        </div>

        <div style={{ display: "grid", gap: "var(--s-2)", fontSize: "0.9rem" }}>
          <div>
            <span style={{ color: "var(--c-text-secondary)", fontWeight: "bold" }}>電話：</span>
            <span style={{ color: "var(--c-text-primary)" }}>{customer.phone}</span>
          </div>
          <div>
            <span style={{ color: "var(--c-text-secondary)", fontWeight: "bold" }}>電郵：</span>
            <span style={{ color: "var(--c-text-primary)" }}>{customer.email}</span>
          </div>
          <div>
            <span style={{ color: "var(--c-text-secondary)", fontWeight: "bold" }}>地址：</span>
            <span style={{ color: "var(--c-text-primary)" }}>{customer.address}</span>
          </div>
          <div>
            <span style={{ color: "var(--c-text-secondary)", fontWeight: "bold" }}>總訂單數：</span>
            <span style={{ color: "var(--c-text-primary)" }}>{customer.totalOrders}</span>
          </div>
          <div>
            <span style={{ color: "var(--c-text-secondary)", fontWeight: "bold" }}>總消費：</span>
            <span style={{ color: "var(--c-text-primary)", fontFamily: "var(--f-mono)" }}>
              {customer.totalSpentDisplay}
            </span>
          </div>
          {customer.notes && (
            <div>
              <span style={{ color: "var(--c-text-secondary)", fontWeight: "bold" }}>備註：</span>
              <span style={{ color: "var(--c-text-primary)" }}>{customer.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "var(--s-4)",
            borderBottom: "1px solid var(--c-border)",
          }}
        >
          <h4
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: "1rem",
              color: "var(--c-text-primary)",
              margin: 0,
            }}
          >
            訂單歷史 ({orders.length})
          </h4>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "var(--s-4)" }}>
          {orders.length === 0 ? (
            <div
              style={{
                color: "var(--c-text-secondary)",
                textAlign: "center",
                padding: "var(--s-4)",
              }}
            >
              暫無訂單記錄
            </div>
          ) : (
            <div style={{ display: "grid", gap: "var(--s-3)" }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    padding: "var(--s-3)",
                    backgroundColor: "var(--c-bg-sidebar)",
                    border: "1px solid var(--c-border-pink)",
                    borderRadius: "4px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "var(--s-2)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--f-mono)",
                        fontSize: "0.8rem",
                        color: "var(--c-text-secondary)",
                      }}
                    >
                      {order.displayId}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 6px",
                        backgroundColor: order.statusClass === "success" ? "var(--c-accent-green-light)" : "#FFF4E5",
                        color: order.statusClass === "success" ? "var(--c-accent-green)" : "#B7791F",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--c-text-primary)",
                      marginBottom: "var(--s-1)",
                    }}
                  >
                    {order.itemsSummary}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ color: "var(--c-text-secondary)" }}>
                      {order.dateLabel}
                    </span>
                    <span
                      style={{
                        color: "var(--c-text-primary)",
                        fontFamily: "var(--f-mono)",
                        fontWeight: "bold",
                      }}
                    >
                      {order.totalDisplay}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}