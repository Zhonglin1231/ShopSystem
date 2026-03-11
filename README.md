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

如果 Firebase 可用，系统会采用顶层集合结构：

- `orders`：与客户端共享的真实订单数据
- `flowers`：花材目录
- `inventory`：库存项目
- `restocks`：补货记录
- `settings/store`：店铺设置

如果 Firebase 不可用、依赖未安装，或数据库为空，系统会自动退回本地文件：

- `backend/data/store.json`

首次启动时会自动写入一批假数据，方便直接演示和联调。

## 运行方式

### 一键启动（macOS）

安装好依赖后，可以直接双击项目根目录里的 `Start ShopSystem.command`。

它会自动：

- 先构建前端页面
- 启动完整应用 `http://127.0.0.1:8000`
- 自动打开浏览器
- 在你关闭启动窗口时停止服务

如果启动失败，可以查看日志：

- `./.run/backend.log`

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
```

## 后端结构

- `backend/main.py`: FastAPI 入口
- `backend/repository.py`: Firestore / 本地 JSON 双存储仓库
- `backend/seed_data.py`: 假数据初始化
- `backend/schemas.py`: 请求模型

## 说明

- 本地 `local-json` 模式下仍使用完整快照，方便离线演示。
- Firestore 模式下，后台数据直接存到顶层集合，不再使用 `shopsystem/default`。
- 迁移脚本会先备份旧数据，再把本地数据同步到顶层集合。
