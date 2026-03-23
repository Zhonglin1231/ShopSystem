import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useShopData } from "../lib/shop-data";

export function Wrappings() {
  const { wrappings, createWrapping, deleteWrapping, loading, error } = useShopData();
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingWrappingId, setDeletingWrappingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredWrappings = wrappings.filter((wrapping) => {
    const query = search.trim().toLowerCase();
    if (query.length === 0) {
      return true;
    }

    return wrapping.name.toLowerCase().includes(query);
  });

  const resetForm = () => {
    setName("");
    setPrice("");
    setImageData(null);
    setImageName(null);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setImageData((loadEvent.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateWrapping = async (event: FormEvent) => {
    event.preventDefault();
    const parsedPrice = Number(price);

    if (!name.trim()) {
      toast.error("請輸入包裝名稱。");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("請輸入有效價格。");
      return;
    }

    setSaving(true);
    try {
      await createWrapping({
        name: name.trim(),
        price: parsedPrice,
        image: imageData,
      });
      toast.success(`已新增 ${name.trim()} 到包裝選項。`);
      resetForm();
      setShowCreateForm(false);
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "無法新增包裝。");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWrapping = async (wrappingId: string, wrappingName: string) => {
    const confirmed = window.confirm(`確定要從包裝選項刪除 ${wrappingName} 嗎？`);
    if (!confirmed) {
      return;
    }

    setDeletingWrappingId(wrappingId);
    try {
      await deleteWrapping(wrappingId);
      toast.success(`已從包裝選項刪除 ${wrappingName}。`);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "無法刪除包裝。");
    } finally {
      setDeletingWrappingId(null);
    }
  };

  return (
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
          placeholder="搜尋包裝選項..."
          className="flex-1 border"
          style={{
            padding: "8px 12px",
            borderColor: "var(--c-border)",
            fontFamily: "var(--f-sans)",
          }}
        />
        <button
          onClick={() => setShowCreateForm((current) => !current)}
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
          {showCreateForm ? "關閉" : "新增包裝"}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(event) => void handleCreateWrapping(event)}
          className="border"
          style={{
            backgroundColor: "white",
            borderColor: "var(--c-border)",
            padding: "var(--s-4)",
            marginBottom: "var(--s-4)",
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--s-3)",
              marginBottom: "var(--s-3)",
            }}
          >
            <div>
              <label className="block" style={{ marginBottom: "6px", fontSize: "0.78rem" }}>
                名稱
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：珍珠白"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                }}
              />
            </div>
            <div>
              <label className="block" style={{ marginBottom: "6px", fontSize: "0.78rem" }}>
                價格
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0.00"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                }}
              />
            </div>
            <div>
              <label className="block" style={{ marginBottom: "6px", fontSize: "0.78rem" }}>
                上傳圖片
              </label>
              <div className="flex" style={{ gap: "var(--s-2)" }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="border"
                  style={{
                    padding: "10px 12px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                    backgroundColor: "white",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  選擇檔案
                </button>
                <div
                  className="border"
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.82rem",
                    color: "var(--c-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    backgroundColor: "#FDFBFB",
                  }}
                  title={imageName ?? "未選擇檔案"}
                >
                  {imageName ?? "未選擇檔案"}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>
          </div>

          {imageData && (
            <div style={{ marginBottom: "var(--s-3)" }}>
              <p style={{ marginBottom: "6px", fontSize: "0.78rem", color: "var(--c-text-secondary)" }}>預覽</p>
              <div
                className="border overflow-hidden"
                style={{
                  width: "120px",
                  height: "120px",
                  borderColor: "var(--c-border)",
                  backgroundColor: "#f0f0f0",
                }}
              >
                <ImageWithFallback src={imageData} alt="包裝預覽" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0 var(--s-4)",
              height: "36px",
              backgroundColor: "var(--c-accent-black)",
              color: "white",
              fontFamily: "var(--f-sans)",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "儲存中..." : "儲存包裝"}
          </button>
        </form>
      )}

      {loading && wrappings.length === 0 ? (
        <div
          className="border"
          style={{
            backgroundColor: "white",
            borderColor: "var(--c-border)",
            padding: "var(--s-4)",
            color: "var(--c-text-secondary)",
          }}
        >
          正在載入包裝選項...
        </div>
      ) : filteredWrappings.length === 0 ? (
        <div
          className="border"
          style={{
            backgroundColor: "white",
            borderColor: "var(--c-border)",
            padding: "var(--s-5)",
            color: "var(--c-text-secondary)",
          }}
        >
          {wrappings.length === 0 ? "目前尚未有包裝選項。" : "沒有符合搜尋條件的包裝選項。"}
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "var(--s-4)",
          }}
        >
          {filteredWrappings.map((wrapping) => (
            <div
              key={wrapping.id}
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
                <ImageWithFallback src={wrapping.image} alt={wrapping.name} className="w-full h-full object-cover" />
              </div>

              <div style={{ padding: "var(--s-3)" }}>
                <div className="flex items-start justify-between" style={{ gap: "var(--s-2)" }}>
                  <h4
                    style={{
                      fontFamily: "var(--f-serif)",
                      fontSize: "1.05rem",
                      marginBottom: "4px",
                      color: "var(--c-text-primary)",
                      flex: 1,
                    }}
                  >
                    {wrapping.name}
                  </h4>
                  <button
                    type="button"
                    onClick={() => void handleDeleteWrapping(wrapping.id, wrapping.name)}
                    disabled={deletingWrappingId === wrapping.id}
                    className="border"
                    style={{
                      padding: "4px 8px",
                      minWidth: "64px",
                      backgroundColor: deletingWrappingId === wrapping.id ? "#F4F1EC" : "transparent",
                      borderColor: "#E2B4B4",
                      color: "#A94442",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.68rem",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      cursor: deletingWrappingId === wrapping.id ? "wait" : "pointer",
                      opacity: deletingWrappingId === wrapping.id ? 0.7 : 1,
                    }}
                  >
                    {deletingWrappingId === wrapping.id ? "..." : "刪除"}
                  </button>
                </div>

                <p
                  style={{
                    marginTop: "8px",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.92rem",
                    color: "var(--c-accent-green)",
                  }}
                >
                  {wrapping.priceDisplay}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
