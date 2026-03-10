# ShopSystem

花店管理系统，现有前端设计已接入 Python 后端，支持：

- Dashboard 总览
- Orders 订单创建、详情查看、状态流转、取消订单
- Flowers 花材目录与新增花材
- Inventory 库存查看、快速增减、补货记录、CSV 导出
- Analytics 销售趋势与热销单品
- Settings 店铺基础配置

## 数据存储

系统会优先尝试使用项目根目录下的 Firebase service account JSON：

- `flower-757d9-firebase-adminsdk-fbsvc-d05a09dcce.json`

如果 Firebase 可用，系统会把完整业务快照写到 Firestore。

如果 Firebase 不可用、依赖未安装，或数据库为空，系统会自动退回本地文件：

- `backend/data/store.json`

首次启动时会自动写入一批假数据，方便直接演示和联调。

## 运行方式

### 1. 安装 Python 依赖

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 启动后端

```bash
npm run dev:backend
```

后端默认运行在 `http://127.0.0.1:8000`。

### 4. 启动前端

```bash
npm run dev:frontend
```

前端默认运行在 `http://127.0.0.1:5173`，`/api` 会自动代理到 Python 后端。

## 可选环境变量

```bash
export SHOPSYSTEM_FIREBASE_CREDENTIALS="/absolute/path/to/your-service-account.json"
export SHOPSYSTEM_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
export SHOPSYSTEM_FIRESTORE_COLLECTION="shopsystem"
export SHOPSYSTEM_FIRESTORE_DOCUMENT="default"
```

## 后端结构

- `backend/main.py`: FastAPI 入口
- `backend/repository.py`: Firestore / 本地 JSON 双存储仓库
- `backend/seed_data.py`: 假数据初始化
- `backend/schemas.py`: 请求模型

## 说明

- 当前后端采用“完整快照”存储，适合课程项目和演示环境，结构简单、调试直接。
- 若后续要扩展成多人并发或更大数据量，建议把 `orders`、`flowers`、`inventory` 拆成独立集合。
