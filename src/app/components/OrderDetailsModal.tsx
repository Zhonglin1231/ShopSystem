import { useState } from "react";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Phone,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Order } from "../lib/api";

interface OrderDetailsModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus?: (status: string) => Promise<unknown>;
}

const timelineSteps = [
  { key: "received", label: "Order Received", icon: Clock },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "ready", label: "Ready for Pickup", icon: CheckCircle },
  { key: "delivered", label: "Delivered", icon: Truck },
];

function statusStyles(statusClass: string) {
  if (statusClass === "success") {
    return { bg: "var(--c-accent-green-light)", color: "var(--c-accent-green)" };
  }

  if (statusClass === "low") {
    return { bg: "#FFF0F0", color: "#C53030" };
  }

  return { bg: "#FFF4E5", color: "#B7791F" };
}

export function OrderDetailsModal({ isOpen, order, onClose, onUpdateStatus }: OrderDetailsModalProps) {
  const [saving, setSaving] = useState(false);

  if (!isOpen || !order) {
    return null;
  }

  const statusIndex =
    order.status === "Delivered" ? 3 : order.status === "Ready" ? 2 : order.status === "Preparing" ? 1 : 0;
  const badgeStyle = statusStyles(order.statusClass);
  const nextStatus = order.status === "Preparing" ? "Ready" : order.status === "Ready" ? "Delivered" : null;

  const handleStatusChange = async (status: string) => {
    if (!onUpdateStatus) {
      return;
    }

    setSaving(true);
    try {
      await onUpdateStatus(status);
      toast.success(`Order ${order.id} updated to ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(10,10,10,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "min(720px, 95vw)",
          maxHeight: "92vh",
          backgroundColor: "var(--c-bg-card)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="flex items-start justify-between border-b flex-shrink-0"
          style={{
            padding: "var(--s-4) var(--s-5)",
            borderColor: "var(--c-border)",
            backgroundColor: "var(--c-bg-sidebar)",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "var(--f-sans)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--c-text-secondary)",
                marginBottom: "2px",
              }}
            >
              Order Details
            </p>
            <div className="flex items-center" style={{ gap: "var(--s-3)" }}>
              <h2
                style={{
                  fontFamily: "var(--f-serif)",
                  fontSize: "1.5rem",
                  color: "var(--c-text-primary)",
                }}
              >
                {order.id}
              </h2>
              <span
                style={{
                  padding: "4px 10px",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.color,
                  fontFamily: "var(--f-sans)",
                }}
              >
                {order.status}
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--f-sans)",
                fontSize: "0.8rem",
                color: "var(--c-text-secondary)",
                marginTop: "2px",
              }}
            >
              Placed {order.dateLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-all"
            style={{
              width: "36px",
              height: "36px",
              backgroundColor: "transparent",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1" style={{ padding: "var(--s-5)" }}>
          {order.status === "Cancelled" && (
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
              This order was cancelled and its reserved stock has been returned to inventory.
            </div>
          )}

          <div
            className="border"
            style={{
              padding: "var(--s-4)",
              marginBottom: "var(--s-4)",
              backgroundColor: "var(--c-bg-app)",
              borderColor: "var(--c-border)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--f-sans)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--c-text-secondary)",
                marginBottom: "var(--s-3)",
              }}
            >
              Fulfillment Status
            </p>
            <div className="flex items-center" style={{ gap: 0 }}>
              {timelineSteps.map((step, index) => {
                const Icon = step.icon;
                const isDone = index <= statusIndex;
                const isActive = index === statusIndex;

                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center" style={{ gap: "6px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isActive
                            ? "var(--c-accent-black)"
                            : isDone
                              ? "var(--c-accent-green)"
                              : "var(--c-bg-card)",
                          border: `2px solid ${
                            isDone
                              ? isActive
                                ? "var(--c-accent-black)"
                                : "var(--c-accent-green)"
                              : "var(--c-border)"
                          }`,
                        }}
                      >
                        <Icon size={15} color={isDone ? "white" : "var(--c-text-secondary)"} />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--f-sans)",
                          fontSize: "0.68rem",
                          textAlign: "center",
                          color: isDone ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: "2px",
                          marginBottom: "20px",
                          backgroundColor: index < statusIndex ? "var(--c-accent-green)" : "var(--c-border)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-4)" }}>
            <div
              className="border"
              style={{
                padding: "var(--s-4)",
                borderColor: "var(--c-border)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--c-text-secondary)",
                  marginBottom: "var(--s-3)",
                }}
              >
                Customer
              </p>
              <p
                style={{
                  fontFamily: "var(--f-serif)",
                  fontSize: "1.1rem",
                  color: "var(--c-text-primary)",
                  marginBottom: "var(--s-2)",
                }}
              >
                {order.customerName}
              </p>
              <div className="flex flex-col" style={{ gap: "var(--s-2)" }}>
                <div className="flex items-center" style={{ gap: "8px" }}>
                  <Phone size={13} color="var(--c-text-secondary)" />
                  <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.85rem", color: "var(--c-text-secondary)" }}>
                    {order.phone || "No phone provided"}
                  </span>
                </div>
                <div className="flex items-start" style={{ gap: "8px" }}>
                  <MapPin size={13} color="var(--c-text-secondary)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.85rem", color: "var(--c-text-secondary)" }}>
                    {order.deliveryAddress || "Pickup in store"}
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: "8px" }}>
                  <CalendarDays size={13} color="var(--c-text-secondary)" />
                  <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.85rem", color: "var(--c-text-secondary)" }}>
                    {order.deliveryDateLabel}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="border"
              style={{
                padding: "var(--s-4)",
                borderColor: "var(--c-border)",
                backgroundColor: "var(--c-bg-app)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--c-text-secondary)",
                  marginBottom: "var(--s-3)",
                }}
              >
                Special Notes
              </p>
              <p
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.88rem",
                  color: "var(--c-text-primary)",
                  lineHeight: "1.6",
                  fontStyle: order.notes ? "italic" : "normal",
                }}
              >
                {order.notes || "No special notes for this order."}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "var(--s-4)" }}>
            <p
              style={{
                fontFamily: "var(--f-sans)",
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--c-text-secondary)",
                marginBottom: "var(--s-3)",
              }}
            >
              Items Ordered
            </p>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Item", "Unit Price", "Qty", "Line Total"].map((heading) => (
                    <th
                      key={heading}
                      className="text-left"
                      style={{
                        padding: "var(--s-2) var(--s-3)",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--c-text-secondary)",
                        borderBottom: "2px solid var(--c-border)",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === order.lineItems.length - 1 ? "none" : "1px solid var(--c-border)",
                        fontFamily: "var(--f-serif)",
                        fontSize: "0.95rem",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {item.name}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === order.lineItems.length - 1 ? "none" : "1px solid var(--c-border)",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.9rem",
                        color: "var(--c-text-secondary)",
                      }}
                    >
                      {item.unitPriceDisplay} / {item.unit}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === order.lineItems.length - 1 ? "none" : "1px solid var(--c-border)",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.9rem",
                        color: "var(--c-text-secondary)",
                      }}
                    >
                      {item.qty}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === order.lineItems.length - 1 ? "none" : "1px solid var(--c-border)",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.9rem",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {item.lineTotalDisplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t" style={{ borderColor: "var(--c-border)", paddingTop: "var(--s-3)" }}>
              <div
                className="flex justify-between"
                style={{
                  marginBottom: "var(--s-2)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.85rem",
                  color: "var(--c-text-secondary)",
                }}
              >
                <span>Subtotal</span>
                <span>{order.subtotalDisplay}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div
                  className="flex justify-between"
                  style={{
                    marginBottom: "var(--s-2)",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.85rem",
                    color: "var(--c-text-secondary)",
                  }}
                >
                  <span>Delivery</span>
                  <span>{order.deliveryFeeDisplay}</span>
                </div>
              )}
              <div
                className="flex justify-between border-t"
                style={{
                  borderColor: "var(--c-border)",
                  paddingTop: "var(--s-2)",
                  fontFamily: "var(--f-serif)",
                  fontSize: "1.1rem",
                  color: "var(--c-text-primary)",
                }}
              >
                <span>Total</span>
                <span>{order.totalDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t flex-shrink-0"
          style={{
            padding: "var(--s-3) var(--s-5)",
            borderColor: "var(--c-border)",
            backgroundColor: "var(--c-bg-card)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0 var(--s-4)",
              height: "40px",
              backgroundColor: "transparent",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-secondary)",
              fontFamily: "var(--f-sans)",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <div className="flex" style={{ gap: "var(--s-2)" }}>
            {order.status !== "Delivered" && order.status !== "Cancelled" && (
              <>
                <button
                  disabled={saving}
                  onClick={() => void handleStatusChange("Cancelled")}
                  style={{
                    padding: "0 var(--s-4)",
                    height: "40px",
                    backgroundColor: "transparent",
                    border: "1px solid #D66D75",
                    color: "#D66D75",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.75rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  Cancel Order
                </button>
                {nextStatus && (
                  <button
                    disabled={saving}
                    onClick={() => void handleStatusChange(nextStatus)}
                    style={{
                      padding: "0 var(--s-4)",
                      height: "40px",
                      backgroundColor: "var(--c-accent-black)",
                      border: "none",
                      color: "white",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.75rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? "Saving..." : order.status === "Preparing" ? "Mark Ready" : "Mark Delivered"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
