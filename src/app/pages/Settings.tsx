import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StoreSettings } from "../lib/api";
import { useShopData } from "../lib/shop-data";

const timezoneOptions = [
  { value: "America/New_York", label: "EST / EDT (New York)" },
  { value: "America/Los_Angeles", label: "PST / PDT (Los Angeles)" },
  { value: "Asia/Hong_Kong", label: "HKT (Hong Kong)" },
  { value: "Asia/Shanghai", label: "CST (Shanghai)" },
];

export function Settings() {
  const { settings, saveSettings, loading, error } = useShopData();
  const [formState, setFormState] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormState(settings);
  }, [settings]);

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
          Store Settings
        </h3>
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            await saveSettings(formState);
            toast.success("Settings saved.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to save settings.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div style={{ marginBottom: "var(--s-4)" }}>
          <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
            Store Name
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
            Contact Email
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
              Currency
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
              <option value="USD">USD ($)</option>
              <option value="HKD">HKD (HK$)</option>
              <option value="CNY">CNY (RMB)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div>
            <label className="block" style={{ marginBottom: "var(--s-2)", fontSize: "0.85rem" }}>
              Timezone
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
            Delivery Radius (Miles)
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
