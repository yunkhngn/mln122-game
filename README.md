# Sáu Hòn Đảo – bản phố phường góc nhìn thứ nhất (Three.js r128)

Thế giới là **một phường phố Việt trên mặt đất** (không còn đảo bay): ngã tư ở giữa, 4 nhánh phố, 6 khu chủ đề
(trường học, chợ, xưởng cơ khí, dãy quán "cạnh tranh", UBND phường, công trường), ruộng ven đô.
Texture ảnh thật + đồ vật 3D CC0 từ Poly Haven, nhân vật 3D có khung xương + hoạt ảnh (Quaternius CC0), biển hiệu chữ Việt.

**Cần chạy qua web server** (model GLTF không nạp được khi mở `file://`):
`npx serve .` hoặc `python3 -m http.server`, rồi mở `http://localhost:...`. Deploy Vercel: đẩy nguyên thư mục lên (site tĩnh, không cần build).

## Điều khiển
| Phím | Chức năng |
|---|---|
| Nhấp chuột | Khóa con trỏ, vào góc nhìn thứ nhất |
| Chuột | Nhìn quanh (lên/xuống/trái/phải) |
| W A S D | Di chuyển · **Shift** chạy · **Space** nhảy |
| ← / → | Xoay ngang bằng bàn phím |
| E / B | Tương tác / mua hạt giống (như bản gốc) |
| 1-4 hoặc A-D, Enter | Trả lời câu hỏi |
| G | Bảng đồ họa (Thấp / Trung bình / Cao, tự giảm độ phân giải, độ nhạy chuột) |
| P | Hiện FPS, draw call, số tam giác |
| Esc | Nhả chuột / đóng hộp thoại |

## Cấu trúc mã nguồn
Script thường (không phải ES module), nạp theo thứ tự trong `index.html`, dùng chung biến toàn cục.

```
index.html             điểm vào + màn hình tải
vendor/                three.min.js r128 + GLTFLoader r128
assets/tex/            texture ảnh thật (diff / nor / arm), Poly Haven CC0
assets/models/         model GLTF Poly Haven CC0 (ghế nhựa, cục nóng điều hòa, quạt trần, kệ sắt…)
assets/people/         thân người + tóc + hoạt ảnh Quaternius CC0 (tạo bằng tools/build_people.py)
assets/CREDITS.md      nguồn tài nguyên
tools/fetch_assets.py  tải lại / thêm tài nguyên (cần Python + Pillow)
js/config.js           3 mức chất lượng + thông số góc nhìn thứ nhất
js/engine.js           renderer, bầu trời, nắng, env map
js/textures.js         texture vẽ bằng code: biển hiệu phong hóa, lịch, thực đơn, tán lá, vệt bẩn
js/assets.js           nạp texture ảnh thật (pbr) + model GLTF (prop/propL → InstancedMesh, tự ẩn khi xa)
js/materials.js        bảng vật liệu MDEF, hiệu ứng tường bẩn (grime), gộp mesh tĩnh
js/characters.js       nhân vật 3D Quaternius: person({...}) – tô áo/quần lên da, tóc, mũ cối/nón lá/mũ bảo hộ, hoạt ảnh đứng/nói/đi/ngồi ghế nhựa
js/props.js            nhà ống (quán đi vào được), cột điện + dây, xe máy, cây, sạp chợ, va chạm SOLID
js/world.js            bố cục phường, các khu chủ đề, NPC, ruộng, rương, cờ, khói
js/data.js · state.js  câu hỏi + kinh tế giá lúa (logic gốc)
js/player.js           điều khiển FPS, mặt đất + va chạm tường (SOLID), near/act/buy
js/ui.js · main.js     HUD, hỏi đáp, bảng đồ họa, vòng lặp
```

### Chỉnh sửa nhanh
- **Câu hỏi:** `js/data.js`.
- **Thêm nhà ống:** `tubeHouse({ x, y, z, ry, floors, type: "pho" | "tea" | "grocery" | "moto" | "phone" | "barber" | "books" | "home" | "closed", sign: {title, sub, top, bg, fg, kind} })`.
- **Thêm người:** `person({ female, shirt, pants, sleeve, shorts, print, hair: "short"|"buzz"|"long"|"bun", hat: "coi"|"non"|"cap"|"hard", pose: "stand"|"talk"|"walk"|"sit"|"eat"|"squat"|"fix"|"drive" })`.
- **Thêm đồ vật GLTF:** khai báo trong `MODEL_DEF` (`js/assets.js`), tải bằng `tools/fetch_assets.py`, đặt bằng `prop(key, x, y, z, ry)`.
- **Va chạm:** `solidW(x0, z0, x1, z1, top)` – hộp thấp (≤ 0.6 trên chân) đi lên được, cao hơn là tường.

## Phần giữ nguyên so với bản gốc
- Tốc độ 7/11, lực nhảy 11, trọng lực 22, giới hạn dt 0.05 s.
- Logic `near`, `act`, `buy`, bán kính tương tác; câu hỏi, giá lúa, sự kiện thị trường, save `localStorage` (khóa `dao-nong-trai`).
- **Đã đổi:** bản đồ (đảo → phường), `groundAt` (vỉa hè/sàn/bậc thang) + thêm va chạm tường, vị trí NPC/ruộng/quầy/rương.

Đo nhanh bản phố phường (Chrome, Apple M2, mức Trung bình, quay camera liên tục): ~60 FPS, ~390 draw call, ~1 triệu tam giác.
Số liệu bảng dưới là của bản đảo cũ.

## Hiệu năng (đo thật, có giới hạn)
Đo trong Chrome headless, 1280×720. Máy test không có GPU nên WebGL chạy bằng **SwiftShader** (CPU giả lập GPU).
Vì vậy FPS dưới đây chỉ để so sánh tương đối, **không phải FPS trên máy thật**.
Chỉ số draw call, tam giác và CPU mỗi khung thì không phụ thuộc GPU.
Camera quay 360° liên tục trong 8 giây; tự chỉnh độ phân giải tắt.

| | Bản gốc | Mới – Thấp | Mới – Trung bình | Mới – Cao |
|---|---|---|---|---|
| FPS (SwiftShader) | 6.8 | 2.4 | 0.9 | 0.9 |
| CPU JS / khung (TB / p95) | 1.6 / 6.0 ms | 2.4 / 8.3 ms | 2.3 / 8.9 ms | 3.1 / 8.2 ms |
| Draw call (gồm pass bóng) | 78 | 102 | 134 | 131 |
| Tam giác / khung | 2.2k | 50k | 62k | 67k |
| Geometry trong bộ nhớ | 237 | 168 | 157 | 154 |
| Texture | 1 | 28 | 41 | 40 |
| JS heap | 8 MB | 29 MB | 47 MB | 52 MB |
| Thời gian tải (SwiftShader) | 0.5 s | 2.3 s | ~6 s | ~6–7 s |

Đã tối ưu:
- Hơn 1.000 mesh trang trí tĩnh được gộp theo (loại vật liệu × đảo); màu tint chuyển vào màu đỉnh.
- Cây và lúa vẽ bằng InstancedMesh.
- NPC đứng yên chỉ tốn 1 draw call.
- Vật nhỏ tự ẩn khi ở xa (LOD).
- Không cấp phát object mới trong vòng lặp.
- Bóng bám lưới texel; mức Thấp chỉ cập nhật bóng mỗi 2 khung.
- Mức Thấp tắt env map (nhanh hơn ~30% trên SwiftShader) và bỏ normal map.
- Độ phân giải tự hạ khi FPS thấp. Phần này chỉ đổi pixel ratio, không chạm vào mô phỏng.

Trên GPU thật, chi phí mỗi pixel thấp hơn nhiều. Nên tự kiểm tra bằng phím **P** trên máy của bạn.
Nếu không đạt 60 FPS, hãy chọn mức **Thấp**.

## Kiểm thử đã chạy (25/25 đạt, tự động bằng Playwright)
- Di chuyển W và D đúng hướng nhìn; camera đặt đúng tầm mắt.
- Nhảy rồi tiếp đất; chuột xoay góc nhìn (Pointer Lock hoạt động).
- Gợi ý tương tác NPC; mở hỏi đáp bằng E; trả lời bằng phím và bằng chuột; hoàn thành đảo → `S.done`; Esc đóng hộp thoại.
- Gieo hạt → lúa chín → thu hoạch; bán lúa đúng giá; mua hạt (B); mở rương +150.
- Đứng trên cầu; rơi khỏi đảo thì hồi sinh.
- Bảng đồ họa: đổi Cao/Thấp ngay trong lúc chơi; bảng hiệu năng.
- Tự lưu `localStorage`; tải lại vẫn giữ tiến độ.
- Không có lỗi console.

## Hạn chế còn lại
- Chưa đo được FPS trên GPU thật (môi trường test không có GPU). Chưa xác nhận đạt 60 FPS.
- Texture được vẽ bằng code nên không chi tiết bằng ảnh scan. Không dùng GLTF, Draco hay KTX2 vì game không có file model hay ảnh ngoài nào.
  Có thể thay sau này bằng cách gán `map`/`normalMap` trong `mat()`.
- Không có baked lighting hay ambient occlusion map; dùng bóng thời gian thực và env map.
- Nhà được thu nhỏ khoảng 0.8 tỉ lệ thật để vừa các đảo nhỏ. Nhà và đồ vật không có va chạm, đúng như bản gốc (bản gốc chỉ có va chạm mặt đất).
- Đổi độ phân giải texture và bật/tắt normal map chỉ có hiệu lực ở lần tải trang sau.
  Bóng, độ phân giải, mật độ lúa, mây, khói và env map đổi được ngay.
- Thiết bị cảm ứng chưa có joystick ảo (bản gốc cũng không có).
