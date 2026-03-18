import { useState } from "react";
import { toast } from "sonner";
import { getAllOrders } from "../lib/api";
import { exportTodayOrdersExcel, getTodayOrders, printTodayOrdersPdf } from "../lib/maintenance-export";
import { useShopData } from "../lib/shop-data";

function maintenanceBadgeStyles(severity: string) {
  if (severity === "critical") {
    return {
      backgroundColor: "#FFF1F1",
      color: "#9B2C2C",
    };
  }

  if (severity === "warning") {
    return {
      backgroundColor: "#FFF8E1",
      color: "#B7791F",
    };
  }

  return {
    backgroundColor: "#EDF8F2",
    color: "#2F855A",
  };
}

function serviceStatusStyles(status: string) {
  if (status === "degraded" || status === "failed" || status === "disabled") {
    return {
      backgroundColor: "#FFF1F1",
      color: "#9B2C2C",
    };
  }

  if (status === "warning" || status === "fallback" || status === "unknown") {
    return {
      backgroundColor: "#FFF8E1",
      color: "#B7791F",
    };
  }

  return {
    backgroundColor: "#EDF8F2",
    color: "#2F855A",
  };
}

function reportStatusStyles(status: string) {
  if (status === "delivery_failed" || status === "generation_failed") {
    return {
      backgroundColor: "#FFF1F1",
      color: "#9B2C2C",
    };
  }

  return {
    backgroundColor: "#EDF8F2",
    color: "#2F855A",
  };
}

export function Maintenance() {
  const {
    dashboard,
    error,
    orders,
    settings,
    systemHealth,
    offlineStatus,
    offlineQueue,
    refreshMaintenanceCache,
    generateWeeklyMaintenanceReport,
  } = useShopData();
  const [refreshingCache, setRefreshingCache] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const latestReport = dashboard.latestWeeklyReport;
  const todayOrders = getTodayOrders(orders, settings.timezone);

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
        className="grid"
        style={{
          gridTemplateColumns: "1.2fr 1.8fr",
          gap: "var(--s-4)",
        }}
      >
        <div className="flex flex-col" style={{ gap: "var(--s-4)" }}>
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
              <div>
                <h3
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.1rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  System Health
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  Checked {systemHealth.checkedAtLabel}
                </div>
              </div>
              <span
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  ...serviceStatusStyles(systemHealth.status),
                }}
              >
                {systemHealth.status}
              </span>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "var(--s-3)",
              }}
            >
              {[
                {
                  label: "Firebase",
                  status: systemHealth.firebase.status,
                  value: systemHealth.firebase.label,
                  detail: systemHealth.firebase.details,
                },
                {
                  label: "Notifications",
                  status: systemHealth.notifications.status,
                  value: systemHealth.notifications.label,
                  detail: systemHealth.notifications.details,
                },
                {
                  label: "Last backup",
                  status: systemHealth.backups.status,
                  value: systemHealth.backups.label,
                  detail: `${systemHealth.backups.fileCount} files in ${systemHealth.backups.directory}`,
                },
                {
                  label: "Offline queue",
                  status: offlineStatus.failedCount > 0 ? "warning" : offlineStatus.queueCount > 0 ? "warning" : "ok",
                  value: offlineStatus.isOnline ? "Online" : "Offline",
                  detail:
                    offlineStatus.queueCount > 0
                      ? `${offlineStatus.queueCount} orders pending sync`
                      : `Last sync ${offlineStatus.lastSyncedLabel}`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border"
                  style={{
                    borderColor: "var(--c-border)",
                    padding: "var(--s-3)",
                    backgroundColor: "#FAFCFA",
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: "6px", gap: "var(--s-2)" }}>
                    <div
                      style={{
                        fontFamily: "var(--f-sans)",
                        fontSize: "0.72rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--c-text-secondary)",
                      }}
                    >
                      {item.label}
                    </div>
                    <span
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.68rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        ...serviceStatusStyles(item.status),
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-serif)",
                      fontSize: "1.2rem",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "0.8rem",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              ))}
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
              <div>
                <h3
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.1rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  Offline Continuity
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  Orders keep flowing locally while the network is unavailable.
                </div>
              </div>
              <span
                style={{
                  padding: "4px 8px",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  ...serviceStatusStyles(offlineStatus.isOnline ? "ok" : "warning"),
                }}
              >
                {offlineStatus.isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "var(--s-3)",
                marginBottom: "var(--s-4)",
              }}
            >
              {[
                {
                  label: "Queued orders",
                  value: offlineStatus.queueCount,
                  hint: offlineStatus.syncing ? "Syncing now" : "Waiting locally",
                },
                {
                  label: "Failed syncs",
                  value: offlineStatus.failedCount,
                  hint: offlineStatus.lastSyncError || "None",
                },
                {
                  label: "Last sync",
                  value: offlineStatus.lastSyncedLabel,
                  hint: offlineStatus.isOnline ? "Auto-sync on reconnect" : "Waiting for connection",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border"
                  style={{
                    borderColor: "var(--c-border)",
                    padding: "var(--s-3)",
                    backgroundColor: "#FAFCFA",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--c-text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-serif)",
                      fontSize: "1.2rem",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "var(--c-text-secondary)" }}>
                    {item.hint}
                  </div>
                </div>
              ))}
            </div>

            {offlineQueue.length > 0 && (
              <div
                className="border"
                style={{
                  borderColor: "var(--c-border)",
                  padding: "var(--s-3)",
                  backgroundColor: "#FFFCF6",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--c-text-secondary)",
                    marginBottom: "var(--s-3)",
                  }}
                >
                  Local queue
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
                  {offlineQueue.slice(0, 4).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between"
                      style={{
                        gap: "var(--s-3)",
                        paddingBottom: "var(--s-2)",
                        borderBottom: "1px solid var(--c-border)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--c-text-primary)" }}>
                          {entry.preview.displayId} · {entry.preview.customerName}
                        </div>
                        <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                          {entry.preview.itemsSummary}
                        </div>
                        {entry.syncError && (
                          <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "#A94442" }}>{entry.syncError}</div>
                        )}
                      </div>
                      <span
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.68rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          ...serviceStatusStyles(entry.syncStatus === "failed" ? "warning" : "ok"),
                        }}
                      >
                        {entry.syncStatus}
                      </span>
                    </div>
                  ))}
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
              className="flex justify-between items-center border-b"
              style={{
                marginBottom: "var(--s-4)",
                paddingBottom: "var(--s-3)",
                borderColor: "var(--c-border)",
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.1rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  Emergency Export
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  Export today's orders to continue on paper if the system needs to fall back.
                </div>
              </div>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "var(--s-3)",
                marginBottom: "var(--s-4)",
              }}
            >
              {[
                { label: "Today's orders", value: todayOrders.length, hint: "Includes offline queued orders" },
                {
                  label: "Queued in export",
                  value: todayOrders.filter((order) => order.offlineMeta?.localOnly).length,
                  hint: "Marked in PDF and Excel",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border"
                  style={{
                    borderColor: "var(--c-border)",
                    padding: "var(--s-3)",
                    backgroundColor: "#FAFCFA",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--c-text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-serif)",
                      fontSize: "1.35rem",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                  <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "var(--c-text-secondary)" }}>
                    {item.hint}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const allOrders = await getAllOrders();
                    printTodayOrdersPdf(allOrders, settings);
                    toast.success("Print dialog opened. Choose 'Save as PDF' for the emergency export.");
                  } catch (exportError) {
                    toast.error(exportError instanceof Error ? exportError.message : "Unable to prepare the PDF export.");
                  }
                }}
                style={{
                  padding: "0 var(--s-3)",
                  height: "34px",
                  backgroundColor: "var(--c-accent-black)",
                  color: "white",
                  border: "none",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Export PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    const allOrders = await getAllOrders();
                    exportTodayOrdersExcel(allOrders, settings);
                    toast.success("Today's orders exported for Excel.");
                  } catch (exportError) {
                    toast.error(exportError instanceof Error ? exportError.message : "Unable to export today's orders.");
                  }
                }}
                style={{
                  padding: "0 var(--s-3)",
                  height: "34px",
                  backgroundColor: "transparent",
                  border: "1px solid var(--c-border)",
                  color: "var(--c-text-primary)",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Export Excel
              </button>
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
              <div>
                <h3
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.1rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  Maintenance Console
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  Daily recovery tools stay separate from the sales dashboard.
                </div>
              </div>
              <button
                onClick={async () => {
                  setRefreshingCache(true);
                  try {
                    const result = await refreshMaintenanceCache();
                    toast.success(result.message);
                  } catch (refreshError) {
                    toast.error(refreshError instanceof Error ? refreshError.message : "Unable to refresh cache.");
                  } finally {
                    setRefreshingCache(false);
                  }
                }}
                disabled={refreshingCache || !offlineStatus.isOnline}
                style={{
                  padding: "0 var(--s-3)",
                  height: "34px",
                  backgroundColor: "var(--c-accent-black)",
                  color: "white",
                  border: "none",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: refreshingCache || !offlineStatus.isOnline ? "not-allowed" : "pointer",
                  opacity: refreshingCache || !offlineStatus.isOnline ? 0.7 : 1,
                }}
              >
                {refreshingCache ? "Refreshing..." : "Quick Restart"}
              </button>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "var(--s-3)",
              }}
            >
              {[
                {
                  label: "Inventory corrections",
                  value: dashboard.maintenanceSummary.inventoryCorrectionsThisWeek,
                  hint: "This week",
                },
                {
                  label: "Notification failures",
                  value: dashboard.maintenanceSummary.notificationFailuresThisWeek,
                  hint: "This week",
                },
                {
                  label: "Low stock items",
                  value: dashboard.maintenanceSummary.openLowStockItems,
                  hint: "Need watching",
                },
                {
                  label: "Last cache refresh",
                  value: dashboard.maintenanceSummary.lastCacheRefreshLabel,
                  hint: `${dashboard.maintenanceSummary.pendingOrders} pending orders`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="border"
                  style={{
                    borderColor: "var(--c-border)",
                    padding: "var(--s-3)",
                    backgroundColor: "#FAFCFA",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--f-sans)",
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--c-text-secondary)",
                      marginBottom: "6px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--f-serif)",
                      fontSize: "1.45rem",
                      color: "var(--c-text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "0.78rem",
                      color: "var(--c-text-secondary)",
                    }}
                  >
                    {item.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "var(--s-4)" }}>
          <div
            className="border"
            style={{
              borderColor: "var(--c-border)",
              padding: "var(--s-4)",
              backgroundColor: "var(--c-bg-card)",
            }}
          >
            <div className="flex justify-between items-start" style={{ gap: "var(--s-3)", marginBottom: "var(--s-3)" }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--c-text-secondary)",
                    marginBottom: "6px",
                  }}
                >
                  Weekly Maintenance Report
                </div>
                <div
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.15rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  {latestReport ? latestReport.weekLabel : "No report yet"}
                </div>
                <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                  {latestReport
                    ? `Generated ${latestReport.createdAtLabel}${latestReport.recipient ? ` for ${latestReport.recipient}` : ""}`
                    : "The dashboard will auto-create the latest completed week report."}
                </div>
              </div>
              {latestReport && (
                <span
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    ...reportStatusStyles(latestReport.status),
                  }}
                >
                  {latestReport.status.replace("_", " ")}
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.86rem", color: "var(--c-text-primary)", marginBottom: "var(--s-3)" }}>
              {latestReport?.deliveryMessage || "Use the report to review this week's exceptions before escalating."}
            </div>

            {latestReport && (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "var(--s-3)",
                  marginBottom: "var(--s-3)",
                }}
              >
                {[
                  { label: "Corrections", value: latestReport.inventoryCorrections },
                  { label: "Failures", value: latestReport.notificationFailures },
                  { label: "Low stock", value: latestReport.lowStockItems },
                ].map((item) => (
                  <div key={item.label} style={{ backgroundColor: "white", padding: "var(--s-2)", border: "1px solid var(--c-border)" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--c-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: "var(--f-serif)", fontSize: "1.2rem", color: "var(--c-text-primary)" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setGeneratingReport(true);
                  try {
                    const report = await generateWeeklyMaintenanceReport();
                    toast.success(
                      report.notificationStatus === "sent"
                        ? "Weekly report generated and delivered."
                        : "Weekly report generated. Check delivery status in the dashboard.",
                    );
                  } catch (reportError) {
                    toast.error(reportError instanceof Error ? reportError.message : "Unable to generate weekly report.");
                  } finally {
                    setGeneratingReport(false);
                  }
                }}
                disabled={generatingReport || !offlineStatus.isOnline}
                style={{
                  padding: "0 var(--s-3)",
                  height: "34px",
                  backgroundColor: "var(--c-accent-black)",
                  color: "white",
                  border: "none",
                  fontFamily: "var(--f-sans)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: generatingReport || !offlineStatus.isOnline ? "not-allowed" : "pointer",
                  opacity: generatingReport || !offlineStatus.isOnline ? 0.7 : 1,
                }}
              >
                {generatingReport ? "Generating..." : "Regenerate PDF"}
              </button>

              {latestReport?.downloadUrl && (
                <a
                  href={latestReport.downloadUrl}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 var(--s-3)",
                    height: "34px",
                    backgroundColor: "transparent",
                    border: "1px solid var(--c-border)",
                    color: "var(--c-text-primary)",
                    fontFamily: "var(--f-sans)",
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    textDecoration: "none",
                  }}
                >
                  Download PDF
                </a>
              )}
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
              <div>
                <h3
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.1rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  Exception Log
                </h3>
                <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                  Inventory corrections and delivery issues stay visible here.
                </div>
              </div>
            </div>

            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  {["When", "Type", "Details", "Severity"].map((header) => (
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
                {dashboard.maintenanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "var(--s-4)", color: "var(--c-text-secondary)" }}>
                      No maintenance exceptions logged yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.maintenanceLogs.map((log, index) => (
                    <tr key={log.id}>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          verticalAlign: "top",
                          borderBottom: index === dashboard.maintenanceLogs.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                          width: "18%",
                        }}
                      >
                        {log.dateLabel}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          verticalAlign: "top",
                          borderBottom: index === dashboard.maintenanceLogs.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                          width: "18%",
                        }}
                      >
                        {log.eventLabel}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          verticalAlign: "top",
                          borderBottom: index === dashboard.maintenanceLogs.length - 1 ? "none" : "1px solid var(--c-border)",
                          color: "var(--c-text-primary)",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{log.title}</div>
                        <div style={{ color: "var(--c-text-secondary)" }}>{log.description}</div>
                        {log.relatedCode && (
                          <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "var(--c-text-secondary)" }}>
                            Ref: {log.relatedCode}
                            {log.relatedName ? ` - ${log.relatedName}` : ""}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "var(--s-3)",
                          verticalAlign: "top",
                          borderBottom: index === dashboard.maintenanceLogs.length - 1 ? "none" : "1px solid var(--c-border)",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            ...maintenanceBadgeStyles(log.severity),
                          }}
                        >
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
