import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import { Flowers } from "./pages/Flowers";
import { Bouquets } from "./pages/Bouquets";
import { Wrappings } from "./pages/Wrappings";
import { Inventory } from "./pages/Inventory";
import { Analytics } from "./pages/Analytics";
import { Maintenance } from "./pages/Maintenance";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "orders", Component: Orders },
      { path: "flowers", Component: Flowers },
      { path: "wrappings", Component: Wrappings },
      { path: "bouquets", Component: Bouquets },
      { path: "inventory", Component: Inventory },
      { path: "analytics", Component: Analytics },
      { path: "maintenance", Component: Maintenance },
      { path: "settings", Component: Settings },
    ],
  },
]);
