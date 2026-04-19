import { useState } from "react";
import { toast } from "sonner";
import { getAllOrders } from "../lib/api";
import { translateServiceStatus, translateSystemLabel } from "../lib/format";
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
                  系統健康狀態
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  檢查時間：{systemHealth.checkedAtLabel}
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
                {translateServiceStatus(systemHealth.status)}
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
                  value: translateSystemLabel(systemHealth.firebase.label),
                  detail: systemHealth.firebase.details,
                },
                {
                  label: "通知",
                  status: systemHealth.notifications.status,
                  value: translateSystemLabel(systemHealth.notifications.label),
                  detail: systemHealth.notifications.details,
                },
                {
                  label: "最近備份",
                  status: systemHealth.backups.status,
                  value: translateSystemLabel(systemHealth.backups.label),
                  detail: `${systemHealth.backups.directory} 內有 ${systemHealth.backups.fileCount} 個檔案`,
                },
                {
                  label: "離線佇列",
                  status: offlineStatus.failedCount > 0 ? "warning" : offlineStatus.queueCount > 0 ? "warning" : "ok",
                  value: offlineStatus.isOnline ? "在線" : "離線",
                  detail:
                    offlineStatus.queueCount > 0
                      ? `${offlineStatus.queueCount} 筆訂單待同步`
                      : `上次同步：${offlineStatus.lastSyncedLabel}`,
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
                      {translateServiceStatus(item.status)}
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
                  離線延續運作
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  網絡中斷時，訂單會先在本機持續記錄。
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
                {offlineStatus.isOnline ? "在線" : "離線"}
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
                  label: "排隊中的訂單",
                  value: offlineStatus.queueCount,
                  hint: offlineStatus.syncing ? "正在同步" : "本機等待中",
                },
                {
                  label: "同步失敗",
                  value: offlineStatus.failedCount,
                  hint: offlineStatus.lastSyncError || "無",
                },
                {
                  label: "上次同步",
                  value: offlineStatus.lastSyncedLabel,
                  hint: offlineStatus.isOnline ? "連線後自動同步" : "等待連線",
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
                  本機佇列
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
                        {translateServiceStatus(entry.syncStatus)}
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
                  緊急匯出
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  如系統需降級運作，可匯出今日訂單以紙本處理。
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
                { label: "今日訂單", value: todayOrders.length, hint: "包含離線排隊訂單" },
                {
                  label: "匯出中排隊",
                  value: todayOrders.filter((order) => order.offlineMeta?.localOnly).length,
                  hint: "會於 PDF 與 Excel 標示",
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
                    toast.success("已開啟列印視窗，可選擇「儲存為 PDF」進行緊急匯出。");
                  } catch (exportError) {
                    toast.error(exportError instanceof Error ? exportError.message : "無法準備 PDF 匯出。");
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
                匯出 PDF
              </button>
              <button
                onClick={async () => {
                  try {
                    const allOrders = await getAllOrders();
                    exportTodayOrdersExcel(allOrders, settings);
                    toast.success("今日訂單已匯出為 Excel。");
                  } catch (exportError) {
                    toast.error(exportError instanceof Error ? exportError.message : "無法匯出今日訂單。");
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
                匯出 Excel
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
                  維護控制台
                </h3>
                <div
                  style={{
                    marginTop: "4px",
                    color: "var(--c-text-secondary)",
                    fontSize: "0.8rem",
                  }}
                >
                  每日復原工具與銷售儀表板分開管理。
                </div>
              </div>
              <button
                onClick={async () => {
                  setRefreshingCache(true);
                  try {
                    const result = await refreshMaintenanceCache();
                    toast.success(result.message);
                  } catch (refreshError) {
                    toast.error(refreshError instanceof Error ? refreshError.message : "無法重新整理快取。");
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
                {refreshingCache ? "重新整理中..." : "快速重啟"}
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
                  label: "庫存修正",
                  value: dashboard.maintenanceSummary.inventoryCorrectionsThisWeek,
                  hint: "本週",
                },
                {
                  label: "通知失敗",
                  value: dashboard.maintenanceSummary.notificationFailuresThisWeek,
                  hint: "本週",
                },
                {
                  label: "低庫存項目",
                  value: dashboard.maintenanceSummary.openLowStockItems,
                  hint: "需留意",
                },
                {
                  label: "最近快取更新",
                  value: dashboard.maintenanceSummary.lastCacheRefreshLabel,
                  hint: `${dashboard.maintenanceSummary.pendingOrders} 筆待處理訂單`,
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
                  每週維護報告
                </div>
                <div
                  style={{
                    fontFamily: "var(--f-serif)",
                    fontSize: "1.15rem",
                    color: "var(--c-text-primary)",
                  }}
                >
                  {latestReport ? latestReport.weekLabel : "尚無報告"}
                </div>
                <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                  {latestReport
                    ? `已於 ${latestReport.createdAtLabel} 產生${latestReport.recipient ? `（收件者：${latestReport.recipient}）` : ""}`
                    : "系統會自動建立最近一週的完成報告。"}
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
                  {translateServiceStatus(latestReport.status)}
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.86rem", color: "var(--c-text-primary)", marginBottom: "var(--s-3)" }}>
              {latestReport?.deliveryMessage || "請先檢視本週異常再決定是否升級處理。"}
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
                  { label: "修正", value: latestReport.inventoryCorrections },
                  { label: "失敗", value: latestReport.notificationFailures },
                  { label: "低庫存", value: latestReport.lowStockItems },
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
                        ? "每週報告已產生並送達。"
                        : "每週報告已產生，請於儀表板查看送達狀態。",
                    );
                  } catch (reportError) {
                    toast.error(reportError instanceof Error ? reportError.message : "無法產生每週報告。");
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
                {generatingReport ? "產生中..." : "重新產生 PDF"}
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
                  下載 PDF
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
                  異常記錄
                </h3>
                <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "var(--c-text-secondary)" }}>
                  庫存修正與送達問題會顯示於此。
                </div>
              </div>
            </div>

            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr>
                  {["時間", "類型", "詳情", "嚴重程度"].map((header) => (
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
                      目前尚未有維護異常記錄。
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
                            參考：{log.relatedCode}
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
                          {translateServiceStatus(log.severity)}
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
