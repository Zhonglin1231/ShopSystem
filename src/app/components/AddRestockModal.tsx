import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { InventoryItem } from "../lib/api";

interface AddRestockModalProps {
  isOpen: boolean;
  inventory: InventoryItem[];
  onClose: () => void;
  onAddRestock: (record: { itemCode: string; quantity: number; unitCost: number }) => Promise<void> | void;
}

export function AddRestockModal({ isOpen, inventory, onClose, onAddRestock }: AddRestockModalProps) {
  const [selectedCode, setSelectedCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedCode(inventory[0]?.code ?? "");
    }
  }, [inventory, isOpen]);

  if (!isOpen) {
    return null;
  }

  const selectedItem = inventory.find((item) => item.code === selectedCode);
  const totalCost = (parseInt(quantity || "0", 10) * parseFloat(unitCost || "0")).toFixed(2);

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
          width: "min(480px, 95vw)",
          backgroundColor: "var(--c-bg-card)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="flex items-center justify-between border-b"
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
              庫存
            </p>
            <h2
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.5rem",
                color: "var(--c-text-primary)",
              }}
            >
              記錄補貨
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
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

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const parsedQuantity = parseInt(quantity, 10);
            const parsedUnitCost = parseFloat(unitCost);

            if (!selectedCode || Number.isNaN(parsedQuantity) || Number.isNaN(parsedUnitCost) || parsedQuantity <= 0 || parsedUnitCost < 0) {
              toast.error("請完整填寫補貨表單。");
              return;
            }

            setSaving(true);
            try {
              await onAddRestock({
                itemCode: selectedCode,
                quantity: parsedQuantity,
                unitCost: parsedUnitCost,
              });
              setQuantity("");
              setUnitCost("");
              onClose();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "無法記錄補貨資料。");
            } finally {
              setSaving(false);
            }
          }}
          className="flex flex-col"
          style={{ padding: "var(--s-5)", gap: "var(--s-4)" }}
        >
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
              選擇項目 *
            </label>
            <select
              value={selectedCode}
              onChange={(event) => setSelectedCode(event.target.value)}
              className="w-full border"
              style={{
                padding: "10px 12px",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.9rem",
                color: "var(--c-text-primary)",
                backgroundColor: "#FDFBFB",
                outline: "none",
              }}
            >
              {inventory.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.name}（目前：{item.stock}）
                </option>
              ))}
            </select>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
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
                新增數量 *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="例如：50"
                className="w-full border"
                required
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
                單位成本（USD）*
              </label>
              <div className="flex border" style={{ borderColor: "var(--c-border)" }}>
                <span
                  className="flex items-center border-r"
                  style={{
                    padding: "0 10px",
                    backgroundColor: "var(--c-bg-sidebar)",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.9rem",
                    color: "var(--c-text-secondary)",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    border: "none",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.9rem",
                    color: "var(--c-text-primary)",
                    outline: "none",
                    backgroundColor: "#FDFBFB",
                  }}
                />
              </div>
            </div>
          </div>

          {selectedItem && quantity && unitCost && (
            <div
              className="border"
              style={{
                padding: "var(--s-3)",
                borderColor: "var(--c-border)",
                backgroundColor: "var(--c-bg-sidebar)",
                marginTop: "var(--s-2)",
              }}
            >
              <div className="flex justify-between" style={{ marginBottom: "8px" }}>
                <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                  總成本：
                </span>
                <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.9rem", color: "var(--c-text-primary)", fontWeight: 500 }}>
                  ${totalCost}
                </span>
              </div>
              <div className="flex justify-between border-t" style={{ paddingTop: "8px", borderColor: "var(--c-border)" }}>
                <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                  新庫存：
                </span>
                <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.9rem", color: "var(--c-accent-green)", fontWeight: 500 }}>
                  {selectedItem.stock + parseInt(quantity || "0", 10)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end" style={{ marginTop: "var(--s-2)", gap: "var(--s-3)" }}>
            <button
              type="button"
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
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: "0 var(--s-5)",
                height: "40px",
                backgroundColor: quantity && unitCost ? "var(--c-accent-black)" : "var(--c-border)",
                border: "none",
                color: quantity && unitCost ? "white" : "var(--c-text-secondary)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: quantity && unitCost && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "儲存中..." : "儲存紀錄"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
