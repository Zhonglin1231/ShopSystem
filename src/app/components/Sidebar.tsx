import { Link, useLocation } from "react-router";
import { useShopData } from "../lib/shop-data";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/orders", label: "Orders" },
  { path: "/flowers", label: "Flowers" },
  { path: "/bouquets", label: "Bouquets" },
  { path: "/inventory", label: "Inventory" },
  { path: "/analytics", label: "Analytics" },
  { path: "/maintenance", label: "Maintenance" },
  { path: "/settings", label: "Settings" },
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
          {nameParts.slice(1).join(" ") || "Lan Garden"}
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
          {storageBackend === "firestore" ? "Firebase Live Data" : "Local Seed Data"}
        </p>
      </div>

      <nav className="flex flex-col" style={{ gap: "var(--s-2)" }}>
        {navItems.map((item) => (
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
              color: "var(--c-text-primary)",
              fontFamily: "var(--f-sans)",
              fontSize: "0.9rem",
              letterSpacing: "0.02em",
              textDecoration: "none",
              transition: "var(--t-fast)",
              backgroundColor: isActive(item.path) ? "rgba(255,255,255,0.4)" : "transparent",
              justifyContent: "space-between",
            }}
          >
            <span className="flex items-center" style={{ gap: "var(--s-2)" }}>
              {isActive(item.path) && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: "var(--c-accent-black)" }}
                />
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
      </nav>
    </aside>
  );
}
