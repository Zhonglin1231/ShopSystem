from __future__ import annotations

from pydantic import BaseModel, Field


class OrderItemInput(BaseModel):
    flowerId: str
    quantity: int = Field(gt=0)


class CreateOrderRequest(BaseModel):
    customerName: str = Field(min_length=1)
    phone: str = ""
    deliveryDate: str
    deliveryAddress: str = ""
    notes: str = ""
    deliveryFee: float = Field(default=8.0, ge=0)
    items: list[OrderItemInput] = Field(min_length=1)


class CreateFlowerRequest(BaseModel):
    name: str = Field(min_length=1)
    category: str = "Other"
    price: float = Field(ge=0)
    unit: str = "stem"
    openingStock: int = Field(default=0, ge=0)
    parLevel: int = Field(default=10, ge=0)
    season: str = "Year-round"
    color: str = ""
    description: str = ""
    image: str | None = None


class BouquetComponentInput(BaseModel):
    flowerId: str = Field(min_length=1)
    quantity: int = Field(gt=0)


class CreateBouquetRequest(BaseModel):
    name: str = Field(min_length=1)
    components: list[BouquetComponentInput] = Field(min_length=1)
    image: str | None = None


class CreateWrappingRequest(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(ge=0)
    image: str | None = None


class UpdateInventoryRequest(BaseModel):
    delta: int


class UpdateInventoryStockRequest(BaseModel):
    stock: int = Field(ge=0)


class UpdateInventoryParRequest(BaseModel):
    parLevel: int = Field(ge=0)


class CreateRestockRequest(BaseModel):
    itemCode: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    unitCost: float = Field(ge=0)


class UpdateSettingsRequest(BaseModel):
    storeName: str = Field(min_length=1)
    contactEmail: str = Field(min_length=1)
    maintenanceEmail: str = ""
    currency: str = Field(min_length=1)
    timezone: str = Field(min_length=1)
    deliveryRadius: int = Field(ge=0)


class UpdateAiPreviewApiRequest(BaseModel):
    apiKey: str = ""
    modelName: str = ""
    imageSize: str = "2560x1440"


class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(min_length=1)
