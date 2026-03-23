from __future__ import annotations

import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
STORE_PATH = PROJECT_ROOT / "backend" / "data" / "store.json"


EXACT_MAP = {
    "Dusty Rose": "霧粉玫瑰",
    "White Tulip": "白色鬱金香",
    "Silver Dollar Eucalyptus": "銀元尤加利",
    "Pink Peony": "粉紅牡丹",
    "Garden Rose": "花園玫瑰",
    "Hydrangea": "繡球花",
    "Baby's Breath": "滿天星",
    "Lavender": "薰衣草",
    "Pink Rose": "粉紅玫瑰",
    "Rose": "玫瑰",
    "Tulip": "鬱金香",
    "Eucalyptus": "尤加利",
    "Peony": "牡丹",
    "Hydrangea": "繡球花",
    "Filler": "襯花",
    "Lavender": "薰衣草",
    "Fresh Flowers": "鮮花",
    "Filler Flowers": "襯花",
    "Foliage": "葉材",
    "Hardgoods": "資材",
    "Blush Pink": "腮紅粉",
    "White": "白色",
    "Green": "綠色",
    "Coral": "珊瑚粉",
    "Ivory": "象牙白",
    "Mixed": "混色",
    "Lilac": "淡紫色",
    "Year-round": "全年",
    "Spring": "春季",
    "Spring-Summer": "春夏",
    "Summer": "夏季",
    "Summer-Autumn": "夏秋",
    "stem": "枝",
    "bunch": "束",
    "piece": "件",
    'Glass Cylinder 8"': '8 吋玻璃圓筒',
    "Wai Lan Garden": "蔚蘭花園",
}


SUBSTRING_MAP = {
    "Soft pink rose with muted tones for romantic arrangements.": "柔和霧粉色玫瑰，適合浪漫花藝設計。",
    "Crisp white tulips for elegant bouquets and event work.": "清雅白色鬱金香，適合優雅花束與活動佈置。",
    "Textural greenery with a fresh scent and rounded leaves.": "帶有清新香氣與圓葉質感的綠葉襯材。",
    "Lush seasonal bloom with layered petals and strong visual impact.": "花瓣層次豐富、視覺感強烈的季節花材。",
    "Premium rose with a fuller head for bridal and premium work.": "花型飽滿的高級玫瑰，適合婚禮與精品花藝。",
    "Large-volume bloom for statement bouquets and installations.": "花量充足，適合重點花束與場地裝置。",
    "Airy filler flower that softens mixed bouquets.": "輕盈襯花，可柔化混合花束層次。",
    "Aromatic bundle used for texture, fragrance, and dried work.": "帶香氣的花束素材，常用於質感、香氛與乾燥花設計。",
    "Pink Rose": "粉紅玫瑰",
    "Dusty Rose": "霧粉玫瑰",
    "White Tulip": "白色鬱金香",
    "Silver Dollar Eucalyptus": "銀元尤加利",
    "Pink Peony": "粉紅牡丹",
    "Garden Rose": "花園玫瑰",
    "Hydrangea": "繡球花",
    "Baby's Breath": "滿天星",
    "Lavender": "薰衣草",
    "Inventory corrected for ": "已修正庫存：",
    "SMTP delivery is not configured. PDF is ready for ": "SMTP 郵件發送未設定。PDF 已準備好，可供 ",
    " to download.": " 下載。",
    "Bouquet": "花束",
    "Store Order": "店舖訂單",
}


def translate_string(value: str) -> str:
    if value in EXACT_MAP:
        return EXACT_MAP[value]

    translated = value
    for source, target in SUBSTRING_MAP.items():
        translated = translated.replace(source, target)
    return translated


def translate_object(node):
    if isinstance(node, dict):
        return {key: translate_object(value) for key, value in node.items()}
    if isinstance(node, list):
        return [translate_object(item) for item in node]
    if isinstance(node, str):
        return translate_string(node)
    return node


def main() -> None:
    if not STORE_PATH.exists():
        raise FileNotFoundError(f"store.json not found: {STORE_PATH}")

    with STORE_PATH.open("r", encoding="utf-8") as handle:
        snapshot = json.load(handle)

    translated = translate_object(snapshot)

    with STORE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(translated, handle, ensure_ascii=False, indent=2)

    print("Translated store snapshot to Traditional Chinese:", STORE_PATH)


if __name__ == "__main__":
    main()
