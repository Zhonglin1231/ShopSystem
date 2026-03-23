import { ChangeEvent, useRef, useState } from "react";
import { Leaf, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { CreateFlowerInput } from "../lib/api";

interface AddFlowerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFlower?: (flower: CreateFlowerInput) => Promise<void> | void;
}

const categories = ["玫瑰", "鬱金香", "牡丹", "尤加利", "繡球花", "薰衣草", "百合", "蘭花", "向日葵", "其他"];
const units = ["枝", "束", "盆", "箱"];
const seasons = ["全年", "春季", "夏季", "秋季", "冬季", "春夏", "夏秋"];
const colors = ["淺粉", "深紅", "白色", "象牙白", "珊瑚色", "黃色", "紫色", "淡紫", "綠色", "混色"];

export function AddFlowerModal({ isOpen, onClose, onAddFlower }: AddFlowerModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState(units[0]);
  const [stock, setStock] = useState("");
  const [season, setSeason] = useState(seasons[0]);
  const [color, setColor] = useState(colors[0]);
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setCategory(categories[0]);
    setPrice("");
    setUnit(units[0]);
    setStock("");
    setSeason(seasons[0]);
    setColor(colors[0]);
    setDescription("");
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

  const statusFromStock = () => {
    const quantity = parseInt(stock, 10);
    if (!stock || Number.isNaN(quantity)) {
      return { label: "—", bg: "var(--c-border)", color: "var(--c-text-secondary)" };
    }
    if (quantity === 0) {
      return { label: "缺貨", bg: "#FFF0F0", color: "#C53030" };
    }
    if (quantity <= 10) {
      return { label: "低庫存", bg: "#FFF0F0", color: "#C53030" };
    }
    return { label: "有庫存", bg: "var(--c-accent-green-light)", color: "var(--c-accent-green)" };
  };

  const status = statusFromStock();

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
          width: "min(720px, 95vw)",
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
              鮮花目錄
            </p>
            <h2
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.5rem",
                color: "var(--c-text-primary)",
              }}
            >
              新增鮮花
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
                  庫存狀態
                </p>
                <span
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    backgroundColor: status.bg,
                    color: status.color,
                    fontFamily: "var(--f-sans)",
                  }}
                >
                  {status.label}
                </span>
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
                  鮮花名稱 *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：花園玫瑰"
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
                    分類
                  </label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
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
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
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
                    顏色
                  </label>
                  <select
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
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
                    {colors.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
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
                    價格（USD）*
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
                      min={0}
                      step={0.5}
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="0.00"
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
                    單位
                  </label>
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
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
                    {units.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
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
                    初始庫存（數量）
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    placeholder="例如：50"
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
                    季節
                  </label>
                  <select
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
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
                    {seasons.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
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
                  描述
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="香味、養護建議、來源、搭配建議..."
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
              const parsedPrice = Number(price);
              const parsedStock = Number(stock || "0");

              if (!name.trim()) {
                toast.error("請輸入鮮花名稱。");
                return;
              }
              if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
                toast.error("請輸入有效價格。");
                return;
              }
              if (Number.isNaN(parsedStock) || parsedStock < 0) {
                toast.error("請輸入有效庫存數量。");
                return;
              }

              setSaving(true);
              try {
                await onAddFlower?.({
                  name: name.trim(),
                  category,
                  price: parsedPrice,
                  unit,
                  openingStock: parsedStock,
                  parLevel: Math.max(10, Math.min(parsedStock || 10, 30)),
                  season,
                  color,
                  description: description.trim(),
                  image: imagePreview,
                });
                resetForm();
                onClose();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "無法新增鮮花。");
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
            {saving ? "儲存中..." : "新增鮮花"}
          </button>
        </div>
      </div>
    </div>
  );
}
