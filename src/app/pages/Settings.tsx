import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAiPreviewSettings, StoreSettings, updateAiPreviewSettings } from "../lib/api";
import { useShopData } from "../lib/shop-data";

const timezoneOptions = [
  { value: "Asia/Shanghai", label: "UTC+8（上海）" },
  { value: "Asia/Hong_Kong", label: "UTC+8（香港）" },
  { value: "America/New_York", label: "EST / EDT（紐約）" },
  { value: "America/Los_Angeles", label: "PST / PDT（洛杉磯）" },
];

export function Settings() {
  const { settings, saveSettings, loading, error, storageBackend } = useShopData();
  const [formState, setFormState] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [aiPreviewApi, setAiPreviewApi] = useState("");
  const [aiPreviewModelName, setAiPreviewModelName] = useState("");
  const [aiPreviewImageSize, setAiPreviewImageSize] = useState("2560x1440");
  const [loadingAiPreview, setLoadingAiPreview] = useState(true);
  const [savingAiPreview, setSavingAiPreview] = useState(false);

  useEffect(() => {
    setFormState(settings);
  }, [settings]);

  useEffect(() => {
    let isMounted = true;

    async function loadAiPreviewSettings() {
      try {
        const payload = await getAiPreviewSettings();
        if (isMounted) {
          setAiPreviewApi(payload.apiKey ?? "");
          setAiPreviewModelName(payload.modelName ?? "");
          setAiPreviewImageSize(payload.imageSize?.trim() || "2560x1440");
        }
      } catch (error) {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : "無法載入 AI API 設定。");
        }
      } finally {
        if (isMounted) {
          setLoadingAiPreview(false);
        }
      }
    }

    void loadAiPreviewSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div
      className="border"
      style={{
        backgroundColor: "var(--c-bg-card)",
        borderColor: "var(--c-border)",
        padding: "var(--s-4)",
        maxWidth: "600px",
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
        className="border-b"
        style={{
          marginBottom: "var(--s-4)",
          paddingBottom: "var(--s-3)",
          borderColor: "var(--c-border)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: "1.1rem",
            color: "var(--c-text-primary)",
          }}
        >
          店舖設定
        </h3>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            await saveSettings(formState);
            toast.success("設定已儲存。");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "無法儲存設定。");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div style={{ marginBottom: "var(--s-4)" }}>
          <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
            店舖名稱
          </label>
          <input
            type="text"
            value={formState.storeName}
            onChange={(event) => updateField("storeName", event.target.value)}
            className="w-full border transition-all"
            style={{
              padding: "var(--s-2) var(--s-3)",
              borderColor: "var(--c-border)",
              fontFamily: "var(--f-sans)",
              fontSize: "0.95rem",
              transition: "var(--t-fast)",
            }}
          />
        </div>

        <div style={{ marginBottom: "var(--s-4)" }}>
          <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
            聯絡電郵
          </label>
          <input
            type="email"
            value={formState.contactEmail}
            onChange={(event) => updateField("contactEmail", event.target.value)}
            className="w-full border transition-all"
            style={{
              padding: "var(--s-2) var(--s-3)",
              borderColor: "var(--c-border)",
              fontFamily: "var(--f-sans)",
              fontSize: "0.95rem",
              transition: "var(--t-fast)",
            }}
          />
        </div>

        <div style={{ marginBottom: "var(--s-4)" }}>
          <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
            維護報告電郵
          </label>
          <input
            type="email"
            value={formState.maintenanceEmail}
            onChange={(event) => updateField("maintenanceEmail", event.target.value)}
            className="w-full border transition-all"
            style={{
              padding: "var(--s-2) var(--s-3)",
              borderColor: "var(--c-border)",
              fontFamily: "var(--f-sans)",
              fontSize: "0.95rem",
              transition: "var(--t-fast)",
            }}
          />
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--s-4)",
            marginBottom: "var(--s-4)",
          }}
        >
          <div>
            <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
              貨幣
            </label>
            <select
              value={formState.currency}
              onChange={(event) => updateField("currency", event.target.value)}
              className="w-full border transition-all"
              style={{
                padding: "var(--s-2) var(--s-3)",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.95rem",
                transition: "var(--t-fast)",
              }}
            >
              <option value="USD">美元（USD $）</option>
              <option value="HKD">港幣（HKD HK$）</option>
              <option value="CNY">人民幣（CNY RMB）</option>
              <option value="EUR">歐元（EUR €）</option>
            </select>
          </div>

          <div>
            <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
              時區
            </label>
            <select
              value={formState.timezone}
              onChange={(event) => updateField("timezone", event.target.value)}
              className="w-full border transition-all"
              style={{
                padding: "var(--s-2) var(--s-3)",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.95rem",
                transition: "var(--t-fast)",
              }}
            >
              {timezoneOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "var(--s-4)" }}>
          <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
            配送範圍（英里）
          </label>
          <input
            type="number"
            value={formState.deliveryRadius}
            onChange={(event) => updateField("deliveryRadius", Number(event.target.value))}
            className="w-full border transition-all"
            style={{
              padding: "var(--s-2) var(--s-3)",
              borderColor: "var(--c-border)",
              fontFamily: "var(--f-sans)",
              fontSize: "0.95rem",
              transition: "var(--t-fast)",
            }}
          />
        </div>

        <div
          className="border-t"
          style={{
            marginTop: "var(--s-5)",
            paddingTop: "var(--s-4)",
            borderColor: "var(--c-border)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--f-serif)",
              fontSize: "1.1rem",
              color: "var(--c-text-primary)",
              marginBottom: "var(--s-3)",
            }}
          >
            AI 預覽 API
          </h3>

          {storageBackend !== "firestore" && (
            <div
              className="border"
              style={{
                marginBottom: "var(--s-3)",
                padding: "var(--s-2) var(--s-3)",
                borderColor: "#F2C5C5",
                backgroundColor: "#FFF7F7",
                color: "#A94442",
                fontSize: "0.85rem",
              }}
            >
              目前儲存模式為 <strong>{storageBackend}</strong>。此處變更不會寫入 Firestore。
            </div>
          )}

          <div style={{ marginBottom: "var(--s-3)" }}>
            <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
              API 金鑰 / 端點（`settings/ai_preview`）
            </label>
            <input
              type="password"
              value={aiPreviewApi}
              onChange={(event) => setAiPreviewApi(event.target.value)}
              placeholder={loadingAiPreview ? "載入中..." : "請輸入 API 值"}
              disabled={loadingAiPreview || savingAiPreview}
              className="w-full border transition-all"
              style={{
                padding: "var(--s-2) var(--s-3)",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.95rem",
                transition: "var(--t-fast)",
              }}
            />
          </div>

          <div style={{ marginBottom: "var(--s-3)" }}>
            <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
              模型名稱
            </label>
            <input
              type="text"
              value={aiPreviewModelName}
              onChange={(event) => setAiPreviewModelName(event.target.value)}
              placeholder={loadingAiPreview ? "載入中..." : "例如：gpt-4o-mini"}
              disabled={loadingAiPreview || savingAiPreview}
              className="w-full border transition-all"
              style={{
                padding: "var(--s-2) var(--s-3)",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.95rem",
                transition: "var(--t-fast)",
              }}
            />
          </div>
          
          <div style={{ marginBottom: "var(--s-3)" }}>
            <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
              圖片尺寸
            </label>
            <input
              type="text"
              value={aiPreviewImageSize}
              onChange={(event) => setAiPreviewImageSize(event.target.value)}
              placeholder={loadingAiPreview ? "載入中..." : "例如：2560x1440"}
              disabled={loadingAiPreview || savingAiPreview}
              className="w-full border transition-all"
              style={{
                padding: "var(--s-2) var(--s-3)",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.95rem",
                transition: "var(--t-fast)",
              }}
            />
          </div>

          <div style={{ marginBottom: "var(--s-4)" }}>
            <button
              type="button"
              disabled={loadingAiPreview || savingAiPreview}
              onClick={async () => {
                setSavingAiPreview(true);
                try {
                  await updateAiPreviewSettings({
                    apiKey: aiPreviewApi,
                    modelName: aiPreviewModelName,
                    imageSize: aiPreviewImageSize,
                  });
                  toast.success("AI API 已儲存。");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "無法儲存 AI API。");
                } finally {
                  setSavingAiPreview(false);
                }
              }}
              className="transition-all"
              style={{
                padding: "0 var(--s-4)",
                height: "36px",
                backgroundColor: "var(--c-bg-card)",
                color: "var(--c-text-primary)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.75rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "1px solid var(--c-border)",
                cursor: loadingAiPreview || savingAiPreview ? "not-allowed" : "pointer",
                opacity: loadingAiPreview || savingAiPreview ? 0.7 : 1,
                transition: "var(--t-fast)",
              }}
            >
              {savingAiPreview ? "儲存 AI API 中..." : "儲存 AI API"}
            </button>
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="transition-all"
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
              cursor: saving || loading ? "not-allowed" : "pointer",
              opacity: saving || loading ? 0.7 : 1,
              transition: "var(--t-fast)",
            }}
          >
            {saving ? "儲存中..." : "儲存變更"}
          </button>
        </div>
      </form>
    </div>
  );
}
