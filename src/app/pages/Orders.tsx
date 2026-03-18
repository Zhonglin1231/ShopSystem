import { useEffect, useState } from "react";
import { OrderDetailsModal } from "../components/OrderDetailsModal";
import { getOrders, Order, OrdersPage as OrdersPageData } from "../lib/api";
import { useShopData } from "../lib/shop-data";

const ORDERS_PAGE_SIZE = 10;

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
  const { orders, ordersPage, loading, error, updateOrderStatus, offlineStatus, clearNewOrderAlerts } = useShopData();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("Newest");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<Order[]>(orders);
  const [pageMeta, setPageMeta] = useState<OrdersPageData>(ordersPage);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    clearNewOrderAlerts();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (page === 1 && debouncedSearch.length === 0) {
      setPageData(orders);
      setPageMeta(ordersPage);
      setPageError(null);
      setPageLoading(false);
    }
  }, [orders, ordersPage, page, debouncedSearch]);

  useEffect(() => {
    if (page === 1 && debouncedSearch.length === 0) {
      return;
    }

    let cancelled = false;
    setPageLoading(true);
    setPageError(null);

    void getOrders(page, ORDERS_PAGE_SIZE, debouncedSearch)
      .then((response) => {
        if (cancelled) {
          return;
        }
        setPageData(response.items);
        setPageMeta(response);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }
        setPageError(requestError instanceof Error ? requestError.message : "Unable to load this page of orders.");
      })
      .finally(() => {
        if (!cancelled) {
          setPageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  const filteredOrders = pageData
    .filter((order) => {
      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      return matchesStatus;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === "Newest" ? rightTime - leftTime : leftTime - rightTime;
    });

  const selectedOrder = pageData.find((order) => order.id === selectedOrderId) ?? null;

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
        {(error || pageError) && (
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
            {pageError ?? error}
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

        {(loading || pageLoading) && pageData.length === 0 ? (
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

            <div
              className="flex items-center justify-between border-t"
              style={{
                marginTop: "var(--s-4)",
                paddingTop: "var(--s-4)",
                borderColor: "var(--c-border)",
              }}
            >
              <div style={{ color: "var(--c-text-secondary)", fontSize: "0.8rem" }}>
                Page {pageMeta.page}
              </div>
              <div className="flex items-center" style={{ gap: "var(--s-2)" }}>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pageMeta.hasPreviousPage || pageLoading}
                  className="border"
                  style={{
                    padding: "0 var(--s-3)",
                    height: "32px",
                    backgroundColor: "transparent",
                    borderColor: "var(--c-border)",
                    color: "var(--c-text-primary)",
                    opacity: !pageMeta.hasPreviousPage || pageLoading ? 0.5 : 1,
                    cursor: !pageMeta.hasPreviousPage || pageLoading ? "not-allowed" : "pointer",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pageMeta.hasNextPage || pageLoading}
                  className="border"
                  style={{
                    padding: "0 var(--s-3)",
                    height: "32px",
                    backgroundColor: "transparent",
                    borderColor: "var(--c-border)",
                    color: "var(--c-text-primary)",
                    opacity: !pageMeta.hasNextPage || pageLoading ? 0.5 : 1,
                    cursor: !pageMeta.hasNextPage || pageLoading ? "not-allowed" : "pointer",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <OrderDetailsModal
        isOpen={selectedOrder !== null}
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onUpdateStatus={async (status) => {
          if (!selectedOrder) {
            return Promise.reject(new Error("No order selected."));
          }

          const updatedOrder = await updateOrderStatus(selectedOrder.id, status);
          setPageData((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
          return updatedOrder;
        }}
      />
    </>
  );
}
