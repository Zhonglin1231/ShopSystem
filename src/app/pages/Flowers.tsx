import { useState } from "react";
import { toast } from "sonner";
import { AddFlowerModal } from "../components/AddFlowerModal";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useShopData } from "../lib/shop-data";

export function Flowers() {
  const { flowers, createFlower, deleteFlower, loading, error } = useShopData();
  const [search, setSearch] = useState("");
  const [addFlowerOpen, setAddFlowerOpen] = useState(false);
  const [deletingFlowerId, setDeletingFlowerId] = useState<string | null>(null);

  const filteredFlowers = flowers.filter((flower) => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return true;
    }

    return (
      flower.name.toLowerCase().includes(query) ||
      flower.category.toLowerCase().includes(query) ||
      flower.color.toLowerCase().includes(query)
    );
  });

  const handleDeleteFlower = async (flowerId: string, flowerName: string) => {
    const confirmed = window.confirm(`Delete ${flowerName} from the catalogue? This also removes its inventory item.`);
    if (!confirmed) {
      return;
    }

    setDeletingFlowerId(flowerId);
    try {
      await deleteFlower(flowerId);
      toast.success(`Deleted ${flowerName} from the catalogue.`);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Unable to delete the flower.");
    } finally {
      setDeletingFlowerId(null);
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
            placeholder="Find flowers..."
            className="flex-1 border"
            style={{
              padding: "8px 12px",
              borderColor: "var(--c-border)",
              fontFamily: "var(--f-sans)",
            }}
          />
          <button
            onClick={() => setAddFlowerOpen(true)}
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
            Add New Flower
          </button>
        </div>

        {loading && flowers.length === 0 ? (
          <div
            className="border"
            style={{
              backgroundColor: "white",
              borderColor: "var(--c-border)",
              padding: "var(--s-4)",
              color: "var(--c-text-secondary)",
            }}
          >
            Loading flower catalogue...
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "var(--s-4)",
            }}
          >
            {filteredFlowers.map((flower) => (
              <div
                key={flower.id}
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
                  <ImageWithFallback src={flower.image} alt={flower.name} className="w-full h-full object-cover" />
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
                      {flower.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFlower(flower.id, flower.name)}
                      disabled={deletingFlowerId === flower.id}
                      className="border"
                      style={{
                        padding: "4px 8px",
                        minWidth: "64px",
                        backgroundColor: deletingFlowerId === flower.id ? "#F4F1EC" : "transparent",
                        borderColor: "#E2B4B4",
                        color: "#A94442",
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.68rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        cursor: deletingFlowerId === flower.id ? "wait" : "pointer",
                        opacity: deletingFlowerId === flower.id ? 0.7 : 1,
                      }}
                    >
                      {deletingFlowerId === flower.id ? "..." : "Delete"}
                    </button>
                  </div>

                  <p
                    style={{
                      marginBottom: "8px",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.8rem",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    {flower.category} · {flower.color || flower.season}
                  </p>

                  <div className="flex justify-between items-center">
                    <span style={{ color: "var(--c-accent-green)" }}>
                      {flower.priceDisplay} / {flower.unit}
                    </span>

                    <span
                      className="inline-flex items-center"
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        backgroundColor:
                          flower.statusClass === "success"
                            ? "var(--c-accent-green-light)"
                            : flower.statusClass === "low"
                              ? "#FFF0F0"
                              : "#FFF4E5",
                        color:
                          flower.statusClass === "success"
                            ? "var(--c-accent-green)"
                            : flower.statusClass === "low"
                              ? "#C53030"
                              : "#B7791F",
                      }}
                    >
                      {flower.status}
                    </span>
                  </div>

                  <p
                    style={{
                      marginTop: "10px",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.8rem",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    Stock: {flower.stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddFlowerModal
        isOpen={addFlowerOpen}
        onClose={() => setAddFlowerOpen(false)}
        onAddFlower={async (payload) => {
          await createFlower(payload);
          toast.success(`Added ${payload.name} to the catalogue.`);
        }}
      />
    </>
  );
}
