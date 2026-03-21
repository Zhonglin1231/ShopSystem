from __future__ import annotations

import asyncio
import json
from pathlib import Path

from fastapi import Query
from fastapi.encoders import jsonable_encoder
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import get_config
from .repository import RepositoryError, ShopRepository, ValidationError, create_store
from .schemas import (
    CreateBouquetRequest,
    CreateFlowerRequest,
    CreateOrderRequest,
    CreateRestockRequest,
    UpdateAiPreviewApiRequest,
    UpdateInventoryParRequest,
    UpdateInventoryRequest,
    UpdateInventoryStockRequest,
    UpdateOrderStatusRequest,
    UpdateSettingsRequest,
)

config = get_config()
store, backend_name = create_store(config)
repository = ShopRepository(store, backend_name, config)
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
def list_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str = Query(default=""),
) -> dict:
    try:
        return repository.list_orders_page(page=page, page_size=page_size, search=search)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/orders/all")
def list_all_orders() -> list[dict]:
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


@app.get("/api/orders/stream")
async def stream_orders(request: Request) -> StreamingResponse:
    async def wrapped_stream():
        events, unsubscribe = repository.subscribe_order_events()
        try:
            ready_payload = {
                "type": "ready",
                "listener": repository.order_event_listener_supported(),
                "storage": repository.backend_name,
            }
            yield f"event: ready\ndata: {json.dumps(jsonable_encoder(ready_payload))}\n\n"

            while True:
                if await request.is_disconnected():
                    break

                event = await asyncio.to_thread(repository.next_order_event, events)
                if event is None:
                    yield ": keep-alive\n\n"
                    continue

                yield f"event: {event['type']}\ndata: {json.dumps(jsonable_encoder(event))}\n\n"
        finally:
            unsubscribe()

    return StreamingResponse(
        wrapped_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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


@app.get("/api/bouquets")
def list_bouquets() -> list[dict]:
    try:
        return repository.list_bouquets()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.post("/api/bouquets")
def create_bouquet(payload: CreateBouquetRequest) -> dict:
    try:
        return repository.create_bouquet(payload.model_dump())
    except RepositoryError as error:
        _handle_repository_error(error)


@app.delete("/api/bouquets/{bouquet_id}")
def delete_bouquet(bouquet_id: str) -> dict:
    try:
        return repository.delete_bouquet(bouquet_id)
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


@app.patch("/api/inventory/{item_code}/stock")
def update_inventory_stock(item_code: str, payload: UpdateInventoryStockRequest) -> dict:
    try:
        return repository.update_inventory_stock(item_code, payload.stock)
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


@app.post("/api/maintenance/cache/refresh")
def refresh_cache() -> dict:
    try:
        return repository.refresh_cache()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.post("/api/maintenance/reports/generate")
def generate_weekly_report() -> dict:
    try:
        return repository.generate_weekly_report(force=True)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/maintenance/reports/{report_id}/download")
def download_weekly_report(report_id: str) -> FileResponse:
    try:
        report_file = repository.get_weekly_report_file(report_id)
        return FileResponse(report_file, media_type="application/pdf", filename=report_file.name)
    except RepositoryError as error:
        _handle_repository_error(error)


@app.put("/api/settings")
def update_settings(payload: UpdateSettingsRequest) -> dict:
    try:
        return repository.update_settings(payload.model_dump())
    except RepositoryError as error:
        _handle_repository_error(error)


@app.get("/api/settings/ai-preview")
def get_ai_preview_settings() -> dict:
    try:
        return repository.get_ai_preview_settings()
    except RepositoryError as error:
        _handle_repository_error(error)


@app.put("/api/settings/ai-preview")
def update_ai_preview_settings(payload: UpdateAiPreviewApiRequest) -> dict:
    try:
        return repository.update_ai_preview_settings(payload.model_dump())
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
