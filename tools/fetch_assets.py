#!/usr/bin/env python3
"""Tải texture + model CC0 từ Poly Haven vào assets/ và thu nhỏ cho web.

Chạy lại được nhiều lần (bỏ qua file đã có):  python3 tools/fetch_assets.py
Cần: Python 3 + Pillow (pip install pillow).
Toàn bộ tài nguyên Poly Haven là CC0 (public domain) – xem assets/CREDITS.md.
"""
import json, os, sys, urllib.request
from io import BytesIO
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
API = "https://api.polyhaven.com/files/"
UA = {"User-Agent": "mln-game-asset-fetch"}

# texture: tên trong game -> asset Poly Haven
TEXTURES = {
    "plaster":   "white_plaster_rough_01",  # tường vữa loang ố, nhuộm màu bằng tint
    "plaster_y": "yellow_plaster",          # tường vàng
    "peel":      "peeling_painted_wall",    # tường sơn bong tróc
    "damaged":   "damaged_plaster",         # vữa vỡ lộ gạch
    "plaster_b": "blue_plaster_weathered",  # tường xanh cũ
    "asphalt":   "asphalt_02",              # đường nhựa nứt
    "sidewalk":  "checkered_pavement_tiles",# gạch vỉa hè ca rô
    "tile":      "square_tiles",            # sàn gạch bông trong quán
    "tile2":     "floor_tiles_06",          # sàn gạch ca rô
    "terrazzo":  "terrazzo_tiles",          # sàn đá mài
    "shutter":   "rusted_shutter",          # cửa cuốn xanh rỉ
    "shutter2":  "painted_metal_shutter",   # cửa cuốn sơn
    "tin":       "corrugated_iron",         # tôn
    "tin_rust":  "rusty_corrugated_iron",   # tôn rỉ
    "roof":      "clay_roof_tiles",         # ngói
    "concrete":  "dirty_concrete",          # bê tông bẩn
    "concrete2": "concrete_wall_006",       # tường bê tông
    "floor_c":   "concrete_floor_worn_001", # sàn xưởng
    "grass":     "sparse_grass",
    "soil":      "farm_soil",
    "wood":      "weathered_planks",
    "rust":      "rusty_metal_02",
    "brick":     "red_brick",
}
TEX_DIFF_SIZE = 1024   # ảnh màu giữ 1k
TEX_AUX_SIZE = 512     # normal / arm thu về 512 cho nhẹ

# model: tên Poly Haven (texture thu về 512)
MODELS = [
    "plastic_monobloc_chair_01", "plastic_crate_02", "exterior_aircon_unit", "ceiling_fan",
    "mounted_fluorescent_lights", "propane_tank", "utility_box_01", "power_box_01",
    "steel_frame_shelves_01", "metal_stool_02", "painted_wooden_stool", "SchoolDesk_01",
    "SchoolChair_01", "standing_chalkboard_01", "wooden_bookshelf_worn", "tool_cart",
    "hand_truck", "old_tyre", "cement_bag", "wicker_basket_02", "pot_enamel_01", "trashbag",
    "Television_01", "planter_pot_clay", "plastic_bottle_gallon", "plastic_jerrycan",
    "wooden_crate_01", "drill_press_01", "bench_vice_01", "metal_office_desk", "wooden_ladder",
]
MODEL_TEX_SIZE = 512


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()


def save_jpg(data, path, size, quality=82):
    im = Image.open(BytesIO(data)).convert("RGB")
    if im.width > size:
        im = im.resize((size, size * im.height // im.width), Image.LANCZOS)
    im.save(path, "JPEG", quality=quality, optimize=True)


def fetch_texture(key, asset):
    out = os.path.join(ROOT, "tex")
    os.makedirs(out, exist_ok=True)
    targets = {"diff": ("Diffuse", TEX_DIFF_SIZE), "nor": ("nor_gl", TEX_AUX_SIZE), "arm": ("arm", TEX_AUX_SIZE)}
    if all(os.path.exists(os.path.join(out, f"{key}_{s}.jpg")) for s in targets):
        return
    files = json.loads(get(API + asset))
    for suffix, (field, size) in targets.items():
        url = files[field]["1k"]["jpg"]["url"]
        save_jpg(get(url), os.path.join(out, f"{key}_{suffix}.jpg"), size)
    print("tex", key, "<-", asset)


def fetch_model(name):
    out = os.path.join(ROOT, "models", name)
    gltf_path = os.path.join(out, name + ".gltf")
    if os.path.exists(gltf_path):
        return
    os.makedirs(os.path.join(out, "textures"), exist_ok=True)
    g = json.loads(get(API + name))["gltf"]["1k"]["gltf"]
    doc = json.loads(get(g["url"]))
    for rel, info in g["include"].items():
        data = get(info["url"])
        dst = os.path.join(out, rel)
        if rel.endswith(".jpg") or rel.endswith(".png"):
            # đổi tên đuôi về .jpg nếu là png, thu nhỏ
            new_rel = rel.rsplit(".", 1)[0] + ".jpg"
            save_jpg(data, os.path.join(out, new_rel), MODEL_TEX_SIZE)
            if new_rel != rel:
                for im in doc.get("images", []):
                    if im.get("uri") == rel:
                        im["uri"] = new_rel
                        im["mimeType"] = "image/jpeg"
        else:
            with open(dst, "wb") as f:
                f.write(data)
    with open(gltf_path, "w") as f:
        json.dump(doc, f)
    print("model", name)


if __name__ == "__main__":
    only = set(sys.argv[1:])
    for k, a in TEXTURES.items():
        if not only or k in only:
            fetch_texture(k, a)
    for m in MODELS:
        if not only or m in only:
            fetch_model(m)
    print("xong")
