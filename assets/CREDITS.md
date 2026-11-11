# Nguồn tài nguyên

Toàn bộ texture trong `tex/` và model trong `models/` lấy từ **Poly Haven** (https://polyhaven.com), giấy phép **CC0** (public domain, không cần ghi công nhưng ghi lại để tiện tra cứu).
Tải lại / thêm bớt bằng `python3 tools/fetch_assets.py` (danh sách nằm trong script).

Texture được thu nhỏ: ảnh màu 1024 px, normal/ARM 512 px. Texture của model thu về 512 px.
Nhân vật: thân người + tóc từ **Universal Base Characters**, hoạt ảnh từ **Universal Animation Library** của Quaternius (https://quaternius.com, CC0).
Đã chọn lọc/nén vào `people/` bằng `python3 tools/build_people.py` (cần 2 thư mục gốc đặt ở gốc dự án). Quần áo được tô lên texture da bằng code.

Biển hiệu, lịch, thực đơn, tán lá được vẽ bằng canvas trong code.
Font biển hiệu: Oswald, Be Vietnam Pro, Pacifico (Google Fonts, SIL Open Font License).
