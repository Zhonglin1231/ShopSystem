import { Order, StoreSettings } from "./api";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDateOnly(value: string, timezone: string) {
  const normalized = value.includes("T") ? value : `${value}T09:00:00`;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(new Date(normalized));
}

function formatDateStamp(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  })
    .format(date)
    .replaceAll("-", "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function todayKey(timezone: string) {
  return formatDateOnly(new Date().toISOString(), timezone);
}

export function getTodayOrders(orders: Order[], timezone: string) {
  const key = todayKey(timezone);
  return orders.filter((order) => formatDateOnly(order.createdAt, timezone) === key);
}

export function exportTodayOrdersExcel(orders: Order[], settings: StoreSettings) {
  const todayOrders = getTodayOrders(orders, settings.timezone);
  if (todayOrders.length === 0) {
    throw new Error("今日尚未有建立的訂單。");
  }

  const rows = todayOrders
    .map((order) => {
      const syncState = order.offlineMeta?.localOnly
        ? order.offlineMeta.syncStatus === "failed"
          ? `離線失敗：${order.offlineMeta.syncError ?? "需要同步"}`
          : "離線排隊"
        : "已同步";

      return `
        <Row>
          <Cell><Data ss:Type="String">${escapeHtml(order.displayId)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(formatDateTime(order.createdAt, settings.timezone))}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.customerName)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.phone || "-")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.deliveryDateLabel)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.deliveryAddress || "到店自取")}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.itemsSummary)}</Data></Cell>
          <Cell><Data ss:Type="Number">${order.total.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.status)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(syncState)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeHtml(order.notes || "-")}</Data></Cell>
        </Row>
      `;
    })
    .join("");

  const workbook = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="今日訂單">
        <Table>
          <Row>
            <Cell><Data ss:Type="String">訂單編號</Data></Cell>
            <Cell><Data ss:Type="String">建立時間</Data></Cell>
            <Cell><Data ss:Type="String">客戶</Data></Cell>
            <Cell><Data ss:Type="String">電話</Data></Cell>
            <Cell><Data ss:Type="String">送貨日期</Data></Cell>
            <Cell><Data ss:Type="String">地址</Data></Cell>
            <Cell><Data ss:Type="String">項目</Data></Cell>
            <Cell><Data ss:Type="String">總額</Data></Cell>
            <Cell><Data ss:Type="String">狀態</Data></Cell>
            <Cell><Data ss:Type="String">同步狀態</Data></Cell>
            <Cell><Data ss:Type="String">備註</Data></Cell>
          </Row>
          ${rows}
        </Table>
      </Worksheet>
    </Workbook>`;

  const filename = `today-orders-${formatDateStamp(new Date(), settings.timezone)}.xls`;
  downloadBlob(
    new Blob([workbook], {
      type: "application/vnd.ms-excel;charset=utf-8",
    }),
    filename,
  );
}

export function printTodayOrdersPdf(orders: Order[], settings: StoreSettings) {
  const todayOrders = getTodayOrders(orders, settings.timezone);
  if (todayOrders.length === 0) {
    throw new Error("今日尚未有建立的訂單。");
  }

  const totalRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const rows = todayOrders
    .map((order) => {
      const syncLabel = order.offlineMeta?.localOnly
        ? order.offlineMeta.syncStatus === "failed"
          ? `離線失敗：${order.offlineMeta.syncError ?? "需手動重試"}`
          : "離線排隊"
        : "已同步";

      return `
        <tr>
          <td>${escapeHtml(order.displayId)}</td>
          <td>${escapeHtml(formatDateTime(order.createdAt, settings.timezone))}</td>
          <td>${escapeHtml(order.customerName)}</td>
          <td>${escapeHtml(order.phone || "-")}</td>
          <td>${escapeHtml(order.deliveryDateLabel)}</td>
          <td>${escapeHtml(order.deliveryAddress || "到店自取")}</td>
          <td>${escapeHtml(order.itemsSummary)}</td>
          <td>${escapeHtml(order.notes || "-")}</td>
          <td>${escapeHtml(order.status)}</td>
          <td>${escapeHtml(syncLabel)}</td>
          <td>${escapeHtml(formatCurrencyValue(order.total, settings.currency))}</td>
        </tr>
      `;
    })
    .join("");

  const printWindow = window.open("", "_blank", "width=1100,height=760");
  if (!printWindow) {
    throw new Error("彈出視窗被封鎖，請允許彈窗後再列印 PDF 匯出。");
  }

  const titleDate = formatDateOnly(new Date().toISOString(), settings.timezone);
  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(settings.storeName)} 今日訂單</title>
        <style>
          body {
            font-family: "Helvetica Neue", Arial, sans-serif;
            margin: 24px;
            color: #111827;
          }
          h1 {
            margin: 0 0 4px;
            font-size: 24px;
          }
          p {
            margin: 0 0 12px;
            color: #4b5563;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin: 20px 0 24px;
          }
          .card {
            border: 1px solid #d1d5db;
            padding: 12px;
            background: #f9fafb;
          }
          .label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #6b7280;
            margin-bottom: 6px;
          }
          .value {
            font-size: 18px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #d1d5db;
            padding: 8px;
            vertical-align: top;
            text-align: left;
          }
          th {
            background: #111827;
            color: white;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          @media print {
            body {
              margin: 12mm;
            }
          }
        </style>
        <script>
          window.addEventListener("load", () => {
            window.setTimeout(() => {
              window.focus();
              window.print();
            }, 150);
          });
        </script>
      </head>
      <body>
        <h1>${escapeHtml(settings.storeName)} - 今日訂單</h1>
        <p>${escapeHtml(titleDate)} 紙本應急匯出。</p>
        <div class="summary">
          <div class="card">
            <div class="label">訂單數</div>
            <div class="value">${todayOrders.length}</div>
          </div>
          <div class="card">
            <div class="label">收入</div>
            <div class="value">${escapeHtml(formatCurrencyValue(totalRevenue, settings.currency))}</div>
          </div>
          <div class="card">
            <div class="label">離線排隊</div>
            <div class="value">${todayOrders.filter((order) => order.offlineMeta?.localOnly).length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>訂單編號</th>
              <th>建立時間</th>
              <th>客戶</th>
              <th>電話</th>
              <th>送貨</th>
              <th>地址</th>
              <th>項目</th>
              <th>備註</th>
              <th>狀態</th>
              <th>同步</th>
              <th>總額</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
}
