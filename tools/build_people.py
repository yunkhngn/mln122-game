#!/usr/bin/env python3
"""Chọn lọc + nén bộ nhân vật Quaternius (CC0) vào assets/people/.

Nguồn (giải nén ở gốc dự án, không deploy):
  Universal Base Characters[Standard]/   – thân người nam/nữ có khung xương + tóc
  Universal Animation Library[Standard]/ – hoạt ảnh cùng khung xương

Kết quả:
  assets/people/male.gltf|bin, female.gltf|bin   – thân (đã bỏ normal/roughness map)
  assets/people/hair_*.gltf|bin                  – tóc (gốc tọa độ = tư thế chữ T)
  assets/people/anims.glb                        – vài hoạt ảnh chọn lọc, không kèm mesh
  assets/people/*.jpg                            – texture thu nhỏ
Chạy:  python3 tools/build_people.py
"""
import json, os, shutil, struct
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UBC = os.path.join(ROOT, "Universal Base Characters[Standard]")
UAL = os.path.join(ROOT, "Universal Animation Library[Standard]")
OUT = os.path.join(ROOT, "assets", "people")

BODY_DIR = os.path.join(UBC, "Base Characters", "Godot - UE")
TEX_DIR = os.path.join(UBC, "Base Characters", "Textures")
HAIR_DIR = os.path.join(UBC, "Hairstyles", "Origin at 0", "glTF (Godot)")
CLIPS = ["Idle_Loop", "Idle_Talking_Loop", "Walk_Loop", "Sitting_Idle_Loop", "Sitting_Talking_Loop",
         "Driving_Loop", "Fixing_Kneeling", "Crouch_Idle_Loop", "Interact"]
HAIRS = ["Hair_SimpleParted", "Hair_Buzzed", "Hair_Long", "Hair_Buns", "Hair_Beard"]


def jpg(src, dst, size, q=85):
    im = Image.open(src).convert("RGB")
    if im.width > size:
        im = im.resize((size, size * im.height // im.width), Image.LANCZOS)
    im.save(os.path.join(OUT, dst), "JPEG", quality=q, optimize=True)


def strip_maps(doc, image_map):
    """Bỏ normal/roughness map; đổi ảnh màu sang file jpg đã nén."""
    for m in doc.get("materials", []):
        m.pop("normalTexture", None)
        m.pop("occlusionTexture", None)
        pbr = m.setdefault("pbrMetallicRoughness", {})
        pbr.pop("metallicRoughnessTexture", None)
        pbr["metallicFactor"] = 0
        pbr["roughnessFactor"] = 0.85
    for im in doc.get("images", []):
        uri = im.get("uri", "")
        im["uri"] = image_map.get(uri, uri)
        im["mimeType"] = "image/jpeg"
    return doc


def copy_gltf(src_dir, name, out_name, image_map):
    doc = json.load(open(os.path.join(src_dir, name + ".gltf")))
    for b in doc["buffers"]:
        shutil.copy(os.path.join(src_dir, b["uri"]), os.path.join(OUT, out_name + ".bin"))
        b["uri"] = out_name + ".bin"
    strip_maps(doc, image_map)
    json.dump(doc, open(os.path.join(OUT, out_name + ".gltf"), "w"))


def read_glb(path):
    b = open(path, "rb").read()
    jl = struct.unpack("<I", b[12:16])[0]
    doc = json.loads(b[20:20 + jl])
    bl = struct.unpack("<I", b[20 + jl:24 + jl])[0]
    return doc, b[28 + jl:28 + jl + bl]


def build_anims():
    doc, binc = read_glb(os.path.join(UAL, "Unreal-Godot", "UAL1_Standard.glb"))
    names = {i: n.get("name") for i, n in enumerate(doc["nodes"])}
    anims = []
    for a in doc["animations"]:
        if a["name"] not in CLIPS:
            continue
        # bỏ kênh scale và dịch chuyển (trừ root/pelvis) để vừa mọi tỉ lệ cơ thể + nhẹ file
        keep = [c for c in a["channels"] if c["target"]["path"] == "rotation" or (c["target"]["path"] == "translation" and names[c["target"]["node"]] in ("root", "pelvis"))]
        smap, samplers = {}, []
        for c in keep:
            s = c["sampler"]
            if s not in smap:
                smap[s] = len(samplers)
                samplers.append(dict(a["samplers"][s]))
            c["sampler"] = smap[s]
        anims.append({"name": a["name"], "channels": keep, "samplers": samplers})
    # gom accessor được dùng, đóng gói lại buffer
    out = bytearray()
    views, accs, amap = [], [], {}
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
    def acc(i):
        if i in amap:
            return amap[i]
        a = dict(doc["accessors"][i])
        v = doc["bufferViews"][a["bufferView"]]
        assert a["componentType"] == 5126 and not v.get("byteStride")
        n = a["count"] * comps[a["type"]] * 4
        start = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        while len(out) % 4:
            out.append(0)
        views.append({"buffer": 0, "byteOffset": len(out), "byteLength": n})
        out.extend(binc[start:start + n])
        a["bufferView"] = len(views) - 1
        a.pop("byteOffset", None)
        accs.append(a)
        amap[i] = len(accs) - 1
        return amap[i]
    for a in anims:
        for s in a["samplers"]:
            s["input"] = acc(s["input"])
            s["output"] = acc(s["output"])
    nodes = []
    for n in doc["nodes"]:
        n = dict(n)
        n.pop("mesh", None)
        n.pop("skin", None)
        nodes.append(n)
    new = {"asset": {"version": "2.0", "generator": "build_people.py"}, "scene": 0, "scenes": doc["scenes"],
           "nodes": nodes, "animations": anims, "accessors": accs, "bufferViews": views,
           "buffers": [{"byteLength": len(out)}]}
    js = json.dumps(new).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    while len(out) % 4:
        out.append(0)
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(os.path.join(OUT, "anims.glb"), "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(out), 0x004E4942)); f.write(out)
    print("anims.glb", round(total / 1e6, 2), "MB", [a["name"] for a in anims])


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    # texture: da sáng/ngăm cho nam & nữ, mắt, tóc
    jpg(os.path.join(TEX_DIR, "T_Superhero_Male_Dark.png"), "body_male_dark.jpg", 1024)
    jpg(os.path.join(TEX_DIR, "T_Superhero_Male_Ligh.png"), "body_male_light.jpg", 1024)
    jpg(os.path.join(TEX_DIR, "T_Superhero_Female_Dark_BaseColor.png"), "body_female_dark.jpg", 1024)
    jpg(os.path.join(TEX_DIR, "T_Superhero_Female_Light_BaseColor.png"), "body_female_light.jpg", 1024)
    jpg(os.path.join(TEX_DIR, "T_Eye_Brown.png"), "eye.jpg", 256)
    jpg(os.path.join(TEX_DIR, "T_Hair_1_BaseColor.png"), "hair1.jpg", 512)
    jpg(os.path.join(TEX_DIR, "T_Hair_2_BaseColor.png"), "hair2.jpg", 512)
    imap = {"T_Superhero_Male_Dark.png": "body_male_dark.jpg", "T_Superhero_Female_Dark_BaseColor.png": "body_female_dark.jpg",
            "T_Eye_Brown.png": "eye.jpg", "T_Hair_1_BaseColor.png": "hair1.jpg", "T_Hair_2_BaseColor.png": "hair2.jpg",
            "T_Hair_2_BaseColor_png.png": "hair2.jpg", "T_Hair_1_BaseColor_png.png": "hair1.jpg"}
    copy_gltf(BODY_DIR, "Superhero_Male_FullBody", "male", imap)
    copy_gltf(BODY_DIR, "Superhero_Female_FullBody", "female", imap)
    for h in HAIRS:
        copy_gltf(HAIR_DIR, h, h.lower(), imap)
    build_anims()
    print("xong ->", OUT)
