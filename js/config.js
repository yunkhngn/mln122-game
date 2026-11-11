// ============================================================
//  CẤU HÌNH ĐỒ HỌA – 3 mức chất lượng (Thấp / Trung bình / Cao)
//  Chỉ ảnh hưởng hình ảnh, KHÔNG đổi gameplay / vật lý.
// ============================================================
const QUALITY = {
  low: {
    name: "Thấp", aa: false, maxPR: 1, minPR: 0.6,
    shadow: 1024, soft: false, shadowEvery: 2,   // cập nhật bóng mỗi 2 khung hình
    env: false,      // tắt phản xạ environment map (tiết kiệm ~30% GPU)
    tex: 256, normals: false, aniso: 2,
    detail: 45,      // khoảng cách hiển thị vật trang trí nhỏ (LOD)
    rice: 0.45,      // mật độ lúa trên ruộng
    clouds: 6, smoke: 3,
  },
  medium: {
    name: "Trung bình", aa: true, maxPR: 1.5, minPR: 0.75,
    shadow: 2048, soft: true, shadowEvery: 1, env: true,
    tex: 512, normals: true, aniso: 4,
    detail: 80, rice: 0.75, clouds: 10, smoke: 5,
  },
  high: {
    name: "Cao", aa: true, maxPR: 2, minPR: 1,
    shadow: 4096, soft: true, shadowEvery: 1, env: true,
    tex: 512, normals: true, aniso: 8,
    detail: 140, rice: 1, clouds: 14, smoke: 6,
  },
};

// Thiết lập người chơi (lưu riêng, không lẫn với save game)
const GFX_KEY = "mln-gfx";
function loadGfx() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(GFX_KEY) || "{}"); } catch (e) {}
  if (!QUALITY[s.q]) {
    const weak = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4;
    s.q = weak ? "low" : "medium";
  }
  if (s.auto == null) s.auto = true;   // tự hạ/tăng độ phân giải khi FPS thấp
  if (s.sens == null) s.sens = 1;      // độ nhạy chuột
  return s;
}
const GFXS = loadGfx();
let GFX = QUALITY[GFXS.q];
const saveGfx = () => { try { localStorage.setItem(GFX_KEY, JSON.stringify(GFXS)); } catch (e) {} };

// Kích thước texture & normal map được chốt lúc tải trang
// (đổi mức chất lượng sẽ áp dụng phần này ở lần tải sau).
const TEX_GEN = { size: GFX.tex, normals: GFX.normals };

// Thông số góc nhìn thứ nhất
const FP = {
  eye: 2.45,        // chiều cao mắt (nhân vật cao ~2.85 đơn vị)
  fov: 72, fovRun: 77,
  sens: 0.0022,     // độ nhạy chuột (nhân với GFXS.sens)
  bob: 0.055,       // biên độ lắc đầu khi đi
};
