import { useEffect, useState } from "react";
import { OrderDetailsModal } from "../components/OrderDetailsModal";
import { useShopData } from "../lib/shop-data";

function statusStyles(statusClass: string) {
  if (statusClass === "success") {
    return {
      backgroundColor: "var(--c-accent-green-light)",
      color: "var(--c-accent-green)",
    };
  }

  if (statusClass === "low") {
    return {
      backgroundColor: "#FFF0F0",
      color: "#C53030",
    };
  }

  return {
    backgroundColor: "#FFF4E5",
    color: "#B7791F",
  };
}

export function Orders() {
  const { orders, loading, error, updateOrderStatus, offlineStatus, clearNewOrderAlerts } = useShopData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    clearNewOrderAlerts();
  }, []);

  const filteredOrders = orders
    .filter((order) => {
      const query = search.trim().toLowerCase();
        const matchesQuery =
        query.length === 0 ||
        order.id.toLowerCase().includes(query) ||
        order.displayId.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      return matchesQuery && matchesStatus;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === "Newest" ? rightTime - leftTime : leftTime - rightTime;
    });

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  return (
    <>
      <div
        className="border"
        style={{
          backgroundColor: "var(--c-bg-card)",
          borderColor: "var(--c-border)",
          padding: "var(--s-4)",
        }}
      >
        {error && (
          <div
            className="border"
            style={{
              marginBottom: "var(--s-4)",
              padding: "var(--s-3)",
              borderColor: "#F2C5C5",
              backgroundColor: "#FFF7F7",
              color: "#A94442",
            }}
          >
            {error}
          </div>
        )}

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
            placeholder="Search orders by ID or customer..."
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
            {["All", "Queued", "Preparing", "Ready", "Delivered", "Cancelled"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
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
            <option>Newest</option>
            <option>Oldest</option>
          </select>
        </div>

        {loading && orders.length === 0 ? (
          <div style={{ padding: "var(--s-4)", color: "var(--c-text-secondary)" }}>Loading orders...</div>
        ) : (
          <>
            {offlineStatus.queueCount > 0 && (
              <div
                className="border"
                style={{
                  marginBottom: "var(--s-4)",
                  padding: "var(--s-3)",
                  borderColor: "#F6D9A7",
                  backgroundColor: "#FFF8E1",
                  color: "#8A5A00",
                }}
              >
                {offlineStatus.queueCount} queued offline order{offlineStatus.queueCount === 1 ? "" : "s"} pending sync.
              </div>
            )}

            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                {["Order ID", "Date", "Customer", "Items", "Total", "Status", "Actions"].map((header) => (
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "var(--s-4)",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    No orders match the current filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const badgeStyle = statusStyles(order.statusClass);
                  return (
                    <tr key={order.id}>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                          fontFamily: "var(--f-serif)",
                        }}
                      >
                        <div>{order.displayId}</div>
                        {order.offlineMeta?.localOnly && (
                          <div style={{ marginTop: "4px", fontSize: "0.72rem", color: "var(--c-text-secondary)" }}>
                            {order.offlineMeta.syncStatus === "failed" ? "Sync failed" : "Offline queue"}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        {order.dateLabel}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        {order.customerName}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        {order.itemsSummary}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        {order.totalDisplay}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
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
                          {order.status}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          borderBottom: index === filteredOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className={order.statusClass === "pending" ? "" : "border"}
                          style={{
                            padding: "0 var(--s-3)",
                            height: "32px",
                            backgroundColor: order.statusClass === "pending" ? "var(--c-accent-black)" : "transparent",
                            borderColor: order.statusClass === "pending" ? "transparent" : "var(--c-border)",
                            color: order.statusClass === "pending" ? "white" : "var(--c-text-primary)",
                            fontFamily: "var(--f-sans)",
                            fontSize: "0.7rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </>
        )}
      </div>

      <OrderDetailsModal
        isOpen={selectedOrder !== null}
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={(status) => (selectedOrder ? updateOrderStatus(selectedOrder.id, status) : Promise.reject(new Error("No order selected.")))}
      />
    </>
  );
}
