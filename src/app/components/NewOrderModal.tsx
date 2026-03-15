import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "../lib/format";
import { useShopData } from "../lib/shop-data";

interface OrderDraftItem {
  id: number;
  flowerId: string;
  qty: number;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewOrderModal({ isOpen, onClose }: NewOrderModalProps) {
  const { flowers, createOrder, settings, offlineStatus } = useShopData();
  const availableFlowers = flowers.filter((flower) => flower.stock > 0);
  const defaultFlowerId = availableFlowers[0]?.id ?? "";

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<OrderDraftItem[]>([{ id: 1, flowerId: defaultFlowerId, qty: 1 }]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setItems((current) => {
      if (current.length === 0) {
        return defaultFlowerId ? [{ id: 1, flowerId: defaultFlowerId, qty: 1 }] : [];
      }

      return current.map((item, index) => ({
        ...item,
        flowerId: item.flowerId || defaultFlowerId || current[index]?.flowerId || "",
      }));
    });
  }, [defaultFlowerId, isOpen]);

  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setDeliveryDate("");
    setDeliveryAddress("");
    setNotes("");
    setItems(defaultFlowerId ? [{ id: 1, flowerId: defaultFlowerId, qty: 1 }] : []);
  };

  const addItem = () => {
    if (!defaultFlowerId) {
      toast.error("Add or restock flowers before creating an order.");
      return;
    }

    setItems((current) => [...current, { id: Date.now(), flowerId: defaultFlowerId, qty: 1 }]);
  };

  const removeItem = (id: number) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  };

  const updateItem = (id: number, field: keyof OrderDraftItem, value: string | number) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const resolvedItems = items
    .map((item) => {
      const flower = flowers.find((entry) => entry.id === item.flowerId);
      if (!flower) {
        return null;
      }

      return {
        ...item,
        flower,
        lineTotal: flower.price * item.qty,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const isPickup = deliveryAddress.trim().length === 0;
  const deliveryFee = isPickup ? 0 : 8;
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal + deliveryFee;

  if (!isOpen) {
    return null;
  }

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
          width: "min(780px, 95vw)",
          maxHeight: "92vh",
          backgroundColor: "var(--c-bg-card)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="flex items-center justify-between border-b flex-shrink-0"
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
              {settings.storeName}
            </p>
            <h2
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.5rem",
                color: "var(--c-text-primary)",
              }}
            >
              New Order
            </h2>
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
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1" style={{ padding: "var(--s-5)" }}>
          {!offlineStatus.isOnline && (
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
              Offline mode is active. New orders will be queued locally and synced when the network returns.
            </div>
          )}

          {availableFlowers.length === 0 && (
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
              No flowers are available. Add inventory first, then create an order.
            </div>
          )}

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-4)" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="e.g. Alice Chen"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  color: "var(--c-text-primary)",
                  outline: "none",
                  backgroundColor: "#FDFBFB",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Phone / Contact
              </label>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. +1 (555) 000-1234"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  color: "var(--c-text-primary)",
                  outline: "none",
                  backgroundColor: "#FDFBFB",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Delivery Date *
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  color: "var(--c-text-primary)",
                  outline: "none",
                  backgroundColor: "#FDFBFB",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Delivery Address
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
                placeholder="Leave blank for pickup in store"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  color: "var(--c-text-primary)",
                  outline: "none",
                  backgroundColor: "#FDFBFB",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: "var(--s-4)" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--s-3)" }}>
              <span
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-secondary)",
                }}
              >
                Order Items
              </span>
              <button
                onClick={addItem}
                className="flex items-center gap-1 transition-all"
                style={{
                  padding: "4px 12px",
                  backgroundColor: "var(--c-accent-green-light)",
                  border: "none",
                  color: "var(--c-accent-green)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} />
                Add Item
              </button>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "1fr 100px 100px 36px",
                gap: "var(--s-2)",
                marginBottom: "var(--s-2)",
              }}
            >
              {["Flower", "Qty", "Unit Price", ""].map((heading) => (
                <span
                  key={heading}
                  style={{
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--c-text-secondary)",
                  }}
                >
                  {heading}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
              {items.map((item) => {
                const flower = flowers.find((entry) => entry.id === item.flowerId) ?? availableFlowers[0];
                return (
                  <div
                    key={item.id}
                    className="grid items-center"
                    style={{
                      gridTemplateColumns: "1fr 100px 100px 36px",
                      gap: "var(--s-2)",
                    }}
                  >
                    <select
                      value={item.flowerId}
                      onChange={(event) => updateItem(item.id, "flowerId", event.target.value)}
                      className="border"
                      style={{
                        padding: "8px 10px",
                        borderColor: "var(--c-border)",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.85rem",
                        color: "var(--c-text-primary)",
                        backgroundColor: "#FDFBFB",
                        outline: "none",
                      }}
                    >
                      {availableFlowers.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.stock} left)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(event) => updateItem(item.id, "qty", Number(event.target.value))}
                      className="border"
                      style={{
                        padding: "8px 10px",
                        borderColor: "var(--c-border)",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.85rem",
                        color: "var(--c-text-primary)",
                        backgroundColor: "#FDFBFB",
                        outline: "none",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.9rem",
                        color: "var(--c-text-primary)",
                        padding: "8px 4px",
                      }}
                    >
                      {flower ? formatCurrency(flower.price, settings.currency) : "N/A"}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
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
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "var(--s-4)" }}>
            <label
              style={{
                display: "block",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--c-text-secondary)",
                marginBottom: "6px",
              }}
            >
              Special Notes
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Card message, wrapping preference, allergies..."
              rows={3}
              className="w-full border resize-none"
              style={{
                padding: "10px 12px",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.9rem",
                color: "var(--c-text-primary)",
                outline: "none",
                backgroundColor: "#FDFBFB",
              }}
            />
          </div>

          <div
            className="border"
            style={{
              marginTop: "var(--s-4)",
              padding: "var(--s-3) var(--s-4)",
              backgroundColor: "var(--c-bg-sidebar)",
              borderColor: "var(--c-border-pink)",
            }}
          >
            <div
              className="flex justify-between"
              style={{ marginBottom: "var(--s-2)", fontFamily: "var(--f-sans)", fontSize: "0.85rem", color: "var(--c-text-secondary)" }}
            >
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, settings.currency)}</span>
            </div>
            <div
              className="flex justify-between border-b"
              style={{
                paddingBottom: "var(--s-2)",
                marginBottom: "var(--s-2)",
                borderColor: "var(--c-border-pink)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.85rem",
                color: "var(--c-text-secondary)",
              }}
            >
              <span>{isPickup ? "Pickup" : "Delivery"}</span>
              <span>{formatCurrency(deliveryFee, settings.currency)}</span>
            </div>
            <div
              className="flex justify-between"
              style={{ fontFamily: "var(--f-serif)", fontSize: "1.15rem", color: "var(--c-text-primary)" }}
            >
              <span>Total</span>
              <span>{formatCurrency(total, settings.currency)}</span>
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
            Cancel
          </button>
          <button
            disabled={saving || availableFlowers.length === 0}
            onClick={async () => {
              if (!customerName.trim()) {
                toast.error("Please enter a customer name.");
                return;
              }
              if (!deliveryDate) {
                toast.error("Please choose a delivery date.");
                return;
              }
              if (resolvedItems.length === 0) {
                toast.error("Please add at least one item.");
                return;
              }

              setSaving(true);
              try {
                const createdOrder = await createOrder({
                  customerName: customerName.trim(),
                  phone: phone.trim(),
                  deliveryDate,
                  deliveryAddress: deliveryAddress.trim(),
                  notes: notes.trim(),
                  deliveryFee,
                  items: resolvedItems.map((item) => ({
                    flowerId: item.flower.id,
                    quantity: item.qty,
                  })),
                });
                toast.success(
                  createdOrder.offlineMeta?.localOnly
                    ? `Order queued locally for ${customerName.trim()}.`
                    : `Order placed for ${customerName.trim()}.`,
                );
                resetForm();
                onClose();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to place the order.");
              } finally {
                setSaving(false);
              }
            }}
            style={{
              padding: "0 var(--s-5)",
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
            {saving
              ? "Saving..."
              : `${offlineStatus.isOnline ? "Place Order" : "Queue Order"} - ${formatCurrency(total, settings.currency)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
