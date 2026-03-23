import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AddRestockModal } from "../components/AddRestockModal";
import { translateStockStatus } from "../lib/format";
import { useShopData } from "../lib/shop-data";

function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function Inventory() {
  const { inventory, restocks, saveInventoryDrafts, createRestock, loading, error } = useShopData();
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [parDrafts, setParDrafts] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    setStockDrafts(
      Object.fromEntries(inventory.map((item) => [item.code, String(item.stock)])),
    );
    setParDrafts(
      Object.fromEntries(inventory.map((item) => [item.code, String(item.par)])),
    );
  }, [inventory]);

  const handleExportReport = () => {
    const rows = [
      ["項目編號", "項目名稱", "分類", "目前庫存", "安全庫存", "平均成本", "狀態"],
      ...inventory.map((item) => [item.code, item.name, item.category, item.stock, item.par, item.averageCostDisplay, item.status]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const hasDraftChanges = inventory.some((item) => {
    const stockDraft = Number(stockDrafts[item.code] ?? item.stock);
    const parDraft = Number(parDrafts[item.code] ?? item.par);
    return stockDraft !== item.stock || parDraft !== item.par;
  });

  const saveDrafts = async () => {
    const changes: Array<{ itemCode: string; stock: number; parLevel: number }> = [];

    for (const item of inventory) {
      const rawStock = stockDrafts[item.code] ?? String(item.stock);
      const rawPar = parDrafts[item.code] ?? String(item.par);
      const nextStock = Number(rawStock);
      const nextPar = Number(rawPar);

      if (!Number.isInteger(nextStock) || nextStock < 0) {
        toast.error(`${item.code} 的目前庫存必須是大於或等於 0 的整數。`);
        return;
      }

      if (!Number.isInteger(nextPar) || nextPar < 0) {
        toast.error(`${item.code} 的安全庫存必須是大於或等於 0 的整數。`);
        return;
      }

      if (nextStock !== item.stock || nextPar !== item.par) {
        changes.push({
          itemCode: item.code,
          stock: nextStock,
          parLevel: nextPar,
        });
      }
    }

    if (changes.length === 0) {
      return;
    }

    setSavingAll(true);
    try {
      await saveInventoryDrafts(changes);
      toast.success(`已儲存 ${changes.length} 項庫存變更。`);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "無法儲存庫存變更。");
    } finally {
      setSavingAll(false);
    }
  };

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
          className="flex justify-between items-center border-b"
          style={{
            marginBottom: "var(--s-4)",
            paddingBottom: "var(--s-3)",
            borderColor: "var(--c-border)",
          }}
        >
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("stock")}
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.1rem",
                color: activeTab === "stock" ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                borderBottom: activeTab === "stock" ? "2px solid var(--c-accent-black)" : "2px solid transparent",
                paddingBottom: "4px",
              }}
            >
              庫存水平
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.1rem",
                color: activeTab === "history" ? "var(--c-text-primary)" : "var(--c-text-secondary)",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                borderBottom: activeTab === "history" ? "2px solid var(--c-accent-black)" : "2px solid transparent",
                paddingBottom: "4px",
              }}
            >
              補貨記錄
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => void saveDrafts()}
              disabled={!hasDraftChanges || savingAll}
              style={{
                padding: "0 var(--s-3)",
                height: "32px",
                backgroundColor: "var(--c-accent-black)",
                color: "white",
                border: "none",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: !hasDraftChanges || savingAll ? "not-allowed" : "pointer",
                opacity: !hasDraftChanges || savingAll ? 0.6 : 1,
              }}
            >
              {savingAll ? "儲存中..." : hasDraftChanges ? "儲存變更" : "已儲存"}
            </button>
            <button
              onClick={() => setIsRestockModalOpen(true)}
              style={{
                padding: "0 var(--s-3)",
                height: "32px",
                backgroundColor: "var(--c-accent-black)",
                color: "white",
                border: "none",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              記錄補貨
            </button>
            <button
              className="border"
              onClick={handleExportReport}
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
              匯出報告
            </button>
          </div>
        </div>

        {loading && inventory.length === 0 && activeTab === "stock" ? (
          <div style={{ padding: "var(--s-4)", color: "var(--c-text-secondary)" }}>正在載入庫存...</div>
        ) : activeTab === "stock" ? (
          <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                {["項目編號", "項目名稱", "分類", "目前庫存", "安全庫存", "平均成本", "狀態", "快速調整"].map((header) => (
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
              {inventory.map((item, index) => (
                <tr key={item.code}>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                      fontFamily: "var(--f-serif)",
                    }}
                  >
                    {item.code}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.name}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.category}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    <div className="flex items-center" style={{ gap: "8px" }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={stockDrafts[item.code] ?? String(item.stock)}
                        onChange={(event) =>
                          setStockDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [item.code]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveDrafts();
                          }
                        }}
                        style={{
                          width: "72px",
                          padding: "6px 8px",
                          border: "1px solid var(--c-border)",
                          backgroundColor: "#FDFBFB",
                          color: "var(--c-text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    <div className="flex items-center" style={{ gap: "8px" }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={parDrafts[item.code] ?? String(item.par)}
                        onChange={(event) =>
                          setParDrafts((currentDrafts) => ({
                            ...currentDrafts,
                            [item.code]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void saveDrafts();
                          }
                        }}
                        style={{
                          width: "72px",
                          padding: "6px 8px",
                          border: "1px solid var(--c-border)",
                          backgroundColor: "#FDFBFB",
                          color: "var(--c-text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.averageCostDisplay}
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                    }}
                  >
                    <span
                      className="inline-flex items-center"
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        backgroundColor: item.statusClass === "success" ? "var(--c-accent-green-light)" : "#FFF0F0",
                        color: item.statusClass === "success" ? "var(--c-accent-green)" : "#C53030",
                      }}
                    >
                      {translateStockStatus(item.status)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "var(--s-3)",
                      borderBottom: index === inventory.length - 1 ? "none" : "1px solid var(--c-border)",
                    }}
                  >
                    <div className="flex" style={{ gap: "4px" }}>
                      <button
                        onClick={() =>
                          setStockDrafts((currentDrafts) => {
                            const currentStock = Number(currentDrafts[item.code] ?? item.stock);
                            return {
                              ...currentDrafts,
                              [item.code]: String(Math.max(0, currentStock - 1)),
                            };
                          })
                        }
                        className="border"
                        style={{
                          width: "28px",
                          height: "28px",
                          backgroundColor: "transparent",
                          borderColor: "var(--c-border)",
                          color: "var(--c-text-primary)",
                          fontFamily: "var(--f-sans)",
                          fontSize: "1rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          setStockDrafts((currentDrafts) => {
                            const currentStock = Number(currentDrafts[item.code] ?? item.stock);
                            return {
                              ...currentDrafts,
                              [item.code]: String(currentStock + 1),
                            };
                          })
                        }
                        className="border"
                        style={{
                          width: "28px",
                          height: "28px",
                          backgroundColor: "transparent",
                          borderColor: "var(--c-border)",
                          color: "var(--c-text-primary)",
                          fontFamily: "var(--f-sans)",
                          fontSize: "1rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                {["編號", "日期", "項目", "數量", "單位成本", "總成本"].map((header) => (
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
              {restocks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "var(--s-4)", color: "var(--c-text-secondary)" }}>
                    尚未有補貨記錄。
                  </td>
                </tr>
              ) : (
                restocks.map((record, index) => (
                  <tr key={record.id}>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === restocks.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                        fontFamily: "var(--f-serif)",
                      }}
                    >
                      {record.id}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === restocks.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {record.dateLabel}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === restocks.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {record.itemName}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === restocks.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {record.quantity}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === restocks.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {record.unitCostDisplay}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === restocks.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {record.totalCostDisplay}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <AddRestockModal
        isOpen={isRestockModalOpen}
        inventory={inventory}
        onClose={() => setIsRestockModalOpen(false)}
        onAddRestock={async (record) => {
          await createRestock(record);
          toast.success(`已記錄 ${record.itemCode} 的補貨。`);
        }}
      />
    </>
  );
}
