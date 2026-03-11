export function formatCurrency(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
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
    return new Intl.NumberFormat("en-US", {
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
