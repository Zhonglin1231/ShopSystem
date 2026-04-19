import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

interface SuppliedFlower {
  flowerId: string;
  flowerName: string;
  category: string;
}

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSupplier?: (supplier: {
    companyName: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
    suppliedFlowers: SuppliedFlower[];
    status: "Active" | "Inactive";
    notes: string;
  }) => Promise<void> | void;
}

export function AddSupplierModal({ isOpen, onClose, onAddSupplier }: AddSupplierModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setCompanyName("");
    setAddress("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setStatus("Active");
    setNotes("");
  };

  const handleSave = async () => {
    // Validation
    if (!companyName.trim()) {
      toast.error("請輸入公司名稱");
      return;
    }

    if (!contactPerson.trim()) {
      toast.error("請輸入聯絡人名稱");
      return;
    }

    if (!phone.trim()) {
      toast.error("請輸入電話號碼");
      return;
    }

    if (!email.trim()) {
      toast.error("請輸入電郵地址");
      return;
    }

    if (!email.includes("@")) {
      toast.error("請輸入有效的電郵地址");
      return;
    }

    setSaving(true);
    try {
      if (onAddSupplier) {
        await onAddSupplier({
          companyName: companyName.trim(),
          address: address.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          suppliedFlowers: [],
          status,
          notes: notes.trim(),
        });
      }
      toast.success("已新增供應商");
      resetForm();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "無法新增供應商");
    } finally {
      setSaving(false);
    }
  };

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
          width: "min(600px, 95vw)",
          maxHeight: "92vh",
          backgroundColor: "var(--c-bg-card)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
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
              供應商管理
            </p>
            <h2
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.5rem",
                color: "var(--c-text-primary)",
              }}
            >
              新增供應商
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

        {/* Content */}
        <div className="overflow-y-auto flex-1" style={{ padding: "var(--s-5)" }}>
          <div className="flex flex-col" style={{ gap: "var(--s-4)" }}>
            {/* Company Name */}
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
                公司名稱 *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="例如：青葉花卉有限公司"
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

            {/* Address */}
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
                地址
              </label>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="例如：香港九龍長沙灣道 123 號"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  color: "var(--c-text-primary)",
                  outline: "none",
                  backgroundColor: "#FDFBFB",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Contact Person */}
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
                聯絡人 *
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(event) => setContactPerson(event.target.value)}
                placeholder="例如：李先生"
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

            {/* Phone & Email */}
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
                  電話 *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+852-2234-5678"
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
                  電郵 *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="contact@example.com"
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
            </div>

            {/* Status */}
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
                狀態
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as "Active" | "Inactive")}
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
                <option value="Active">啟用中</option>
                <option value="Inactive">停用</option>
              </select>
            </div>

            {/* Notes */}
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
                備註
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="例如：主要供應商，質量穩定，交貨準時。"
                className="w-full border"
                style={{
                  padding: "10px 12px",
                  borderColor: "var(--c-border)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  color: "var(--c-text-primary)",
                  outline: "none",
                  backgroundColor: "#FDFBFB",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Helper Text */}
            <div
              style={{
                padding: "var(--s-3)",
                backgroundColor: "#F8F8F8",
                border: "1px solid var(--c-border)",
                borderRadius: "2px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  margin: 0,
                  lineHeight: "1.5",
                }}
              >
                * 必填欄位。完成新增後，可在詳情面板中添加供應的花卉。
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div
          className="flex items-center justify-end gap-2 border-t flex-shrink-0"
          style={{
            padding: "var(--s-4) var(--s-5)",
            borderColor: "var(--c-border)",
            backgroundColor: "var(--c-bg-sidebar)",
          }}
        >
          <button
            onClick={onClose}
            className="border"
            style={{
              padding: "8px 24px",
              height: "40px",
              borderColor: "var(--c-border)",
              backgroundColor: "transparent",
              fontFamily: "var(--f-sans)",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              color: "var(--c-text-primary)",
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 24px",
              height: "40px",
              backgroundColor: saving ? "var(--c-text-secondary)" : "var(--c-accent-black)",
              color: "white",
              fontFamily: "var(--f-sans)",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: "none",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "處理中..." : "新增供應商"}
          </button>
        </div>
      </div>
    </div>
  );
}
