import { Link } from "react-router";
import {
  buildChartBars,
  buildChartScale,
  formatCompactCurrency,
  getChartBarColor,
  translateDashboardLabel,
  translateOrderStatus,
} from "../lib/format";
import { useShopData } from "../lib/shop-data";

function statusStyles(statusClass: string) {
  if (statusClass === "success") {
    return {
      backgroundColor: "var(--c-accent-green-light)",
      color: "var(--c-accent-green)",
    };
  }

  if (statusClass === "low") {
    return {
      backgroundColor: "#FFF0F0",
      color: "#C53030",
    };
  }

  return {
    backgroundColor: "#FFF4E5",
    color: "#B7791F",
  };
}

export function Dashboard() {
  const { dashboard, loading, error, settings } = useShopData();
  const chartBars = buildChartBars(dashboard.weeklySales);
  const chartScale = buildChartScale(dashboard.weeklySales);

  if (loading && dashboard.kpis.length === 0) {
    return (
      <div
        className="border"
        style={{
          backgroundColor: "var(--c-bg-card)",
          borderColor: "var(--c-border)",
          padding: "var(--s-5)",
          color: "var(--c-text-secondary)",
        }}
      >
        正在載入店舖總覽...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          className="border"
          style={{
            marginBottom: "var(--s-4)",
            padding: "var(--s-3)",
            borderColor: "#F2C5C5",
            backgroundColor: "#FFF7F7",
            color: "#A94442",
          }}
        >
          {error}
        </div>
      )}

      <div
        className="grid mb-[var(--s-5)]"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        {dashboard.kpis.map((kpi, index) => (
          <div
            key={`${kpi.label}-${index}`}
            className="relative overflow-hidden border flex flex-col"
            style={{
              backgroundColor: "var(--c-bg-card)",
              borderColor: "var(--c-border)",
              padding: "var(--s-4)",
              gap: "var(--s-2)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--f-sans)",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--c-text-secondary)",
              }}
            >
              {translateDashboardLabel(kpi.label)}
            </span>
            <span
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "2.2rem",
                color: "var(--c-text-primary)",
              }}
            >
              {kpi.value}
            </span>
            <span
              style={{
                fontSize: "0.8rem",
                fontFamily: "var(--f-sans)",
                color: kpi.isUp ? "var(--c-accent-green)" : "#D66D75",
              }}
            >
              {kpi.trend}
            </span>

            <span
              className="absolute"
              style={{
                right: "-20px",
                bottom: "-20px",
                width: "60px",
                height: "60px",
                backgroundColor: "var(--c-bg-app)",
                transform: "rotate(45deg)",
                opacity: "0.5",
              }}
            />
          </div>
        ))}
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "2fr 1fr",
          gap: "var(--s-4)",
        }}
      >
        <div
          className="border"
          style={{
            backgroundColor: "var(--c-bg-card)",
            borderColor: "var(--c-border)",
            padding: "var(--s-4)",
          }}
        >
          <div
            className="flex justify-between items-center border-b"
            style={{
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-3)",
              borderColor: "var(--c-border)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.1rem",
                color: "var(--c-text-primary)",
              }}
            >
              每週銷售趨勢
            </h3>
            <div
              style={{
                fontFamily: "var(--f-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontSize: "0.75rem",
                color: "var(--c-text-secondary)",
              }}
            >
              最近 7 天
            </div>
          </div>

          <div
            className="w-full border-b"
            style={{
              height: "200px",
              background: "linear-gradient(to bottom, #fff 0%, #F9FDF9 100%)",
              padding: "var(--s-3) var(--s-4) 0",
              borderColor: "var(--c-border)",
            }}
          >
            <div
              className="grid h-full"
              style={{
                gridTemplateColumns: "56px 1fr",
                gridTemplateRows: "1fr auto",
                columnGap: "var(--s-3)",
              }}
            >
              <div className="relative" style={{ gridColumn: "1", gridRow: "1" }}>
                {chartScale.ticks.map((tick) => (
                  <div
                    key={tick.value}
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: `${tick.percent}%`,
                      transform: "translateY(50%)",
                      paddingRight: "8px",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.68rem",
                      color: "var(--c-text-secondary)",
                      lineHeight: 1,
                    }}
                  >
                    {formatCompactCurrency(tick.value, settings.currency)}
                  </div>
                ))}
              </div>

              <div className="relative" style={{ gridColumn: "2", gridRow: "1" }}>
                {chartScale.ticks.map((tick) => (
                  <div
                    key={tick.value}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: `${tick.percent}%`,
                      borderTop: tick.value === 0 ? "1px solid var(--c-text-primary)" : "1px dashed var(--c-border)",
                      opacity: tick.value === 0 ? 0.45 : 1,
                    }}
                  />
                ))}

                <div className="relative z-10 flex h-full items-end justify-between">
                  {chartBars.map((item) => {
                    const barColor = getChartBarColor(item.amount, chartScale.max);
                    return (
                      <div key={item.date} className="flex items-end justify-center" style={{ width: "11%", height: "100%" }}>
                        <div
                          className="transition-all hover:opacity-100"
                          title={`${item.label}: ${formatCompactCurrency(item.amount, settings.currency)}`}
                          style={{
                            width: "70%",
                            height: `${item.height}%`,
                            backgroundColor: barColor,
                            opacity: "0.82",
                            transition: "height 1s ease",
                          }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.backgroundColor = "var(--c-accent-green)";
                            event.currentTarget.style.opacity = "1";
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.backgroundColor = barColor;
                            event.currentTarget.style.opacity = "0.82";
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ gridColumn: "1", gridRow: "2" }} />
              <div className="flex justify-between" style={{ gridColumn: "2", gridRow: "2", paddingTop: "8px" }}>
                {chartBars.map((item) => (
                  <span
                    key={item.date}
                    className="text-center"
                    style={{
                      width: "11%",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.72rem",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="border"
          style={{
            backgroundColor: "var(--c-bg-card)",
            borderColor: "var(--c-border)",
            padding: "var(--s-4)",
          }}
        >
          <div
            className="flex justify-between items-center border-b"
            style={{
              marginBottom: "var(--s-4)",
              paddingBottom: "var(--s-3)",
              borderColor: "var(--c-border)",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--f-serif)",
                fontSize: "1.1rem",
                color: "var(--c-text-primary)",
              }}
            >
              最近訂單
            </h3>
            <Link
              to="/orders"
              style={{
                color: "var(--c-accent-green)",
                fontSize: "0.8rem",
                textDecoration: "none",
              }}
            >
              查看全部
            </Link>
          </div>

          <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                {["編號", "客戶", "狀態"].map((header) => (
                  <th
                    key={header}
                    className="text-left"
                    style={{
                      padding: "var(--s-2) var(--s-3)",
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--c-text-secondary)",
                      borderBottom: "2px solid var(--c-border)",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.recentOrders.map((order, index) => {
                const badgeStyle = statusStyles(order.statusClass);

                return (
                  <tr key={order.id}>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === dashboard.recentOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                        fontFamily: "var(--f-serif)",
                      }}
                    >
                      {order.displayId}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === dashboard.recentOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                        color: "var(--c-text-primary)",
                      }}
                    >
                      {order.customerName}
                    </td>
                    <td
                      style={{
                        padding: "var(--s-3)",
                        borderBottom: index === dashboard.recentOrders.length - 1 ? "none" : "1px solid var(--c-border)",
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          ...badgeStyle,
                        }}
                      >
                        {translateOrderStatus(order.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
