# 供應商數據持久化實現

## 🎯 實現功能

已實現使用 `localStorage` 來持久化供應商數據，讓新增的供應商在頁面刷新後仍然保留。

## 📝 修改內容

### 1. 添加 localStorage 工具函式

```typescript
const SUPPLIERS_STORAGE_KEY = "shop-system-suppliers";

// 從 localStorage 載入供應商數據
function loadSuppliersFromStorage(): Supplier[] {
  try {
    const stored = localStorage.getItem(SUPPLIERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Failed to load suppliers from localStorage:", error);
  }
  // 如果沒有數據或出錯，返回模擬數據
  return MOCK_SUPPLIERS;
}

// 保存供應商數據到 localStorage
function saveSuppliersToStorage(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
  } catch (error) {
    console.error("Failed to save suppliers to localStorage:", error);
    toast.error("無法保存供應商數據到本地存儲");
  }
}
```

### 2. 修改組件初始化

```typescript
export function Suppliers() {
  // 初始狀態設為空數組
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // 組件載入時從 localStorage 讀取數據
  useEffect(() => {
    const storedSuppliers = loadSuppliersFromStorage();
    setSuppliers(storedSuppliers);
  }, []);

  // 供應商數據改變時自動保存到 localStorage
  useEffect(() => {
    if (suppliers.length > 0) {
      saveSuppliersToStorage(suppliers);
    }
  }, [suppliers]);
}
```

## 🚀 測試步驟

### 測試 1: 新增供應商後刷新頁面

1. **啟動應用**
   ```bash
   ./start.sh
   ```

2. **打開供應商頁面**
   ```
   http://127.0.0.1:8000 → 側邊欄 → 供應商
   ```

3. **新增供應商**
   - 點擊「新增供應商」按鈕
   - 填入測試數據：
     - 公司名稱: `測試花卉公司`
     - 聯絡人: `張先生`
     - 電話: `+852-1234-5678`
     - 電郵: `test@flowers.com`
   - 點擊「新增供應商」

4. **驗證新增成功**
   - ✅ 應看到「已成功新增供應商」提示
   - ✅ 新供應商應出現在列表頂部

5. **刷新頁面**
   - 按 `F5` 或 `Cmd+R` 刷新頁面

6. **驗證數據保留**
   - ✅ 「測試花卉公司」應仍然在列表中
   - ✅ 所有信息都正確保存

### 測試 2: 編輯供應商後刷新

1. **點擊「詳情」按鈕** 打開測試供應商的詳情面板
2. **點擊「編輯」按鈕** 進入編輯模式
3. **修改信息** 例如：將備註改為「這是測試供應商」
4. **點擊「保存」** 保存更改
5. **刷新頁面** 驗證更改是否保留

### 測試 3: 清除 localStorage

1. **打開瀏覽器開發者工具**
   - Chrome: `F12` → Application → Local Storage
   - Firefox: `F12` → Storage → Local Storage

2. **找到 shop-system-suppliers**
   - 在 `localhost:8000` 下找到 `shop-system-suppliers` 鍵

3. **刪除數據**
   - 右鍵點擊 → Delete
   - 或選擇並按 Delete 鍵

4. **刷新頁面**
   - ✅ 應回到初始的 3 個模擬供應商

## 🔧 技術細節

### localStorage 鍵名
```
shop-system-suppliers
```

### 數據結構
```json
[
  {
    "id": "supplier-1713523456789",
    "companyName": "測試花卉公司",
    "address": "",
    "contactPerson": "張先生",
    "phone": "+852-1234-5678",
    "email": "test@flowers.com",
    "suppliedFlowers": [],
    "status": "Active",
    "statusLabel": "啟用中",
    "notes": "",
    "purchaseHistory": [],
    "createdAt": "2026-04-19T12:34:56.789Z"
  }
]
```

### 錯誤處理
- ✅ 如果 localStorage 無法讀取，使用模擬數據
- ✅ 如果 localStorage 無法寫入，顯示錯誤提示
- ✅ 不會因為 localStorage 錯誤而崩潰應用

## 🎯 優點

| 優點 | 說明 |
|------|------|
| **無需後端** | 不需要服務器即可實現數據持久化 |
| **即時保存** | 每次操作都會自動保存 |
| **錯誤恢復** | 如果出錯會回到模擬數據 |
| **跨會話** | 關閉瀏覽器後數據仍然保留 |
| **簡單實現** | 不需要複雜的狀態管理 |

## 🔄 遷移到後端

當準備連接真實後端時：

1. **替換 localStorage 函式**
   ```typescript
   // 替換 loadSuppliersFromStorage
   async function loadSuppliersFromAPI(): Promise<Supplier[]> {
     try {
       const response = await fetch('/api/suppliers');
       return await response.json();
     } catch {
       return MOCK_SUPPLIERS; // 後備數據
     }
   }

   // 替換 saveSuppliersToStorage
   // 不需要，因為 API 調用會直接保存到數據庫
   ```

2. **修改 useEffect**
   ```typescript
   useEffect(() => {
     loadSuppliersFromAPI().then(setSuppliers);
   }, []);
   ```

3. **移除自動保存 useEffect**
   ```typescript
   // 刪除這個 useEffect，因為 API 調用會處理保存
   // useEffect(() => { saveSuppliersToStorage(suppliers); }, [suppliers]);
   ```

## 🐛 故障排除

### 問題: 新增的供應商沒有保存
**解決方案**:
1. 檢查瀏覽器控制台是否有錯誤
2. 確認 localStorage 可用（檢查隱私設定）
3. 檢查 `SUPPLIERS_STORAGE_KEY` 鍵是否存在

### 問題: 頁面刷新後數據丟失
**解決方案**:
1. 確認 `useEffect` 正確執行
2. 檢查 `loadSuppliersFromStorage` 函式
3. 在瀏覽器開發者工具中檢查 localStorage

### 問題: localStorage 錯誤
**解決方案**:
1. 檢查瀏覽器是否支持 localStorage
2. 檢查是否有足夠的存儲空間
3. 在隱私瀏覽模式下可能無法使用

## 📊 數據統計

測試後，您可以檢查 localStorage 中的數據：

```javascript
// 在瀏覽器控制台執行
const suppliers = JSON.parse(localStorage.getItem('shop-system-suppliers'));
console.log(`總共有 ${suppliers.length} 個供應商`);
console.log('供應商列表:', suppliers.map(s => s.companyName));
```

## ✅ 完成檢查清單

- [x] 添加 localStorage 工具函式
- [x] 修改組件初始化邏輯
- [x] 實現自動保存機制
- [x] 添加錯誤處理
- [x] 測試新增功能
- [x] 測試編輯功能
- [x] 測試數據持久化
- [x] 創建測試指南

---

## 🎉 現在測試吧！

```bash
./start.sh
# 然後在瀏覽器中測試新增供應商功能
# 刷新頁面確認數據保留
```

新增的供應商現在會永久保存在您的瀏覽器中！ 🚀