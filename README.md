# Sáu Hòn Đảo – bản remaster góc nhìn thứ nhất (Three.js r128)

Mở `index.html` bằng trình duyệt là chơi được, kể cả khi mở trực tiếp file (`file://`) và không có mạng.
Nếu muốn chạy qua server: `npx serve .` hoặc `python -m http.server`, rồi mở `http://localhost:...`.

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
Các file là script thường (không phải ES module), nạp theo thứ tự trong `index.html`
và dùng chung biến toàn cục, nên mở file trực tiếp vẫn chạy.

```
index.html          điểm vào (giữ nguyên tên)
css/style.css       giao diện gốc + tâm ngắm, màn hình khóa chuột, bảng đồ họa
vendor/three.min.js Three.js r128 (đúng phiên bản bản gốc dùng qua CDN)
js/config.js        3 mức chất lượng + thông số góc nhìn thứ nhất (chiều cao mắt, FOV, độ nhạy)
js/engine.js        renderer (sRGB, ACES tone mapping, PCF soft shadow), bầu trời, nắng, env map
js/textures.js      texture vẽ bằng code: cỏ, đất, đá, gỗ, tường vôi, ngói, tôn, gạch vỉa hè, kính, biển hiệu chữ Việt, quốc kỳ
js/materials.js     vật liệu PBR có cache, hàm dựng sb/sc/sm, gộp mesh tĩnh, hiệu ứng lá lay trong gió
js/characters.js    nhân vật (tay, chân, mặt, nón lá); NPC đứng yên gộp thành 1 mesh
js/props.js         nhà ống, nhà cấp 4 mái ngói, cột điện + dây điện, xe máy, ghế nhựa, sạp chợ
js/world.js         6 đảo, cầu, chủ đề từng đảo, NPC, ruộng, rương, cây (InstancedMesh), lúa, cờ, khói
js/data.js          câu hỏi (giữ nguyên)
js/state.js         save game + kinh tế giá lúa (giữ nguyên)
js/player.js        điều khiển FPS (Pointer Lock), vật lý, near/act/buy (logic gốc)
js/ui.js            HUD, hỏi đáp (gốc), bảng đồ họa, bảng hiệu năng
js/main.js          vòng lặp game (gốc) + cập nhật hình ảnh, LOD, độ phân giải động
```

### Chỉnh sửa nhanh
- **Câu hỏi:** `js/data.js`.
- **Chiều cao mắt, FOV, độ nhạy chuột, độ lắc đầu:** `FP` trong `js/config.js`.
- **Màu, độ nhám, kích thước lặp texture:** `MDEF` trong `js/materials.js`; hoa văn nằm trong `GEN` ở `js/textures.js`.
- **Thêm nhà ống:** `tubeHouse({ x, y, z, ry, floors, color, sign: ["TIÊU ĐỀ", "dòng phụ", "#nền", "#chữ"] })`.
- **Thêm đồ trang trí tĩnh:** gọi `sb(...)` (hộp), `sc(...)` (trụ) hoặc `sm(geometry, ...)`. Các vật này được tự động gộp theo đảo.
  Thêm `{ detail: true }` để vật tự ẩn khi người chơi ở xa.
- **Vật chuyển động:** tạo `THREE.Mesh` thường và `scene.add(...)`. Đừng dùng `sb`/`sc`/`sm`, vì các mesh đó bị gộp và đứng yên.

## Phần giữ nguyên so với bản gốc
- Vị trí, bán kính, độ cao của 6 đảo; 9 cây cầu; hàm `groundAt` (va chạm).
- Tốc độ 7/11, lực nhảy 11, trọng lực 22, giới hạn dt 0.05 s, rơi xuống dưới y = -30 thì về (0, 0, 8).
- Vị trí NPC, ruộng, quầy, rương; bán kính tương tác; logic `near`, `act`, `buy`.
- Câu hỏi, giá lúa, sự kiện thị trường, save `localStorage` (khóa `dao-nong-trai`, save cũ vẫn đọc được).

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
