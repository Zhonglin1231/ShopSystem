import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  adjustInventory as adjustInventoryRequest,
  AnalyticsData,
  Bouquet,
  CacheRefreshResult,
  createBouquet as createBouquetRequest,
  createFlower as createFlowerRequest,
  createWrapping as createWrappingRequest,
  CreateBouquetInput,
  CreateFlowerInput,
  CreateWrappingInput,
  createOrder as createOrderRequest,
  CreateOrderInput,
  createRestock as createRestockRequest,
  CreateRestockInput,
  DashboardData,
  deleteBouquet as deleteBouquetRequest,
  deleteFlower as deleteFlowerRequest,
  deleteWrapping as deleteWrappingRequest,
  Flower,
  generateWeeklyMaintenanceReport as generateWeeklyMaintenanceReportRequest,
  getAnalytics,
  getBouquets,
  getDashboard,
  getFlowers,
  getHealth,
  getInventory,
  getOrders,
  getSettings,
  getWrappings,
  InventoryItem,
  openOrderEvents,
  Order,
  OrderCreatedEvent,
  OrdersPage,
  refreshMaintenanceCache as refreshMaintenanceCacheRequest,
  RestockRecord,
  StoreSettings,
  SystemHealth,
  updateInventoryStock as updateInventoryStockRequest,
  updateInventoryParLevel as updateInventoryParLevelRequest,
  updateOrderStatus as updateOrderStatusRequest,
  updateSettings as updateSettingsRequest,
  Wrapping,
  WeeklyMaintenanceReport,
} from "./api";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: "Active" | "Inactive";
  statusLabel: string;
  notes: string;
  totalOrders: number;
  totalSpent: number;
  totalSpentDisplay: string;
  createdAt: string;
}

type OfflineSyncStatus = "queued" | "syncing" | "failed";

interface OfflineQueuedOrder {
  id: string;
  createdAt: string;
  payload: CreateOrderInput;
  preview: Order;
  syncStatus: OfflineSyncStatus;
  syncError: string | null;
}

interface OfflineState {
  queue: OfflineQueuedOrder[];
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

interface OfflineStatus {
  isOnline: boolean;
  queueCount: number;
  failedCount: number;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastSyncedLabel: string;
  lastSyncError: string | null;
}

interface ShopDataContextValue {
  dashboard: DashboardData;
  orders: Order[];
  ordersPage: OrdersPage;
  bouquets: Bouquet[];
  flowers: Flower[];
  wrappings: Wrapping[];
  inventory: InventoryItem[];
  restocks: RestockRecord[];
  analytics: AnalyticsData;
  settings: StoreSettings;
  systemHealth: SystemHealth;
  customers: Customer[];
  offlineStatus: OfflineStatus;
  offlineQueue: OfflineQueuedOrder[];
  newOrderAlertCount: number;
  loading: boolean;
  error: string | null;
  storageBackend: string;
  clearNewOrderAlerts: () => void;
  refreshAll: () => Promise<void>;
  refreshMaintenanceCache: () => Promise<CacheRefreshResult>;
  generateWeeklyMaintenanceReport: () => Promise<WeeklyMaintenanceReport>;
  createOrder: (payload: CreateOrderInput) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string) => Promise<Order>;
  createBouquet: (payload: CreateBouquetInput) => Promise<Bouquet>;
  deleteBouquet: (bouquetId: string) => Promise<{ id: string; name: string; deleted: boolean }>;
  createFlower: (payload: CreateFlowerInput) => Promise<Flower>;
  deleteFlower: (flowerId: string) => Promise<{ id: string; name: string; deleted: boolean }>;
  createWrapping: (payload: CreateWrappingInput) => Promise<Wrapping>;
  deleteWrapping: (wrappingId: string) => Promise<{ id: string; name: string; deleted: boolean }>;
  adjustInventory: (itemCode: string, delta: number) => Promise<InventoryItem>;
  updateInventoryStock: (itemCode: string, stock: number) => Promise<InventoryItem>;
  updateInventoryParLevel: (itemCode: string, parLevel: number) => Promise<InventoryItem>;
  saveInventoryDrafts: (changes: Array<{ itemCode: string; stock: number; parLevel: number }>) => Promise<void>;
  createRestock: (payload: CreateRestockInput) => Promise<RestockRecord>;
  saveSettings: (payload: StoreSettings) => Promise<StoreSettings>;
  addCustomer: (customerData: Omit<Customer, "id" | "createdAt">) => void;
}

const OFFLINE_STATE_KEY = "shopsystem.offline-state";
const DEFAULT_ORDERS_PAGE_SIZE = 10;

const defaultSettings: StoreSettings = {
  storeName: "Wai Lan Garden",
  contactEmail: "hello@wailangarden.com",
  maintenanceEmail: "hello@wailangarden.com",
  currency: "USD",
  timezone: "Asia/Shanghai",
  deliveryRadius: 15,
};

const emptyDashboard: DashboardData = {
  kpis: [],
  recentOrders: [],
  weeklySales: [],
  maintenanceSummary: {
    inventoryCorrectionsThisWeek: 0,
    notificationFailuresThisWeek: 0,
    openLowStockItems: 0,
    pendingOrders: 0,
    lastCacheRefreshAt: null,
    lastCacheRefreshLabel: "尚未",
  },
  maintenanceLogs: [],
  latestWeeklyReport: null,
};

const emptyOrdersPage: OrdersPage = {
  items: [],
  page: 1,
  pageSize: DEFAULT_ORDERS_PAGE_SIZE,
  hasNextPage: false,
  hasPreviousPage: false,
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

const emptySystemHealth: SystemHealth = {
  status: "unknown",
  storage: "unknown",
  checkedAt: new Date(0).toISOString(),
  checkedAtLabel: "不可用",
  firebase: {
    status: "unknown",
    label: "未知",
    details: "尚未載入健康狀態資料。",
  },
  notifications: {
    status: "unknown",
    label: "未知",
    details: "尚未載入健康狀態資料。",
  },
  backups: {
    status: "unknown",
    label: "不可用",
    details: "目前沒有可用的備份中繼資料。",
    lastBackupAt: null,
    directory: "output/backups",
    fileCount: 0,
  },
};

const defaultOfflineState: OfflineState = {
  queue: [],
  lastSyncedAt: null,
  lastSyncError: null,
};

const ShopDataContext = createContext<ShopDataContextValue | null>(null);

let notificationAudioContext: AudioContext | null = null;

function isOrdersRouteActive() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/orders" || window.location.pathname.endsWith("/orders");
}

function primeNewOrderAlertSound() {
  if (typeof window === "undefined") {
    return;
  }

  const audioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!audioContextClass) {
    return;
  }

  try {
    notificationAudioContext ??= new audioContextClass();
    if (notificationAudioContext.state === "suspended") {
      void notificationAudioContext.resume().catch(() => undefined);
    }
  } catch {
    // Ignore browser audio restrictions.
  }
}

function playNewOrderAlertSound() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    primeNewOrderAlertSound();
    const audioContext = notificationAudioContext;
    if (!audioContext) {
      return;
    }

    const tones = [
      { frequency: 880, duration: 0.14, offset: 0 },
      { frequency: 1320, duration: 0.18, offset: 0.18 },
    ];

    for (const tone of tones) {
      const startAt = audioContext.currentTime + tone.offset;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, startAt);

      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + tone.duration);
    }
  } catch {
    // Ignore browser audio restrictions.
  }
}

function formatDateTimeLabel(value: string | null, timezone: string) {
  if (!value) {
    return "尚未";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDeliveryLabel(value: string, timezone: string) {
  try {
    const hasTime = value.includes("T");
    const normalized = hasTime ? value : `${value}T09:00:00`;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(normalized));
  } catch {
    return value;
  }
}

function formatCurrencyValue(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function toDateKey(value: string, timezone: string) {
  try {
    const normalized = value.includes("T") ? value : `${value}T09:00:00`;
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    }).format(new Date(normalized));
  } catch {
    return value;
  }
}

function mergeIncomingOrder(currentOrders: Order[], nextOrder: Order) {
  const merged = [nextOrder, ...currentOrders.filter((order) => order.id !== nextOrder.id)];
  return merged.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function updateDashboardWithIncomingOrder(
  currentDashboard: DashboardData,
  order: Order,
  settings: StoreSettings,
) {
  const orderDateKey = toDateKey(order.createdAt, settings.timezone);
  const todayKey = toDateKey(new Date().toISOString(), settings.timezone);
  const isTodayOrder = orderDateKey === todayKey;
  const isPendingOrder = order.status !== "Delivered" && order.status !== "Cancelled";

  const weeklySales = currentDashboard.weeklySales.map((entry) =>
    entry.date === orderDateKey
      ? {
          ...entry,
          amount: Math.round((entry.amount + order.total) * 100) / 100,
        }
      : entry,
  );
  const weeklyRevenue = weeklySales.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    ...currentDashboard,
    recentOrders: mergeIncomingOrder(currentDashboard.recentOrders, order).slice(0, 4),
    weeklySales,
    kpis: currentDashboard.kpis.map((kpi) => {
      if (kpi.label === "Today's Orders" && isTodayOrder) {
        const nextValue = Number.parseInt(kpi.value, 10);
        return {
          ...kpi,
          value: String(Number.isNaN(nextValue) ? 1 : nextValue + 1),
          trend: kpi.trend === "No change vs yesterday" ? "+1 vs yesterday" : kpi.trend,
          isUp: true,
        };
      }

      if (kpi.label === "Pending" && isPendingOrder) {
        const nextValue = Number.parseInt(kpi.value, 10);
        return {
          ...kpi,
          value: String(Number.isNaN(nextValue) ? 1 : nextValue + 1),
          trend: "Action required",
          isUp: false,
        };
      }

      if (kpi.label === "Revenue") {
        return {
          ...kpi,
          value: formatCurrencyValue(weeklyRevenue, settings.currency),
        };
      }

      return kpi;
    }),
    maintenanceSummary: {
      ...currentDashboard.maintenanceSummary,
      pendingOrders: isPendingOrder
        ? currentDashboard.maintenanceSummary.pendingOrders + 1
        : currentDashboard.maintenanceSummary.pendingOrders,
    },
  };
}

function updateFlowersWithIncomingOrder(currentFlowers: Flower[], order: Order) {
  const qtyByFlowerId = new Map<string, number>();
  for (const item of order.lineItems) {
    qtyByFlowerId.set(item.flowerId, (qtyByFlowerId.get(item.flowerId) ?? 0) + item.qty);
  }

  return currentFlowers.map((flower) => ({
    ...flower,
    stock: Math.max(0, flower.stock - (qtyByFlowerId.get(flower.id) ?? 0)),
  }));
}

function updateInventoryWithIncomingOrder(currentInventory: InventoryItem[], flowers: Flower[], order: Order) {
  const inventoryCodeByFlowerId = new Map(flowers.map((flower) => [flower.id, flower.inventoryCode]));
  const qtyByInventoryCode = new Map<string, number>();

  for (const item of order.lineItems) {
    const inventoryCode = inventoryCodeByFlowerId.get(item.flowerId);
    if (!inventoryCode) {
      continue;
    }
    qtyByInventoryCode.set(inventoryCode, (qtyByInventoryCode.get(inventoryCode) ?? 0) + item.qty);
  }

  return currentInventory.map((item) => ({
    ...item,
    stock: Math.max(0, item.stock - (qtyByInventoryCode.get(item.code) ?? 0)),
  }));
}

function updateAnalyticsWithIncomingOrder(currentAnalytics: AnalyticsData, order: Order, settings: StoreSettings) {
  const orderDateKey = toDateKey(order.createdAt, settings.timezone);
  const salesSeries = currentAnalytics.salesSeries.map((entry) =>
    entry.date === orderDateKey
      ? {
          ...entry,
          amount: Math.round((entry.amount + order.total) * 100) / 100,
        }
      : entry,
  );

  const sellerByName = new Map(
    currentAnalytics.topSellers.map((seller) => [seller.name, { ...seller }]),
  );

  for (const item of order.lineItems) {
    const existing = sellerByName.get(item.name);
    if (existing) {
      existing.revenue = Math.round((existing.revenue + item.lineTotal) * 100) / 100;
      existing.revenueDisplay = formatCurrencyValue(existing.revenue, settings.currency);
      existing.unitsSold += item.qty;
      continue;
    }

    sellerByName.set(item.name, {
      name: item.name,
      revenue: item.lineTotal,
      revenueDisplay: formatCurrencyValue(item.lineTotal, settings.currency),
      unitsSold: item.qty,
    });
  }

  const grossRevenue = Math.round((currentAnalytics.totals.grossRevenue + order.total) * 100) / 100;
  const orderCountBase = currentAnalytics.totals.averageOrderValue > 0
    ? Math.max(1, Math.round(currentAnalytics.totals.grossRevenue / currentAnalytics.totals.averageOrderValue))
    : 0;
  const nextOrderCount = orderCountBase + 1;
  const averageOrderValue = nextOrderCount > 0 ? grossRevenue / nextOrderCount : 0;

  return {
    salesSeries,
    topSellers: [...sellerByName.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    totals: {
      grossRevenue,
      grossRevenueDisplay: formatCurrencyValue(grossRevenue, settings.currency),
      completedOrders: currentAnalytics.totals.completedOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      averageOrderValueDisplay: formatCurrencyValue(averageOrderValue, settings.currency),
    },
  };
}

function summarizeItems(lineItems: Order["lineItems"]) {
  return lineItems.map((item) => `${item.name} x${item.qty}`).join(", ");
}

function loadOfflineState(): OfflineState {
  if (typeof window === "undefined") {
    return defaultOfflineState;
  }

  try {
    const rawValue = window.localStorage.getItem(OFFLINE_STATE_KEY);
    if (!rawValue) {
      return defaultOfflineState;
    }

    const parsed = JSON.parse(rawValue) as Partial<OfflineState>;
    const queue: OfflineQueuedOrder[] = Array.isArray(parsed.queue)
      ? parsed.queue.map((entry) => ({
          ...entry,
          syncStatus: (entry.syncStatus === "failed" ? "failed" : "queued") as OfflineSyncStatus,
          syncError: entry.syncError ?? null,
        }))
      : [];

    return {
      queue,
      lastSyncedAt: parsed.lastSyncedAt ?? null,
      lastSyncError: parsed.lastSyncError ?? null,
    };
  } catch {
    return defaultOfflineState;
  }
}

function isLikelyNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  );
}

function buildOfflinePreviewOrder(
  payload: CreateOrderInput,
  flowers: Flower[],
  settings: StoreSettings,
  queueId: string,
  createdAt: string,
  syncStatus: OfflineSyncStatus,
  syncError: string | null,
): Order {
  const flowerMap = new Map(flowers.map((flower) => [flower.id, flower]));
  const lineItems = payload.items.map((item) => {
    const flower = flowerMap.get(item.flowerId);
    const unitPrice = flower?.price ?? 0;
    const lineTotal = unitPrice * item.quantity;
    return {
      flowerId: item.flowerId,
      name: flower?.name ?? "不可用花材",
      qty: item.quantity,
      unit: flower?.unit ?? "stem",
      unitPrice,
      unitPriceDisplay: formatCurrencyValue(unitPrice, settings.currency),
      lineTotal,
      lineTotalDisplay: formatCurrencyValue(lineTotal, settings.currency),
    };
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = payload.deliveryFee;
  const total = subtotal + deliveryFee;
  const shortId = queueId.replace("offline-", "").slice(-4).toUpperCase();

  return {
    id: queueId,
    displayId: `LOCAL-${shortId}`,
    createdAt,
    dateLabel: formatDateTimeLabel(createdAt, settings.timezone),
    customerName: payload.customerName.trim(),
    phone: payload.phone.trim(),
    deliveryDate: payload.deliveryDate,
    deliveryDateLabel: formatDeliveryLabel(payload.deliveryDate, settings.timezone),
    deliveryAddress: payload.deliveryAddress.trim() || "到店自取",
    notes: payload.notes.trim(),
    itemsSummary: summarizeItems(lineItems),
    subtotal,
    subtotalDisplay: formatCurrencyValue(subtotal, settings.currency),
    deliveryFee,
    deliveryFeeDisplay: formatCurrencyValue(deliveryFee, settings.currency),
    total,
    totalDisplay: formatCurrencyValue(total, settings.currency),
    status: "已排隊",
    statusClass: "pending",
    lineItems,
    offlineMeta: {
      localOnly: true,
      syncStatus,
      syncError,
    },
  };
}

function withOfflineMetadata(entry: OfflineQueuedOrder): Order {
  return {
    ...entry.preview,
    offlineMeta: {
      localOnly: true,
      syncStatus: entry.syncStatus,
      syncError: entry.syncError,
    },
  };
}

function mergeOrders(liveOrders: Order[], offlineQueue: OfflineQueuedOrder[]) {
  return [...offlineQueue.map(withOfflineMetadata), ...liveOrders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function applyOfflineReservationsToFlowers(flowers: Flower[], offlineQueue: OfflineQueuedOrder[]) {
  const reservedByFlowerId = new Map<string, number>();

  for (const entry of offlineQueue) {
    for (const item of entry.payload.items) {
      reservedByFlowerId.set(item.flowerId, (reservedByFlowerId.get(item.flowerId) ?? 0) + item.quantity);
    }
  }

  return flowers.map((flower) => {
    const reserved = reservedByFlowerId.get(flower.id) ?? 0;
    return {
      ...flower,
      stock: Math.max(0, flower.stock - reserved),
    };
  });
}

function applyOfflineReservationsToInventory(
  inventory: InventoryItem[],
  flowers: Flower[],
  offlineQueue: OfflineQueuedOrder[],
) {
  const inventoryCodeByFlowerId = new Map(flowers.map((flower) => [flower.id, flower.inventoryCode]));
  const reservedByCode = new Map<string, number>();

  for (const entry of offlineQueue) {
    for (const item of entry.payload.items) {
      const inventoryCode = inventoryCodeByFlowerId.get(item.flowerId);
      if (!inventoryCode) {
        continue;
      }

      reservedByCode.set(inventoryCode, (reservedByCode.get(inventoryCode) ?? 0) + item.quantity);
    }
  }

  return inventory.map((item) => ({
    ...item,
    stock: Math.max(0, item.stock - (reservedByCode.get(item.code) ?? 0)),
  }));
}

function applyOfflineOrdersToDashboard(baseDashboard: DashboardData, orders: Order[]) {
  const offlineOrders = orders.filter((order) => order.offlineMeta?.localOnly);
  if (offlineOrders.length === 0) {
    return baseDashboard;
  }

  const pendingOfflineOrders = offlineOrders.filter((order) => order.status !== "Cancelled" && order.status !== "Delivered").length;

  return {
    ...baseDashboard,
    recentOrders: orders.slice(0, 5),
    maintenanceSummary: {
      ...baseDashboard.maintenanceSummary,
      pendingOrders: baseDashboard.maintenanceSummary.pendingOrders + pendingOfflineOrders,
    },
  };
}

function validateOfflineOrderPayload(payload: CreateOrderInput, flowers: Flower[]) {
  const requestedByFlower = new Map<string, number>();
  for (const item of payload.items) {
    requestedByFlower.set(item.flowerId, (requestedByFlower.get(item.flowerId) ?? 0) + item.quantity);
  }

  for (const [flowerId, quantity] of requestedByFlower.entries()) {
    const flower = flowers.find((entry) => entry.id === flowerId);
    if (!flower) {
      throw new Error("部分花材已不可用。");
    }
    if (flower.stock < quantity) {
      throw new Error(`Not enough stock for ${flower.name}.`);
    }
  }
}

export function ShopDataProvider({ children }: { children: ReactNode }) {
  const [baseDashboard, setBaseDashboard] = useState<DashboardData>(emptyDashboard);
  const [baseOrders, setBaseOrders] = useState<Order[]>([]);
  const [baseOrdersPage, setBaseOrdersPage] = useState<OrdersPage>(emptyOrdersPage);
  const [baseBouquets, setBaseBouquets] = useState<Bouquet[]>([]);
  const [baseFlowers, setBaseFlowers] = useState<Flower[]>([]);
  const [baseWrappings, setBaseWrappings] = useState<Wrapping[]>([]);
  const [baseInventory, setBaseInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [restocks, setRestocks] = useState<RestockRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(emptySystemHealth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageBackend, setStorageBackend] = useState("unknown");
  const [newOrderAlertCount, setNewOrderAlertCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [syncingOfflineQueue, setSyncingOfflineQueue] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState>(() => loadOfflineState());

  const offlineStateRef = useRef(offlineState);
  const baseOrdersRef = useRef(baseOrders);
  const settingsRef = useRef(settings);
  const baseFlowersRef = useRef(baseFlowers);
  const hasOrderBaselineRef = useRef(false);
  const orderRefreshInFlightRef = useRef(false);
  const hasOrderStreamReadyRef = useRef(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    offlineStateRef.current = offlineState;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(OFFLINE_STATE_KEY, JSON.stringify(offlineState));
    }
  }, [offlineState]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    baseOrdersRef.current = baseOrders;
  }, [baseOrders]);

  useEffect(() => {
    baseFlowersRef.current = baseFlowers;
  }, [baseFlowers]);

  const flowers = applyOfflineReservationsToFlowers(baseFlowers, offlineState.queue);
  const inventory = applyOfflineReservationsToInventory(baseInventory, baseFlowers, offlineState.queue);
  const orders = mergeOrders(baseOrders, offlineState.queue);
  const dashboard = applyOfflineOrdersToDashboard(baseDashboard, orders);

  const offlineStatus: OfflineStatus = {
    isOnline,
    queueCount: offlineState.queue.length,
    failedCount: offlineState.queue.filter((entry) => entry.syncStatus === "failed").length,
    syncing: syncingOfflineQueue,
    lastSyncedAt: offlineState.lastSyncedAt,
    lastSyncedLabel: formatDateTimeLabel(offlineState.lastSyncedAt, settings.timezone),
    lastSyncError: offlineState.lastSyncError,
  };

  const loadAll = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setError(null);
      const [
        health,
        nextDashboard,
        nextOrdersPage,
        nextBouquets,
        nextFlowers,
        nextWrappings,
        nextInventory,
        nextAnalytics,
        nextSettings,
      ] =
        await Promise.all([
          getHealth(),
          getDashboard(),
          getOrders(1, DEFAULT_ORDERS_PAGE_SIZE),
          getBouquets(),
          getFlowers(),
          getWrappings(),
          getInventory(),
          getAnalytics(),
          getSettings(),
        ]);

      setSystemHealth(health);
      setStorageBackend(health.storage);
      setBaseDashboard(nextDashboard);
      baseOrdersRef.current = nextOrdersPage.items;
      hasOrderBaselineRef.current = true;
      setBaseOrders(nextOrdersPage.items);
      setBaseOrdersPage(nextOrdersPage);
      setBaseBouquets(nextBouquets);
      setBaseFlowers(nextFlowers);
      setBaseWrappings(nextWrappings);
      setBaseInventory(nextInventory.items);
      setRestocks(nextInventory.restocks);
      setAnalytics(nextAnalytics);
      setSettings(nextSettings);
    } catch (requestError) {
      const nextError =
        requestError instanceof Error
          ? requestError.message
          : "無法載入店舖資料。";
      setError(nextError);

      if (!isOnline || isLikelyNetworkError(requestError)) {
        setSystemHealth((current) => ({
          ...current,
          status: "degraded",
          checkedAt: new Date().toISOString(),
          checkedAtLabel: "離線",
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshOrdersOnly = async () => {
    if (!isOnline || orderRefreshInFlightRef.current) {
      return;
    }

    orderRefreshInFlightRef.current = true;

    try {
      const nextOrdersPage = await getOrders(1, baseOrdersPage.pageSize || DEFAULT_ORDERS_PAGE_SIZE);
      baseOrdersRef.current = nextOrdersPage.items;
      hasOrderBaselineRef.current = true;
      setBaseOrders(nextOrdersPage.items);
      setBaseOrdersPage(nextOrdersPage);
    } catch {
      // Keep listener resync failures silent while EventSource reconnects.
    } finally {
      orderRefreshInFlightRef.current = false;
    }
  };

  const applyIncomingOrderEvent = (nextOrder: Order, options?: { notify?: boolean }) => {
    const shouldNotify = options?.notify ?? true;

    if (baseOrdersRef.current.some((order) => order.id === nextOrder.id)) {
      return;
    }

    const nextOrders = mergeIncomingOrder(baseOrdersRef.current, nextOrder);
    const nextFlowers = updateFlowersWithIncomingOrder(baseFlowersRef.current, nextOrder);
    const nextPageSize = baseOrdersPage.pageSize || DEFAULT_ORDERS_PAGE_SIZE;
    const pageItems = nextOrders.slice(0, nextPageSize);

    baseOrdersRef.current = pageItems;
    baseFlowersRef.current = nextFlowers;
    hasOrderBaselineRef.current = true;

    setBaseOrders(pageItems);
    setBaseOrdersPage((current) => ({
      ...current,
      items: pageItems,
      page: 1,
      pageSize: current.pageSize || nextPageSize,
      hasNextPage: current.hasNextPage || nextOrders.length > nextPageSize,
      hasPreviousPage: false,
    }));
    setBaseDashboard((current) => updateDashboardWithIncomingOrder(current, nextOrder, settingsRef.current));
    setBaseFlowers(nextFlowers);
    setBaseInventory((current) => updateInventoryWithIncomingOrder(current, nextFlowers, nextOrder));
    setAnalytics((current) => updateAnalyticsWithIncomingOrder(current, nextOrder, settingsRef.current));

    if (shouldNotify) {
      playNewOrderAlertSound();
    }

    if (shouldNotify && !isOrdersRouteActive()) {
      setNewOrderAlertCount((current) => current + 1);
    }
  };

  const syncOfflineQueue = async () => {
    if (!isOnline || syncingRef.current) {
      return;
    }

    const queuedEntries = offlineStateRef.current.queue.filter((entry) => entry.syncStatus !== "failed");
    if (queuedEntries.length === 0) {
      return;
    }

    syncingRef.current = true;
    setSyncingOfflineQueue(true);

    let syncedCount = 0;
    let lastSyncError: string | null = null;

    try {
      for (const entry of queuedEntries) {
        setOfflineState((current) => ({
          ...current,
          queue: current.queue.map((queuedEntry) =>
            queuedEntry.id === entry.id
              ? {
                  ...queuedEntry,
                  syncStatus: "syncing",
                  syncError: null,
                }
              : queuedEntry,
          ),
        }));

        try {
          await createOrderRequest(entry.payload);
          syncedCount += 1;
          setOfflineState((current) => ({
            ...current,
            queue: current.queue.filter((queuedEntry) => queuedEntry.id !== entry.id),
            lastSyncedAt: new Date().toISOString(),
            lastSyncError: null,
          }));
        } catch (syncError) {
          if (isLikelyNetworkError(syncError)) {
            const message =
              syncError instanceof Error ? syncError.message : "同步排隊訂單時網絡中斷。";
            lastSyncError = message;
            setOfflineState((current) => ({
              ...current,
              queue: current.queue.map((queuedEntry) =>
                queuedEntry.id === entry.id
                  ? {
                      ...queuedEntry,
                      syncStatus: "queued",
                      syncError: message,
                    }
                  : queuedEntry,
              ),
              lastSyncError: message,
            }));
            break;
          }

          const message =
            syncError instanceof Error ? syncError.message : "此排隊訂單無法同步。";
          lastSyncError = message;
          setOfflineState((current) => ({
            ...current,
            queue: current.queue.map((queuedEntry) =>
              queuedEntry.id === entry.id
                ? {
                    ...queuedEntry,
                    syncStatus: "failed",
                    syncError: message,
                  }
                : queuedEntry,
            ),
            lastSyncError: message,
          }));
        }
      }

      if (syncedCount > 0) {
        await loadAll(false);
      }
    } finally {
      syncingRef.current = false;
      setSyncingOfflineQueue(false);

      if (lastSyncError) {
        setError(lastSyncError);
      }
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      primeNewOrderAlertSound();
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void loadAll(false);
      void syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && offlineState.queue.some((entry) => entry.syncStatus !== "failed")) {
      void syncOfflineQueue();
    }
  }, [isOnline, offlineState.queue.length]);

  useEffect(() => {
    if (!isOnline || storageBackend !== "firestore") {
      return;
    }

    const eventSource = openOrderEvents();
    if (!eventSource) {
      return;
    }

    const handleReady = () => {
      if (!hasOrderStreamReadyRef.current) {
        hasOrderStreamReadyRef.current = true;
        return;
      }

      void refreshOrdersOnly();
    };

    const handleOrderCreated = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as OrderCreatedEvent;
        applyIncomingOrderEvent(payload.order);
      } catch {
        // Ignore malformed listener payloads and wait for the next valid event.
      }
    };

    eventSource.addEventListener("ready", handleReady);
    eventSource.addEventListener("order_created", handleOrderCreated);

    return () => {
      eventSource.removeEventListener("ready", handleReady);
      eventSource.removeEventListener("order_created", handleOrderCreated);
      eventSource.close();
    };
  }, [isOnline, storageBackend]);

  const refreshInventoryRelatedData = async () => {
    const [nextDashboard, nextFlowers, nextInventory] = await Promise.all([
      getDashboard(),
      getFlowers(),
      getInventory(),
    ]);
    setBaseDashboard(nextDashboard);
    setBaseFlowers(nextFlowers);
    setBaseInventory(nextInventory.items);
    setRestocks(nextInventory.restocks);
  };

  const refreshDashboardAndFlowers = async () => {
    try {
      const [nextDashboard, nextFlowers] = await Promise.all([getDashboard(), getFlowers()]);
      setBaseDashboard(nextDashboard);
      setBaseFlowers(nextFlowers);
    } catch {
      // Keep the fast local update and avoid surfacing a second error for a successful mutation.
    }
  };

  const runMutation = async <T,>(
    request: () => Promise<T>,
    onSuccess?: (result: T) => Promise<void> | void,
  ) => {
    setError(null);
    const result = await request();
    if (onSuccess) {
      await onSuccess(result);
    } else {
      await loadAll(false);
    }
    return result;
  };

  const queueOfflineOrder = (payload: CreateOrderInput) => {
    validateOfflineOrderPayload(payload, flowers);

    const createdAt = new Date().toISOString();
    const queueId = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const preview = buildOfflinePreviewOrder(
      payload,
      baseFlowersRef.current,
      settingsRef.current,
      queueId,
      createdAt,
      "queued",
      null,
    );

    const entry: OfflineQueuedOrder = {
      id: queueId,
      createdAt,
      payload,
      preview,
      syncStatus: "queued",
      syncError: null,
    };

    setOfflineState((current) => ({
      ...current,
      queue: [entry, ...current.queue],
      lastSyncError: null,
    }));
    setError(null);

    return preview;
  };

  const clearNewOrderAlerts = () => {
    setNewOrderAlertCount(0);
  };

  return (
    <ShopDataContext.Provider
      value={{
        dashboard,
        orders,
        ordersPage: {
          ...baseOrdersPage,
          items: orders,
        },
        bouquets: baseBouquets,
        flowers,
        wrappings: baseWrappings,
        inventory,
        restocks,
        analytics,
        settings,
        systemHealth,
        customers,
        offlineStatus,
        offlineQueue: offlineState.queue,
        newOrderAlertCount,
        loading,
        error,
        storageBackend,
        clearNewOrderAlerts,
        refreshAll: async () => {
          await loadAll(false);
          await syncOfflineQueue();
        },
        refreshMaintenanceCache: () => runMutation(() => refreshMaintenanceCacheRequest()),
        generateWeeklyMaintenanceReport: () => runMutation(() => generateWeeklyMaintenanceReportRequest()),
        createOrder: async (payload) => {
          if (!isOnline) {
            return queueOfflineOrder(payload);
          }

          try {
            return await runMutation(() => createOrderRequest(payload), (createdOrder) => {
              applyIncomingOrderEvent(createdOrder, { notify: false });
            });
          } catch (createError) {
            if (!isLikelyNetworkError(createError)) {
              throw createError;
            }

            return queueOfflineOrder(payload);
          }
        },
        updateOrderStatus: (orderId, status) => {
          if (orderId.startsWith("offline-")) {
            return Promise.reject(new Error("離線排隊訂單需同步後才可更新。"));
          }

          return runMutation(() => updateOrderStatusRequest(orderId, status));
        },
        createBouquet: (payload) => runMutation(() => createBouquetRequest(payload)),
        deleteBouquet: (bouquetId) => runMutation(() => deleteBouquetRequest(bouquetId)),
        createFlower: (payload) => runMutation(() => createFlowerRequest(payload)),
        deleteFlower: (flowerId) => runMutation(() => deleteFlowerRequest(flowerId)),
        createWrapping: (payload) => runMutation(() => createWrappingRequest(payload)),
        deleteWrapping: (wrappingId) => runMutation(() => deleteWrappingRequest(wrappingId)),
        adjustInventory: (itemCode, delta) =>
          runMutation(() => adjustInventoryRequest(itemCode, delta), (nextItem) => {
            setBaseInventory((currentInventory) =>
              currentInventory.map((item) => (item.code === nextItem.code ? nextItem : item)),
            );
            void refreshDashboardAndFlowers();
          }),
        updateInventoryStock: (itemCode, stock) =>
          runMutation(() => updateInventoryStockRequest(itemCode, stock), (nextItem) => {
            setBaseInventory((currentInventory) =>
              currentInventory.map((item) => (item.code === nextItem.code ? nextItem : item)),
            );
            void refreshDashboardAndFlowers();
          }),
        updateInventoryParLevel: (itemCode, parLevel) =>
          runMutation(() => updateInventoryParLevelRequest(itemCode, parLevel), (nextItem) => {
            setBaseInventory((currentInventory) =>
              currentInventory.map((item) => (item.code === nextItem.code ? nextItem : item)),
            );
            void refreshDashboardAndFlowers();
          }),
        saveInventoryDrafts: async (changes) => {
          setError(null);
          try {
            for (const change of changes) {
              const currentItem = inventory.find((item) => item.code === change.itemCode);
              if (!currentItem) {
                continue;
              }

              if (currentItem.stock !== change.stock) {
                await updateInventoryStockRequest(change.itemCode, change.stock);
              }

              if (currentItem.par !== change.parLevel) {
                await updateInventoryParLevelRequest(change.itemCode, change.parLevel);
              }
            }

            await refreshInventoryRelatedData();
          } catch (saveError) {
            await refreshInventoryRelatedData().catch(() => undefined);
            throw saveError;
          }
        },
        createRestock: (payload) => runMutation(() => createRestockRequest(payload)),
        saveSettings: (payload) => runMutation(() => updateSettingsRequest(payload)),
        addCustomer: (customerData) => {
          const newCustomer: Customer = {
            id: `customer-${Date.now()}`,
            ...customerData,
            statusLabel: customerData.status === "Active" ? "活躍" : "不活躍",
            createdAt: new Date().toISOString(),
          };
          setCustomers((current) => [newCustomer, ...current]);
        },
      }}
    >
      {children}
    </ShopDataContext.Provider>
  );
}

export function useShopData() {
  const context = useContext(ShopDataContext);
  if (context === null) {
    throw new Error("`useShopData` 必須在 `ShopDataProvider` 內使用。");
  }
  return context;
}
