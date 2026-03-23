import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Leaf, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { CreateBouquetInput, Flower } from "../lib/api";

interface AddBouquetModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowers: Flower[];
  onAddBouquet?: (bouquet: CreateBouquetInput) => Promise<void> | void;
}

interface BouquetLineDraft {
  key: string;
  flowerId: string;
  quantity: string;
}

function createDraftLine(defaultFlowerId = ""): BouquetLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    flowerId: defaultFlowerId,
    quantity: "1",
  };
}

export function AddBouquetModal({ isOpen, onClose, flowers, onAddBouquet }: AddBouquetModalProps) {
  const [name, setName] = useState("");
  const [components, setComponents] = useState<BouquetLineDraft[]>([createDraftLine()]);
  const [imageName, setImageName] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (flowers.length === 0) {
      return;
    }

    const availableFlowerIds = new Set(flowers.map((flower) => flower.id));
    const fallbackFlowerId = flowers[0].id;

    setComponents((current) => {
      const next = current.map((component) =>
        availableFlowerIds.has(component.flowerId)
          ? component
          : {
              ...component,
              flowerId: fallbackFlowerId,
            },
      );

      return next.some((component, index) => component !== current[index]) ? next : current;
    });
  }, [flowers]);

  const resetForm = () => {
    setName("");
    setComponents([createDraftLine(flowers[0]?.id ?? "")]);
    setImageName(null);
    setImagePreview(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImagePreview((loadEvent.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
  };

  const varietyCount = new Set(components.map((component) => component.flowerId).filter(Boolean)).size;
  const totalQuantity = components.reduce((sum, component) => {
    const quantity = Number.parseInt(component.quantity, 10);
    return sum + (Number.isNaN(quantity) || quantity <= 0 ? 0 : quantity);
  }, 0);

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
          width: "min(760px, 95vw)",
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
              花束目錄
            </p>
            <h2
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.5rem",
                color: "var(--c-text-primary)",
              }}
            >
              新增花束
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

        <div className="overflow-y-auto flex-1" style={{ padding: "var(--s-5)" }}>
          <div className="grid" style={{ gridTemplateColumns: "180px 1fr", gap: "var(--s-5)" }}>
            <div className="flex flex-col" style={{ gap: "var(--s-3)" }}>
              <span
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--c-text-secondary)",
                }}
              >
                相片
              </span>
              <div
                className="flex flex-col items-center justify-center border cursor-pointer overflow-hidden"
                style={{
                  height: "200px",
                  borderColor: "var(--c-border-pink)",
                  borderStyle: "dashed",
                  backgroundColor: imagePreview ? undefined : "var(--c-bg-sidebar)",
                  position: "relative",
                }}
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="flex flex-col items-center" style={{ gap: "var(--s-2)", padding: "var(--s-4)" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: "var(--c-accent-pink)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Leaf size={20} color="var(--c-text-secondary)" />
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.75rem",
                        color: "var(--c-text-secondary)",
                        textAlign: "center",
                        lineHeight: "1.4",
                      }}
                    >
                      點擊上傳相片
                    </span>
                    <Upload size={13} color="var(--c-text-secondary)" />
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
              </div>
              {imageName && (
                <span
                  style={{
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.72rem",
                    color: "var(--c-text-secondary)",
                    wordBreak: "break-all",
                  }}
                >
                  {imageName}
                </span>
              )}

              <div
                style={{
                  padding: "var(--s-3)",
                  backgroundColor: "var(--c-bg-app)",
                  border: "1px solid var(--c-border)",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--c-text-secondary)",
                    marginBottom: "var(--s-2)",
                  }}
                >
                  配方摘要
                </p>
                <div className="flex flex-col" style={{ gap: "6px" }}>
                  <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.8rem", color: "var(--c-text-primary)" }}>
                    {varietyCount} 種花材
                  </span>
                  <span style={{ fontFamily: "var(--f-sans)", fontSize: "0.8rem", color: "var(--c-text-primary)" }}>
                    總數 {totalQuantity} 單位
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: "var(--s-3)" }}>
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
                  花束名稱 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：春日花園花束"
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

              <div
                style={{
                  padding: "var(--s-4)",
                  border: "1px solid var(--c-border)",
                  backgroundColor: "#FDFBFB",
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: "var(--s-3)", gap: "var(--s-3)" }}>
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--c-text-secondary)",
                        marginBottom: "4px",
                      }}
                    >
                      花束配方
                    </p>
                    <p style={{ fontFamily: "var(--f-sans)", fontSize: "0.82rem", color: "var(--c-text-secondary)" }}>
                      請選擇此花束的花材與數量。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setComponents((current) => [...current, createDraftLine(flowers[0]?.id ?? "")])}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0 12px",
                      height: "36px",
                      backgroundColor: "transparent",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text-primary)",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.72rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={14} />
                    新增花材
                  </button>
                </div>

                {flowers.length === 0 ? (
                  <div
                    className="border"
                    style={{
                      padding: "var(--s-3)",
                      borderColor: "#F2C5C5",
                      backgroundColor: "#FFF7F7",
                      color: "#A94442",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.85rem",
                    }}
                  >
                    建立花束前，請先把鮮花加入目錄。
                  </div>
                ) : (
                  <div className="flex flex-col" style={{ gap: "var(--s-3)" }}>
                    {components.map((component, index) => (
                      <div
                        key={component.key}
                        className="grid"
                        style={{
                          gridTemplateColumns: "minmax(0, 1fr) 110px 44px",
                          gap: "var(--s-2)",
                          alignItems: "end",
                        }}
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
                            {index === 0 ? "花材" : "花材"}
                          </label>
                          <select
                            value={component.flowerId}
                            onChange={(event) =>
                              setComponents((current) =>
                                current.map((entry) =>
                                  entry.key === component.key ? { ...entry, flowerId: event.target.value } : entry,
                                ),
                              )
                            }
                            className="w-full border"
                            style={{
                              padding: "10px 12px",
                              borderColor: "var(--c-border)",
                              fontFamily: "var(--f-sans)",
                              fontSize: "0.9rem",
                              color: "var(--c-text-primary)",
                              backgroundColor: "#FFFFFF",
                              outline: "none",
                            }}
                          >
                            {flowers.map((flower) => (
                              <option key={flower.id} value={flower.id}>
                                {flower.name}
                              </option>
                            ))}
                          </select>
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
                            數量
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={component.quantity}
                            onChange={(event) =>
                              setComponents((current) =>
                                current.map((entry) =>
                                  entry.key === component.key ? { ...entry, quantity: event.target.value } : entry,
                                ),
                              )
                            }
                            className="w-full border"
                            style={{
                              padding: "10px 12px",
                              borderColor: "var(--c-border)",
                              fontFamily: "var(--f-sans)",
                              fontSize: "0.9rem",
                              color: "var(--c-text-primary)",
                              outline: "none",
                              backgroundColor: "#FFFFFF",
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setComponents((current) =>
                              current.length === 1 ? current : current.filter((entry) => entry.key !== component.key),
                            )
                          }
                          disabled={components.length === 1}
                          style={{
                            width: "44px",
                            height: "44px",
                            display: "grid",
                            placeItems: "center",
                            backgroundColor: "transparent",
                            border: "1px solid var(--c-border)",
                            color: "var(--c-text-secondary)",
                            cursor: components.length === 1 ? "not-allowed" : "pointer",
                            opacity: components.length === 1 ? 0.5 : 1,
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
            取消
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              if (!name.trim()) {
                toast.error("請輸入花束名稱。");
                return;
              }

              if (flowers.length === 0) {
                toast.error("建立花束前請先新增鮮花至目錄。");
                return;
              }

              const mergedComponents = new Map<string, number>();

              for (const component of components) {
                if (!component.flowerId) {
                  toast.error("請為每一行花束項目選擇花材。");
                  return;
                }

                const quantity = Number.parseInt(component.quantity, 10);
                if (Number.isNaN(quantity) || quantity <= 0) {
                  toast.error("請為每一行花束項目輸入有效數量。");
                  return;
                }

                mergedComponents.set(component.flowerId, (mergedComponents.get(component.flowerId) ?? 0) + quantity);
              }

              setSaving(true);
              try {
                await onAddBouquet?.({
                  name: name.trim(),
                  components: Array.from(mergedComponents.entries()).map(([flowerId, quantity]) => ({
                    flowerId,
                    quantity,
                  })),
                  image: imagePreview,
                });
                resetForm();
                onClose();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "無法新增花束。");
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
            {saving ? "儲存中..." : "新增花束"}
          </button>
        </div>
      </div>
    </div>
  );
}
