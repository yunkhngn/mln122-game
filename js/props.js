// ============================================================
//  BỘ DỰNG ĐỐI TƯỢNG PHỐ VIỆT
//  nhà ống (quán mở cửa đi vào được), chuồng cọp, cục nóng điều hòa, cờ treo,
//  cột điện + bó dây, đèn đường, xe máy, ghế nhựa lùn, cây (tấm lá), lan can gốc cây…
//  Tỉ lệ: U = 1.68 đơn vị / mét (khai báo trong assets.js).
// ============================================================

// ---------- Ngẫu nhiên có seed: bố cục giống nhau mỗi lần tải ----------
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = mulberry(20261111);
const rr = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- Va chạm: hộp AABB {x0,x1,z0,z1,top} ----------
// Hộp có đỉnh thấp (≤ chân + 0.6) => đi lên được (vỉa hè, bậc thang). Cao hơn => tường chắn.
const SOLID = [];
function solidW(x0, z0, x1, z1, top) {
  SOLID.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), top });
}
const _c = new T.Vector3();
function solidL(G, x0, z0, x1, z1, top) {
  G.updateMatrixWorld(true);
  let ax = 1e9, bx = -1e9, az = 1e9, bz = -1e9;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    G.localToWorld(_c.set(x, 0, z));
    ax = Math.min(ax, _c.x); bx = Math.max(bx, _c.x); az = Math.min(az, _c.z); bz = Math.max(bz, _c.z);
  }
  solidW(ax, az, bx, bz, _c.y + top);
}

// Mái ngói 4 mái (W >= D), đáy tại y=0, tâm tại gốc
function hipRoof(W, D, h, tile = 3.4) {
  const hw = W / 2, hd = D / 2, rx = Math.max(0, hw - hd), sl = Math.hypot(h, hd), sl2 = Math.hypot(h, hw - rx);
  const P = [], UV = [];
  const tri = (a, b, c, ua, ub, uc) => { P.push(...a, ...b, ...c); UV.push(...ua, ...ub, ...uc); };
  const t = 1 / tile;
  tri([-hw, 0, hd], [hw, 0, hd], [rx, h, 0], [-hw * t, 0], [hw * t, 0], [rx * t, sl * t]);
  tri([-hw, 0, hd], [rx, h, 0], [-rx, h, 0], [-hw * t, 0], [rx * t, sl * t], [-rx * t, sl * t]);
  tri([hw, 0, -hd], [-hw, 0, -hd], [-rx, h, 0], [-hw * t, 0], [hw * t, 0], [rx * t, sl * t]);
  tri([hw, 0, -hd], [-rx, h, 0], [rx, h, 0], [-hw * t, 0], [rx * t, sl * t], [-rx * t, sl * t]);
  tri([-hw, 0, -hd], [-hw, 0, hd], [-rx, h, 0], [-hd * t, 0], [hd * t, 0], [0, sl2 * t]);
  tri([hw, 0, hd], [hw, 0, -hd], [rx, h, 0], [-hd * t, 0], [hd * t, 0], [0, sl2 * t]);
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(P, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(UV, 2));
  g.computeVertexNormals();
  return g;
}

// Nhóm cục bộ đặt trong ST (vị trí + hướng). Mặt trước hướng về +z cục bộ.
function localGroup(x, y, z, ry = 0, detail = false) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  if (detail) g.userData.detail = true;
  ST.add(g); return g;
}
function subGroup(G, detail = true) { const D = new T.Group(); if (detail) D.userData.detail = true; G.add(D); return D; }
function worldPoint(g, x, y, z) { g.updateMatrixWorld(true); return g.localToWorld(new T.Vector3(x, y, z)); }

// Màu sơn mặt tiền phổ biến: vàng, kem, xanh cốm, hồng phấn, xanh trời, trắng ngà
const FACADE = [0xf2cf72, 0xf0dfb0, 0xcfe0a8, 0xf2c4ae, 0xbfd6e6, 0xeee6d6, 0xe8b860, 0xd8e8c0];
const DARK = M(0x1e1b18, 1);
const RAIL = M(0x23262a, 0.5, 0.6);
const INOX = M(0xd4d8dc, 0.25, 0.9);

// ============================================================
//  BIỂN HIỆU – tên quán (hư cấu) theo loại cửa hàng
// ============================================================
const STREET = ["Phố Chợ", "Phố Hàng Lúa", "Ngõ Văn Hóa", "Phố Mới"];
const SHOPS = {
  pho:     [["PHỞ BÒ GIA TRUYỀN", "Tái – Chín – Nạm – Gầu"], ["PHỞ GÀ BÀ TƯ", "Phở gà – Miến gà – Trứng non"], ["BÚN CHẢ HÀNG QUẠT", "Bún chả – Nem cua bể"], ["CƠM BÌNH DÂN", "Cơm suất – Canh cua"], ["BÚN RIÊU CUA", "Bún riêu – Bún ốc"], ["BÁNH CUỐN NÓNG", "Bánh cuốn – Chả quế"]],
  tea:     [["CÀ PHÊ SÁNG", "Cà phê đen đá – Nâu – Bạc xỉu"], ["TRÀ ĐÁ VỈA HÈ", "Trà đá – Hướng dương"], ["CÀ PHÊ GIẢNG", "Cà phê trứng"], ["NƯỚC MÍA SẠCH", "Nước mía – Sinh tố"]],
  grocery: [["TẠP HÓA THU HƯƠNG", "Bia – Nước ngọt – Bánh kẹo"], ["ĐẠI LÝ GAS", "Gas – Bếp gas – Nước khoáng"], ["TẠP HÓA MINH ANH", "Hàng tiêu dùng"], ["GẠO – NGŨ CỐC", "Gạo tám thơm – Nếp cái hoa vàng"]],
  moto:    [["SỬA XE MÁY", "Vá săm – Thay nhớt – Bơm hơi"], ["RỬA XE – SỬA XE", "Rửa xe máy 30k"], ["PHỤ TÙNG XE MÁY", "Lốp – Ắc quy – Nhớt"]],
  phone:   [["ĐIỆN THOẠI HÙNG CƯỜNG", "Mua bán – Sửa chữa – Ép kính"], ["MOBILE MINH PHÁT", "Trả góp 0% – Bảo hành 12 tháng"], ["SIM SỐ ĐẸP", "Nạp thẻ – Sim – Phụ kiện"]],
  barber:  [["CẮT TÓC NAM", "Cạo mặt – Ráy tai – Gội đầu"], ["SALON TÓC LAN", "Uốn – Duỗi – Nhuộm"]],
  books:   [["NHÀ SÁCH TRI THỨC", "Sách giáo khoa – Văn phòng phẩm"], ["PHOTO – IN ẤN", "Photo màu – Đóng quyển – Ép plastic"], ["VĂN PHÒNG PHẨM", "Bút – Vở – Đồ dùng học tập"]],
  home:    [], closed: [],
  tailor:  [["MAY ĐO THANH HÀ", "Áo dài – Vest – Sửa quần áo"]],
  pharmacy:[["NHÀ THUỐC", "Thuốc tây – Thực phẩm chức năng"]],
};
const SIGN_STYLE = [ // [nền, nền 2, chữ, kiểu]
  ["#c8231f", "#9e1712", "#ffe14a", "vinyl"], ["#1d4f9c", "#123a75", "#ffffff", "vinyl"], ["#f4e9cf", "#e6d6ae", "#b8231a", "vinyl"],
  ["#0f7a3e", "#0a5a2c", "#ffffff", "vinyl"], ["#ffd23a", "#f0b81a", "#b8131a", "vinyl"], ["#b07a45", "", "#8e1a12", "wood"],
  ["#ffffff", "#e8e8e8", "#d01a1a", "vinyl"], ["#5a1f6e", "#3a124a", "#ffe14a", "vinyl"], ["#2a2a2a", "#111", "#ff5a2a", "board"],
];
function signFor(type, i, addr) {
  const list = SHOPS[type];
  if (!list || !list.length) return null;
  const [title, sub] = list[i % list.length];
  const st = SIGN_STYLE[(i * 7 + title.length) % SIGN_STYLE.length];
  return { title, sub, top: addr, bg: st[0], bg2: st[1] || st[0], fg: st[2], kind: st[3], topc: st[3] == "wood" ? "#3a1a0a" : st[2] == "#ffffff" ? "#ffe14a" : "#ffffff", subc: st[3] == "wood" ? "#3a1a0a" : "#ffffff", font: type == "tea" && i % 2 ? "script" : "bold", stroke: st[3] == "vinyl" && st[0] != "#ffffff" ? "rgba(0,0,0,.35)" : null };
}

// ============================================================
//  CHI TIẾT NHỎ
// ============================================================
// Ghế nhựa lùn (đỏ / xanh) – đặc sản vỉa hè
const STOOL_GEO = (() => {
  const h = 0.42 * U, it = [{ g: BG(0.3 * U, 0.05 * U, 0.3 * U), m: mtx(0, h, 0) }];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) it.push({ g: new T.CylinderGeometry(0.018 * U, 0.028 * U, h, 5), m: mtx(sx * 0.12 * U, h / 2, sz * 0.12 * U, sz * 0.1, 0, -sx * 0.1) });
  for (const s of [-1, 1]) { it.push({ g: BG(0.26 * U, 0.03 * U, 0.02 * U), m: mtx(0, h * 0.35, s * 0.135 * U) }); it.push({ g: BG(0.02 * U, 0.03 * U, 0.26 * U), m: mtx(s * 0.135 * U, h * 0.35, 0) }); }
  return mergeGeos(it);
})();
function stool(x, y, z, c, p) { sm(STOOL_GEO, M(c ?? pick([0xd9302f, 0x2f6ad9, 0xd9302f, 0x2a9a5a]), 0.5), x, y, z, { detail: true, ry: rand() * 1.5, p, shadow: true }); }
// Bàn inox thấp
function lowTable(x, y, z, p, ry = 0) {
  const G = new T.Group(); G.position.set(x, y, z); G.rotation.y = ry; G.userData.detail = true; (p || ST).add(G);
  const h = 0.55 * U;
  sb(0.8 * U, 0.03 * U, 0.55 * U, INOX, 0, h, 0, { p: G });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) sb(0.03 * U, h, 0.03 * U, INOX, sx * 0.36 * U, h / 2, sz * 0.24 * U, { p: G });
  // ống đũa, lọ tương ớt, cốc trà đá
  sc(0.05, 0.05, 0.25, M(0x8a5a2a, 0.6), -0.2, h, 0, { p: G, seg: 6, shadow: false });
  sc(0.04, 0.04, 0.2, M(0xc8231f, 0.4), 0.1, h, 0.1, { p: G, seg: 6, shadow: false });
  sc(0.06, 0.05, 0.18, M(0xd8b060, 0.1), 0.35, h, -0.1, { p: G, seg: 6, shadow: false });
  return G;
}
// Bàn thờ thần tài / gia tiên (đỏ, có ảnh, bát hương)
function altar(G, x, y, z) {
  sb(1.4, 0.08, 0.7, M(0x8a1a12, 0.5), x, y, z, { p: G });
  sb(1.4, 0.9, 0.06, M(0x7a1510, 0.5), x, y + 0.45, z - 0.33, { p: G });
  sc(0.12, 0.1, 0.18, M(0xc8a040, 0.3, 0.6), x, y + 0.04, z, { p: G, seg: 8, shadow: false });
  for (const s of [-0.45, 0.45]) sc(0.03, 0.03, 0.5, M(0xe03a2a, 0.5), x + s, y + 0.04, z, { p: G, seg: 5, shadow: false });
  sb(0.35, 0.45, 0.04, M(0x2a2a2a, 0.5), x, y + 0.45, z - 0.28, { p: G, shadow: false });
}
// Hàng hóa trên kệ (hộp màu gộp chung)
function shelfGoods(G, x, y0, z, w, rows, gap) {
  for (let r = 0; r < rows; r++) {
    let gx = -w / 2 + 0.15;
    while (gx < w / 2 - 0.2) {
      const bw = rr(0.14, 0.32), bh = rr(0.18, 0.4);
      sb(bw, bh, 0.28, pick([0xd9302f, 0x2f7ad9, 0xe0b030, 0x3a9a5a, 0xf2f2ea, 0xe07a2a, 0x8a3a9a]), x + gx + bw / 2, y0 + r * gap + bh / 2 + 0.06, z, { p: G, shadow: false, detail: true });
      gx += bw + 0.03;
    }
  }
}

// Cờ đỏ sao vàng treo chéo trên mặt tiền
const FLAG_MAT = new T.MeshStandardMaterial({ map: TX.flag(), roughness: 0.8, side: T.DoubleSide });
const FLAG_GEO = (() => { // lá cờ hơi gợn sóng (tĩnh)
  const g = new T.PlaneGeometry(1.5, 1.0, 10, 4), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 3.2) * 0.08 * (x + 0.75)); }
  g.translate(0.75, -0.5, 0); g.computeVertexNormals(); return g;
})();
function hangFlag(G, x, y, z, side = 1) {
  const F = new T.Group(); F.position.set(x, y, z); F.rotation.set(0.75, side > 0 ? 0 : Math.PI, 0); G.add(F);
  sc(0.025, 0.025, 2.2, M(0xd8d0c0, 0.5), 0, 0, 0, { p: F, seg: 5, shadow: false, rx: -Math.PI / 2 });
  const fm = new T.Mesh(FLAG_GEO, FLAG_MAT);
  fm.position.set(0, -0.02, 1.4); fm.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  fm.castShadow = true; F.add(fm);
}

// Chuồng cọp (khung sắt bảo vệ nhô ra ngoài cửa sổ) – đặc trưng nhà phố cũ
function cage(G, x, y, zf, w, h, dep) {
  const D = subGroup(G);
  for (let k = 0; k <= Math.round(w / 0.32); k++) sb(0.035, h, 0.035, RAIL, x - w / 2 + (k * w) / Math.round(w / 0.32), y + h / 2, zf + dep, { p: D, shadow: false });
  for (const yy of [0, h * 0.5, h]) sb(w, 0.05, 0.05, RAIL, x, y + yy, zf + dep, { p: D, shadow: false });
  for (const sx of [-w / 2, w / 2]) for (const yy of [0, h]) sb(0.05, 0.05, dep, RAIL, x + sx, y + yy, zf + dep / 2, { p: D, shadow: false });
  sb(w + 0.1, 0.05, dep + 0.1, mat("tin_rust", 0xb0a090), x, y + h + 0.06, zf + dep / 2, { p: G, rx: 0.12 });
}
// Dây phơi quần áo
function laundry(G, x, y, z, w) {
  sb(w, 0.015, 0.015, M(0x222222), x, y, z, { p: G, shadow: false, detail: true });
  for (let k = 0; k < Math.floor(w / 0.55); k++) {
    const cw = rr(0.35, 0.5), ch = rr(0.45, 0.8);
    sb(cw, ch, 0.02, pick([0xe8e0d0, 0x3a5a9a, 0xd04a3a, 0xf0c040, 0x5a9a6a, 0xf4f4f4, 0xc06a9a]), x - w / 2 + 0.35 + k * 0.55, y - ch / 2, z, { p: G, detail: true, shadow: false });
  }
}

// ============================================================
//  NHÀ ỐNG – mặt trước hướng +z cục bộ, đáy tại y của nhóm
//  o: { x,y,z, ry, w, d, floors, type, color, wall, sign, idx, addr, flag }
// ============================================================
const GF = 3.4 * U, UF = 3.1 * U, ID = 5.2 * U; // cao tầng trệt, tầng trên, sâu phần quán
function tubeHouse(o) {
  const w = o.w || rr(4, 5) * U, d = o.d || 20, F = o.floors || 3, H = GF + (F - 1) * UF, zf = d / 2;
  const type = o.type || "home", open = type != "closed";
  const G = localGroup(o.x, o.y || 0, o.z, o.ry || 0);
  const color = o.color ?? pick(FACADE);
  const wallKey = o.wall || pick(["plaster", "plaster", "plaster", "plaster_y", "peel", "plaster_b"]);
  const wall = mat(wallKey, wallKey == "plaster" || wallKey == "peel" ? color : 0xffffff);
  const inner = mat("plaster", pick([0xf4f0e6, 0xe8f0e8, 0xf0e8d8, 0xdfe8f0]), { grime: false });
  // khối tầng trên + phần sau tầng trệt
  sb(w, H - GF, d, wall, 0, GF + (H - GF) / 2, 0, { p: G });
  sb(w, GF, d - ID, wall, 0, GF / 2, -ID / 2, { p: G });
  for (const s of [-1, 1]) sb(0.3, GF, ID, wall, s * (w / 2 - 0.15), GF / 2, zf - ID / 2, { p: G });
  sb(w + 0.04, 0.4, 0.3, mat("concrete2", 0xd8d2c4), 0, GF + 0.05, zf + 0.1, { p: G }); // đà ngang
  sb(w, 0.25, 0.4, mat("concrete", 0x9a958c), 0, 0.12, zf + 0.15, { p: G, shadow: false }); // bậc thềm
  solidL(G, -w / 2, -zf, w / 2, zf - ID, H);             // khối sau
  for (const s of [-1, 1]) solidL(G, s * w / 2 - 0.3, zf - ID, s * w / 2 + 0.0, zf, GF); // tường bên
  solidL(G, -w / 2 + 0.3, zf - ID, w / 2 - 0.3, zf + 0.35, 0.25); // sàn quán (bước lên được)

  if (!open) {
    // cửa cuốn đóng
    sb(w - 0.6, GF - 0.6, 0.12, mat("shutter", pick([0xffffff, 0xc8d8e8, 0xd8e8d0])), 0, (GF - 0.6) / 2 + 0.2, zf - 0.2, { p: G });
    sb(w - 0.4, 0.6, 0.6, mat("shutter2", 0xb8c0c8), 0, GF - 0.35, zf - 0.15, { p: G });
    solidL(G, -w / 2, zf - ID, w / 2, zf - 0.1, GF);
  } else {
    // nội thất tầng trệt: sàn gạch, trần trắng, tường trong, hộp cửa cuốn cuộn lên
    sb(w - 0.6, 0.06, ID, mat(pick(["tile", "tile2", "terrazzo"])), 0, 0.27, zf - ID / 2, { p: G, shadow: false });
    sb(w - 0.6, 0.05, ID, mat("plaster", 0xf6f4ee, { grime: false }), 0, GF - 0.03, zf - ID / 2, { p: G, shadow: false });
    sb(w - 0.6, GF, 0.05, inner, 0, GF / 2, zf - ID + 0.03, { p: G, shadow: false });
    for (const s of [-1, 1]) sb(0.04, GF - 0.3, ID - 0.1, inner, s * (w / 2 - 0.32), GF / 2, zf - ID / 2, { p: G, shadow: false });
    sb(w - 0.4, 0.55, 0.55, mat("shutter2", 0xc0c8d0), 0, GF - 0.4, zf - 0.1, { p: G });
    propL(G, "tube", 0, GF - 0.05, zf - ID * 0.45, Math.PI / 2);
    if (rand() < 0.6) propL(G, "fan", 0, GF - 0.05, zf - ID * 0.6, rand() * 3);
    // lịch treo tường
    sb(0.5, 0.62, 0.02, paperMat("calendar", "2026", String(1 + Math.floor(rand() * 28))), w / 2 - 1.0, 3.2, zf - ID + 0.07, { p: G, shadow: false, detail: true });
    interior(G, type, w, zf, o.idx || 0);
  }

  // biển hiệu chính trên đà tầng 2 (hơi chúc xuống) + đôi khi biển phụ treo thấp phía trước
  const sg = o.sign || signFor(type, o.idx || 0, o.addr);
  if (sg) {
    const sh = w / Math.max(3.4, Math.min(5, sg.ar || 4.2));
    sb(w - 0.1, sh, 0.14, signMat(Object.assign({ ar: (w - 0.1) / sh }, sg)), 0, GF + 0.35 + sh / 2, zf + 0.35, { p: G, rx: 0.06 });
    if (rand() < 0.35) {
      const s2 = { title: sg.title, sub: sg.sub, top: sg.top, bg: sg.bg, bg2: sg.bg2, fg: sg.fg, kind: sg.kind, topc: sg.topc, subc: sg.subc, font: sg.font };
      const w2 = w * 0.8, h2 = w2 / 4.2;
      sb(w2, h2, 0.1, signMat(Object.assign({ ar: 4.2 }, s2)), 0, GF - 0.9 - h2 / 2, zf + 1.0, { p: G, rx: -0.25 });
      for (const s of [-1, 1]) sb(0.04, 1.0, 0.04, RAIL, s * w2 * 0.45, GF - 0.45, zf + 0.9, { p: G, shadow: false });
    }
  }
  // mái hiên tôn / bạt che trước cửa
  if (open && rand() < 0.55) {
    const tarp = rand() < 0.5;
    sb(w - 0.2, 0.05, 2.6, tarp ? M(pick([0x2f6ad9, 0xd9302f, 0x3a9a5a, 0xe8a020]), 0.8) : mat("tin_rust", 0xc8c0b0), 0, GF - 0.9, zf + 1.3, { p: G, rx: 0.28 });
  }
  // các tầng trên
  for (let f = 1; f < F; f++) {
    const y0 = GF + (f - 1) * UF, style = (o.idx + f) % 4;
    if (style == 0 || style == 1) { // ban công + lan can + cửa kính
      sb(w, 0.22, 1.5, mat("concrete2", 0xd8d4cc), 0, y0 + 0.11, zf + 0.75, { p: G });
      const D = subGroup(G);
      sb(w, 0.07, 0.07, RAIL, 0, y0 + 1.8, zf + 1.46, { p: D });
      for (let b = -w / 2 + 0.2; b < w / 2 - 0.1; b += 0.28) sb(0.035, 1.6, 0.035, RAIL, b, y0 + 1.0, zf + 1.46, { p: D, shadow: false });
      sb(w * 0.62, 3.4, 0.05, mat("glass", 0x9ab0c0), 0, y0 + 1.9, zf + 0.03, { p: G });
      for (const s of [-1, 1]) sb(0.1, 3.5, 0.1, M(0x6a4a2a, 0.7), s * w * 0.31, y0 + 1.9, zf + 0.05, { p: G });
      if (rand() < 0.7) propL(G, "plant", w / 2 - 0.6, y0 + 0.22, zf + 1.1, 0, rr(0.8, 1.2));
      if (rand() < 0.4) laundry(G, 0, y0 + 3.6, zf + 1.2, w - 0.6);
      if (rand() < 0.6) propL(G, rand() < 0.5 ? "aircon" : "aircon_r", -w / 2 + 0.9, y0 + 0.22, zf + 0.7, 0, 1);
    } else if (style == 2) { // cửa sổ + chuồng cọp
      sb(w * 0.5, 2.4, 0.05, mat("glass", 0x8aa0b0), 0, y0 + 2.0, zf + 0.03, { p: G });
      cage(G, 0, y0 + 0.7, zf, w * 0.62, 2.8, 0.7);
      if (rand() < 0.5) propL(G, "plant", 0.6, y0 + 0.75, zf + 0.35, 0, 0.8);
      propL(G, rand() < 0.5 ? "aircon" : "aircon_r", w / 2 - 0.8, y0 + 3.3, zf + 0.35, 0, 1);
    } else { // cửa chớp gỗ xanh + gờ cửa sổ
      for (const s of [-1, 1]) sb(w * 0.22, 2.6, 0.08, M(pick([0x4f8a5a, 0x3a6a8a, 0x6a4a2a]), 0.7), s * w * 0.13, y0 + 1.9, zf + 0.05, { p: G });
      sb(w * 0.55, 0.15, 0.35, mat("concrete2"), 0, y0 + 0.55, zf + 0.15, { p: G });
      sb(w * 0.6, 0.12, 0.5, mat("concrete2"), 0, y0 + 3.4, zf + 0.25, { p: G });
      if (rand() < 0.5) propL(G, "aircon_r", -w / 2 + 0.8, y0 + 3.6, zf + 0.35, 0, 1);
    }
  }
  if (o.flag || rand() < 0.3) hangFlag(G, w / 2 - 0.4, GF + 0.6, zf + 0.2, 1);
  // tường chắn mái + mái tôn / bồn nước inox / tum thang
  for (const s of [-1, 1]) sb(0.18, 0.9, d, wall, s * (w / 2 - 0.09), H + 0.45, 0, { p: G });
  sb(w, 0.9, 0.18, wall, 0, H + 0.45, zf - 0.09, { p: G });
  const top = rand();
  if (top < 0.4) {
    sb(w + 0.3, 0.08, d * 0.6, mat("tin_rust", 0xd0c8b8), 0, H + 1.6, -d * 0.1, { p: G, rx: 0.12 });
  } else {
    sb(w * 0.6, 3.0, 3.0, wall, -w * 0.18, H + 1.5, -zf + 4, { p: G });
    const tank = new T.CylinderGeometry(0.55, 0.55, 2.0, 16); tank.rotateZ(Math.PI / 2);
    sm(tank, INOX, w * 0.15, H + 3.6, -zf + 4.5, { p: G });
    for (const sx of [-0.7, 0.7]) sb(0.08, 0.6, 0.9, RAIL, w * 0.15 + sx, H + 3.1, -zf + 4.5, { p: G, shadow: false });
  }
  G.attach = worldPoint(G, w / 2 - 0.4, GF + 0.6, zf + 0.4); // điểm mắc dây điện
  G.front = worldPoint(G, 0, 0, zf + 2.4);
  G.w = w;
  return G;
}

// Đồ đạc trong quán theo loại
function interior(G, type, w, zf, i) {
  const y = 0.3, zb = zf - ID + 0.6, zm = zf - ID / 2, iw = w - 0.8;
  const D = subGroup(G);
  if (type == "pho") {
    // tủ kính + nồi nước dùng ở mặt tiền
    sb(1.6, 1.4, 0.8, mat("glass", 0xd8e8f0), -w / 2 + 1.3, y + 0.7, zf - 0.8, { p: G });
    sb(1.7, 0.08, 0.9, INOX, -w / 2 + 1.3, y + 1.44, zf - 0.8, { p: G });
    sc(0.35, 0.4, 0.5, M(0x2a2a2a, 0.6), -w / 2 + 1.0, y, zf + 0.3, { p: G, seg: 10 }); // bếp than
    propL(G, "pot", -w / 2 + 1.0, y + 0.5, zf + 0.3, rand());
    for (let k = 0; k < 2; k++) { lowTable(0.4, y, zm - 0.8 + k * 2.2, D); for (const s of [-1, 1]) stool(0.4 + s * 0.85, y, zm - 0.8 + k * 2.2, null, D); }
    altar(G, w / 2 - 1.1, y + 2.1, zb - 0.25);
    sb(0.8, 1.2, 0.03, paperMat("menu", "THỰC ĐƠN"), -w / 2 + 1.2, 2.6, zb - 0.55, { p: G, shadow: false });
  } else if (type == "tea") {
    for (let k = 0; k < 3; k++) stool(rr(-iw / 2, iw / 2), y, rr(zb, zf - 1), null, D);
    sb(1.2, 1.0, 0.6, M(0x3a6ad0, 0.6), -w / 2 + 1, y + 0.5, zb, { p: G });
    propL(G, "jug", -w / 2 + 0.8, y + 1.0, zb, 0); propL(G, "crate", w / 2 - 0.8, y, zb, 0.3);
    propL(G, "crate", w / 2 - 0.8, y + 0.42, zb, 0.1);
  } else if (type == "grocery") {
    for (const s of [-1, 1]) { propL(G, "shelf", s * (w / 2 - 0.75), y, zm, s * Math.PI / 2); shelfGoods(G, s * (w / 2 - 0.75), y, zm, 1.5, 4, 0.75); }
    propL(G, "shelf", 0, y, zb, 0); shelfGoods(G, 0, y, zb + 0.1, 1.6, 4, 0.75);
    for (let k = 0; k < 3; k++) propL(G, "crate", -1 + k, y, zf - 0.6, rand() * 0.3);
    for (let k = 0; k < 2; k++) propL(G, "crate", -0.5 + k, y + 0.42, zf - 0.6, rand() * 0.3);
    for (let k = 0; k < 3; k++) propL(G, "gas", w / 2 - 0.6, y, zf - 1.2 - k * 0.65, rand());
    propL(G, "jug", -w / 2 + 0.6, y, zf - 0.5, 0); propL(G, "jug", -w / 2 + 0.95, y, zf - 0.6, 1);
  } else if (type == "moto") {
    for (let k = 0; k < 4; k++) propL(G, "tyre", -w / 2 + 0.5, y + 0.5 + k * 0.28, zb + 0.2, 0, 1, { rx: Math.PI / 2 });
    propL(G, "toolcart", w / 2 - 1.3, y, zb + 0.2, 0);
    propL(G, "handtruck", w / 2 - 0.5, y, zf - 1.5, -0.4);
    propL(G, "jerry", -w / 2 + 0.6, y, zf - 0.8, 0.4); propL(G, "jerry", -w / 2 + 1.0, y, zf - 0.5, 1.1);
    for (let k = 0; k < 3; k++) propL(G, "tyre", -w / 2 + 0.8 + k * 0.5, y + 0.5, zf + 0.4, 0, 1, { rz: 0.2 });
    motorbike(0, y, zm + 0.4, 0.2, null, D);
  } else if (type == "phone") {
    for (const s of [-1, 1]) {
      sb(0.8, 1.6, ID * 0.7, mat("glass", 0xe8f0ff), s * (w / 2 - 0.8), y + 0.8, zm, { p: G });
      sb(0.85, 0.06, ID * 0.72, INOX, s * (w / 2 - 0.8), y + 1.6, zm, { p: G });
    }
    for (let k = 0; k < 3; k++) sb(0.9, 1.3, 0.02, paperMat("poster", ["#2f6ad9", "#d9302f", "#1a9a5a"][k], ["IPHONE", "TRẢ GÓP 0%", "ÉP KÍNH"][k]), -1.2 + k * 1.2, 2.8, zb - 0.55, { p: G, shadow: false });
    propL(G, "mstool", 0, y, zm, 0); propL(G, "mstool", 0.8, y, zm + 1, 0);
  } else if (type == "barber") {
    sb(1.8, 1.2, 0.04, M(0xc8d8e0, 0.05, 0.9), 0, 2.2, zb - 0.5, { p: G }); // gương
    sb(1.8, 0.8, 0.5, M(0xe8e4dc, 0.6), 0, y + 0.4, zb - 0.2, { p: G });
    propL(G, "chair", 0, y, zb + 0.9, Math.PI);
    propL(G, "chair", w / 2 - 0.8, y, zf - 1.2, -0.6);
  } else if (type == "books") {
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) propL(G, "bookshelf", s * (w / 2 - 0.6), y, zb + 0.7 + k * 2.4, s * Math.PI / 2);
    propL(G, "bookshelf", 0, y, zb, 0);
    sb(1.6, 0.9, 0.8, M(0x7a5a3a, 0.7), 0, y + 0.45, zf - 1.4, { p: G });
    shelfGoods(G, 0, y + 0.9, zf - 1.4, 1.4, 1, 0.5);
  } else if (type == "tailor") {
    sb(2.2, 0.9, 1.0, M(0x6a4a2a, 0.7), 0, y + 0.45, zm, { p: G });
    for (let k = 0; k < 4; k++) sb(0.5, 1.4, 0.3, pick([0xd04a6a, 0xf0f0f0, 0x3a5a9a, 0xe8c040]), -w / 2 + 0.9 + k * 0.6, y + 1.4, zb, { p: G, detail: true });
    propL(G, "wstool", 0.3, y, zm + 0.9, 0);
  } else if (type == "pharmacy") {
    sb(iw, 1.1, 0.6, mat("glass", 0xf0f8ff), 0, y + 0.55, zm, { p: G });
    propL(G, "shelf", 0, y, zb, 0); shelfGoods(G, 0, y, zb + 0.1, 1.6, 4, 0.75);
  } else { // nhà ở: TV, ghế, bàn thờ, xe máy để trong nhà
    sb(1.6, 0.6, 0.5, M(0x5a3a22, 0.6), 0, y + 0.3, zb, { p: G });
    propL(G, "tv", 0, y + 0.6, zb, 0);
    altar(G, 0, y + 2.4, zb - 0.25);
    propL(G, "chair", -0.8, y, zm, 0.4); propL(G, "chair", 0.8, y, zm + 0.3, -0.3);
    motorbike(w / 2 - 1.2, y, zf - 1.2, 0.1, null, D);
  }
}

// ============================================================
//  CỘT ĐIỆN BÊ TÔNG + BÓ DÂY CHẰNG CHỊT + CUỘN DÂY
// ============================================================
function pole(x, y, z, h = 8 * U, ry = 0) {
  const G = localGroup(x, y, z, ry);
  sc(0.14, 0.26, h, mat("concrete", 0xc8c4bc), 0, 0, 0, { p: G, seg: 8 });
  sb(2.0, 0.14, 0.14, M(0x4a4640, 0.6, 0.3), 0, h - 0.5, 0, { p: G });
  sb(1.4, 0.12, 0.12, M(0x4a4640, 0.6, 0.3), 0, h - 1.4, 0, { p: G });
  for (const sx of [-0.85, 0, 0.85]) sc(0.05, 0.07, 0.2, M(0xe8e8e0, 0.3), sx, h - 0.44, 0, { p: G, seg: 6, shadow: false });
  propL(G, "pbox", 0.0, h - 3.2, 0.3, 0, 1.3);
  if (rand() < 0.6) sb(0.5, 0.7, 0.05, signMat({ title: "KHOAN CẮT BÊ TÔNG", sub: "09xx.xxx.xxx", bg: "#ffe14a", fg: "#c8231f", kind: "plain", ar: 0.7 }), 0, 2.4, 0.28, { p: G, shadow: false, detail: true });
  // điểm mắc dây: 3 sứ trên + 4 điểm cáp viễn thông thấp
  return [[-0.85, h - 0.36], [0, h - 0.36], [0.85, h - 0.36], [0.2, h - 1.3], [-0.2, h - 1.35], [0.25, h - 2.2], [-0.25, h - 2.3], [0, h - 2.6]].map(([sx, sy]) => worldPoint(G, sx, sy, 0));
}
const CABLE_M = M(0x111111, 0.7);
function cable(a, b, sag = 0.6, r = 0.022) {
  const mid = a.clone().add(b).multiplyScalar(0.5); mid.y -= sag * 2;
  const g = new T.TubeGeometry(new T.QuadraticBezierCurve3(a, mid, b), 12, r, 3, false);
  sm(g, CABLE_M, 0, 0, 0, { shadow: false, detail: true });
}
function coil(p, r = 0.5) { // cuộn dây thừa treo trên cột
  for (let k = 0; k < 3; k++) sm(new T.TorusGeometry(r - k * 0.05, 0.03, 4, 18), CABLE_M, p.x + 0.3, p.y - r - 0.2, p.z + k * 0.04, { shadow: false, detail: true, ry: Math.PI / 2 + k * 0.1 });
}
// Bó dây giữa 2 cột (đặc trưng phố Việt): nhiều sợi võng khác nhau
function cables(A, B) {
  for (let k = 0; k < Math.min(A.length, B.length); k++) cable(A[k], B[k], 0.3 + 0.1 * k + rand() * 0.15, k < 3 ? 0.022 : 0.03);
  for (let k = 0; k < 4; k++) { // thêm sợi xoắn lệch
    const a = A[5 + (k % 3)].clone().add(new T.Vector3(0, -k * 0.08, (k - 1.5) * 0.05)), b = B[5 + ((k + 1) % 3)].clone().add(new T.Vector3(0, -k * 0.1, 0));
    cable(a, b, 0.7 + k * 0.18 + rand() * 0.2, 0.028);
  }
  if (rand() < 0.5) coil(A[6], rr(0.35, 0.6));
}

// ---------- Đèn đường cần cong ----------
function streetLamp(x, y, z, ry) {
  const G = localGroup(x, y, z, ry), h = 7.5 * U;
  sc(0.09, 0.14, h, M(0x9aa0a4, 0.5, 0.7), 0, 0, 0, { p: G, seg: 8 });
  const curve = new T.QuadraticBezierCurve3(new T.Vector3(0, h, 0), new T.Vector3(0, h + 1.0, 0.6), new T.Vector3(0, h + 0.7, 2.4));
  sm(new T.TubeGeometry(curve, 8, 0.07, 6, false), M(0x9aa0a4, 0.5, 0.7), 0, 0, 0, { p: G });
  sb(0.4, 0.18, 0.9, M(0x5a6064, 0.5, 0.6), 0, h + 0.62, 2.6, { p: G });
  sb(0.3, 0.04, 0.7, M(0xfff6d8, 0.3), 0, h + 0.52, 2.6, { p: G, shadow: false });
}

// ============================================================
//  XE MÁY (kiểu xe số / tay ga phổ thông) – dựng bằng hình khối
// ============================================================
const WHEEL_GEO = (() => { const g = new T.TorusGeometry(0.26, 0.075, 8, 18); g.rotateY(Math.PI / 2); return g; })();
const RIM_GEO = (() => { const g = new T.CylinderGeometry(0.19, 0.19, 0.05, 12); g.rotateZ(Math.PI / 2); return g; })();
function motorbike(x, y, z, ry, color, p) {
  const G = new T.Group(); G.position.set(x, y, z); G.rotation.y = ry; G.userData.detail = true; G.scale.setScalar(U); (p || ST).add(G);
  color = color ?? pick([0xb0202a, 0x1a1a1a, 0x24467a, 0xe8e8e8, 0x8a8e94, 0x6a1a1a, 0x2a5a3a]);
  const c = M(color, 0.35, 0.3), blk = M(0x161616, 0.8), chrome = M(0xb8bcc0, 0.25, 0.9);
  for (const wz of [-0.62, 0.62]) { sm(WHEEL_GEO, blk, 0, 0.34, wz, { p: G }); sm(RIM_GEO, chrome, 0, 0.34, wz, { p: G, shadow: false }); }
  sb(0.08, 0.05, 0.5, chrome, 0.1, 0.3, -0.42, { p: G, shadow: false });                 // ống xả
  sb(0.26, 0.28, 0.75, c, 0, 0.62, -0.25, { p: G });                                   // thân sau
  sb(0.22, 0.12, 0.32, c, 0, 0.55, 0.15, { p: G });                                     // sàn để chân
  sb(0.3, 0.12, 0.62, M(0x2a2420, 0.7), 0, 0.82, -0.25, { p: G });                      // yên
  sb(0.34, 0.5, 0.1, c, 0, 0.72, 0.38, { p: G, rx: -0.2 });                             // ốp chân trước
  sb(0.05, 0.6, 0.05, chrome, 0, 0.68, 0.58, { p: G, rx: -0.35, shadow: false });       // phuộc
  sb(0.18, 0.06, 0.22, c, 0, 0.62, 0.62, { p: G, shadow: false });                      // chắn bùn trước
  sb(0.6, 0.04, 0.04, blk, 0, 1.08, 0.48, { p: G, shadow: false });                      // ghi đông
  sb(0.22, 0.14, 0.12, c, 0, 1.05, 0.52, { p: G });                                     // đầu đèn
  sb(0.1, 0.06, 0.03, M(0xfff6d8, 0.2), 0, 1.05, 0.59, { p: G, shadow: false });
  for (const s of [-1, 1]) { // gương chiếu hậu
    sb(0.015, 0.25, 0.015, blk, s * 0.2, 1.2, 0.48, { p: G, rz: -s * 0.25, shadow: false });
    sc(0.05, 0.05, 0.02, chrome, s * 0.24, 1.32, 0.48, { p: G, rx: Math.PI / 2, seg: 8, shadow: false });
  }
  sb(0.12, 0.08, 0.04, M(0xc81a1a, 0.4), 0, 0.7, -0.64, { p: G, shadow: false });        // đèn hậu
  return G;
}

// ============================================================
//  CÂY XANH: thân (vỏ thật) + tấm lá alpha (InstancedMesh, lắc theo gió)
// ============================================================
const TREES = [];
function tree(x, y, z, kind = "sau", s) { TREES.push({ x, y, z, k: kind, s: s ?? rr(0.85, 1.2), r: rand() * 6.28 }); }
// Lan can sắt quanh gốc cây
function treeGuard(x, y, z) {
  const G = localGroup(x, y, z, 0, true), a = 0.75;
  for (const [sx, sz, rx] of [[0, -a, 0], [0, a, 0], [-a, 0, 1], [a, 0, 1]]) {
    sb(rx ? 0.04 : a * 2, 0.04, rx ? a * 2 : 0.04, RAIL, sx, 1.1, sz, { p: G, shadow: false });
    for (let k = -3; k <= 3; k++) sb(0.03, 1.1, 0.03, RAIL, sx + (rx ? 0 : k * 0.22), 0.55, sz + (rx ? k * 0.22 : 0), { p: G, shadow: false });
  }
  sb(1.5, 0.05, 1.5, mat("soil"), 0, 0.03, 0, { p: G, shadow: false });
}
const LEAF_MATS = {};
function leafMat(kind) {
  return LEAF_MATS[kind] || (LEAF_MATS[kind] = addSway(new T.MeshStandardMaterial({ map: TX.leafCard(kind), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.85, envMapIntensity: 0.4 }), 0.0012));
}
const TREE_DEF = {
  // cây sấu / xà cừ: thân cao, tán rộng lá nhỏ
  sau: () => {
    const trunk = [{ g: new T.CylinderGeometry(0.22, 0.38, 7.5, 8), m: mtx(0, 3.75, 0) },
      { g: new T.CylinderGeometry(0.08, 0.16, 3.2, 6), m: mtx(0.9, 7.4, 0, 0, 0, -0.6) },
      { g: new T.CylinderGeometry(0.08, 0.15, 3.0, 6), m: mtx(-0.8, 7.2, 0.3, 0.3, 0, 0.7) },
      { g: new T.CylinderGeometry(0.07, 0.13, 2.6, 6), m: mtx(0.1, 7.6, -0.9, -0.6, 0, 0) }];
    const can = [], hs = TX.hash;
    for (let k = 0; k < 22; k++) {
      const a = hs(k, 1, 3) * 6.28, d = hs(k, 2, 3) * 2.6, y = 7.5 + hs(k, 3, 3) * 4, s = 3.2 + hs(k, 4, 3) * 1.6;
      can.push({ g: new T.PlaneGeometry(s, s), m: mtx(Math.cos(a) * d, y, Math.sin(a) * d, (hs(k, 5, 3) - 0.5) * 1.6, a, (hs(k, 6, 3) - 0.5) * 1.2) });
    }
    return [trunk, can];
  },
  // cây bàng: tầng lá xòe ngang
  bang: () => {
    const trunk = [{ g: new T.CylinderGeometry(0.2, 0.34, 6.5, 8), m: mtx(0, 3.25, 0) }];
    const can = [], hs = TX.hash;
    for (let t = 0; t < 3; t++) for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.28 + t, d = 1.4 + hs(k, t, 5) * 1.2, s = 2.8 + hs(k, t, 6) * 1.2;
      can.push({ g: new T.PlaneGeometry(s, s), m: mtx(Math.cos(a) * d, 5.6 + t * 1.6, Math.sin(a) * d, -Math.PI / 2 + (hs(k, t, 7) - 0.5) * 0.5, 0, a) });
    }
    for (let k = 0; k < 6; k++) can.push({ g: new T.PlaneGeometry(3, 3), m: mtx(0, 7.2, 0, 0, (k / 6) * Math.PI, 0) });
    return [trunk, can];
  },
  // chuối (ven ruộng)
  banana: () => {
    const trunk = [{ g: new T.CylinderGeometry(0.15, 0.24, 2.6, 8), m: mtx(0, 1.3, 0) }];
    const can = [];
    for (let k = 0; k < 7; k++) {
      const g = new T.PlaneGeometry(0.9, 2.6, 2, 8), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const yy = p.getY(i) + 1.3, t = yy / 2.6; p.setXYZ(i, p.getX(i) * (0.4 + Math.sin(Math.PI * t)), yy * 0.6 - 0.25 * yy * yy * 0.3, yy * 0.8); }
      g.computeVertexNormals();
      can.push({ g, m: mtx(0, 2.5, 0, 0, (k / 7) * 6.28 + k * 0.3, 0) });
    }
    return [trunk, can, true];
  },
};
const BARK = mat("bark");
function buildTrees() {
  const im = new T.Object3D();
  for (const kind in TREE_DEF) {
    const list = TREES.filter((t) => t.k == kind);
    if (!list.length) continue;
    const [tr, ca, plainLeaf] = TREE_DEF[kind]();
    const lm = plainLeaf ? addSway(new T.MeshStandardMaterial({ color: lin(0x5a9a3a), side: T.DoubleSide, roughness: 0.8 }), 0.004) : leafMat(kind);
    for (const [items, m] of [[tr, BARK], [ca, lm]]) {
      const g = mergeGeos(items);
      items.forEach((i) => i.g.dispose());
      const I = new T.InstancedMesh(g, m, list.length);
      list.forEach((t, k) => { im.position.set(t.x, t.y, t.z); im.rotation.set(0, t.r, 0); im.scale.setScalar(t.s); im.updateMatrix(); I.setMatrixAt(k, im.matrix); });
      I.castShadow = true; I.receiveShadow = true;
      I.frustumCulled = false;
      scene.add(I);
    }
  }
}

// ============================================================
//  SẠP CHỢ: khung sắt, bạt che, thúng mây, hoa quả
// ============================================================
function stall(x, y, z, ry, tarp, label, goods) {
  const G = localGroup(x, y, z, ry);
  const wd = 2.2 * U, dp = 1.2 * U, h = 0.8 * U;
  sb(wd, 0.1, dp, mat("wood", 0xc8a070), 0, h, 0, { p: G });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) sb(0.07, h, 0.07, RAIL, sx * (wd / 2 - 0.1), h / 2, sz * (dp / 2 - 0.1), { p: G });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) sb(0.06, sz > 0 ? 3.6 : 4.0, 0.06, RAIL, sx * (wd / 2 + 0.2), (sz > 0 ? 3.6 : 4.0) / 2, sz * (dp / 2 + 0.5), { p: G });
  sb(wd + 0.8, 0.04, dp + 1.6, M(tarp, 0.85), 0, 3.85, 0, { p: G, rx: -0.12 });
  if (label) sb(wd * 0.9, 0.55, 0.05, signMat({ title: label, bg: "#1f5fae", fg: "#ffffff", kind: "plain", ar: wd * 0.9 / 0.55 }), 0, 3.25, dp / 2 + 0.52, { p: G });
  const D = subGroup(G);
  const fc = goods || [0xe08a1a, 0xd8366a, 0xe6d23a];
  for (let k = 0; k < 3; k++) {
    const bx = (-1 + k) * 1.1;
    propL(G, "basket", bx, h + 0.05, 0, rand());
    for (let f = 0; f < 7; f++) sm(new T.SphereGeometry(0.12, 8, 6), M(fc[k % fc.length], 0.5), bx + Math.cos(f) * 0.2, h + 0.42 + (f % 2) * 0.08, Math.sin(f) * 0.2, { p: D, shadow: false });
  }
  propL(G, "crate", -wd / 2 + 0.3, 0, dp / 2 + 0.3, 0.3);
  stool(wd / 2 - 0.3, 0, -dp / 2 - 0.5, null, D);
  solidL(G, -wd / 2, -dp / 2, wd / 2, dp / 2, h + 0.1);
  return G;
}

// Bảng chữ A trên vỉa hè (thực đơn)
function aFrame(x, y, z, ry, kind = "menu", a, b) {
  const G = localGroup(x, y, z, ry, true);
  for (const s of [-1, 1]) sb(1.0, 1.7, 0.04, paperMat(kind, a, b), 0, 0.85, s * 0.25, { p: G, rx: s * 0.2 });
  for (const s of [-1, 1]) sb(0.03, 1.8, 0.6, RAIL, s * 0.52, 0.85, 0, { p: G, shadow: false });
}
