import { buildChartBars, buildChartScale, formatCompactCurrency, getChartBarColor } from "../lib/format";
import { useShopData } from "../lib/shop-data";

export function Analytics() {
  const { analytics, loading, error, settings } = useShopData();
  const chartBars = buildChartBars(analytics.salesSeries);
  const chartScale = buildChartScale(analytics.salesSeries);

  return (
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
          className="border-b"
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
            Sales Performance
          </h3>
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--s-3)", marginTop: "var(--s-3)" }}>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--c-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Gross Revenue
              </p>
              <p style={{ fontFamily: "var(--f-serif)", fontSize: "1.2rem", color: "var(--c-text-primary)" }}>
                {analytics.totals.grossRevenueDisplay}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--c-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Completed
              </p>
              <p style={{ fontFamily: "var(--f-serif)", fontSize: "1.2rem", color: "var(--c-text-primary)" }}>
                {analytics.totals.completedOrders}
              </p>
            </div>
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--c-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Avg Order
              </p>
              <p style={{ fontFamily: "var(--f-serif)", fontSize: "1.2rem", color: "var(--c-text-primary)" }}>
                {analytics.totals.averageOrderValueDisplay}
              </p>
            </div>
          </div>
        </div>

        {loading && analytics.salesSeries.length === 0 ? (
          <div style={{ padding: "var(--s-4)", color: "var(--c-text-secondary)" }}>Loading analytics...</div>
        ) : (
          <div
            className="w-full border-b"
            style={{
              height: "300px",
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
        )}
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
          className="border-b"
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
            Top Sellers
          </h3>
        </div>

        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <tbody>
            {analytics.topSellers.map((seller, index) => (
              <tr key={`${seller.name}-${index}`}>
                <td
                  style={{
                    padding: "var(--s-3)",
                    borderBottom: index === analytics.topSellers.length - 1 ? "none" : "1px solid var(--c-border)",
                    color: "var(--c-text-primary)",
                  }}
                >
                  <div>{`${index + 1}. ${seller.name}`}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--c-text-secondary)" }}>{seller.unitsSold} units sold</div>
                </td>
                <td
                  className="text-right"
                  style={{
                    padding: "var(--s-3)",
                    borderBottom: index === analytics.topSellers.length - 1 ? "none" : "1px solid var(--c-border)",
                    color: "var(--c-text-primary)",
                  }}
                >
                  {seller.revenueDisplay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
