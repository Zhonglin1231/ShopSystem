import { useState } from "react";

interface SuppliedFlower {
  flowerId: string;
  flowerName: string;
  category: string;
}

interface PurchaseHistory {
  id: string;
  date: string;
  dateLabel: string;
  flowerId: string;
  flowerName: string;
  quantity: number;
  unitPrice: number;
  unitPriceDisplay: string;
  lineTotal: number;
  lineTotalDisplay: string;
}

interface Supplier {
  id: string;
  companyName: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  suppliedFlowers: SuppliedFlower[];
  status: "Active" | "Inactive";
  statusLabel: string;
  notes: string;
  purchaseHistory: PurchaseHistory[];
  createdAt: string;
}

interface SupplierDetailsPanelProps {
  supplier: Supplier;
  onClose: () => void;
  onUpdate: (supplier: Supplier) => void;
}

export function SupplierDetailsPanel({ supplier, onClose, onUpdate }: SupplierDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSupplier, setEditedSupplier] = useState(supplier);

  const handleSave = () => {
    onUpdate(editedSupplier);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSupplier(supplier);
    setIsEditing(false);
  };

  return (
    <div
      className="border-l"
      style={{
        width: "380px",
        flex: "0 0 auto",
        backgroundColor: "var(--c-bg-card)",
        borderColor: "var(--c-border)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--s-4)",
          borderBottom: "1px solid var(--c-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: "1.1rem",
            color: "var(--c-text-primary)",
          }}
        >
          供應商詳情
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "var(--c-text-secondary)",
            padding: 0,
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "var(--s-4)" }}>
        {/* Company Info Section */}
        <div style={{ marginBottom: "var(--s-5)" }}>
          <h3
            style={{
              fontFamily: "var(--f-sans)",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--c-text-secondary)",
              marginBottom: "var(--s-3)",
            }}
          >
            基本資訊
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-3)" }}>
            {/* Company Name */}
            <div>
              <label
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                公司名稱
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSupplier.companyName}
                  onChange={(e) =>
                    setEditedSupplier({
                      ...editedSupplier,
                      companyName: e.target.value,
                    })
                  }
                  className="border w-full"
                  style={{
                    padding: "8px 10px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                  }}
                />
              ) : (
                <p style={{ color: "var(--c-text-primary)" }}>{supplier.companyName}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                地址
              </label>
              {isEditing ? (
                <textarea
                  value={editedSupplier.address}
                  onChange={(e) =>
                    setEditedSupplier({
                      ...editedSupplier,
                      address: e.target.value,
                    })
                  }
                  className="border w-full"
                  style={{
                    padding: "8px 10px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                    minHeight: "60px",
                    resize: "vertical",
                  }}
                />
              ) : (
                <p style={{ color: "var(--c-text-primary)", whiteSpace: "pre-wrap" }}>
                  {supplier.address}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                聯絡人
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedSupplier.contactPerson}
                  onChange={(e) =>
                    setEditedSupplier({
                      ...editedSupplier,
                      contactPerson: e.target.value,
                    })
                  }
                  className="border w-full"
                  style={{
                    padding: "8px 10px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                  }}
                />
              ) : (
                <p style={{ color: "var(--c-text-primary)" }}>{supplier.contactPerson}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                電話
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedSupplier.phone}
                  onChange={(e) =>
                    setEditedSupplier({
                      ...editedSupplier,
                      phone: e.target.value,
                    })
                  }
                  className="border w-full"
                  style={{
                    padding: "8px 10px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                  }}
                />
              ) : (
                <p style={{ color: "var(--c-text-primary)" }}>
                  <a
                    href={`tel:${supplier.phone}`}
                    style={{ color: "var(--c-accent-green)", textDecoration: "none" }}
                  >
                    {supplier.phone}
                  </a>
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                電郵
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedSupplier.email}
                  onChange={(e) =>
                    setEditedSupplier({
                      ...editedSupplier,
                      email: e.target.value,
                    })
                  }
                  className="border w-full"
                  style={{
                    padding: "8px 10px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                  }}
                />
              ) : (
                <p style={{ color: "var(--c-text-primary)" }}>
                  <a
                    href={`mailto:${supplier.email}`}
                    style={{ color: "var(--c-accent-green)", textDecoration: "none" }}
                  >
                    {supplier.email}
                  </a>
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                style={{
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.75rem",
                  color: "var(--c-text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                狀態
              </label>
              {isEditing ? (
                <select
                  value={editedSupplier.status}
                  onChange={(e) =>
                    setEditedSupplier({
                      ...editedSupplier,
                      status: e.target.value as "Active" | "Inactive",
                      statusLabel: e.target.value === "Active" ? "啟用中" : "停用",
                    })
                  }
                  className="border w-full"
                  style={{
                    padding: "8px 10px",
                    borderColor: "var(--c-border)",
                    fontFamily: "var(--f-sans)",
                  }}
                >
                  <option value="Active">啟用中</option>
                  <option value="Inactive">停用</option>
                </select>
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    backgroundColor:
                      supplier.status === "Active"
                        ? "var(--c-accent-green-light)"
                        : "#F0F0F0",
                    color:
                      supplier.status === "Active" ? "var(--c-accent-green)" : "#666666",
                  }}
                >
                  {supplier.statusLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Supplied Flowers Section */}
        <div style={{ marginBottom: "var(--s-5)" }}>
          <h3
            style={{
              fontFamily: "var(--f-sans)",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--c-text-secondary)",
              marginBottom: "var(--s-2)",
            }}
          >
            供應的鮮花 ({supplier.suppliedFlowers.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {supplier.suppliedFlowers.length === 0 ? (
              <p style={{ color: "var(--c-text-secondary)", fontSize: "0.85rem" }}>
                暫無供應鮮花記錄
              </p>
            ) : (
              supplier.suppliedFlowers.map((flower) => (
                <div
                  key={flower.flowerId}
                  className="border"
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#FAFAFA",
                    borderColor: "var(--c-border)",
                    cursor: "pointer",
                    transition: "var(--t-fast)",
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.backgroundColor = "#F0F0F0";
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.backgroundColor = "#FAFAFA";
                  }}
                >
                  <p style={{ color: "var(--c-text-primary)", margin: 0 }}>
                    {flower.flowerName}
                  </p>
                  <p
                    style={{
                      color: "var(--c-text-secondary)",
                      fontSize: "0.8rem",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {flower.category}
                  </p>
                  <p
                    style={{
                      color: "var(--c-accent-green)",
                      fontSize: "0.75rem",
                      margin: "4px 0 0 0",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    連結到花卉詳情 →
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div style={{ marginBottom: "var(--s-5)" }}>
          <h3
            style={{
              fontFamily: "var(--f-sans)",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--c-text-secondary)",
              marginBottom: "var(--s-2)",
            }}
          >
            備註
          </h3>
          {isEditing ? (
            <textarea
              value={editedSupplier.notes}
              onChange={(e) =>
                setEditedSupplier({
                  ...editedSupplier,
                  notes: e.target.value,
                })
              }
              className="border w-full"
              style={{
                padding: "8px 10px",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                minHeight: "80px",
                resize: "vertical",
              }}
            />
          ) : (
            <p
              style={{
                color: "var(--c-text-primary)",
                whiteSpace: "pre-wrap",
                fontSize: "0.9rem",
                lineHeight: 1.5,
              }}
            >
              {supplier.notes || "沒有備註"}
            </p>
          )}
        </div>

        {/* Purchase History Section */}
        <div style={{ marginBottom: "var(--s-5)" }}>
          <h3
            style={{
              fontFamily: "var(--f-sans)",
              fontSize: "0.8rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--c-text-secondary)",
              marginBottom: "var(--s-2)",
            }}
          >
            採購紀錄 ({supplier.purchaseHistory.length})
          </h3>

          {supplier.purchaseHistory.length === 0 ? (
            <p style={{ color: "var(--c-text-secondary)", fontSize: "0.85rem" }}>
              暫無採購紀錄
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {supplier.purchaseHistory.map((purchase) => (
                <div
                  key={purchase.id}
                  className="border"
                  style={{
                    padding: "12px",
                    backgroundColor: "#FAFAFA",
                    borderColor: "var(--c-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <p
                      style={{
                        color: "var(--c-text-primary)",
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      {purchase.flowerName}
                    </p>
                    <p
                      style={{
                        color: "var(--c-accent-green)",
                        margin: 0,
                        fontSize: "0.9rem",
                      }}
                    >
                      {purchase.lineTotalDisplay}
                    </p>
                  </div>
                  <p
                    style={{
                      color: "var(--c-text-secondary)",
                      fontSize: "0.8rem",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {purchase.dateLabel}
                  </p>
                  <p
                    style={{
                      color: "var(--c-text-secondary)",
                      fontSize: "0.8rem",
                      margin: 0,
                    }}
                  >
                    數量: {purchase.quantity} · 單價: {purchase.unitPriceDisplay}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          padding: "var(--s-4)",
          borderTop: "1px solid var(--c-border)",
          display: "flex",
          gap: "var(--s-2)",
          flexShrink: 0,
        }}
      >
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: "0 var(--s-3)",
                height: "36px",
                backgroundColor: "var(--c-accent-black)",
                color: "white",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
              }}
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              className="border"
              style={{
                flex: 1,
                padding: "0 var(--s-3)",
                height: "36px",
                backgroundColor: "transparent",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                flex: 1,
                padding: "0 var(--s-3)",
                height: "36px",
                backgroundColor: "var(--c-accent-black)",
                color: "white",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
              }}
            >
              編輯
            </button>
            <button
              onClick={onClose}
              className="border"
              style={{
                flex: 1,
                padding: "0 var(--s-3)",
                height: "36px",
                backgroundColor: "transparent",
                borderColor: "var(--c-border)",
                fontFamily: "var(--f-sans)",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              關閉
            </button>
          </>
        )}
      </div>
    </div>
  );
}
