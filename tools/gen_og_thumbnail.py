#!/usr/bin/env python3
"""Generate high quality 1200x630 OpenGraph and thumbnail banner for MLN122 - Game Bao Cấp."""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/Library/Fonts/Arial.ttf" if os.path.exists("/Library/Fonts/Arial.ttf") else FONT_BOLD

W, H = 1200, 630
im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
draw = ImageDraw.Draw(im)

# 1. Background: Deep rich crimson radial gradient
cx_bg, cy_bg = int(W * 0.35), int(H * 0.5)
max_dist = math.sqrt(W**2 + H**2) * 0.65

# Create radial gradient background
bg_pixels = im.load()
for y in range(H):
    for x in range(W):
        dx = x - cx_bg
        dy = y - cy_bg
        d = math.sqrt(dx * dx + dy * dy)
        t = min(1.0, d / max_dist)
        # Gradient: #b21e17 (center) -> #750d09 -> #3c0402 (corners)
        r = int(178 * (1 - t) + 60 * t)
        g = int(30 * (1 - t) + 5 * t)
        b = int(23 * (1 - t) + 3 * t)
        bg_pixels[x, y] = (r, g, b, 255)

# 2. Subtle vintage sunburst rays emanating from emblem center
rays_overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d_rays = ImageDraw.Draw(rays_overlay)
emblem_cx, emblem_cy = 280, 315
ray_count = 32
ray_len = 1000
for i in range(0, ray_count, 2):
    a1 = (i / ray_count) * 2 * math.pi
    a2 = ((i + 1) / ray_count) * 2 * math.pi
    p1 = (emblem_cx + ray_len * math.cos(a1), emblem_cy + ray_len * math.sin(a1))
    p2 = (emblem_cx + ray_len * math.cos(a2), emblem_cy + ray_len * math.sin(a2))
    d_rays.polygon([(emblem_cx, emblem_cy), p1, p2], fill=(255, 230, 140, 18))

im = Image.alpha_composite(im, rays_overlay)
draw = ImageDraw.Draw(im)

# 3. Outer vintage border & frame
draw.rectangle([16, 16, W - 17, H - 17], outline="#ffd54f", width=3)
draw.rectangle([24, 24, W - 25, H - 25], outline="#f6c343", width=1)
# Corner ornaments
for ox in (16, W - 36):
    for oy in (16, H - 36):
        draw.rectangle([ox, oy, ox + 20, oy + 20], fill="#8b110c", outline="#ffd54f", width=2)
        draw.text((ox + 4, oy + 2), "★", font=ImageFont.truetype(FONT_BOLD, 14), fill="#ffd54f")

# 4. Large Golden Emblem on Left (Emblem Center: 280, 315)
R_emblem = 180
# Shadow
draw.ellipse([emblem_cx - R_emblem - 8, emblem_cy - R_emblem + 6, 
              emblem_cx + R_emblem + 8, emblem_cy + R_emblem + 14], fill=(20, 2, 2, 160))
# Outer gold ring
draw.ellipse([emblem_cx - R_emblem, emblem_cy - R_emblem, 
              emblem_cx + R_emblem, emblem_cy + R_emblem], fill="#b31a15", outline="#ffd54f", width=8)

# Inner dashed stamp ring
r_dash = R_emblem - 16
draw.ellipse([emblem_cx - r_dash, emblem_cy - r_dash, 
              emblem_cx + r_dash, emblem_cy + r_dash], outline="#f6c343", width=2)

# Central 5-Point Star
star_r = int(R_emblem * 0.62)
star_inner = int(star_r * 0.382)
star_pts = []
for i in range(10):
    a = -math.pi / 2 + i * math.pi / 5
    curr = star_r if i % 2 == 0 else star_inner
    star_pts.append((emblem_cx + curr * math.cos(a), emblem_cy - 12 + curr * math.sin(a)))

# Star drop shadow
star_shadow = [(x + 2, y + 6) for x, y in star_pts]
draw.polygon(star_shadow, fill=(50, 5, 5, 200))
# Star fill
draw.polygon(star_pts, fill="#ffd54f", outline="#c67d00", width=3)

# 3D facet shading on star
for i in range(0, 10, 2):
    p_tip = star_pts[i]
    p_right = star_pts[(i + 1) % 10]
    draw.polygon([(emblem_cx, emblem_cy - 12), p_tip, p_right], fill="#ffa000")

# Golden rice ears (Bông lúa vàng) curving around bottom of star
for s in (-1, 1):
    for k in range(7):
        t = (k + 1) / 8.0
        gx = emblem_cx + s * int(R_emblem * (0.24 + t * 0.52))
        gy = emblem_cy + int(R_emblem * (0.25 + t * 0.42 - (t - 0.5)**2 * 0.3))
        gw = int(22 - k * 1.5)
        gh = int(12 - k * 0.8)
        draw.ellipse([gx - gw, gy - gh, gx + gw, gy + gh], fill="#ffd54f", outline="#b87400", width=2)

# Center tie knot
draw.ellipse([emblem_cx - 16, emblem_cy + R_emblem - 34, emblem_cx + 16, emblem_cy + R_emblem - 2], fill="#ffd54f", outline="#b87400", width=2)
draw.ellipse([emblem_cx - 8, emblem_cy + R_emblem - 26, emblem_cx + 8, emblem_cy + R_emblem - 10], fill="#8b110c")

# 5. Right Side Typography & Visual Layout
tx = 520

# Top ribbon tag
tag_font = ImageFont.truetype(FONT_BOLD, 18)
tag_text = "★ GÓC NHÌN THỨ NHẤT (FPS) · THREE.JS 3D ★"
draw.rectangle([tx, 65, tx + 480, 100], fill="#300504", outline="#ffd54f", width=2)
draw.text((tx + 28, 72), tag_text, font=tag_font, fill="#ffd54f")

# Main Title: MLN122
title_font = ImageFont.truetype(FONT_BOLD, 100)
# Drop shadow
draw.text((tx + 4, 114), "MLN122", font=title_font, fill=(20, 2, 2, 220))
# Fill
draw.text((tx, 110), "MLN122", font=title_font, fill="#fff275")
# Subtle 3D offset
draw.text((tx - 2, 108), "MLN122", font=title_font, fill="#ffd54f")

# Subtitle banner: GAME BAO CẤP
sub_font = ImageFont.truetype(FONT_BOLD, 46)
sub_text = "GAME BAO CẤP"
draw.rectangle([tx, 230, tx + 450, 295], fill="#c8231f", outline="#ffd54f", width=3)
draw.rectangle([tx + 4, 234, tx + 446, 291], outline="#f6c343", width=1)
draw.text((tx + 28, 235), sub_text, font=sub_font, fill="#ffffff")

# Catchphrase description
desc_font = ImageFont.truetype(FONT_BOLD, 22)
draw.text((tx, 318), "MÔ PHỎNG PHỐ PHƯỜNG & CHỢ THỊ TRƯỜNG 3D", font=desc_font, fill="#fced9d")

# Features bullet list
feat_font = ImageFont.truetype(FONT_BOLD, 19)
features = [
    "🌾 Trồng lúa, gieo hạt & thu hoạch tại ruộng",
    "🏪 Quầy thu mua lúa, sạp chợ & quán xá vỉa hè",
    "🎟️ Đổi tem phiếu mậu dịch & tương tác NPC",
    "🏙️ Khung cảnh Việt Nam hoài niệm chân thực"
]

fy = 360
for feat in features:
    # Bullet background card
    draw.rectangle([tx, fy - 2, tx + 560, fy + 26], fill=(50, 6, 5, 140))
    draw.text((tx + 10, fy), feat, font=feat_font, fill="#fff8e7")
    fy += 34

# 6. Bottom Stamp Coupons (Tem phiếu mậu dịch)
stamps = [
    ("GẠO", "5 KG", "#d4a359"),
    ("ĐƯỜNG", "1 KG", "#c85a4a"),
    ("THỊT", "500G", "#b84a4a"),
    ("VẢI", "2 MÉT", "#4a7a9a")
]

stamp_x = tx
for name, qty, color in stamps:
    sw, sh = 88, 48
    draw.rectangle([stamp_x, 525, stamp_x + sw, 525 + sh], fill="#f5ede0", outline="#2b231f", width=1)
    draw.rectangle([stamp_x + 3, 528, stamp_x + sw - 3, 528 + sh - 6], outline="#888", width=1)
    draw.text((stamp_x + 10, 532), "TEM PHIẾU", font=ImageFont.truetype(FONT_BOLD, 10), fill="#777")
    draw.text((stamp_x + 10, 544), name, font=ImageFont.truetype(FONT_BOLD, 15), fill="#9a1a14")
    draw.text((stamp_x + 10, 558), qty, font=ImageFont.truetype(FONT_BOLD, 11), fill="#222")
    stamp_x += sw + 16

# 7. Vintage Postmark Rubber Stamp in corner
postmark = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
pd = ImageDraw.Draw(postmark)
pd.ellipse([10, 10, 170, 170], outline=(200, 35, 30, 220), width=3)
pd.ellipse([22, 22, 158, 158], outline=(200, 35, 30, 180), width=1)
pm_font = ImageFont.truetype(FONT_BOLD, 15)
pm_small = ImageFont.truetype(FONT_BOLD, 12)
pd.text((32, 45), "BƯU ĐIỆN", font=pm_font, fill=(200, 35, 30, 230))
pd.text((38, 75), "1980 - 1986", font=pm_small, fill=(200, 35, 30, 210))
pd.text((28, 105), "★ ĐÃ DUYỆT ★", font=pm_small, fill=(200, 35, 30, 230))

# Rotate postmark stamp by -15 degrees for authentic rubber stamp look
postmark = postmark.rotate(-15, resample=Image.BICUBIC)
im.paste(postmark, (W - 200, H - 200), postmark)

# Save both og-image.png and thumbnail.png
og_path = os.path.join(ROOT, "og-image.png")
thumb_path = os.path.join(ROOT, "thumbnail.png")

im_rgb = im.convert("RGB")
im_rgb.save(og_path, "PNG", quality=92, optimize=True)
im_rgb.save(thumb_path, "PNG", quality=92, optimize=True)

print(f"Generated {og_path} (1200x630)")
print(f"Generated {thumb_path} (1200x630)")

