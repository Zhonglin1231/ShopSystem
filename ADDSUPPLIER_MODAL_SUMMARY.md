# AddSupplierModal 實裝完成

## 📝 更改摘要

### 1. 創建新元件: `AddSupplierModal.tsx`
**位置**: `src/app/components/AddSupplierModal.tsx`

新增加完整的供應商新增模態框，模仿 `AddFlowerModal.tsx` 的設計風格。

**功能**:
- ✅ 表單驗證（公司名稱、聯絡人、電話、電郵必填）
- ✅ 表單輸入字段：
  - 公司名稱（必填）
  - 地址（可選）
  - 聯絡人（必填）
  - 電話（必填）
  - 電郵（必填）
  - 狀態（下拉選單：啟用中/停用）
  - 備註（可選）
- ✅ 錯誤處理與提示（使用 `toast`）
- ✅ 加載狀態指示
- ✅ 取消/新增按鈕
- ✅ 完全響應式設計

### 2. 更新: `Suppliers.tsx`

#### 新增導入
```typescript
import { toast } from "sonner";
import { AddSupplierModal } from "../components/AddSupplierModal";
```

#### 替換模態框代碼
- ✅ 移除舊的占位符模態框
- ✅ 集成 `AddSupplierModal` 元件
- ✅ 實現 `onAddSupplier` 處理器
- ✅ 新增供應商自動新增到列表頂部
- ✅ 顯示成功提示信息

### 3. 新增供應商流程

```
點擊「新增供應商」按鈕
         ↓
打開 AddSupplierModal 表單
         ↓
用戶填入供應商信息（驗證必填欄位）
         ↓
點擊「新增供應商」按鈕
         ↓
數據新增到列表
         ↓
顯示成功提示
         ↓
表單關閉，列表自動刷新
```

---

## 🎯 使用說明

### 打開新增供應商表單
```typescript
<button
  onClick={() => setIsAddingSupplier(true)}
  style={{...}}
>
  新增供應商
</button>
```

### 新增供應商處理邏輯
```typescript
onAddSupplier={async (newSupplierData) => {
  const newSupplier: Supplier = {
    id: `supplier-${Date.now()}`,      // 生成 mock ID
    ...newSupplierData,
    statusLabel: "啟用中" / "停用",     // 根據狀態設定標籤
    purchaseHistory: [],                // 新供應商無購買紀錄
    createdAt: new Date().toISOString() // 設定創建日期
  };
  
  setSuppliers((current) => [newSupplier, ...current]); // 新增到列表頂部
  toast.success("已成功新增供應商");
}}
```

---

## ✨ 表單欄位詳情

| 欄位 | 必填 | 類型 | 驗證 | 示例 |
|------|------|------|------|------|
| 公司名稱 | ✅ | 文字 | 非空 | 青葉花卉有限公司 |
| 地址 | ❌ | 多行文字 | 無 | 香港九龍長沙灣道 123 號 |
| 聯絡人 | ✅ | 文字 | 非空 | 李先生 |
| 電話 | ✅ | 電話 | 非空 | +852-2234-5678 |
| 電郵 | ✅ | 電郵 | 非空 + @ 符號 | contact@example.com |
| 狀態 | ❌ | 下拉選單 | 無 | 啟用中 / 停用 |
| 備註 | ❌ | 多行文字 | 無 | 主要供應商... |

---

## 🎨 設計與風格

### 與 AddFlowerModal 保持一致
- ✅ 同樣的模態框框架和頭部設計
- ✅ 相同的亮起背景 (`rgba(10,10,10,0.55)`)
- ✅ 相同的顏色方案和排版
- ✅ 相同的按鈕樣式和互動效果
- ✅ 相同的輸入字段樣式

### 自訂部分
- 表單內容適應供應商信息結構
- 移除了圖像上傳部分（不適用於供應商）
- 調整欄位數量和排列

---

## 🚀 測試步驟

### 1. 啟動應用
```bash
./start.sh
```

### 2. 導航到供應商頁面
```
http://127.0.0.1:8000 → 側邊欄 → 供應商
```

### 3. 測試新增供應商

**測試案例 1 - 成功新增**
```
1. 點擊「新增供應商」按鈕
2. 填入所有必填欄位：
   - 公司名稱: 新世界花卉
   - 聯絡人: 王女士
   - 電話: +852-2987-6543
   - 電郵: info@newworld-flowers.com
3. 可選：填入地址和備註
4. 點擊「新增供應商」按鈕
5. ✅ 應看到「已成功新增供應商」提示
6. ✅ 新供應商應出現在列表頂部
```

**測試案例 2 - 驗證公司名稱**
```
1. 點擊「新增供應商」按鈕
2. 不填公司名稱
3. 點擊「新增供應商」按鈕
4. ✅ 應看到「請輸入公司名稱」錯誤提示
```

**測試案例 3 - 驗證電郵格式**
```
1. 點擊「新增供應商」按鈕
2. 填入無效電郵：contact@
3. 點擊「新增供應商」按鈕
4. ✅ 應看到「請輸入有效的電郵地址」錯誤提示
```

**測試案例 4 - 關閉模態框**
```
1. 點擊「新增供應商」按鈕
2. 點擊「取消」按鈕
3. ✅ 模態框應關閉，沒有新增供應商
```

---

## 📋 代碼範例

### 在其他頁面使用 AddSupplierModal

```typescript
import { AddSupplierModal } from "../components/AddSupplierModal";
import { toast } from "sonner";

export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddSupplier = async (supplierData) => {
    try {
      // 調用 API 或狀態管理
      await api.createSupplier(supplierData);
      toast.success("已新增供應商");
      setIsOpen(false);
    } catch (error) {
      toast.error("無法新增供應商");
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>新增</button>
      <AddSupplierModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAddSupplier={handleAddSupplier}
      />
    </>
  );
}
```

---

## 🔄 與後端整合

### 當連接到真實後端時

```typescript
// 在 Suppliers.tsx 中替換處理器：

onAddSupplier={async (newSupplierData) => {
  try {
    const createdSupplier = await createSupplier(newSupplierData);
    setSuppliers((current) => [createdSupplier, ...current]);
    toast.success("已成功新增供應商");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "無法新增供應商");
    throw error;
  }
}}
```

### 所需的 API 函式

```typescript
// 在 src/app/lib/api.ts 中

export async function createSupplier(
  supplier: Omit<Supplier, "id" | "createdAt">
): Promise<Supplier> {
  const response = await fetch("http://127.0.0.1:8000/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(supplier),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create supplier");
  }
  
  return response.json();
}
```

---

## ✅ 檢查清單

- [x] AddSupplierModal 元件已創建
- [x] 表單驗證已實現
- [x] 錯誤提示已集成
- [x] 成功提示已集成
- [x] Suppliers.tsx 已更新
- [x] 新增供應商流程已完整
- [x] 設計與現有系統一致
- [x] 可測試狀態

---

## 🎯 下一步

1. **測試新增功能** - 在瀏覽器中測試上述案例
2. **連接後端 API** - 實現真實的供應商創建
3. **添加花卉選擇** - 新增時直接選擇供應的花卉
4. **編輯功能** - 在詳情面板中添加完整編輯功能
5. **刪除功能** - 實現供應商刪除

---

## 📚 參考文件

- `src/app/components/AddFlowerModal.tsx` - 參考設計模式
- `src/app/components/AddSupplierModal.tsx` - 新元件
- `src/app/pages/Suppliers.tsx` - 使用示例
- SUPPLIERS_IMPLEMENTATION.md - 完整集成指南
