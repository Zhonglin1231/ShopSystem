import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  adjustInventory as adjustInventoryRequest,
  AnalyticsData,
  createFlower as createFlowerRequest,
  CreateFlowerInput,
  createOrder as createOrderRequest,
  CreateOrderInput,
  createRestock as createRestockRequest,
  CreateRestockInput,
  DashboardData,
  Flower,
  getAnalytics,
  getDashboard,
  getFlowers,
  getHealth,
  getInventory,
  getOrders,
  getSettings,
  InventoryItem,
  Order,
  RestockRecord,
  StoreSettings,
  updateInventoryParLevel as updateInventoryParLevelRequest,
  updateOrderStatus as updateOrderStatusRequest,
  updateSettings as updateSettingsRequest,
} from "./api";

interface ShopDataContextValue {
  dashboard: DashboardData;
  orders: Order[];
  flowers: Flower[];
  inventory: InventoryItem[];
  restocks: RestockRecord[];
  analytics: AnalyticsData;
  settings: StoreSettings;
  loading: boolean;
  error: string | null;
  storageBackend: string;
  refreshAll: () => Promise<void>;
  createOrder: (payload: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string) => Promise<Order>;
  createFlower: (payload: CreateFlowerInput) => Promise<Flower>;
  adjustInventory: (itemCode: string, delta: number) => Promise<InventoryItem>;
  updateInventoryParLevel: (itemCode: string, parLevel: number) => Promise<InventoryItem>;
  createRestock: (payload: CreateRestockInput) => Promise<RestockRecord>;
  saveSettings: (payload: StoreSettings) => Promise<StoreSettings>;
}

const defaultSettings: StoreSettings = {
  storeName: "Wai Lan Garden",
  contactEmail: "hello@wailangarden.com",
  currency: "USD",
  timezone: "America/New_York",
  deliveryRadius: 15,
};

const emptyDashboard: DashboardData = {
  kpis: [],
  recentOrders: [],
  weeklySales: [],
};

const emptyAnalytics: AnalyticsData = {
  salesSeries: [],
  topSellers: [],
  totals: {
    grossRevenue: 0,
    grossRevenueDisplay: "$0.00",
    completedOrders: 0,
    averageOrderValue: 0,
    averageOrderValueDisplay: "$0.00",
  },
};

const ShopDataContext = createContext<ShopDataContextValue | null>(null);

export function ShopDataProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [orders, setOrders] = useState<Order[]>([]);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [restocks, setRestocks] = useState<RestockRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageBackend, setStorageBackend] = useState("unknown");

  const loadAll = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setError(null);
      const [health, nextDashboard, nextOrders, nextFlowers, nextInventory, nextAnalytics, nextSettings] =
        await Promise.all([
          getHealth(),
          getDashboard(),
          getOrders(),
          getFlowers(),
          getInventory(),
          getAnalytics(),
          getSettings(),
        ]);

      setStorageBackend(health.storage);
      setDashboard(nextDashboard);
      setOrders(nextOrders);
      setFlowers(nextFlowers);
      setInventory(nextInventory.items);
      setRestocks(nextInventory.restocks);
      setAnalytics(nextAnalytics);
      setSettings(nextSettings);
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load the store data.";
      setError(nextError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const runMutation = async <T,>(request: () => Promise<T>) => {
    setError(null);
    const result = await request();
    await loadAll(false);
    return result;
  };

  return (
    <ShopDataContext.Provider
      value={{
        dashboard,
        orders,
        flowers,
        inventory,
        restocks,
        analytics,
        settings,
        loading,
        error,
        storageBackend,
        refreshAll: () => loadAll(false),
        createOrder: (payload) => runMutation(() => createOrderRequest(payload)),
        updateOrderStatus: (orderId, status) =>
          runMutation(() => updateOrderStatusRequest(orderId, status)),
        createFlower: (payload) => runMutation(() => createFlowerRequest(payload)),
        adjustInventory: (itemCode, delta) =>
          runMutation(() => adjustInventoryRequest(itemCode, delta)),
        updateInventoryParLevel: (itemCode, parLevel) =>
          runMutation(() => updateInventoryParLevelRequest(itemCode, parLevel)),
        createRestock: (payload) => runMutation(() => createRestockRequest(payload)),
        saveSettings: (payload) => runMutation(() => updateSettingsRequest(payload)),
      }}
    >
      {children}
    </ShopDataContext.Provider>
  );
}

export function useShopData() {
  const context = useContext(ShopDataContext);
  if (context === null) {
    throw new Error("useShopData must be used inside ShopDataProvider.");
  }
  return context;
}
