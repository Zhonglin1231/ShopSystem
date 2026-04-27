export interface DashboardKpi {
  label: string;
  value: string;
  trend: string;
  isUp: boolean;
}

export interface MaintenanceSummary {
  inventoryCorrectionsThisWeek: number;
  notificationFailuresThisWeek: number;
  openLowStockItems: number;
  pendingOrders: number;
  lastCacheRefreshAt: string | null;
  lastCacheRefreshLabel: string;
}

export interface MaintenanceLog {
  id: string;
  createdAt: string;
  dateLabel: string;
  eventType: string;
  eventLabel: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  relatedCode?: string | null;
  relatedName?: string | null;
}

export interface WeeklyMaintenanceReport {
  id: string;
  createdAt: string;
  createdAtLabel: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  status: string;
  notificationStatus: string;
  deliveryMessage: string;
  recipient: string;
  inventoryCorrections: number;
  notificationFailures: number;
  weekOrders: number;
  pendingOrders: number;
  lowStockItems: number;
  downloadUrl: string | null;
}

export interface CacheRefreshResult {
  status: string;
  storage: string;
  refreshedAt: string;
  message: string;
}

export interface HealthServiceStatus {
  status: string;
  label: string;
  details: string;
}

export interface BackupHealthStatus extends HealthServiceStatus {
  lastBackupAt: string | null;
  directory: string;
  fileCount: number;
}

export interface SystemHealth {
  status: string;
  storage: string;
  checkedAt: string;
  checkedAtLabel: string;
  firebase: HealthServiceStatus;
  notifications: HealthServiceStatus;
  backups: BackupHealthStatus;
}

export interface OrderLineItem {
  flowerId: string;
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  unitPriceDisplay: string;
  lineTotal: number;
  lineTotalDisplay: string;
}

export interface Order {
  id: string;
  displayId: string;
  createdAt: string;
  dateLabel: string;
  customerName: string;
  phone: string;
  deliveryDate: string;
  deliveryDateLabel: string;
  deliveryAddress: string;
  notes: string;
  itemsSummary: string;
  subtotal: number;
  subtotalDisplay: string;
  deliveryFee: number;
  deliveryFeeDisplay: string;
  total: number;
  totalDisplay: string;
  status: string;
  statusClass: string;
  lineItems: OrderLineItem[];
  offlineMeta?: {
    localOnly: boolean;
    syncStatus: "queued" | "syncing" | "failed";
    syncError?: string | null;
  };
}

export interface OrderCreatedEvent {
  type: "order_created";
  order: Order;
}

export interface OrdersPage {
  items: Order[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface OrderStreamReadyEvent {
  type: "ready";
  listener: boolean;
  storage: string;
}

export interface Flower {
  id: string;
  name: string;
  category: string;
  color: string;
  price: number;
  priceDisplay: string;
  unit: string;
  season: string;
  description: string;
  image: string;
  stock: number;
  status: string;
  statusClass: string;
  inventoryCode: string;
  parLevel: number;
}

export interface BouquetComponent {
  flowerId: string;
  flowerName: string;
  quantity: number;
  unit: string;
  image: string;
}

export interface Bouquet {
  id: string;
  name: string;
  image: string;
  components: BouquetComponent[];
  varietyCount: number;
  totalQuantity: number;
  componentSummary: string;
}

export interface Wrapping {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  image: string;
}

export interface InventoryItem {
  code: string;
  name: string;
  category: string;
  stock: number;
  par: number;
  averageCost: number | null;
  averageCostDisplay: string;
  status: string;
  statusClass: string;
  unit: string;
  linkedFlowerId?: string | null;
}

export interface RestockRecord {
  id: string;
  createdAt: string;
  dateLabel: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  unitCostDisplay: string;
  totalCost: number;
  totalCostDisplay: string;
}

export interface DashboardData {
  kpis: DashboardKpi[];
  recentOrders: Order[];
  weeklySales: Array<{
    date: string;
    label: string;
    amount: number;
  }>;
  maintenanceSummary: MaintenanceSummary;
  maintenanceLogs: MaintenanceLog[];
  latestWeeklyReport: WeeklyMaintenanceReport | null;
}

export interface AnalyticsData {
  salesSeries: Array<{
    date: string;
    label: string;
    amount: number;
  }>;
  topSellers: Array<{
    name: string;
    revenue: number;
    revenueDisplay: string;
    unitsSold: number;
  }>;
  totals: {
    grossRevenue: number;
    grossRevenueDisplay: string;
    completedOrders: number;
    averageOrderValue: number;
    averageOrderValueDisplay: string;
  };
}

export interface StoreSettings {
  storeName: string;
  contactEmail: string;
  maintenanceEmail: string;
  currency: string;
  timezone: string;
  deliveryRadius: number;
}

export interface AiPreviewSettings {
  apiKey: string;
  modelName: string;
  imageSize: string;
}

export interface InventoryPayload {
  items: InventoryItem[];
  restocks: RestockRecord[];
}

export interface CreateOrderInput {
  customerName: string;
  phone: string;
  deliveryDate: string;
  deliveryAddress: string;
  notes: string;
  deliveryFee: number;
  items: Array<{
    flowerId: string;
    quantity: number;
  }>;
}

export interface CreateFlowerInput {
  name: string;
  category: string;
  price: number;
  unit: string;
  openingStock: number;
  parLevel: number;
  season: string;
  color: string;
  description: string;
  image?: string | null;
}

export interface CreateBouquetInput {
  name: string;
  components: Array<{
    flowerId: string;
    quantity: number;
  }>;
  image?: string | null;
}

export interface CreateRestockInput {
  itemCode: string;
  quantity: number;
  unitCost: number;
}

export interface CreateWrappingInput {
  name: string;
  price: number;
  image?: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  let payload: unknown = null;

  if (contentType.includes("application/json")) {
    payload = await response.json().catch(() => null);
  } else {
    payload = await response.text().catch(() => "");
  }

  if (!response.ok) {
    if (payload && typeof payload === "object" && "detail" in payload) {
      throw new Error(String((payload as { detail?: unknown }).detail ?? "請求失敗。"));
    }
    throw new Error("請求失敗。");
  }

  if (payload === null || typeof payload === "string") {
    throw new Error("後端 API 回傳格式異常，可能是 /api 被改寫到前端頁面（index.html）。");
  }

  return payload as T;
}

export function getHealth() {
  return request<SystemHealth>("/health");
}

export function getDashboard() {
  return request<DashboardData>("/dashboard");
}

export function refreshMaintenanceCache() {
  return request<CacheRefreshResult>("/maintenance/cache/refresh", {
    method: "POST",
  });
}

export function generateWeeklyMaintenanceReport() {
  return request<WeeklyMaintenanceReport>("/maintenance/reports/generate", {
    method: "POST",
  });
}

export function getOrders(page = 1, pageSize = 10, search = "") {
  return request<OrdersPage>(
    `/orders?page=${encodeURIComponent(String(page))}&page_size=${encodeURIComponent(String(pageSize))}&search=${encodeURIComponent(search)}`,
  );
}

export function getAllOrders() {
  return request<Order[]>("/orders/all");
}

export function createOrder(payload: CreateOrderInput) {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrderStatus(orderId: string, status: string) {
  return request<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getFlowers() {
  return request<Flower[]>("/flowers");
}

export function createFlower(payload: CreateFlowerInput) {
  return request<Flower>("/flowers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteFlower(flowerId: string) {
  return request<{ id: string; name: string; deleted: boolean }>(`/flowers/${encodeURIComponent(flowerId)}`, {
    method: "DELETE",
  });
}

export function getBouquets() {
  return request<Bouquet[]>("/bouquets");
}

export function createBouquet(payload: CreateBouquetInput) {
  return request<Bouquet>("/bouquets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteBouquet(bouquetId: string) {
  return request<{ id: string; name: string; deleted: boolean }>(`/bouquets/${encodeURIComponent(bouquetId)}`, {
    method: "DELETE",
  });
}

export function getWrappings() {
  return request<Wrapping[]>("/wrappings");
}

export function createWrapping(payload: CreateWrappingInput) {
  return request<Wrapping>("/wrappings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteWrapping(wrappingId: string) {
  return request<{ id: string; name: string; deleted: boolean }>(`/wrappings/${encodeURIComponent(wrappingId)}`, {
    method: "DELETE",
  });
}

export function getInventory() {
  return request<InventoryPayload>("/inventory");
}

export function adjustInventory(itemCode: string, delta: number) {
  return request<InventoryItem>(`/inventory/${encodeURIComponent(itemCode)}`, {
    method: "PATCH",
    body: JSON.stringify({ delta }),
  });
}

export function updateInventoryStock(itemCode: string, stock: number) {
  return request<InventoryItem>(`/inventory/${encodeURIComponent(itemCode)}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock }),
  });
}

export function updateInventoryParLevel(itemCode: string, parLevel: number) {
  return request<InventoryItem>(`/inventory/${encodeURIComponent(itemCode)}/par`, {
    method: "PATCH",
    body: JSON.stringify({ parLevel }),
  });
}

export function createRestock(payload: CreateRestockInput) {
  return request<RestockRecord>("/inventory/restocks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAnalytics() {
  return request<AnalyticsData>("/analytics");
}

export function getSettings() {
  return request<StoreSettings>("/settings");
}

export function updateSettings(payload: StoreSettings) {
  return request<StoreSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getAiPreviewSettings() {
  return request<AiPreviewSettings>("/settings/ai-preview");
}

export function updateAiPreviewSettings(payload: AiPreviewSettings) {
  return request<AiPreviewSettings>("/settings/ai-preview", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function openOrderEvents() {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return null;
  }

  return new EventSource(`${API_BASE}/orders/stream`);
}
