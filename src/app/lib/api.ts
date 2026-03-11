export interface DashboardKpi {
  label: string;
  value: string;
  trend: string;
  isUp: boolean;
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

export interface InventoryItem {
  code: string;
  name: string;
  category: string;
  stock: number;
  par: number;
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
  currency: string;
  timezone: string;
  deliveryRadius: number;
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

export interface CreateRestockInput {
  itemCode: string;
  quantity: number;
  unitCost: number;
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

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || "Request failed.");
  }

  return payload as T;
}

export function getHealth() {
  return request<{ status: string; storage: string }>("/health");
}

export function getDashboard() {
  return request<DashboardData>("/dashboard");
}

export function getOrders() {
  return request<Order[]>("/orders");
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

export function getInventory() {
  return request<InventoryPayload>("/inventory");
}

export function adjustInventory(itemCode: string, delta: number) {
  return request<InventoryItem>(`/inventory/${encodeURIComponent(itemCode)}`, {
    method: "PATCH",
    body: JSON.stringify({ delta }),
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
