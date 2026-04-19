export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("zh-HK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatCompactCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("zh-HK", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return formatCurrency(amount, currency);
  }
}

export function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "SS";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getChartMax(series: Array<{ amount: number }>) {
  const rawMax = Math.max(...series.map((item) => item.amount), 0);
  if (rawMax <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const normalized = rawMax / magnitude;

  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

export function buildChartBars(series: Array<{ label: string; amount: number }>) {
  const max = getChartMax(series);
  return series.map((item) => ({
    ...item,
    height: item.amount <= 0 ? 0 : Math.max(14, Math.round((item.amount / max) * 100)),
  }));
}

export function buildChartScale(series: Array<{ amount: number }>, tickCount = 4) {
  const max = getChartMax(series);
  return {
    max,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => {
      const value = (max / tickCount) * index;
      return {
        value,
        percent: max === 0 ? 0 : (value / max) * 100,
      };
    }),
  };
}

export function getChartBarColor(amount: number, max: number) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(amount / max, 1));
  const saturation = 36 + ratio * 18;
  const lightness = 86 - ratio * 28;
  return `hsl(12 ${saturation}% ${lightness}%)`;
}

export function translateOrderStatus(status: string) {
  const map: Record<string, string> = {
    Queued: "已排隊",
    Preparing: "製作中",
    Ready: "可取貨",
    Delivered: "已送達",
    Cancelled: "已取消",
    received: "已接單",
  };
  return map[status] ?? status;
}

export function translateStockStatus(status: string) {
  const map: Record<string, string> = {
    "In Stock": "有庫存",
    "Low Stock": "低庫存",
    "Out of Stock": "缺貨",
  };
  return map[status] ?? status;
}

export function translateDashboardLabel(label: string) {
  const map: Record<string, string> = {
    "Today's Orders": "今日訂單",
    Pending: "待處理",
    Revenue: "收入",
    "Low Stock": "低庫存",
    "Pending Orders": "待處理訂單",
  };
  return map[label] ?? label;
}

export function translateKpiTrend(trend: string) {
  const map: Record<string, string> = {
    "No change vs yesterday": "與昨日持平",
    "+1 vs yesterday": "較昨日 +1",
    "Action required": "需要跟進",
  };
  return map[trend] ?? trend;
}

export function translateServiceStatus(status: string) {
  const map: Record<string, string> = {
    ok: "正常",
    warning: "警告",
    degraded: "降級",
    failed: "失敗",
    disabled: "已停用",
    fallback: "備援",
    unknown: "未知",
    queued: "排隊中",
    syncing: "同步中",
    sent: "已送達",
    delivery_failed: "送達失敗",
    generation_failed: "產生失敗",
    critical: "嚴重",
  };
  return map[status] ?? status;
}

export function translateSystemLabel(label: string) {
  const map: Record<string, string> = {
    Connected: "已連線",
    Disconnected: "未連線",
    "Not configured": "未設定",
    Configured: "已設定",
    Unknown: "未知",
    Unavailable: "不可用",
  };
  return map[label] ?? label;
}
