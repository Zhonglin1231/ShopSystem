import { useState } from "react";
import { toast } from "sonner";
import { AddBouquetModal } from "../components/AddBouquetModal";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useShopData } from "../lib/shop-data";

export function Bouquets() {
  const { bouquets, flowers, createBouquet, deleteBouquet, loading, error } = useShopData();
  const [search, setSearch] = useState("");
  const [addBouquetOpen, setAddBouquetOpen] = useState(false);
  const [deletingBouquetId, setDeletingBouquetId] = useState<string | null>(null);

  const filteredBouquets = bouquets.filter((bouquet) => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return true;
    }

    return (
      bouquet.name.toLowerCase().includes(query) ||
      bouquet.components.some((component) => component.flowerName.toLowerCase().includes(query))
    );
  });

  const handleDeleteBouquet = async (bouquetId: string, bouquetName: string) => {
    const confirmed = window.confirm(`確定要從花束目錄刪除 ${bouquetName} 嗎？`);
    if (!confirmed) {
      return;
    }

    setDeletingBouquetId(bouquetId);
    try {
      await deleteBouquet(bouquetId);
      toast.success(`已從花束目錄刪除 ${bouquetName}。`);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "無法刪除花束。");
    } finally {
      setDeletingBouquetId(null);
    }
  };

  return (
    <>
      <div>
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
            placeholder="搜尋花束..."
            className="flex-1 border"
            style={{
              padding: "8px 12px",
              borderColor: "var(--c-border)",
              fontFamily: "var(--f-sans)",
            }}
          />
          <button
            onClick={() => setAddBouquetOpen(true)}
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
            新增花束
          </button>
        </div>

        {loading && bouquets.length === 0 ? (
          <div
            className="border"
            style={{
              backgroundColor: "white",
              borderColor: "var(--c-border)",
              padding: "var(--s-4)",
              color: "var(--c-text-secondary)",
            }}
          >
            正在載入花束目錄...
          </div>
        ) : filteredBouquets.length === 0 ? (
          <div
            className="border"
            style={{
              backgroundColor: "white",
              borderColor: "var(--c-border)",
              padding: "var(--s-5)",
              color: "var(--c-text-secondary)",
            }}
          >
            {bouquets.length === 0
              ? "目前尚未有花束。可先新增第一個花束配方。"
              : "沒有符合搜尋條件的花束。"}
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "var(--s-4)",
            }}
          >
            {filteredBouquets.map((bouquet) => (
              <div
                key={bouquet.id}
                className="border transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  backgroundColor: "white",
                  borderColor: "var(--c-border)",
                  transition: "var(--t-fast)",
                }}
              >
                <div
                  className="relative overflow-hidden"
                  style={{
                    height: "200px",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  <ImageWithFallback src={bouquet.image} alt={bouquet.name} className="w-full h-full object-cover" />
                </div>

                <div style={{ padding: "var(--s-3)" }}>
                  <div className="flex items-start justify-between" style={{ gap: "var(--s-2)" }}>
                    <h4
                      style={{
                        fontFamily: "var(--f-serif)",
                        fontSize: "1.1rem",
                        marginBottom: "4px",
                        color: "var(--c-text-primary)",
                        flex: 1,
                      }}
                    >
                      {bouquet.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => void handleDeleteBouquet(bouquet.id, bouquet.name)}
                      disabled={deletingBouquetId === bouquet.id}
                      className="border"
                      style={{
                        padding: "4px 8px",
                        minWidth: "64px",
                        backgroundColor: deletingBouquetId === bouquet.id ? "#F4F1EC" : "transparent",
                        borderColor: "#E2B4B4",
                        color: "#A94442",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.68rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: deletingBouquetId === bouquet.id ? "wait" : "pointer",
                        opacity: deletingBouquetId === bouquet.id ? 0.7 : 1,
                      }}
                    >
                      {deletingBouquetId === bouquet.id ? "..." : "刪除"}
                    </button>
                  </div>

                  <p
                    style={{
                      marginBottom: "10px",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.8rem",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    {bouquet.varietyCount} 種花材 · 總數 {bouquet.totalQuantity} 單位
                  </p>

                  <div className="flex flex-col" style={{ gap: "8px" }}>
                    {bouquet.components.map((component) => (
                      <div
                        key={`${bouquet.id}-${component.flowerId}`}
                        className="flex items-center justify-between"
                        style={{
                          padding: "8px 10px",
                          backgroundColor: "var(--c-bg-app)",
                          border: "1px solid var(--c-border)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--f-sans)",
                            fontSize: "0.82rem",
                            color: "var(--c-text-primary)",
                          }}
                        >
                          {component.flowerName}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--f-sans)",
                            fontSize: "0.78rem",
                            color: "var(--c-text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          x{component.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddBouquetModal
        isOpen={addBouquetOpen}
        onClose={() => setAddBouquetOpen(false)}
        flowers={flowers}
        onAddBouquet={createBouquet}
      />
    </>
  );
}
