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
const pickR = (arr) => arr[Math.floor(rand() * arr.length)];

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
// ---------- Tiện ích hình khối mềm (bo cạnh) ----------
function roundRectShape(w, d, r) {
  const s = new T.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// Tấm phẳng bo góc nằm ngang (mặt ghế, mặt bàn): tâm ở gốc, đáy y=0
function slab(w, d, t, r, bevel = 0.006) {
  const g = new T.ExtrudeGeometry(roundRectShape(w - 2 * bevel, d - 2 * bevel, r), { depth: t - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  return g;
}
// Ống trụ nối 2 điểm
function tubeBetween(a, b, r, seg = 8) {
  const A = new T.Vector3(...a), B = new T.Vector3(...b), L = A.distanceTo(B);
  const g = new T.CylinderGeometry(r, r, L, seg, 1);
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyMatrix4(new T.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), q, new T.Vector3(1, 1, 1)));
  return g;
}
// Biên dạng nhìn ngang (z: dọc thân, y: cao) đùn theo bề rộng x, có bo cạnh.
// Điểm [z,y] = lineTo; [cz,cy,z,y] = cong bậc 2.
function sideExtrude(pts, width, bevel = 0.02) {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length == 4) sh.quadraticCurveTo(p[0], p[1], p[2], p[3]); else sh.lineTo(p[0], p[1]); }
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, { depth: Math.max(0.001, width - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -(width - 2 * bevel) / 2);
  g.rotateY(-Math.PI / 2); // x của biên dạng -> trục z (mũi xe), bề dày -> trục x
  return g;
}

// ---------- Ghế nhựa đẩu (đúc liền, bóng) ----------
const STOOL_GEO = (() => {
  const h = 0.44, top = 0.29, foot = 0.36, it = [];
  it.push({ g: slab(top, top, 0.025, 0.035), m: mtx(0, h - 0.025, 0) });                     // mặt ghế bo góc
  for (const [sx, sz, ry] of [[0, 1, 0], [0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, Math.PI / 2]]) // váy dưới mặt
    it.push({ g: BG(top - 0.05, 0.045, 0.01), m: mtx(sx * (top / 2 - 0.006), h - 0.05, sz * (top / 2 - 0.006), 0, ry, 0) });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {                            // 4 chân chữ L xòe ra
    const a = [sx * (top / 2 - 0.02), h - 0.03, sz * (top / 2 - 0.02)], b = [sx * (foot / 2 - 0.02), 0.01, sz * (foot / 2 - 0.02)];
    for (const [ox, oz] of [[sx * -0.025, 0], [0, sz * -0.025]]) it.push({ g: tubeBetween([a[0] + ox, a[1], a[2] + oz], [b[0] + ox, b[1], b[2] + oz], 0.011, 6) });
    it.push({ g: BG(0.05, 0.012, 0.05), m: mtx(b[0], 0.006, b[2]) });
  }
  const yb = 0.12, wb = (top + (foot - top) * (1 - yb / h)) / 2 - 0.02;                      // đai giằng thấp
  for (const [sx, sz, ry] of [[0, 1, 0], [0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, Math.PI / 2]]) it.push({ g: BG(wb * 2, 0.018, 0.01), m: mtx(sx * wb, yb, sz * wb, 0, ry, 0) });
  const g = mergeGeos(it); g.scale(U, U, U); return g;
})();
function stool(x, y, z, c, p) { sm(STOOL_GEO, M(c ?? pickR([0xd0262a, 0x2a5fc8, 0xd0262a, 0x2a8a4a, 0x2a5fc8]), 0.32, 0.02), x, y, z, { detail: true, ry: (rand() - 0.5) * 0.6, p, shadow: true }); }

// ---------- Bàn inox thấp + đồ trên bàn ----------
const TABLE_GEO = (() => {
  const h = 0.62, w = 0.8, d = 0.56, it = [];
  it.push({ g: slab(w, d, 0.02, 0.02), m: mtx(0, h - 0.02, 0) });
  for (const [sx, sz, ry, L] of [[0, 1, 0, w], [0, -1, 0, w], [1, 0, Math.PI / 2, d], [-1, 0, Math.PI / 2, d]]) it.push({ g: BG(L - 0.02, 0.04, 0.008), m: mtx(sx * (w / 2 - 0.006), h - 0.04, sz * (d / 2 - 0.006), 0, ry, 0) }); // gờ mép
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) it.push({ g: tubeBetween([sx * (w / 2 - 0.05), h - 0.03, sz * (d / 2 - 0.05)], [sx * (w / 2 - 0.02), 0, sz * (d / 2 - 0.02)], 0.013, 10) });
  for (const sz of [-1, 1]) it.push({ g: tubeBetween([-w / 2 + 0.04, 0.16, sz * (d / 2 - 0.035)], [w / 2 - 0.04, 0.16, sz * (d / 2 - 0.035)], 0.008, 6) });
  const g = mergeGeos(it); g.scale(U, U, U); return g;
})();
const lathe = (pts, seg = 14) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r * U, y * U)), seg);
const GLASS_GEO = lathe([[0.0, 0], [0.032, 0], [0.034, 0.005], [0.04, 0.11], [0.038, 0.11]]);   // cốc trà đá
const TEA_GEO = lathe([[0, 0.006], [0.031, 0.006], [0.036, 0.08], [0, 0.08]]);
const CHILI_GEO = lathe([[0, 0], [0.03, 0], [0.032, 0.09], [0.018, 0.12], [0.012, 0.15], [0, 0.15]]); // chai tương ớt
const CAP_GEO = lathe([[0, 0.145], [0.014, 0.145], [0.014, 0.17], [0, 0.17]]);
const TUBE_GEO = lathe([[0, 0], [0.04, 0], [0.04, 0.13], [0.035, 0.13], [0.035, 0.01], [0, 0.01]]); // ống đũa tre
const CHOP_GEO = (() => { const it = []; for (let k = 0; k < 8; k++) { const a = k * 0.8, r = 0.012 + (k % 3) * 0.008; it.push({ g: new T.CylinderGeometry(0.0035, 0.0045, 0.24, 4), m: mtx(Math.cos(a) * r, 0.13, Math.sin(a) * r, Math.sin(a) * 0.08, 0, Math.cos(a) * 0.08) }); } const g = mergeGeos(it); g.scale(U, U, U); return g; })();
const GLASS_MAT = new T.MeshStandardMaterial({ color: lin(0xe8f0f0), roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, envMapIntensity: 1.2, depthWrite: false });
const TEA_MAT = new T.MeshStandardMaterial({ color: lin(0xb87a2a), roughness: 0.15, transparent: true, opacity: 0.85 });
const CHILI_MAT = M(0xc81e14, 0.25), BAMBOO = M(0xc8a060, 0.6), WHITE_P = M(0xf0eee8, 0.4);
function tableTop(G, h) { // đồ trên mặt bàn (tọa độ cục bộ của bàn)
  const y = h + 0.001;
  sm(TUBE_GEO, BAMBOO, -0.18 * U, y, -0.1 * U, { p: G, shadow: false }); sm(CHOP_GEO, BAMBOO, -0.18 * U, y, -0.1 * U, { p: G, shadow: false });
  sm(CHILI_GEO, CHILI_MAT, -0.06 * U, y, -0.14 * U, { p: G, shadow: false }); sm(CAP_GEO, WHITE_P, -0.06 * U, y, -0.14 * U, { p: G, shadow: false });
  for (const [gx, gz] of [[0.2, 0.08], [-0.24, 0.12], [0.06, -0.16]]) { sm(TEA_GEO, TEA_MAT, gx * U, y, gz * U, { p: G, shadow: false }); sm(GLASS_GEO, GLASS_MAT, gx * U, y, gz * U, { p: G, shadow: false }); }
}
function lowTable(x, y, z, p, ry = 0) {
  const G = new T.Group(); G.position.set(x, y, z); G.rotation.y = ry; G.userData.detail = true; (p || ST).add(G);
  const h = 0.62 * U; // đủ cao để đầu gối người ngồi ghế nhựa lọt dưới mặt bàn
  sm(TABLE_GEO, INOX, 0, 0, 0, { p: G });
  tableTop(G, h);
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
const GOODS_MAT = new T.MeshStandardMaterial({ map: TX.goods(), roughness: 0.45, envMapIntensity: 0.5 });
const goodsCell = () => { const i = Math.floor(rand() * 16), cx = i % 4, cy = Math.floor(i / 4); return [cx / 4, 1 - (cy + 1) / 4, (cx + 1) / 4, 1 - cy / 4]; };
// Hàng trên kệ: gói/hộp, lon, chai – mỗi món mang 1 nhãn hàng (gộp thành 1 mesh / 1 draw call)
// độ cao 4 tầng của kệ sắt (model cao 1.9 m) – để hàng nằm đúng trên mặt từng tầng
const SHELF_ROWS = [0.035, 0.26, 0.485, 0.71].map((f) => f * 1.9 * U + 0.03);
function shelfGoods(G, x, y0, z, w, rows, gap, axis = "x") {
  const it = [];
  for (let r = 0; r < rows; r++) {
    let gx = -w / 2 + 0.12;
    const yb = y0 + (gap ? r * gap + 0.06 : SHELF_ROWS[r]);
    while (gx < w / 2 - 0.2) {
      const t = rand(), bw = rr(0.14, 0.28), bh = rr(0.18, 0.38);
      let g;
      if (t < 0.5) g = BG(bw, bh, 0.24);
      else if (t < 0.8) { g = new T.CylinderGeometry(bw * 0.38, bw * 0.38, bh * 0.75, 12); g.translate(0, -bh * 0.125, 0); }
      else { const rb = bw * 0.36; g = new T.LatheGeometry([[0, 0], [rb, 0], [rb, bh * 0.6], [rb * 0.45, bh * 0.82], [rb * 0.38, bh], [0, bh]].map(([a, b]) => new T.Vector2(a, b)), 12); g.translate(0, -bh / 2, 0); }
      uvTo(g, goodsCell());
      const along = gx + bw / 2;
      it.push({ g, m: axis == "x" ? mtx(x + along, yb + bh / 2, z, 0, (rand() - 0.5) * 0.3, 0) : mtx(x, yb + bh / 2, z + along, 0, Math.PI / 2 + (rand() - 0.5) * 0.3, 0) });
      gx += bw + 0.025;
    }
  }
  sm(mergeGeos(it), GOODS_MAT, 0, 0, 0, { p: G, shadow: false, detail: true });
}

// Cờ đỏ sao vàng treo chéo trên mặt tiền
const FLAG_MAT = new T.MeshStandardMaterial({ map: TX.flag(), roughness: 0.8, side: T.DoubleSide });
// Cờ treo trên cán chéo cắm từ mặt tiền: mép cán (cạnh ngắn) ôm dọc đầu cán,
// phần cờ rủ xuống theo trọng lực, hơi bay ra phía đường và gợn sóng nhẹ (hình tĩnh, mỗi lá một kiểu).
function hangFlag(G, x, y, z) {
  const tilt = 0.75, len = 2.2;
  const F = new T.Group(); F.position.set(x, y, z); F.rotation.x = -tilt; G.add(F);
  sb(0.04, 0.04, len, M(0xd8d0c0, 0.5), 0, 0, len / 2, { p: F, shadow: false });            // cán cờ
  sc(0.035, 0.035, 0.06, M(0xd8b040, 0.3, 0.8), 0, -0.03, len, { p: F, seg: 8, shadow: false, rx: Math.PI / 2 }); // núm đầu cán
  const pd = new T.Vector3(0, Math.sin(tilt), Math.cos(tilt));                                  // hướng cán (cục bộ nhà)
  const tip = new T.Vector3(x, y, z).addScaledVector(pd, len - 0.08);
  const fly = new T.Vector3(0, -1, 0.32 + rand() * 0.15).normalize();                          // rủ xuống, hơi bay ra ngoài
  const nrm = new T.Vector3().crossVectors(pd, fly).normalize();
  const W = 1.5, Hh = 1.0, ph = rand() * 6;
  const g = new T.PlaneGeometry(W, Hh, 14, 6), p = g.attributes.position, q = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + W / 2) / W, v = (Hh / 2 - p.getY(i)) / Hh;                         // u: từ cán ra mép bay, v: dọc cán
    const ripple = Math.sin(u * 7 + v * 1.5 + ph) * 0.07 * u + Math.sin(u * 3 + ph) * 0.05 * u;
    q.copy(tip).addScaledVector(pd, -v * Hh).addScaledVector(fly, u * W * (1 - 0.06 * Math.sin(v * 3.1)))
      .addScaledVector(nrm, ripple);
    p.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  const fm = new T.Mesh(g, FLAG_MAT); fm.castShadow = true; G.add(fm);
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
    sb(cw, ch, 0.02, pickR([0xe8e0d0, 0x3a5a9a, 0xd04a3a, 0xf0c040, 0x5a9a6a, 0xf4f4f4, 0xc06a9a]), x - w / 2 + 0.35 + k * 0.55, y - ch / 2, z, { p: G, detail: true, shadow: false });
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
  const color = o.color ?? pickR(FACADE);
  const wallKey = o.wall || pickR(["plaster", "plaster", "plaster", "plaster_y", "peel", "plaster_b"]);
  const wall = mat(wallKey, wallKey == "plaster" || wallKey == "peel" ? color : 0xffffff);
  const inner = mat("plaster", pickR([0xf4f0e6, 0xe8f0e8, 0xf0e8d8, 0xdfe8f0]), { grime: false });
  // khối tầng trên + phần sau tầng trệt
  sb(w, H - GF, d, wall, 0, GF + (H - GF) / 2, 0, { p: G });
  sb(w, GF, d - ID, wall, 0, GF / 2, -ID / 2, { p: G });
  for (const s of [-1, 1]) sb(0.3, GF, ID, wall, s * (w / 2 - 0.15), GF / 2, zf - ID / 2, { p: G });
  sb(w + 0.04, 0.4, 0.3, mat("concrete2", 0xd8d2c4), 0, GF + 0.05, zf + 0.1, { p: G }); // đà ngang
  sb(w, 0.25, 0.4, mat("concrete", 0x9a958c), 0, 0.12, zf + 0.15, { p: G, shadow: false }); // bậc thềm
  solidL(G, -w / 2, -zf, w / 2, zf - ID, H);             // khối sau
  for (const s of [-1, 1]) solidL(G, s > 0 ? w / 2 - 0.3 : -w / 2, zf - ID, s > 0 ? w / 2 : -w / 2 + 0.3, zf, GF); // tường bên
  solidL(G, -w / 2 + 0.3, zf - ID, w / 2 - 0.3, zf + 0.35, 0.25); // sàn quán (bước lên được)

  if (!open) {
    // cửa cuốn đóng
    sb(w - 0.6, GF - 0.6, 0.12, mat("shutter", pickR([0xffffff, 0xc8d8e8, 0xd8e8d0])), 0, (GF - 0.6) / 2 + 0.2, zf - 0.2, { p: G });
    sb(w - 0.4, 0.6, 0.6, mat("shutter2", 0xb8c0c8), 0, GF - 0.35, zf - 0.15, { p: G });
    solidL(G, -w / 2, zf - ID, w / 2, zf - 0.1, GF);
  } else {
    // nội thất tầng trệt: sàn gạch, trần trắng, tường trong, hộp cửa cuốn cuộn lên
    sb(w - 0.6, 0.06, ID, mat(pickR(["tile", "tile2", "terrazzo"])), 0, 0.27, zf - ID / 2, { p: G, shadow: false });
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
    sb(w - 0.2, 0.05, 2.6, tarp ? M(pickR([0x2f6ad9, 0xd9302f, 0x3a9a5a, 0xe8a020]), 0.8) : mat("tin_rust", 0xc8c0b0), 0, GF - 0.9, zf + 1.3, { p: G, rx: 0.28 });
  }
  // các tầng trên
  for (let f = 1; f < F; f++) {
    const y0 = GF + (f - 1) * UF, style = ((o.idx || 0) + f + (o.styleOff || 0)) % 4;
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
      for (const s of [-1, 1]) sb(w * 0.22, 2.6, 0.08, M(pickR([0x4f8a5a, 0x3a6a8a, 0x6a4a2a]), 0.7), s * w * 0.13, y0 + 1.9, zf + 0.05, { p: G });
      sb(w * 0.55, 0.15, 0.35, mat("concrete2"), 0, y0 + 0.55, zf + 0.15, { p: G });
      sb(w * 0.6, 0.12, 0.5, mat("concrete2"), 0, y0 + 3.4, zf + 0.25, { p: G });
      if (rand() < 0.5) propL(G, "aircon_r", -w / 2 + 0.8, y0 + 3.6, zf + 0.35, 0, 1);
    }
  }
  if (o.flag || rand() < 0.3) hangFlag(G, w / 2 - 0.4, GF + 0.6, zf + 0.2);
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
  G.front = worldPoint(G, 0, 0, zf + 1.9);
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
    for (let k = 0; k < 2; k++) {
      const tz = zm - 0.8 + k * 2.2;
      lowTable(0.4, y, tz, D);
      for (const s of [-1, 1]) {
        stool(0.4 + s * 1.15, y, tz, null, D);
        if (rand() < 0.55) { // khách đang ăn phở
          const pp = randomPerson(Math.floor(rand() * 50), { pose: "eat", still: true, parent: D });
          pp.position.set(0.4 + s * 1.15, y, tz); pp.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
          phoBowl(0.4 + s * 0.28, y + 0.62 * U + 0.03, tz, D);
        }
      }
    }
    altar(G, w / 2 - 1.1, y + 2.1, zb - 0.25);
    sb(0.8, 1.2, 0.03, paperMat("menu", "THỰC ĐƠN"), -w / 2 + 1.2, 2.6, zb - 0.55, { p: G, shadow: false });
  } else if (type == "tea") {
    for (let k = 0; k < 3; k++) stool(-iw / 2 + 0.6 + k * 0.75, y, zm + 0.6, null, D); // ghế xếp hàng, không chồng nhau
    sb(1.2, 1.0, 0.6, M(0x3a6ad0, 0.6), -w / 2 + 1, y + 0.5, zb, { p: G });
    propL(G, "jug", -w / 2 + 0.8, y + 1.0, zb, 0); propL(G, "crate", w / 2 - 0.8, y, zb, 0.3);
    propL(G, "crate", w / 2 - 0.8, y + 0.42, zb, 0.1);
  } else if (type == "grocery") {
    for (const s of [-1, 1]) { propL(G, "shelf", s * (w / 2 - 0.75), y, zm, s * Math.PI / 2); shelfGoods(G, s * (w / 2 - 0.75), y, zm, 1.45, 4, 0, "z"); }
    propL(G, "shelf", 0, y, zb, 0); shelfGoods(G, 0, y, zb, 1.45, 4, 0);
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
    for (let k = 0; k < 4; k++) sb(0.5, 1.4, 0.3, pickR([0xd04a6a, 0xf0f0f0, 0x3a5a9a, 0xe8c040]), -w / 2 + 0.9 + k * 0.6, y + 1.4, zb, { p: G, detail: true });
    propL(G, "wstool", 0.3, y, zm + 0.9, 0);
  } else if (type == "pharmacy") {
    sb(iw, 1.1, 0.6, mat("glass", 0xf0f8ff), 0, y + 0.55, zm, { p: G });
    propL(G, "shelf", 0, y, zb, 0); shelfGoods(G, 0, y, zb, 1.45, 4, 0);
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
  sb(0.6, 0.8, 0.3, mat("rust", 0x9aa4a8), 0, h - 2.8, 0.32, { p: G }); // hộp công tơ
  sb(0.5, 0.06, 0.4, M(0x3a3a3a, 0.6), 0, h - 2.37, 0.32, { p: G, shadow: false });
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
// Xe số kiểu phổ thông (dáng Wave / Dream), dựng 1 lần thành khuôn theo vật liệu, mét.
// Mũi xe hướng +z, bánh trước z=+0.62, bánh sau z=-0.62. Xe dựng nghiêng nhẹ trên chân chống trái.
const BIKE_TPL = (() => {
  const P = { paint: [], chrome: [], rubber: [], black: [], seat: [], metal: [], tail: [], lens: [] };
  const add = (k, g, m) => P[k].push({ g, m: m || null });
  for (const wz of [0.62, -0.62]) {                                      // bánh xe: lốp, vành, may-ơ, 5 nan đúc
    const tire = new T.TorusGeometry(0.248, 0.052, 10, 30); tire.rotateY(Math.PI / 2); add("rubber", tire, mtx(0, 0.3, wz));
    const rim = new T.TorusGeometry(0.2, 0.013, 6, 30); rim.rotateY(Math.PI / 2); add("chrome", rim, mtx(0, 0.3, wz));
    const hub = new T.CylinderGeometry(0.055, 0.055, 0.13, 14); hub.rotateZ(Math.PI / 2); add("metal", hub, mtx(0, 0.3, wz));
    for (let k = 0; k < 5; k++) add("metal", BG(0.022, 0.15, 0.03), mtx(0, 0.3, wz, (k / 5) * Math.PI * 2, 0, 0).multiply(mtx(0, 0.12, 0)));
  }
  const disc = new T.CylinderGeometry(0.105, 0.105, 0.006, 22); disc.rotateZ(Math.PI / 2); add("chrome", disc, mtx(0.075, 0.3, 0.62));
  // thân: yếm trước, sàn để chân, thân sau, yên (biên dạng đùn, bo cạnh)
  add("paint", sideExtrude([[0.27, 0.4], [0.4, 0.41], [0.52, 0.6, 0.6, 0.93], [0.55, 1.0], [0.47, 0.98], [0.43, 0.7, 0.3, 0.52]], 0.36, 0.035));
  add("black", sideExtrude([[-0.06, 0.33], [0.33, 0.33], [0.4, 0.42], [0.3, 0.45], [-0.06, 0.45]], 0.22, 0.015));
  add("paint", sideExtrude([[-0.02, 0.42], [-0.12, 0.6, -0.32, 0.67], [-0.7, 0.71], [-0.88, 0.67, -0.86, 0.6], [-0.7, 0.5], [-0.38, 0.43]], 0.27, 0.045));
  add("seat", sideExtrude([[-0.08, 0.69], [-0.3, 0.8, -0.6, 0.79], [-0.8, 0.765], [-0.85, 0.7], [-0.08, 0.66]], 0.25, 0.035));
  // chắn bùn trước (cung ôm bánh) + chắn bùn sau
  const ff = new T.TorusGeometry(0.29, 0.055, 6, 18, 2.2); ff.scale(1, 1, 1.25); ff.rotateY(-Math.PI / 2); add("paint", ff, mtx(0, 0.3, 0.62, 0.35, 0, 0));
  const rf = new T.TorusGeometry(0.29, 0.05, 6, 14, 1.4); rf.scale(1, 1, 1.2); rf.rotateY(-Math.PI / 2); add("black", rf, mtx(0, 0.3, -0.62, 1.55, 0, 0));
  // phuộc trước mạ crôm + ốp phuộc đen
  for (const s of [-1, 1]) { add("chrome", tubeBetween([s * 0.075, 0.3, 0.62], [s * 0.075, 0.62, 0.575], 0.019)); add("black", tubeBetween([s * 0.075, 0.6, 0.578], [s * 0.075, 0.9, 0.53], 0.026)); }
  // đầu đèn, mặt đồng hồ, đèn pha, ghi đông, tay nắm, gương tròn
  add("paint", new T.SphereGeometry(1, 18, 12), mtx(0, 0.985, 0.54, 0, 0, 0, 0.13, 0.085, 0.13));
  add("black", new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mtx(0, 1.04, 0.5, -0.25, 0, 0, 0.08, 0.035, 0.06));
  add("lens", new T.SphereGeometry(1, 14, 10, -Math.PI / 2, Math.PI, 0, Math.PI), mtx(0, 0.975, 0.62, 0, 0, 0, 0.075, 0.05, 0.03));
  add("chrome", tubeBetween([-0.31, 1.02, 0.5], [0.31, 1.02, 0.5], 0.012));
  for (const s of [-1, 1]) {
    add("black", tubeBetween([s * 0.24, 1.02, 0.5], [s * 0.36, 1.02, 0.5], 0.019, 10));
    add("black", tubeBetween([s * 0.2, 1.03, 0.49], [s * 0.26, 1.27, 0.44], 0.007, 5));
    const mir = new T.CylinderGeometry(0.052, 0.052, 0.015, 16); mir.rotateX(Math.PI / 2 - 0.15); add("black", mir, mtx(s * 0.265, 1.3, 0.44));
    const mg = new T.CircleGeometry(0.045, 16); mg.rotateY(Math.PI); mg.rotateX(0.15); add("chrome", mg, mtx(s * 0.265, 1.3, 0.431));
  }
  // động cơ, ống xả, hộp xích, càng sau, giảm xóc, chân chống, baga
  add("metal", sideExtrude([[0.22, 0.16], [0.3, 0.3], [0.12, 0.37], [-0.12, 0.35], [-0.13, 0.17]], 0.24, 0.03));
  for (let k = 0; k < 4; k++) add("metal", BG(0.26, 0.012, 0.11), mtx(0, 0.2 + k * 0.03, 0.27, 0.5, 0, 0));
  add("black", tubeBetween([0.06, 0.18, 0.2], [0.13, 0.24, -0.25], 0.032));
  add("chrome", tubeBetween([0.13, 0.24, -0.25], [0.15, 0.31, -0.78], 0.058, 14));
  add("black", tubeBetween([0.15, 0.31, -0.78], [0.155, 0.315, -0.82], 0.04, 10));
  add("black", BG(0.04, 0.09, 0.56), mtx(-0.13, 0.31, -0.36));
  for (const s of [-1, 1]) { add("black", tubeBetween([s * 0.1, 0.3, -0.05], [s * 0.1, 0.3, -0.62], 0.02)); add("chrome", tubeBetween([s * 0.135, 0.31, -0.6], [s * 0.135, 0.64, -0.5], 0.016)); add("black", tubeBetween([s * 0.135, 0.42, -0.565], [s * 0.135, 0.6, -0.515], 0.03, 10)); }
  add("black", tubeBetween([-0.13, 0.25, -0.04], [-0.32, 0.01, -0.06], 0.012));
  for (const s of [-1, 1]) add("chrome", tubeBetween([s * 0.1, 0.785, -0.58], [s * 0.1, 0.785, -0.86], 0.009, 5));
  add("chrome", tubeBetween([-0.1, 0.785, -0.86], [0.1, 0.785, -0.86], 0.009, 5));
  add("tail", BG(0.15, 0.06, 0.05), mtx(0, 0.655, -0.885));
  const out = {};
  for (const k in P) { const g = mergeGeos(P[k]); g.scale(U, U, U); out[k] = g; }
  return out;
})();
const PLATE_GEO = (() => { const g = new T.PlaneGeometry(0.19 * U, 0.14 * U); g.rotateY(Math.PI); g.translate(0, 0.53 * U, -0.905 * U); return g; })();
const _plates = [];
function plateMat(i) { // biển số trắng chữ đen (số hư cấu)
  if (_plates[i]) return _plates[i];
  const c = document.createElement("canvas"); c.width = 128; c.height = 96; const x = c.getContext("2d");
  x.fillStyle = "#f2f2ee"; x.fillRect(0, 0, 128, 96); x.strokeStyle = "#111"; x.lineWidth = 4; x.strokeRect(3, 3, 122, 90);
  x.fillStyle = "#111"; x.textAlign = "center"; x.font = "bold 34px Arial";
  const top = ["29-K1", "30-F5", "29-X3", "33-B2", "29-H7", "30-L9"][i], bot = ["123.45", "678.90", "246.81", "135.79", "802.46", "571.13"][i];
  x.fillText(top, 64, 40); x.fillText(bot, 64, 82);
  const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
  return (_plates[i] = new T.MeshStandardMaterial({ map: t, roughness: 0.5 }));
}
const BIKE_MAT = {
  chrome: M(0xe2e5e8, 0.12, 1), rubber: M(0x141414, 0.88), black: M(0x1c1c1f, 0.5, 0.15), seat: M(0x1a1615, 0.45),
  metal: M(0x9ea2a6, 0.35, 0.85), tail: M(0xd0201a, 0.2, 0.1), lens: M(0xf6f4ec, 0.05, 0.3),
};
// màu sơn phổ biến: đỏ, đen, xanh dương, trắng, bạc, "cánh gián", xanh rêu
const BIKE_COLORS = [0xb0151c, 0x151515, 0x1e3f86, 0xeceae4, 0xa9adb2, 0x5e2414, 0x2c4a32, 0x6a1a8a];
function motorbike(x, y, z, ry, color, p) {
  const G = new T.Group(); G.position.set(x, y + 0.02 * U, z); G.rotation.set(0, ry, 0); G.userData.detail = true; (p || ST).add(G);
  const L = new T.Group(); L.rotation.z = 0.11; G.add(L); // nghiêng sang chân chống
  const paint = M(color ?? pickR(BIKE_COLORS), 0.28, 0.25);
  for (const k in BIKE_TPL) sm(BIKE_TPL[k], k == "paint" ? paint : BIKE_MAT[k], 0, 0, 0, { p: L, shadow: k != "lens" && k != "tail" });
  sm(PLATE_GEO, plateMat(Math.floor(rand() * 6)), 0, 0, 0, { p: L, shadow: false });
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
  banana: () => { // thân giả có sọc + lá chuối dài cong võng, có texture
    const trunk = [{ g: new T.CylinderGeometry(0.13, 0.22, 2.6, 10), m: mtx(0, 1.3, 0) }];
    const can = [];
    for (let k = 0; k < 8; k++) {
      const g = new T.PlaneGeometry(0.95, 2.6, 1, 10), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const yy = p.getY(i) + 1.3, t = yy / 2.6, out = yy * 0.8; p.setXYZ(i, p.getX(i) * (1 - 0.15 * t), 0.55 * yy - 0.42 * yy * yy * 0.45 + Math.abs(p.getX(i)) * 0.18, out); }
      g.computeVertexNormals();
      can.push({ g, m: mtx(0, 2.45 + (k % 3) * 0.12, 0, 0, (k / 8) * 6.28 + k * 0.4, 0) });
    }
    return [trunk, can, "banana"];
  },
};
const BARK = mat("bark");
function buildTrees() {
  const im = new T.Object3D();
  for (const kind in TREE_DEF) {
    const list = TREES.filter((t) => t.k == kind);
    if (!list.length) continue;
    const [tr, ca, plainLeaf] = TREE_DEF[kind]();
    const lm = plainLeaf == "banana" ? addSway(new T.MeshStandardMaterial({ map: TX.bananaLeaf(), alphaTest: 0.4, side: T.DoubleSide, roughness: 0.75 }), 0.004) : leafMat(kind);
    const tm = plainLeaf == "banana" ? M(0x7a8a4a, 0.85) : BARK;
    for (const [items, m] of [[tr, tm], [ca, lm]]) {
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
//  HÀNG HÓA Ở CHỢ: bày trên mẹt tre / khay inox. Mỗi đống gộp thành 1 hình có màu đỉnh + vân đốm.
// ============================================================
const FRUIT_MAT = new T.MeshStandardMaterial({ vertexColors: true, map: TX.speckle(), roughness: 0.55, envMapIntensity: 0.5 });
const MET_GEO = lathe([[0, 0], [0.3, 0], [0.32, 0.04], [0.31, 0.05], [0.29, 0.012], [0, 0.012]], 24);   // mẹt tre tròn
const MET_MAT = mat("wood", 0xe0c890, { tile: 0.6 });
const TRAY_GEO = (() => { const g = slab(0.55, 0.38, 0.025, 0.04); g.scale(U, U, U); return g; })();
const STALL_GOODS = {
  "HOA QUẢ": ["cam", "xoai", "thanhlong"], "RAU SẠCH": ["rau", "cachua", "chuoi"], "GẠO – NGŨ CỐC": ["gao", "gao", "kho"],
  "THỊT – CÁ": ["ca", "thit", "ca"], "ĐỒ KHÔ": ["kho", "chuoi", "kho"], "QUẦN ÁO": ["quanao", "quanao", "quanao"],
};
const _pile = {};
function goodsPile(kind) { // đống hàng (mét -> đơn vị), tâm ở gốc, đáy y=0
  const k = kind + Math.floor(rand() * 3);
  if (_pile[k]) return _pile[k];
  const L = [], add = (g, hex, m) => L.push({ g, m, c: lin(hex) });
  const mound = (n, R, H, fn) => { for (let i = 0; i < n; i++) { const r = R * Math.sqrt((i + 0.5) / n), a = i * 2.39996; fn(Math.cos(a) * r, (1 - r / R) * H, Math.sin(a) * r, i); } };
  if (kind == "cam") mound(16, 0.22, 0.09, (x, y, z, i) => add(new T.IcosahedronGeometry(0.042, 2), [0xe8901e, 0xf0a02a, 0xd87c14][i % 3], mtx(x, y + 0.038, z, 0, i, 0, 1, 0.93, 1)));
  else if (kind == "xoai") mound(11, 0.22, 0.07, (x, y, z, i) => add(new T.SphereGeometry(1, 12, 9), [0xd8c040, 0xe0b030, 0xc8c84a][i % 3], mtx(x, y + 0.04, z, 0, i * 0.7, 0.3, 0.048, 0.04, 0.078)));
  else if (kind == "thanhlong") mound(8, 0.2, 0.06, (x, y, z, i) => {
    add(new T.SphereGeometry(1, 12, 9), 0xd83070, mtx(x, y + 0.05, z, 0, i, 0.4, 0.055, 0.052, 0.075));
    for (let f = 0; f < 6; f++) add(new T.ConeGeometry(0.012, 0.045, 4), 0x7ab83a, mtx(x + Math.cos(f) * 0.05, y + 0.06 + (f % 2) * 0.02, z + Math.sin(f) * 0.05, Math.sin(f) * 1.1, 0, -Math.cos(f) * 1.1));
  });
  else if (kind == "chuoi") for (let b = 0; b < 3; b++) { // nải chuối
    const bx = (b - 1) * 0.14, ry = b * 0.9;
    for (let i = 0; i < 6; i++) {
      const tb = new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(0, 0, 0), new T.Vector3(0.08, -0.03, 0), new T.Vector3(0.17, 0.05, 0)), 8, 0.016, 6);
      add(tb, i % 2 ? 0xe8c83a : 0xdcc030, mtx(bx, 0.03 + (i % 2) * 0.025, (i - 2.5) * 0.028, 0, ry, 0));
    }
    add(BG(0.03, 0.05, 0.16), 0x6a5a2a, mtx(bx, 0.04, 0, 0, ry, 0));
  }
  else if (kind == "cachua") mound(18, 0.22, 0.07, (x, y, z, i) => { add(new T.SphereGeometry(0.033, 10, 8), [0xc8281e, 0xd83a20, 0xb82018][i % 3], mtx(x, y + 0.03, z, 0, 0, 0, 1, 0.85, 1)); add(new T.ConeGeometry(0.012, 0.01, 5), 0x3a7a2a, mtx(x, y + 0.058, z)); });
  else if (kind == "rau") mound(9, 0.22, 0.05, (x, y, z, i) => { // mớ rau lá xoăn
    const g = new T.IcosahedronGeometry(0.06, 1), p = g.attributes.position;
    for (let j = 0; j < p.count; j++) { const kx = 1 + (Math.sin(j * 12.9898 + i) * 0.5) * 0.35; p.setXYZ(j, p.getX(j) * kx, p.getY(j) * kx * 0.8, p.getZ(j) * kx); }
    g.computeVertexNormals(); add(g, [0x4a8a2a, 0x5e9a34, 0x3e7a24][i % 3], mtx(x, y + 0.045, z, 0, i, 0));
  });
  else if (kind == "gao" || kind == "kho") { // đống gạo trắng / đồ khô nâu, có lon đong
    add(new T.SphereGeometry(0.26, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), kind == "gao" ? 0xece6d6 : 0x8a5a2a, mtx(0, 0, 0, 0, 0, 0, 1, 0.42, 1));
    if (kind == "kho") mound(14, 0.2, 0.08, (x, y, z, i) => add(new T.IcosahedronGeometry(0.03, 1), [0x6a4020, 0x8a6030][i % 2], mtx(x, y + 0.04, z)));
    add(new T.CylinderGeometry(0.045, 0.045, 0.1, 12, 1, true), 0xb8bcc0, mtx(0.08, 0.1, 0.05, 0.5, 0, 0));
  }
  else if (kind == "ca") for (let i = 0; i < 6; i++) { // cá xếp hàng trên khay
    const x = (i % 3 - 1) * 0.15, z = (Math.floor(i / 3) - 0.5) * 0.14;
    add(new T.SphereGeometry(1, 12, 8), 0xa8b0b8, mtx(x, 0.03, z, 0, Math.PI / 2, 0, 0.035, 0.022, 0.11));
    add(new T.ConeGeometry(0.03, 0.06, 4), 0x8a9298, mtx(x + 0.13, 0.03, z, 0, 0, Math.PI / 2, 1, 1, 0.3));
  }
  else if (kind == "thit") for (let i = 0; i < 5; i++) { // miếng thịt có vân mỡ
    const g = slab(0.14, 0.09, 0.03, 0.02, 0.004);
    add(g, 0xc04a52, mtx((i % 3 - 1) * 0.15, 0.025 + Math.floor(i / 3) * 0.03, (Math.floor(i / 3) - 0.5) * 0.12, 0, i * 0.4, 0));
    add(BG(0.12, 0.006, 0.015), 0xf2e2d8, mtx((i % 3 - 1) * 0.15, 0.057 + Math.floor(i / 3) * 0.03, (Math.floor(i / 3) - 0.5) * 0.12, 0, i * 0.4, 0));
  }
  else if (kind == "quanao") for (let st = 0; st < 2; st++) for (let i = 0; i < 4; i++) // chồng quần áo gấp
    add(slab(0.3, 0.22, 0.045, 0.02, 0.006), [0x2a4a8a, 0xe8e0d0, 0xc8304a, 0x4a7a4a, 0x2a2a2a, 0xe0b030][(st * 4 + i) % 6], mtx((st - 0.5) * 0.36, i * 0.046, 0, 0, (i % 2) * 0.08, 0));
  const g = mergeGeos(L, true); g.scale(U, U, U);
  return (_pile[k] = g);
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
  const kinds = STALL_GOODS[label] || ["cam", "xoai", "thanhlong"];
  for (let k = 0; k < 3; k++) {
    const bx = (-1 + k) * 1.1, kind = kinds[k];
    const onTray = kind == "ca" || kind == "thit";
    if (kind != "quanao") sm(onTray ? TRAY_GEO : MET_GEO, onTray ? INOX : MET_MAT, bx, h + 0.05, 0, { p: D, shadow: false, ry: rand() });
    sm(goodsPile(kind), FRUIT_MAT, bx, h + 0.05 + (kind == "quanao" ? 0 : 0.05 * U), 0, { p: D, shadow: true, ry: rand() * 6 });
  }
  propL(G, "basket", wd / 2 - 0.2, 0, dp / 2 + 0.5, rand()); // thúng mây để dưới đất
  propL(G, "crate", -wd / 2 + 0.3, 0, dp / 2 + 0.3, 0.3);
  const sx = 0, sz = -dp / 2 - 0.36;
  stool(sx, 0, sz, null, D);
  if (rand() < 0.8) { // người bán ngồi ghế nhựa đẩu sau sạp
    const sl = person({
      female: true, hair: "bun", hat: "non", skin: Math.floor(rand() * 2),
      shirt: pickR(["#c86a8a", "#5a7aa8", "#8a5a3a", "#e8e0d0", "#6a8a4a"]),
      sleeve: "long", pants: pickR(["#2a2a30", "#3a2a2a", "#2a3a2a"]),
      apron: pickR(["#4a6a9a", "#8a4a5a", "#3a7a5a", "#a87a3a"]),
      pose: "sit", still: true, parent: D,
      x: sx, y: 0, z: sz, ry: 0
    });
    sl.position.set(sx, 0, sz);
  }
  solidL(G, -wd / 2, -dp / 2, wd / 2, dp / 2, h + 0.1);
  return G;
}

// Bảng chữ A trên vỉa hè (thực đơn)
function aFrame(x, y, z, ry, kind = "menu", a, b) {
  const G = localGroup(x, y, z, ry, true);
  for (const s of [-1, 1]) sb(1.0, 1.7, 0.04, paperMat(kind, a, b), 0, 0.85, s * 0.25, { p: G, rx: s * 0.2 });
  for (const s of [-1, 1]) sb(0.03, 1.8, 0.6, RAIL, s * 0.52, 0.85, 0, { p: G, shadow: false });
}
