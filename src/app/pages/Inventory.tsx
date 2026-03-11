import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AddRestockModal } from "../components/AddRestockModal";
import { useShopData } from "../lib/shop-data";

function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function Inventory() {
  const { inventory, restocks, adjustInventory, updateInventoryParLevel, createRestock, loading, error } = useShopData();
  const [activeTab, setActiveTab] = useState<"stock" | "history">("stock");
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [parDrafts, setParDrafts] = useState<Record<string, string>>({});
  const [savingParCode, setSavingParCode] = useState<string | null>(null);

  useEffect(() => {
    setParDrafts(
      Object.fromEntries(inventory.map((item) => [item.code, String(item.par)])),
    );
  }, [inventory]);

  const handleExportReport = () => {
    const rows = [
      ["Item Code", "Item Name", "Category", "Current Stock", "Par Level", "Avg Cost", "Status"],
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

  const saveParLevel = async (itemCode: string, currentPar: number) => {
    const rawValue = parDrafts[itemCode] ?? String(currentPar);
    const nextPar = Number(rawValue);

    if (!Number.isInteger(nextPar) || nextPar < 0) {
      toast.error("Par level must be a whole number greater than or equal to 0.");
      return;
    }

    if (nextPar === currentPar) {
      return;
    }

    setSavingParCode(itemCode);
    try {
      await updateInventoryParLevel(itemCode, nextPar);
      toast.success(`Updated par level for ${itemCode}.`);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to update par level.");
    } finally {
      setSavingParCode(null);
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
              Stock Levels
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
              Restock History
            </button>
          </div>
          <div className="flex gap-3">
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
              Record Restock
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
              Export Report
            </button>
          </div>
        </div>

        {loading && inventory.length === 0 && activeTab === "stock" ? (
          <div style={{ padding: "var(--s-4)", color: "var(--c-text-secondary)" }}>Loading inventory...</div>
        ) : activeTab === "stock" ? (
          <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                {["Item Code", "Item Name", "Category", "Current Stock", "Par Level", "Avg Cost", "Status", "Quick Update"].map((header) => (
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
                    {item.stock}
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
                            void saveParLevel(item.code, item.par);
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
                      <button
                        onClick={() => void saveParLevel(item.code, item.par)}
                        disabled={savingParCode === item.code || Number(parDrafts[item.code] ?? item.par) === item.par}
                        className="border"
                        style={{
                          padding: "0 10px",
                          height: "28px",
                          backgroundColor: "transparent",
                          borderColor: "var(--c-border)",
                          color: "var(--c-text-primary)",
                          fontFamily: "var(--f-sans)",
                          fontSize: "0.72rem",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          cursor: savingParCode === item.code ? "wait" : "pointer",
                          opacity:
                            savingParCode === item.code || Number(parDrafts[item.code] ?? item.par) === item.par
                              ? 0.5
                              : 1,
                        }}
                      >
                        {savingParCode === item.code ? "Saving" : "Save"}
                      </button>
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
                      {item.status}
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
                        onClick={async () => {
                          try {
                            await adjustInventory(item.code, -1);
                            toast.success(`Updated ${item.name} stock.`);
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Unable to update stock.");
                          }
                        }}
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
                        onClick={async () => {
                          try {
                            await adjustInventory(item.code, 1);
                            toast.success(`Updated ${item.name} stock.`);
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Unable to update stock.");
                          }
                        }}
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
                {["ID", "Date", "Item", "Quantity", "Unit Cost", "Total Cost"].map((header) => (
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
                    No restocks recorded yet.
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
          toast.success(`Recorded restock for ${record.itemCode}.`);
        }}
      />
    </>
  );
}
