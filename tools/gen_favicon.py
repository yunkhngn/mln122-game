#!/usr/bin/env python3
"""Generate retro Vietnam Bao Cap themed favicons: SVG, ICO, PNGs."""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. Generate favicon.svg (Vector format for crisp rendering in modern browsers)
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="badgeGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#cf2a24"/>
      <stop offset="70%" stop-color="#b31a15"/>
      <stop offset="100%" stop-color="#8b110c"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff176"/>
      <stop offset="45%" stop-color="#ffd54f"/>
      <stop offset="100%" stop-color="#ffb300"/>
    </linearGradient>
    <linearGradient id="goldDark" x1="0%" y1="0%" x2="0%" y3="100%">
      <stop offset="0%" stop-color="#ffca28"/>
      <stop offset="100%" stop-color="#d48806"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="innerStarShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#5a0000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Outer Shadow & Base Circle -->
  <circle cx="256" cy="256" r="236" fill="url(#badgeGrad)" stroke="#ffd54f" stroke-width="10" filter="url(#shadow)"/>
  
  <!-- Inner dotted stamp ring -->
  <circle cx="256" cy="256" r="214" fill="none" stroke="#f6c343" stroke-width="3" stroke-dasharray="6,6" opacity="0.6"/>
  
  <!-- Central Star -->
  <g filter="url(#innerStarShadow)" transform="translate(0, -18)">
    <!-- 5-Pointed Star -->
    <polygon points="
      256,76
      294,188
      412,189
      317,259
      353,371
      256,302
      159,371
      195,259
      100,189
      218,188"
      fill="url(#goldGrad)" stroke="#c67d00" stroke-width="4" stroke-linejoin="round"/>
    
    <!-- Star facets for 3D retro badge look -->
    <polygon points="256,76 256,302 353,371" fill="#ffa000" opacity="0.22"/>
    <polygon points="256,76 256,302 195,259" fill="#fff" opacity="0.18"/>
    <polygon points="256,76 256,302 412,189" fill="#ffa000" opacity="0.25"/>
  </g>

  <!-- Golden Rice Ears (Bông lúa vàng) at Bottom -->
  <g fill="url(#goldGrad)" stroke="#b87400" stroke-width="1.5" stroke-linejoin="round">
    <!-- Left Rice Ear -->
    <g transform="translate(256, 350) scale(1, 1)">
      <!-- Left side grains -->
      <path d="M-20,-10 C-45,-25 -70,-35 -95,-35 C-85,-20 -60,-5 -35,5 Z" />
      <path d="M-40,8 C-70,0 -105,-5 -135,5 C-120,20 -85,25 -55,20 Z" />
      <path d="M-60,26 C-95,28 -130,35 -155,55 C-135,65 -100,60 -72,42 Z" />
      <path d="M-75,48 C-105,62 -135,85 -150,115 C-130,115 -105,100 -85,72 Z" />
    </g>

    <!-- Right Rice Ear -->
    <g transform="translate(256, 350) scale(-1, 1)">
      <!-- Right side grains -->
      <path d="M-20,-10 C-45,-25 -70,-35 -95,-35 C-85,-20 -60,-5 -35,5 Z" />
      <path d="M-40,8 C-70,0 -105,-5 -135,5 C-120,20 -85,25 -55,20 Z" />
      <path d="M-60,26 C-95,28 -130,35 -155,55 C-135,65 -100,60 -72,42 Z" />
      <path d="M-75,48 C-105,62 -135,85 -150,115 C-130,115 -105,100 -85,72 Z" />
    </g>

    <!-- Center Rice Stalk Stem Arc -->
    <path d="M120,440 Q256,480 392,440" fill="none" stroke="#fbc02d" stroke-width="7" stroke-linecap="round"/>
    
    <!-- Central ribbon / gear emblem tie -->
    <circle cx="256" cy="458" r="14" fill="#ffd54f" stroke="#b87400" stroke-width="2"/>
    <circle cx="256" cy="458" r="7" fill="#b31a15"/>
  </g>
</svg>
'''

svg_path = os.path.join(ROOT, "favicon.svg")
with open(svg_path, "w", encoding="utf-8") as f:
    f.write(svg_content)
print(f"Generated {svg_path}")

# 2. Render high-res PNG using Pillow and export multiple sizes
def draw_favicon(size):
    # Render with 4x supersampling for ultra smooth antialiasing
    scale = 4
    S = size * scale
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    cx, cy = S // 2, S // 2
    R = int(S * 0.46)

    # Base red circle
    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill="#b31a15", outline="#ffd54f", width=int(S * 0.022))

    # Inner subtle dashed ring
    r_inner = int(S * 0.42)
    d.ellipse([cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], outline="#f6c343", width=int(S * 0.006))

    # Central star (shifted slightly up)
    star_cy = cy - int(S * 0.035)
    star_R = S * 0.23
    star_r = star_R * 0.382
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        curr = star_R if i % 2 == 0 else star_r
        pts.append((cx + curr * math.cos(a), star_cy + curr * math.sin(a)))

    # Star drop shadow
    shadow_pts = [(x, y + int(S * 0.012)) for x, y in pts]
    d.polygon(shadow_pts, fill="#500906")
    # Star fill
    d.polygon(pts, fill="#ffd54f", outline="#c67d00", width=int(S * 0.008))

    # Star facet shading
    for i in range(0, 10, 2):
        p_tip = pts[i]
        p_right = pts[(i + 1) % 10]
        d.polygon([(cx, star_cy), p_tip, p_right], fill="#ffa000")

    # Bottom golden wreath / rice ear arch
    arc_y = cy + int(S * 0.38)
    d.arc([cx - int(S * 0.34), arc_y - int(S * 0.15), cx + int(S * 0.34), arc_y + int(S * 0.15)], 
          start=20, end=160, fill="#ffd54f", width=int(S * 0.02))

    # Rice grains left & right
    for s in (-1, 1):
        for k in range(5):
            t = (k + 1) / 6.0
            gx = cx + s * int(S * (0.10 + t * 0.24))
            gy = cy + int(S * (0.24 + t * 0.15 - (t - 0.5)**2 * 0.1))
            gw = int(S * 0.045)
            gh = int(S * 0.025)
            angle = s * (-35 + k * 18)
            # Draw grain ellipse
            d.ellipse([gx - gw, gy - gh, gx + gw, gy + gh], fill="#ffd54f", outline="#b87400", width=int(S * 0.004))

    # Center tie node
    d.ellipse([cx - int(S*0.03), arc_y + int(S*0.04) - int(S*0.03), cx + int(S*0.03), arc_y + int(S*0.04) + int(S*0.03)], 
              fill="#ffd54f", outline="#b87400", width=int(S*0.005))
    d.ellipse([cx - int(S*0.015), arc_y + int(S*0.04) - int(S*0.015), cx + int(S*0.015), arc_y + int(S*0.04) + int(S*0.015)], 
              fill="#b31a15")

    # Downsample with Lanczos
    return im.resize((size, size), Image.LANCZOS)

# Generate 512x512
img512 = draw_favicon(512)
img512.save(os.path.join(ROOT, "favicon-512x512.png"), "PNG")
print("Generated favicon-512x512.png")

# Generate 192x192
img192 = draw_favicon(192)
img192.save(os.path.join(ROOT, "favicon-192x192.png"), "PNG")
img192.save(os.path.join(ROOT, "apple-touch-icon.png"), "PNG")
print("Generated favicon-192x192.png and apple-touch-icon.png")

# Generate 32x32
img32 = draw_favicon(32)
img32.save(os.path.join(ROOT, "favicon-32x32.png"), "PNG")
print("Generated favicon-32x32.png")

# Generate favicon.ico (multi-resolution 16, 32, 48, 64)
img16 = draw_favicon(16)
img48 = draw_favicon(48)
img64 = draw_favicon(64)
img32.save(
    os.path.join(ROOT, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)],
    append_images=[img16, img48, img64]
)
print("Generated favicon.ico")
