import { useLocation } from "react-router";
import { getInitials } from "../lib/format";
import { useShopData } from "../lib/shop-data";
import { useModals } from "./ModalContext";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/flowers": "Flowers",
  "/bouquets": "Bouquets",
  "/inventory": "Inventory",
  "/analytics": "Analytics",
  "/maintenance": "Maintenance",
  "/settings": "Settings",
};

export function TopBar() {
  const location = useLocation();
  const title = titleMap[location.pathname] || "Dashboard";
  const { settings } = useShopData();
  const { openNewOrder } = useModals();

  return (
    <header
      className="h-[70px] flex items-center justify-between border-b"
      style={{
        backgroundColor: "var(--c-bg-app)",
        borderColor: "var(--c-border)",
        padding: "0 var(--s-5)",
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: "var(--f-serif)",
            fontSize: "1.25rem",
            color: "var(--c-text-primary)",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: "var(--f-sans)",
            fontSize: "0.72rem",
            color: "var(--c-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {settings.storeName}
        </p>
      </div>

      <div className="flex items-center" style={{ gap: "var(--s-3)" }}>
        <button
          onClick={openNewOrder}
          className="inline-flex items-center justify-center cursor-pointer transition-all border"
          style={{
            padding: "0 var(--s-3)",
            height: "32px",
            backgroundColor: "transparent",
            borderColor: "var(--c-border)",
            color: "var(--c-text-primary)",
            fontFamily: "var(--f-sans)",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "var(--t-fast)",
          }}
        >
          New Order
        </button>

        <div
          className="grid place-items-center"
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "var(--c-accent-pink)",
            fontFamily: "var(--f-serif)",
            fontSize: "0.9rem",
          }}
        >
          {getInitials(settings.storeName)}
        </div>
      </div>
    </header>
  );
}
