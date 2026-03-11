from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import get_config
from .repository import RepositoryError, ShopRepository, ValidationError, create_store
from .schemas import (
    CreateFlowerRequest,
    CreateOrderRequest,
    CreateRestockRequest,
    UpdateInventoryParRequest,
    UpdateInventoryRequest,
    UpdateOrderStatusRequest,
    UpdateSettingsRequest,
)

config = get_config()
store, backend_name = create_store(config)
repository = ShopRepository(store, backend_name)
repository.initialize()

DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
INDEX_FILE = DIST_DIR / "index.html"

app = FastAPI(title="ShopSystem API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _handle_repository_error(error: Exception) -> None:
    if isinstance(error, ValidationError):
        raise HTTPException(status_code=400, detail=str(error)) from error
    raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/api/health")
def health() -> dict:
    return repository.get_health()


@app.get("/api/dashboard")
def dashboard() -> dict:
    try:
        return repository.get_dashboard()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/orders")
def list_orders() -> list[dict]:
    try:
        return repository.list_orders()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.post("/api/orders")
def create_order(payload: CreateOrderRequest) -> dict:
    try:
        return repository.create_order(payload.model_dump())
    except RepositoryError as error:
        _handle_repository_error(error)


@app.patch("/api/orders/{order_id}")
def update_order_status(order_id: str, payload: UpdateOrderStatusRequest) -> dict:
    try:
        return repository.update_order_status(order_id, payload.status)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/flowers")
def list_flowers() -> list[dict]:
    try:
        return repository.list_flowers()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.post("/api/flowers")
def create_flower(payload: CreateFlowerRequest) -> dict:
    try:
        return repository.create_flower(payload.model_dump())
    except RepositoryError as error:
        _handle_repository_error(error)


@app.delete("/api/flowers/{flower_id}")
def delete_flower(flower_id: str) -> dict:
    try:
        return repository.delete_flower(flower_id)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/inventory")
def inventory() -> dict:
    try:
        return repository.get_inventory()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.patch("/api/inventory/{item_code}")
def adjust_inventory(item_code: str, payload: UpdateInventoryRequest) -> dict:
    try:
        return repository.adjust_inventory(item_code, payload.delta)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.patch("/api/inventory/{item_code}/par")
def update_inventory_par(item_code: str, payload: UpdateInventoryParRequest) -> dict:
    try:
        return repository.update_inventory_par(item_code, payload.parLevel)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.post("/api/inventory/restocks")
def create_restock(payload: CreateRestockRequest) -> dict:
    try:
        return repository.create_restock(payload.model_dump())
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/analytics")
def analytics() -> dict:
    try:
        return repository.get_analytics()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/settings")
def settings() -> dict:
    try:
        return repository.get_settings()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.put("/api/settings")
def update_settings(payload: UpdateSettingsRequest) -> dict:
    try:
        return repository.update_settings(payload.model_dump())
    except RepositoryError as error:
        _handle_repository_error(error)


if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def frontend_index() -> FileResponse:
        return FileResponse(INDEX_FILE)


    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_routes(full_path: str) -> FileResponse:
        candidate = DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(INDEX_FILE)
