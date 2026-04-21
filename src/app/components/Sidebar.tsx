import { Link, useLocation } from "react-router";
import { useShopData } from "../lib/shop-data";

interface NavGroup {
  groupTitle?: string;
  items: { path: string; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { path: "/", label: "儀表板" },
    ],
  },
  {
    items: [
      { path: "/orders", label: "訂單管理" },
    ],
  },
  {
    items: [
      { path: "/customers", label: "客戶管理" },
    ],
  },
  {
    groupTitle: "產品管理",
    items: [
      { path: "/flowers", label: "鮮花" },
      { path: "/bouquets", label: "花束" },
      { path: "/wrappings", label: "包裝" },
    ],
  },
  {
    items: [
      { path: "/inventory", label: "庫存管理" },
    ],
  },
  {
    items: [
      { path: "/suppliers", label: "供應商管理" },
    ],
  },
  {
    items: [
      { path: "/analytics", label: "分析報表" },
    ],
  },
  {
    items: [
      { path: "/maintenance", label: "系統維護" },
    ],
  },
  {
    items: [
      { path: "/settings", label: "設定" },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { settings, storageBackend, newOrderAlertCount, clearNewOrderAlerts } = useShopData();
  const nameParts = settings.storeName.split(/\s+/).filter(Boolean);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className="w-[260px] flex flex-col flex-shrink-0 border-r"
      style={{
        backgroundColor: "var(--c-bg-sidebar)",
        borderColor: "var(--c-border-pink)",
        padding: "var(--s-5) var(--s-4)",
      }}
    >
      <div style={{ marginBottom: "var(--s-6)" }}>
        <h1
          className="leading-[1.1] italic"
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: "1.5rem",
            color: "var(--c-text-primary)",
          }}
        >
          {nameParts[0] ?? "Wai"}
          <br />
          {nameParts.slice(1).join(" ") || "Wai Lan Garden"}
        </h1>
        <p
          style={{
            marginTop: "var(--s-2)",
            fontFamily: "var(--f-sans)",
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--c-text-secondary)",
          }}
        >
          {storageBackend === "firestore" ? "Firebase 即時資料" : "本機種子資料"}
        </p>
      </div>

      <nav className="flex flex-col" style={{ gap: "var(--s-3)" }}>
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex} style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
            {group.groupTitle && (
              <div
                style={{
                  padding: "var(--s-3)",
                  color: "var(--c-text-primary)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.9rem",
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s-2)",
                  cursor: "default",
                }}
              >
                <span>{group.groupTitle}</span>
                <span style={{ color: "var(--c-text-secondary)", fontSize: "0.7rem" }}>▼</span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center relative transition-all ${isActive(item.path) ? "active" : ""}`}
                  onClick={() => {
                    if (item.path === "/orders") {
                      clearNewOrderAlerts();
                    }
                  }}
                  style={{
                    padding: "var(--s-3)",
                    paddingLeft: group.groupTitle ? "calc(var(--s-3) + var(--s-4))" : "var(--s-3)",
                    color: "var(--c-text-primary)",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.9rem",
                    letterSpacing: "0.02em",
                    textDecoration: "none",
                    transition: "var(--t-fast)",
                    backgroundColor: isActive(item.path) ? "rgba(255,255,255,0.4)" : "transparent",
                    justifyContent: "space-between",
                    position: "relative",
                  }}
                >
                  <span className="flex items-center" style={{ gap: "var(--s-2)" }}>
                    {isActive(item.path) && (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                        style={{ backgroundColor: "var(--c-accent-black)" }}
                      />
                    )}
                    {group.groupTitle && (
                      <span style={{ color: "var(--c-text-secondary)", fontSize: "0.5rem", marginLeft: "-var(--s-1)" }}>●</span>
                    )}
                    <span>{item.label}</span>
                  </span>
                  {item.path === "/orders" && newOrderAlertCount > 0 && (
                    <span
                      style={{
                        minWidth: "22px",
                        height: "22px",
                        padding: "0 6px",
                        borderRadius: "999px",
                        backgroundColor: "#C53030",
                        color: "#FFFFFF",
                        fontSize: "0.72rem",
                        lineHeight: "22px",
                        textAlign: "center",
                        fontFamily: "var(--f-sans)",
                      }}
                    >
                      {newOrderAlertCount > 99 ? "99+" : newOrderAlertCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
