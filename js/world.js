// ============================================================
//  THẾ GIỚI: một phường phố Việt trên mặt đất
//  Ngã tư ở giữa (0,0). Phố Chợ chạy theo trục X, Phố Văn Hóa chạy theo trục Z.
//      Bắc (z<0):  Khu Tri Thức (trường học) · nhà sách
//      Đông (x>0): Chợ (góc đông bắc) · dãy quán Cạnh Tranh
//      Tây (x<0):  Xưởng Sản Xuất · ruộng ven đô (ruộng của người chơi)
//      Nam (z>0):  UBND phường (Kinh Tế Việt Nam) · công trường Tương Lai
// ============================================================
const SW = 0.15;                     // cao vỉa hè
const ROAD = 6, WALK = 11, EDGE = 120; // nửa bề rộng đường, mép nhà, mép phường
const npcs = [], floaters = [];
const fl = (m, a, s, r) => floaters.push({ m, y0: m.position.y, s: s || 1.5, p: Math.random() * 6, a: a || 0.3, r: r || 0 });

// Vùng chủ đề (để hiện tên khu trên HUD)
const ZONES = [
  { id: 0, x: -33, z: -78, r: 30 },  // Tri Thức – trường học
  { id: 1, x: 31, z: -31, r: 24 },   // Thị Trường – chợ
  { id: 2, x: -80, z: -31, r: 26 },  // Sản Xuất – xưởng
  { id: 3, x: 85, z: 0, r: 32 },     // Cạnh Tranh – dãy quán
  { id: 4, x: 33, z: 75, r: 26 },    // Kinh Tế VN – UBND phường
  { id: 5, x: -36, z: 85, r: 32 },   // Tương Lai – công trường
];
// Các lô đặc biệt: không xây nhà ống ở đây [x0,x1,z0,z1]
const LOTS = [
  [11, 54, -54, -11],     // chợ
  [-58, -11, -102, -54],  // trường học
  [-102, -58, -54, -11],  // xưởng
  [-120, -58, 11, 74],    // ruộng
  [11, 56, 54, 96],       // UBND
  [-62, -11, 54, 118],    // công trường
];
const inLot = (x, z) => LOTS.some((l) => x > l[0] && x < l[1] && z > l[2] && z < l[3]);

// ============================================================
//  MẶT ĐẤT, ĐƯỜNG, VỈA HÈ, VẠCH SƠN
// ============================================================
{
  const base = new T.PlaneGeometry(700, 700); base.rotateX(-Math.PI / 2);
  uvScale(base, 700 / 4, 700 / 4);
  sm(base, mat("concrete", 0x9a9890), 0, -0.02, 0, { shadow: false });
  const road = mat("asphalt", 0xb8b8b8);
  sb(EDGE * 2 + 40, 0.04, ROAD * 2, road, 0, 0.0, 0, { shadow: false });
  // trục Z chia 2 đoạn, chừa ô ngã tư (tránh 2 mặt đường trùng nhau => nhấp nháy z-fighting)
  for (const s of [-1, 1]) sb(ROAD * 2, 0.04, EDGE + 20 - ROAD, road, 0, 0.0, s * (ROAD + EDGE + 20) / 2, { shadow: false });
  const walk = mat("sidewalk", 0xd8d4cc), curb = mat("concrete", 0xb8b4ac);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    // dải vỉa hè dọc Phố Chợ và Phố Văn Hóa (mỗi góc ngã tư một chữ L)
    const ax = (ROAD + EDGE + 10) / 2;
    sb(EDGE + 10 - ROAD, SW, WALK - ROAD, walk, sx * ax, SW / 2, sz * (ROAD + WALK) / 2, { shadow: false });
    sb(WALK - ROAD, SW, EDGE + 10 - WALK, walk, sx * (ROAD + WALK) / 2, SW / 2, sz * (WALK + EDGE + 10) / 2, { shadow: false });
    solidW(sx * ROAD, sz * ROAD, sx * (EDGE + 10), sz * WALK, SW);
    solidW(sx * ROAD, sz * WALK, sx * WALK, sz * (EDGE + 10), SW);
    // bó vỉa nhô ra 3 cm khỏi mặt vỉa hè (không trùng mặt) và 2 đoạn nối ở góc, không chồng lên nhau
    const c0 = ROAD - 0.03, cw = 0.3, L1 = EDGE + 10 - c0, L2 = EDGE + 10 - c0 - cw;
    sb(L1, SW + 0.04, cw, curb, sx * (c0 + L1 / 2), SW / 2, sz * (c0 + cw / 2), { shadow: false });
    sb(cw, SW + 0.04, L2, curb, sx * (c0 + cw / 2), SW / 2, sz * (c0 + cw + L2 / 2), { shadow: false });
  }
  // vạch kẻ giữa đường + vạch đi bộ
  const paint = M(0xe8e4d8, 0.8), yel = M(0xe0b828, 0.8);
  for (let x = WALK + 6.5; x < EDGE + 10; x += 6) for (const s of [-1, 1]) { sb(3, 0.01, 0.18, yel, s * x, 0.03, 0, { shadow: false }); sb(0.18, 0.01, 3, yel, 0, 0.03, s * x, { shadow: false }); }
  for (const s of [-1, 1]) for (let k = -4; k <= 4; k++) {
    sb(0.7, 0.01, 3.2, paint, k * 1.3, 0.03, s * (WALK + 2.2), { shadow: false });
    sb(3.2, 0.01, 0.7, paint, s * (WALK + 2.2), 0.03, k * 1.3, { shadow: false });
  }
  // nắp cống, vũng ố trên đường
  for (let k = 0; k < 10; k++) sc(0.55, 0.55, 0.02, M(0x2a2826, 0.7, 0.5), rr(-100, 100), 0.02, pickR([-3.5, 3.5]), { seg: 14, shadow: false, detail: true });
  // ranh giới phường (không cho đi ra ngoài)
  solidW(-EDGE - 30, -EDGE - 8, EDGE + 30, -EDGE - 4, 30); solidW(-EDGE - 30, EDGE + 4, EDGE + 30, EDGE + 8, 30);
  solidW(-EDGE - 8, -EDGE - 30, -EDGE - 4, EDGE + 30, 30); solidW(EDGE + 4, -EDGE - 30, EDGE + 8, EDGE + 30, 30);
}

// ============================================================
//  DÃY NHÀ ỐNG HAI BÊN PHỐ
// ============================================================
const HOUSES = [];
const TYPE_POOL = ["pho", "grocery", "tea", "home", "home", "moto", "closed", "phone", "barber", "home", "tailor", "pharmacy", "pho", "tea", "closed", "grocery"];
let houseNo = 0;
// Dãy nhà dọc một trục: axis "x" (mặt tiền nhìn ra Phố Chợ) hoặc "z" (Phố Văn Hóa)
function row(axis, side, from, to, opt = {}) {
  let c = from;
  const dir = Math.sign(to - from);
  while (Math.abs(to - c) > 5.5) {
    const w = Math.min(rr(4, 5.2) * U, Math.abs(to - c));
    const mid = c + (dir * w) / 2;
    const fz = side * (WALK + 10); // tâm nhà cách tim đường
    const x = axis == "x" ? mid : fz, z = axis == "x" ? fz : mid;
    c += dir * w;
    if (inLot(x, z)) continue;
    const ry = axis == "x" ? (side > 0 ? Math.PI : 0) : side > 0 ? -Math.PI / 2 : Math.PI / 2;
    houseNo++;
    const type = opt.types ? opt.types[houseNo % opt.types.length] : TYPE_POOL[(houseNo * 7 + (houseNo >> 2)) % TYPE_POOL.length];
    const h = tubeHouse({ x, y: SW, z, ry, w: w - 0.05, d: 20, floors: 2 + Math.floor(rand() * 3.2), type, idx: houseNo, addr: "Số " + houseNo * 2 + " " + (axis == "x" ? STREET[0] : STREET[2]), sign: opt.signs ? opt.signs[houseNo % opt.signs.length] : undefined });
    HOUSES.push({ g: h, type, x, z, axis, side });
  }
}
// Phố Chợ (trục X): hai bên, hai nửa
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  if (sx > 0) continue; // nửa đông là dãy Cạnh Tranh (dựng riêng bên dưới)
  row("x", sz, sx * WALK, sx * (EDGE - 2));
}
// Phố Văn Hóa (trục Z): bắt đầu sau góc nhà Phố Chợ
for (const sx of [-1, 1]) for (const sz of [-1, 1]) row("z", sx, sz * (WALK + 20), sz * (EDGE - 2), sz < 0 && sx > 0 ? { types: ["books", "books", "home", "tea", "books", "pharmacy"] } : {});

// ---------- 3. CẠNH TRANH: dãy quán đối đầu nhau ở nửa đông Phố Chợ ----------
{
  const rivals = [
    { title: "PHỞ GIA TRUYỀN", sub: "Tái – Chín – Nạm", top: "Số 61 Phố Chợ", bg: "#c8231f", bg2: "#9e1712", fg: "#ffe14a", kind: "vinyl", stroke: "rgba(0,0,0,.35)" },
    { title: "PHỞ GIA TRUYỀN CHÍNH GỐC", sub: "Không có chi nhánh!", top: "Số 63 Phố Chợ", bg: "#ffd23a", bg2: "#f0b81a", fg: "#b8131a", kind: "vinyl" },
    { title: "ĐIỆN THOẠI GIÁ RẺ", sub: "Rẻ nhất phố – Trả góp 0%", top: "Số 65 Phố Chợ", bg: "#1d4f9c", bg2: "#123a75", fg: "#ffffff", kind: "vinyl" },
    { title: "ĐIỆN THOẠI RẺ HƠN", sub: "Rẻ hơn bên cạnh 100k", top: "Số 67 Phố Chợ", bg: "#0f7a3e", bg2: "#0a5a2c", fg: "#ffffff", kind: "vinyl" },
    { title: "QUỸ TÍN DỤNG", sub: "Gửi tiết kiệm – Vay vốn", top: "Số 69 Phố Chợ", bg: "#f4f4f4", bg2: "#e0e0e0", fg: "#1d4f9c", kind: "vinyl" },
    { title: "CÀ PHÊ SỐ 1", sub: "Ngon nhất phố", top: "Số 71 Phố Chợ", bg: "#3a2a1e", bg2: "#2a1a10", fg: "#ffd45e", kind: "board" },
    { title: "CÀ PHÊ SỐ 1 THẬT", sub: "Cẩn thận hàng nhái", top: "Số 73 Phố Chợ", bg: "#b07a45", fg: "#8e1a12", kind: "wood" },
    { title: "SIÊU THỊ MINI", sub: "Mở cửa 24/7", top: "Số 75 Phố Chợ", bg: "#e0302a", bg2: "#b81a14", fg: "#ffffff", kind: "vinyl" },
  ];
  const types = ["pho", "pho", "phone", "phone", "pharmacy", "tea", "tea", "grocery"];
  for (const sz of [-1, 1]) {
    let c = sz < 0 ? 54 : WALK, k = sz < 0 ? 0 : 3;
    while (c < EDGE - 6) {
      const w = rr(4.2, 5.2) * U, x = c + w / 2;
      c += w; k++;
      houseNo++;
      const h = tubeHouse({ x, y: SW, z: sz * (WALK + 10), ry: sz > 0 ? Math.PI : 0, w: w - 0.05, d: 20, floors: 3 + Math.floor(rand() * 3), type: types[k % types.length], idx: houseNo, sign: rivals[k % rivals.length], flag: k % 3 == 0 });
      HOUSES.push({ g: h, type: types[k % types.length], x, z: sz * (WALK + 10), axis: "x", side: sz });
    }
  }
}

function streetTree(x, z, y = SW, kind) {
  tree(x, y, z, kind || (rand() < 0.6 ? "sau" : "bang"));
  treeGuard(x, y, z);
  solidW(x - 0.8, z - 0.8, x + 0.8, z + 0.8, y + 1.2);
}
// ============================================================
//  ĐỒ VẬT VỈA HÈ: cột điện + dây, cây + lan can gốc, đèn đường, xe máy, ghế nhựa
// ============================================================
{
  // cột điện dọc mép vỉa hè, nối dây liên tiếp; thỉnh thoảng có dây vắt qua đường
  const lines = [];
  for (const sz of [-1, 1]) { const L = []; for (let x = -EDGE + 4; x <= EDGE - 4; x += 24) if (Math.abs(x) > WALK + 3) { L.push(pole(x, SW, sz * (ROAD + 0.45), 8 * U, 0)); solidW(x - 0.3, sz * (ROAD + 0.45) - 0.3, x + 0.3, sz * (ROAD + 0.45) + 0.3, 12); } lines.push(L); }
  for (const sx of [-1, 1]) { const L = []; for (let z = -EDGE + 4; z <= EDGE - 4; z += 24) if (Math.abs(z) > WALK + 3) { L.push(pole(sx * (ROAD + 0.45), SW, z, 8 * U, Math.PI / 2)); solidW(sx * (ROAD + 0.45) - 0.3, z - 0.3, sx * (ROAD + 0.45) + 0.3, z + 0.3, 12); } lines.push(L); }
  for (const L of lines) {
    for (let k = 0; k + 1 < L.length; k++) if (L[k][0].distanceTo(L[k + 1][0]) < 30) cables(L[k], L[k + 1]);
  }
  for (let k = 0; k + 1 < lines[0].length; k += 3) { cable(lines[0][k][3], lines[1][k][3], 0.6); cable(lines[0][k][6], lines[1][k][5], 0.9, 0.03); }
  for (let k = 0; k + 1 < lines[2].length; k += 3) { cable(lines[2][k][3], lines[3][k][3], 0.6); cable(lines[2][k][6], lines[3][k][5], 0.9, 0.03); }
  // dây từ cột vào nhà
  for (const h of HOUSES) if (rand() < 0.4) {
    let best = null, bd = 30;
    for (const L of lines) for (const p of L) { const d = p[4].distanceTo(h.g.attach); if (d < bd) { bd = d; best = p; } }
    if (best) cable(best[4 + Math.floor(rand() * 3)], h.g.attach, 0.25);
  }
  // cây xanh + lan can gốc, đèn đường
  for (const s of [-1, 1]) {
    // cây cách cột điện (mỗi 24) và đèn đường (mỗi 34, lệch 6) ít nhất 2.5 đơn vị
    const clear = (v) => { const dp = ((v + EDGE - 4) % 24 + 24) % 24, dl = ((v + EDGE - 26) % 34 + 34) % 34; return Math.min(dp, 24 - dp) > 2.5 && Math.min(dl, 34 - dl) > 2.5; };
    for (let x = -EDGE + 14; x < EDGE - 6; x += rr(13, 18)) if (Math.abs(x) > WALK + 4 && clear(x)) streetTree(x, s * (ROAD + 1.3));
    for (let z = -EDGE + 14; z < EDGE - 6; z += rr(13, 18)) if (Math.abs(z) > WALK + 4 && clear(z)) streetTree(s * (ROAD + 1.3), z);
    for (let x = -EDGE + 20; x < EDGE; x += 34) if (Math.abs(x) > WALK + 4) streetLamp(x + 6, SW, s * (ROAD + 0.3), s > 0 ? Math.PI : 0);
    for (let z = -EDGE + 20; z < EDGE; z += 34) if (Math.abs(z) > WALK + 4) streetLamp(s * (ROAD + 0.3), SW, z + 6, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  // trước cửa quán – mỗi nhà một khoảng vỉa hè riêng (tọa độ cục bộ: x dọc phố, z hướng ra đường),
  // các món không đè lên nhau: quán trà đá = bộ bàn ghế, quán phở = bảng thực đơn + dãy ghế, nhà khác = xe máy dựng
  for (const h of HOUSES) {
    const f = h.g.front, ry = h.g.rotation.y, hw = h.g.w / 2 - 0.5;
    const along = h.axis == "x" ? [1, 0] : [0, 1];
    const G = localGroup(f.x, SW, f.z, ry, true);
    if (h.type == "tea") {
      lowTable(0, 0, 0, G, 0);
      for (const s of [-1, 1]) {
        stool(s * 1.15, 0, 0, null, G);
        if (rand() < 0.75) { // khách uống trà đá ngồi ghế nhựa
          const pp = randomPerson(Math.floor(rand() * 50), { pose: "sit", still: true, parent: G });
          pp.position.set(s * 1.15, 0, 0); pp.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
      }
      stool(0.2, 0, -0.95, null, G); // ghế trống chờ khách (phía trong, xa gốc cây)
    } else if (h.type == "pho") {
      const a = worldPoint(G, hw - 0.2, 0, 0.4);
      aFrame(a.x, SW, a.z, ry + 0.5, "menu", "THỰC ĐƠN");
      for (let k = 0; k < 3; k++) stool(-hw + 0.4 + k * 0.7, 0, -1.2, null, G); // ghế xếp sát tường chờ khách
    } else if (rand() < 0.6) {
      const n = Math.min(1 + Math.floor(rand() * 3), Math.floor((hw * 2) / 1.7));
      for (let k = 0; k < n; k++) motorbike(-hw + 1.0 + k * 1.7, 0, -0.5, Math.PI + 0.7 + rr(-0.08, 0.08), null, G); // dựng chéo, đầu xe quay vào nhà
    }
    if (rand() < 0.15) propL(G, "trash", hw + 0.3, 0, -1.3, rand() * 3); // bao rác dựng sát mép tường giáp nhà bên
  }
}

// ============================================================
//  NỀN PHÍA SAU: mái nhà san sát + đường chân trời xa (chỉ để nhìn)
// ============================================================
{
  // khối nhà phía sau dãy mặt phố: mặt tiền có cửa sổ/chuồng cọp/cục nóng, mái bằng có bồn nước, mái tôn, ăng-ten
  const tints = [0xf2e6c8, 0xe4dccc, 0xf0d8a8, 0xd8e0d0, 0xe8d0c0, 0xd0d8e0];
  const roofTop = (cx, cz, w, d, h) => {
    sb(w - 0.1, 0.35, d - 0.1, mat("concrete", 0xb8b4ac), cx, h + 0.17, cz);                     // sân thượng (không đè sang nhà bên => không nhấp nháy)
    if (rand() < 0.7) { const tk = new T.CylinderGeometry(0.6, 0.6, 2.0, 14); tk.rotateZ(Math.PI / 2); sm(tk, INOX, cx + rr(-w / 3, w / 3), h + 1.3, cz + rr(-d / 3, d / 3), { detail: true }); }
    if (rand() < 0.5) sb(rr(4, 7), 0.08, rr(4, 7), mat("tin_rust", 0xc8c0b0), cx + rr(-w / 4, w / 4), h + 2.4, cz + rr(-d / 4, d / 4), { rx: 0.1 });
    if (rand() < 0.5) { sc(0.03, 0.03, 4, RAIL, cx + rr(-w / 3, w / 3), h + 0.35, cz + rr(-d / 3, d / 3), { seg: 4, shadow: false, detail: true }); }
  };
  for (let x = -EDGE; x < EDGE; x += 18) for (let z = -EDGE; z < EDGE; z += 18) {
    const cx = x + 9, cz = z + 9;
    if (Math.abs(cx) < WALK + 26 || Math.abs(cz) < WALK + 26 || inLot(cx, cz) || inLot(x, z) || inLot(x + 18, z + 18) || inLot(x, z + 18) || inLot(x + 18, z)) continue;
    // chia lô 18×18 thành 2 nhà cao thấp khác nhau
    for (const half of [-1, 1]) {
      const h = Math.round(rr(2, 5)) * 5.2 + 1;
      sb(9, h, 18, mat("facade", pickR(tints)), cx + half * 4.5, h / 2, cz);
      roofTop(cx + half * 4.5, cz, 9, 18, h);
    }
    solidW(x, z, x + 18, z + 18, 30);
  }
  // chặn cuối phố bằng dãy nhà cao
  for (const [x, z, w, d] of [[EDGE + 14, 0, 20, 60], [-EDGE - 14, 0, 20, 60], [0, EDGE + 14, 60, 20], [0, -EDGE - 14, 60, 20]]) {
    const h = rr(24, 34);
    sb(w, h, d, mat("facade", pickR(FACADE)), x, h / 2, z);
    roofTop(x, z, w, d, h);
  }
  // đường chân trời xa (sương mù làm mờ)
  for (let k = 0; k < 46; k++) {
    const a = (k / 46) * 6.28, d = rr(170, 230), h = rr(18, 70), w = rr(14, 30);
    sb(w, h, w, mat("facade", pickR([0xc8c4bc, 0xb8c0c8, 0xd8d0c0])), Math.cos(a) * d, h / 2, Math.sin(a) * d, { shadow: false });
  }
}

// ============================================================
//  1. CHỢ (góc đông bắc): nhà lồng mái tôn, sạp hàng
// ============================================================
const SH = { x: 22, z: -15.5 }; // quầy thu mua lúa (logic gốc: bán lúa / mua hạt)
const VILL_C = { x: 33, z: -30, r: 13 }; // bà bán hàng đi qua lại dọc lối giữa hai hàng sạp
{
  const x0 = 13, x1 = 52, z0 = -52, z1 = -13;
  sb(x1 - x0, 0.2, z1 - z0, mat("terrazzo", 0xd0ccc4), (x0 + x1) / 2, 0.1, (z0 + z1) / 2, { shadow: false });
  solidW(x0, z0, x1, z1, 0.2);
  // khung cột thép + mái tôn rỉ 2 lớp
  const col = M(0x3a5a6a, 0.6, 0.5);
  for (let x = x0 + 2; x <= x1 - 1; x += 9) for (let z = z0 + 2; z <= z1 - 1; z += 9) { sb(0.35, 10, 0.35, col, x, 5, z); solidW(x - 0.2, z - 0.2, x + 0.2, z + 0.2, 10); }
  sb(x1 - x0 + 2, 0.1, (z1 - z0) / 2 + 2, mat("tin_rust", 0xd8d0c0), (x0 + x1) / 2, 10.6, z0 + (z1 - z0) * 0.25, { rx: -0.16 });
  sb(x1 - x0 + 2, 0.1, (z1 - z0) / 2 + 2, mat("tin_rust", 0xd8d0c0), (x0 + x1) / 2, 10.6, z0 + (z1 - z0) * 0.75, { rx: 0.16 });
  sb(x1 - x0 + 2, 0.5, 0.5, col, (x0 + x1) / 2, 11.9, (z0 + z1) / 2);
  // tường sau và bên
  sb(x1 - x0, 4, 0.3, mat("damaged", 0xffffff), (x0 + x1) / 2, 2, z0); solidW(x0, z0 - 0.2, x1, z0 + 0.2, 4);
  sb(0.3, 4, z1 - z0, mat("damaged", 0xffffff), x1, 2, (z0 + z1) / 2); solidW(x1 - 0.2, z0, x1 + 0.2, z1, 4);
  // biển cổng chợ
  sb(12, 1.6, 0.2, signMat({ title: "CHỢ PHƯỜNG", sub: "Mở cửa 5h – 19h hằng ngày", top: "BAN QUẢN LÝ CHỢ", bg: "#1f5fae", bg2: "#123a75", fg: "#ffe14a", kind: "vinyl", ar: 7.5 }), (x0 + x1) / 2 - 6, 8.6, z1 + 0.2);
  sb(0.3, 8.6, 0.3, col, (x0 + x1) / 2 - 12.2, 4.3, z1 + 0.2); sb(0.3, 8.6, 0.3, col, (x0 + x1) / 2 + 0.2, 4.3, z1 + 0.2);
  // sạp hàng
  const stalls = [[0xd9503f, "HOA QUẢ"], [0x3f7ad9, "RAU SẠCH"], [0xe0b030, "GẠO – NGŨ CỐC"], [0x3a9a5a, "THỊT – CÁ"], [0xd9503f, "ĐỒ KHÔ"], [0x8a4a9a, "QUẦN ÁO"]];
  let k = 0;
  for (let x = x0 + 6; x < x1 - 4; x += 8) for (const z of [-24, -36, -46]) {
    const st = stalls[k++ % stalls.length];
    stall(x, 0.2, z, (k % 2) * Math.PI, st[0], st[1]);
  }
  // quầy thu mua lúa (thương nhân)
  const G = localGroup(SH.x, 0.2, SH.z, 0);
  sb(3.6, 1.2, 1.4, mat("wood", 0xb08860), 0, 0.6, 0, { p: G });
  sb(3.8, 0.1, 1.6, mat("wood", 0x8a6040), 0, 1.25, 0, { p: G });
  sb(4.2, 0.06, 2.8, M(0xd9503f, 0.85), 0, 3.9, 0, { p: G, rx: 0.12 });
  for (const [sx, sz, h] of [[-1.9, 1.2, 3.7], [1.9, 1.2, 3.7], [-1.9, -1.2, 4.1], [1.9, -1.2, 4.1]]) sb(0.08, h, 0.08, RAIL, sx, h / 2, sz, { p: G });
  sb(3.4, 0.7, 0.08, signMat({ title: "THU MUA LÚA", sub: "Bán hạt giống – Giá theo thị trường", bg: "#c8231f", fg: "#ffe14a", kind: "vinyl", ar: 4.8 }), 0, 3.2, 1.25, { p: G });
  for (let k3 = 0; k3 < 3; k3++) propL(G, "cement", -1.2 + k3 * 1.2, 0, 1.3, rand() * 0.4, 1, { rx: 0 }); // bao lúa (dùng bao xi măng làm bao tải)
  sb(0.4, 0.3, 0.4, M(0xc8231f, 0.5), 1.2, 1.45, 0, { p: G });
  solidL(G, -1.8, -0.7, 1.8, 0.7, 1.3);
}

// ============================================================
//  0. TRI THỨC: trường học (vàng, cửa sổ xanh, hành lang) + sân + cổng
// ============================================================
{
  const x0 = -56, x1 = -13, z0 = -100, z1 = -56;
  sb(x1 - x0, 0.2, z1 - z0, mat("sidewalk", 0xe0d8d0), (x0 + x1) / 2, 0.1, (z0 + z1) / 2, { shadow: false });
  solidW(x0, z0, x1, z1, 0.2);
  // hàng rào + cổng
  const fz0 = z0, fz1 = z1, gx = -11.5, gate0 = -82, gate1 = -72;
  for (const [a, b] of [[fz0, gate0], [gate1, fz1]]) {
    sb(0.4, 1.2, b - a, mat("concrete2", 0xe8d8a0), gx, 0.6, (a + b) / 2);
    for (let z = a + 0.5; z < b; z += 0.4) sb(0.04, 1.4, 0.04, RAIL, gx, 1.9, z, { shadow: false, detail: true });
    sb(0.06, 0.06, b - a, RAIL, gx, 2.6, (a + b) / 2, { shadow: false });
    solidW(gx - 0.3, a, gx + 0.3, b, 2.6);
  }
  for (const z of [gate0, gate1]) sb(0.8, 3.6, 0.8, mat("concrete2", 0xe8d8a0), gx, 1.8, z);
  sb(1.0, 1.0, gate1 - gate0 + 0.8, mat("concrete2", 0xe8d8a0), gx, 4.0, (gate0 + gate1) / 2);
  sb(0.2, 1.3, gate1 - gate0 - 0.6, signMat({ title: "TRƯỜNG THCS TRI THỨC", sub: "Học – Học nữa – Học mãi", bg: "#1d4f9c", bg2: "#123a75", fg: "#ffffff", kind: "board", ar: 7 }), gx + 0.55, 4.0, (gate0 + gate1) / 2);
  for (const z of [z0, z1]) { sb(x1 - x0, 2.6, 0.4, mat("concrete2", 0xe8d8a0), (x0 + x1) / 2, 1.3, z); solidW(x0, z - 0.3, x1, z + 0.3, 2.6); }
  // dãy lớp học 3 tầng có hành lang, quay mặt ra sân (+x)
  const bx = -46, bw = 12, bl = 40, wall = mat("plaster_y", 0xffffff);
  const floorsH = 4 * U;
  for (let f = 0; f < 3; f++) {
    const y = 0.2 + f * floorsH;
    sb(bw, 0.35, bl, mat("concrete2", 0xe0dcd4), bx, y + 0.17, (z0 + z1) / 2);
    sb(0.3, floorsH, bl, wall, bx - bw / 2 + 0.15, y + floorsH / 2, (z0 + z1) / 2); // tường sau
    sb(0.3, floorsH - 0.35, bl, wall, bx + 1.5, y + 0.35 + (floorsH - 0.35) / 2, (z0 + z1) / 2, { detail: false }); // tường lớp phía hành lang
    // lan can hành lang
    sb(0.2, 1.6, bl, wall, bx + bw / 2 - 0.1, y + 0.35 + 0.8, (z0 + z1) / 2);
    for (let z = z0 + 4; z < z1 - 2; z += 5) sb(0.6, floorsH, 0.6, wall, bx + bw / 2 - 0.3, y + floorsH / 2, z); // cột
    // cửa sổ xanh + cửa ra vào
    for (let z = z0 + 6.5; z < z1 - 3; z += 5) {
      sb(0.1, 2.0, 2.4, M(0x2f7a5a, 0.6), bx + 1.68, y + 2.6, z);
      sb(0.08, 1.8, 2.2, mat("glass", 0xa8c0d0), bx + 1.72, y + 2.6, z);
    }
    for (const z of [z0 + 9, z0 + 24]) sb(0.1, 3.2, 1.6, M(0x6a4a2a, 0.6), bx + 1.7, y + 1.95, z);
  }
  sb(bw + 1, 0.4, bl + 1, mat("concrete2", 0xd8d0c0), bx, 0.2 + 3 * floorsH + 0.2, (z0 + z1) / 2);
  sm(hipRoof(bl + 2, bw + 3, 3.6), mat("roof"), bx, 0.2 + 3 * floorsH + 0.4, (z0 + z1) / 2, { ry: Math.PI / 2 });
  solidW(bx - bw / 2, z0, bx + bw / 2, z1, 30);
  // một lớp học mở ở tầng trệt nhìn được vào (bàn ghế + bảng)
  {
    const cz = -66, cx = bx + bw / 2 + 4;
    sb(9, 0.08, 8, mat("terrazzo"), cx, 0.24, cz, { shadow: false });
    sb(0.2, 3.5, 8, M(0x2a4a3a, 0.8), cx - 4.6, 2.0, cz);
    prop("chalk", cx - 3.6, 0.25, cz, Math.PI / 2, 1.2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { prop("desk", cx - 1.35 + i * 2.1, 0.25, cz - 2.5 + j * 2.5, -Math.PI / 2); prop("schair", cx - 0.05 + i * 2.1, 0.25, cz - 2.5 + j * 2.5, -Math.PI / 2); }
    sb(9.4, 0.3, 8.4, mat("tin_rust", 0xd8d0c0), cx, 4.6, cz, { rz: 0.06 });
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) sb(0.15, 4.4, 0.15, RAIL, cx + a * 4.5, 2.4, cz + b * 4);
  }
  // cột cờ sân trường + ghế đá + cây bàng
  sc(0.06, 0.09, 9, mat("metal", 0xe6e6e6), -26, 0.2, -77, { seg: 10 });
  for (const z of [-90, -62]) streetTree(-24, z, 0.2, "bang");
  for (const z of [-86, -66]) sb(2.4, 0.6, 0.8, mat("concrete2", 0xd0ccc4), -19, 0.5, z);
}

// ============================================================
//  2. SẢN XUẤT: xưởng cơ khí mái tôn + ống khói
// ============================================================
{
  const x0 = -100, x1 = -60, z0 = -52, z1 = -13;
  sb(x1 - x0, 0.2, z1 - z0, mat("floor_c"), (x0 + x1) / 2, 0.1, (z0 + z1) / 2, { shadow: false });
  solidW(x0, z0, x1, z1, 0.2);
  const shed = mat("tin", 0xb8c0c8), steel = M(0x4a5560, 0.5, 0.6);
  // nhà xưởng: tường tôn 3 phía, mặt trước mở
  const hx = (x0 + x1) / 2, hz = -36, hw = 32, hd = 22, hh = 8;
  sb(hw, hh, 0.2, shed, hx, hh / 2, hz - hd / 2); solidW(hx - hw / 2, hz - hd / 2 - 0.3, hx + hw / 2, hz - hd / 2 + 0.3, hh);
  for (const s of [-1, 1]) { sb(0.2, hh, hd, shed, hx + s * hw / 2, hh / 2, hz); solidW(hx + s * hw / 2 - 0.3, hz - hd / 2, hx + s * hw / 2 + 0.3, hz + hd / 2, hh); }
  sb(hw + 1, 0.15, hd + 1, mat("tin_rust", 0xd0c8b8), hx, hh + 0.6, hz, { rx: -0.08 });
  for (let x = hx - hw / 2 + 4; x < hx + hw / 2; x += 8) sb(0.3, hh, 0.3, steel, x, hh / 2, hz + hd / 2);
  sb(hw, 0.6, 0.3, steel, hx, hh - 0.3, hz + hd / 2);
  sb(14, 1.6, 0.2, signMat({ title: "XƯỞNG CƠ KHÍ ĐOÀN KẾT", sub: "Gia công – Tiện – Hàn – Phay", top: "HTX SẢN XUẤT", bg: "#244a7a", bg2: "#183458", fg: "#ffffff", kind: "board", ar: 8.75 }), hx, hh - 1.6, hz + hd / 2 + 0.2);
  // máy móc
  for (let k = 0; k < 4; k++) prop("drill", hx - 7 + k * 4, 0.2, hz - 7, 0, 1.6);
  for (let k = 0; k < 3; k++) prop("toolcart", hx - 10 + k * 7, 0.2, hz - 1, rand());
  for (let k = 0; k < 6; k++) prop("wcrate", hx + 6 + (k % 3) * 1.6, 0.2 + Math.floor(k / 3) * 0.6, hz + 4, 0);
  for (let k = 0; k < 5; k++) prop("tyre", hx - 13, 0.2 + k * 0.28, hz + 6, 0, 1, { rx: Math.PI / 2 });
  prop("handtruck", hx + 2, 0.2, hz + 6, 0.5); prop("ladder", hx + 12, 0.2, hz - 8, 0.3);
  for (let k = 0; k < 4; k++) prop("jerry", hx + 10 + k * 0.5, 0.2, hz + 8, rand());
  prop("odesk", hx + 10, 0.2, hz - 4, Math.PI);
  // băng chuyền + thùng phuy
  sb(14, 0.3, 1.4, M(0x22262c, 0.9), hx - 2, 1.1, hz + 2);
  for (let k = 0; k < 6; k++) for (const s of [-0.6, 0.6]) sb(0.12, 1.0, 0.12, steel, hx - 8 + k * 2.4, 0.5, hz + 2 + s);
  for (let k = 0; k < 4; k++) sb(1.2, 1.0, 1.0, mat("wood", 0xd09060), hx - 7 + k * 3.5, 1.75, hz + 2);
  for (let k = 0; k < 5; k++) sc(0.45, 0.45, 1.4, M([0x2f5a9a, 0xb03a2a][k % 2], 0.5, 0.4), hx + 13 - (k % 2) * 1, 0.2, hz + 2 + Math.floor(k / 2) * 1, { seg: 12 });
  // ống khói gạch
  sc(0.8, 1.1, 18, mat("brick"), hx - 12, 0.2, hz - 9, { seg: 16 });
  sc(0.9, 0.9, 0.5, M(0x2a2a2a), hx - 12, 18.2, hz - 9, { seg: 16 });
  solidW(hx - 13.2, hz - 10.2, hx - 10.8, hz - 7.8, 18);
  // hàng rào tôn ra phố
  for (const [a, b] of [[x0, hx - 8], [hx + 8, x1]]) { sb(b - a, 2.6, 0.15, mat("tin_rust", 0xb0c0b8), (a + b) / 2, 1.3, z1 + 0.5); solidW(a, z1 + 0.2, b, z1 + 0.8, 2.6); }
  sb(0.3, 4, z1 - z0, mat("damaged"), x0, 2, (z0 + z1) / 2); solidW(x0 - 0.3, z0, x0 + 0.3, z1, 4);
  sb(0.3, 4, z1 - z0, mat("damaged"), x1, 2, (z0 + z1) / 2); solidW(x1 - 0.3, z0, x1 + 0.3, z1, 4);
}

// ============================================================
//  4. KINH TẾ VIỆT NAM: trụ sở UBND phường + cột cờ
// ============================================================
let FLAG_POS = null;
{
  const x0 = 13, x1 = 56, z0 = 56, z1 = 96;
  sb(x1 - x0, 0.2, z1 - z0, mat("terrazzo", 0xe0d8cc), (x0 + x1) / 2, 0.1, (z0 + z1) / 2, { shadow: false });
  solidW(x0, z0, x1, z1, 0.2);
  // hàng rào sơn vàng + cổng
  const gx = 11.5, g0 = 70, g1 = 80;
  for (const [a, b] of [[z0, g0], [g1, z1]]) {
    sb(0.4, 1.0, b - a, mat("concrete2", 0xf0d880), gx, 0.5, (a + b) / 2);
    for (let z = a + 0.5; z < b; z += 0.35) sb(0.04, 1.5, 0.04, M(0x3a3a3a, 0.5, 0.6), gx, 1.75, z, { shadow: false, detail: true });
    solidW(gx - 0.3, a, gx + 0.3, b, 2.5);
  }
  for (const z of [z0, z1]) { sb(x1 - x0, 2.5, 0.4, mat("concrete2", 0xf0d880), (x0 + x1) / 2, 1.25, z); solidW(x0, z - 0.3, x1, z + 0.3, 2.5); }
  // tòa nhà 3 tầng kiểu Pháp: vàng, cột trắng, cửa chớp xanh
  const bx = 46, bw = 14, bl = 34, fh = 4.2 * U, wall = mat("plaster_y", 0xffffff), white = mat("concrete2", 0xf4f0e8);
  sb(bw, fh * 3, bl, wall, bx, 0.2 + fh * 1.5, (z0 + z1) / 2);
  solidW(bx - bw / 2, z0 + 3, bx + bw / 2 + 3, z1 - 3, 30);
  for (let f = 0; f < 3; f++) {
    const y = 0.2 + f * fh;
    sb(1.2, 0.35, bl, white, bx - bw / 2 - 0.4, y + fh - 0.2, (z0 + z1) / 2);
    for (let z = z0 + 5; z < z1 - 3; z += 4) {
      for (const s of [-1, 1]) sb(0.1, 2.8, 0.75, M(0x2f6a4a, 0.6), bx - bw / 2 - 0.06, y + 2.4, z + s * 0.4);
      sb(0.3, 0.3, 2, white, bx - bw / 2 - 0.15, y + 4.0, z);
    }
  }
  // sảnh cột trước
  for (const z of [72, 75, 78]) sc(0.4, 0.45, fh * 2, white, bx - bw / 2 - 3, 0.2, z, { seg: 14 });
  sb(4, 0.5, 9, white, bx - bw / 2 - 2, 0.2 + fh * 2, 75);
  sb(4, 0.6, 9, mat("concrete2", 0xd8d4cc), bx - bw / 2 - 2, 0.5, 75); solidW(bx - bw / 2 - 4, 70.5, bx - bw / 2, 79.5, 0.8);
  sb(0.25, 1.8, 12, signMat({ title: "ỦY BAN NHÂN DÂN PHƯỜNG", sub: "Cộng hòa xã hội chủ nghĩa Việt Nam", bg: "#c8231f", bg2: "#a01a14", fg: "#ffe14a", kind: "board", ar: 6.7 }), bx - bw / 2 - 0.2, 0.2 + fh * 3 - 1.4, 75);
  sm(hipRoof(bl + 1, bw + 1, 3.2), mat("roof"), bx, 0.2 + fh * 3, (z0 + z1) / 2, { ry: Math.PI / 2 });
  // băng rôn đỏ
  sb(0.1, 1.2, 20, signMat({ title: "CHUNG SỨC XÂY DỰNG PHƯỜNG VĂN MINH – GIÀU ĐẸP", bg: "#c8231f", fg: "#ffe14a", kind: "plain", ar: 16 }), bx - bw / 2 - 0.15, 0.2 + fh + 1.5, 75);
  // cột cờ giữa sân
  sc(0.5, 0.6, 0.4, white, 26, 0.2, 75, { seg: 12 });
  sc(0.08, 0.12, 10, mat("metal", 0xe6e6e6), 26, 0.2, 75, { seg: 10 });
  sm(new T.SphereGeometry(0.18, 10, 8), M(0xe0b030, 0.3, 0.9), 26, 10.3, 75);
  FLAG_POS = new T.Vector3(26 + 1.15, 9.2, 75);
  for (const z of [62, 90]) streetTree(20, z, 0.2, "sau");
  for (const z of [64, 86]) for (let k = 0; k < 3; k++) propL(ST, "plant", 30 + k * 3, 0.2, z, 0, 1.4);
}

// ============================================================
//  5. TƯƠNG LAI: công trường khu đô thị mới – khung bê tông, giàn giáo, cần cẩu
//  Leo cầu thang giàn giáo lên sàn cao để lấy rương vàng.
// ============================================================
const STAIR_TOP = 9;
{
  const x0 = -62, x1 = -11, z0 = 54, z1 = 118;
  sb(x1 - x0, 0.05, z1 - z0, mat("soil", 0xc0a890), (x0 + x1) / 2, 0.02, (z0 + z1) / 2, { shadow: false });
  // tường rào tôn xanh + băng rôn công trình, cổng mở ở z 66–74
  const fence = mat("tin", 0x2f7a9a), gx = -11.5;
  for (const [a, b] of [[z0, 66], [74, z1]]) { sb(0.15, 3.4, b - a, fence, gx, 1.7, (a + b) / 2); solidW(gx - 0.3, a, gx + 0.3, b, 3.4); }
  sb(0.12, 2.2, 22, signMat({ title: "KHU ĐÔ THỊ MỚI – TƯƠNG LAI", sub: "Công trình đang thi công – Cấm vào khi không có nhiệm vụ", top: "CHỦ ĐẦU TƯ: CÔNG TY CỔ PHẦN PHÁT TRIỂN ĐÔ THỊ", bg: "#ffffff", bg2: "#e8eef4", fg: "#1d4f9c", kind: "vinyl", ar: 10 }), gx + 0.12, 1.9, 90);
  for (const z of [z0, z1]) { sb(x1 - x0, 3.4, 0.15, fence, (x0 + x1) / 2, 1.7, z); solidW(x0, z - 0.3, x1, z + 0.3, 3.4); }
  sb(0.15, 3.4, z1 - z0, fence, x0, 1.7, (z0 + z1) / 2); solidW(x0 - 0.3, z0, x0 + 0.3, z1, 3.4);
  // khung nhà bê tông 6 tầng đang xây
  const cx = -42, cz = 92, cw = 26, cd = 30, fh = 3.3 * U, beton = mat("concrete2", 0xd8d4cc);
  for (let f = 0; f < 6; f++) {
    const y = f * fh;
    if (f > 0) sb(cw, 0.4, cd, beton, cx, y, cz);
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) sb(0.6, fh, 0.6, beton, cx - cw / 2 + (a * cw) / 4, y + fh / 2, cz - cd / 2 + (b * cd) / 4);
    if (f < 3) for (let k = 0; k < 4; k++) sb(cw / 4 - 0.6, fh * 0.9, 0.25, mat("brick"), cx - cw / 2 + cw / 8 + (k * cw) / 4, y + fh * 0.45, cz - cd / 2);
  }
  for (let k = 0; k < 4; k++) sc(0.04, 0.04, 2.5, M(0x6a4a3a, 0.6, 0.5), cx - cw / 2 + (k * cw) / 4, 6 * fh, cz - cd / 2, { seg: 4, shadow: false, detail: true }); // thép chờ
  solidW(cx - cw / 2 - 0.3, cz - cd / 2 - 0.3, cx + cw / 2 + 0.3, cz + cd / 2 + 0.3, 30);
  // giàn giáo + lưới xanh mặt trước
  const tube = M(0x8a8e92, 0.4, 0.8);
  for (let x = cx - cw / 2; x <= cx + cw / 2; x += 2.2) sb(0.08, 6 * fh, 0.08, tube, x, 3 * fh, cz - cd / 2 - 1.4, { shadow: false, detail: true });
  for (let y = 2; y < 6 * fh; y += 2.4) sb(cw, 0.08, 0.08, tube, cx, y, cz - cd / 2 - 1.4, { shadow: false, detail: true });
  sb(cw * 0.5, 6 * fh * 0.7, 0.05, new T.MeshStandardMaterial({ color: lin(0x2a8a4a), transparent: true, opacity: 0.55, side: T.DoubleSide, roughness: 1 }), cx + cw * 0.22, 6 * fh * 0.4, cz - cd / 2 - 1.5, { shadow: false });
  // cần cẩu tháp
  const yel = M(0xe0a81b, 0.45, 0.4), ch = 40, kx = -24, kz = 106;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) sb(0.25, ch, 0.25, yel, kx + a * 0.9, ch / 2, kz + b * 0.9);
  for (let y = 2; y < ch; y += 2.2) { sb(1.9, 0.12, 0.12, yel, kx, y, kz - 0.9, { detail: true }); sb(1.9, 0.12, 0.12, yel, kx, y, kz + 0.9, { detail: true }); }
  sb(36, 1.0, 1.0, yel, kx - 8, ch + 0.5, kz); sb(2.2, 2.2, 2.2, mat("glass", 0xe0e8f0), kx + 1.6, ch - 1, kz);
  sb(4, 2.4, 2.4, M(0x6a6a6a, 0.8), kx + 8, ch - 0.7, kz); sb(0.04, 14, 0.04, M(0x222222), kx - 18, ch - 7, kz, { shadow: false });
  sb(1.6, 1.0, 1.6, mat("wood", 0xb08050), kx - 18, ch - 14.5, kz);
  solidW(kx - 1.2, kz - 1.2, kx + 1.2, kz + 1.2, ch);
  // vật liệu xây dựng
  for (let k = 0; k < 14; k++) prop("cement", -30 + (k % 4) * 0.9, 0.05 + Math.floor(k / 4) * 0.3, 60 + (k % 2) * 0.1, (k % 2) * 0.1);
  solidW(-30.6, 59.3, -26.8, 60.8, 1.2);
  for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) sb(1.8, 0.6, 0.9, mat("brick"), -50 + k * 2, 0.3 + j * 0.6, 64, { detail: true });
  solidW(-51, 63.4, -44, 64.6, 2.4);
  prop("ladder", -36, 0.05, 72, 0.4); prop("handtruck", -33, 0.05, 66, 1.2); prop("wcrate", -40, 0.05, 70, 0.2);
  // cầu thang giàn giáo 2 đợt lên sàn cao (bậc 0.45, mỗi bậc là 1 hộp đi lên được)
  const stepH = 0.45, nSteps = 10, run = 0.8, wood = mat("wood", 0xc8a070);
  const flight = (xa, dir, zA, zB, y0) => {
    for (let k = 0; k < nSteps; k++) {
      const xs = xa + dir * (k + 0.5) * run, top = y0 + (k + 1) * stepH;
      sb(run, 0.12, zB - zA, wood, xs, top - 0.06, (zA + zB) / 2);
      SOLID.push({ x0: xs - run / 2, x1: xs + run / 2, z0: zA, z1: zB, top, bot: top - 0.5 });
    }
    for (const z of [zA, zB]) {
      const g = new T.CylinderGeometry(0.04, 0.04, Math.hypot(nSteps * run, nSteps * stepH), 5);
      sm(g, tube, xa + (dir * nSteps * run) / 2, y0 + (nSteps * stepH) / 2 + 1.1, z, { rz: dir * (Math.PI / 2 - Math.atan2(stepH, run)), shadow: false });
    }
  };
  const landing = (xa, xb, zA, zB, top) => {
    sb(xb - xa, 0.2, zB - zA, wood, (xa + xb) / 2, top - 0.1, (zA + zB) / 2);
    SOLID.push({ x0: xa, x1: xb, z0: zA, z1: zB, top, bot: top - 0.5 });
    for (const [x, z] of [[xa, zA], [xb, zA], [xa, zB], [xb, zB]]) sb(0.1, top, 0.1, tube, x, top / 2, z, { shadow: false });
  };
  flight(-16, -1, 62, 64.6, 0);          // đợt 1: đi về phía tây, lên 4.5
  landing(-27, -24, 62, 67.6, 4.5);      // chiếu nghỉ
  flight(-24, 1, 65, 67.6, 4.5);          // đợt 2: quay lại phía đông, lên 9
  landing(-16, -11.8, 62, 67.6, STAIR_TOP); // sàn trên cùng (có rương)
  // lan can sàn trên
  for (const z of [62, 67.6]) sb(4.2, 0.06, 0.06, tube, -13.9, STAIR_TOP + 1.1, z, { shadow: false });
  sb(0.06, 0.06, 5.6, tube, -11.8, STAIR_TOP + 1.1, 64.8, { shadow: false });
  SOLID.push({ x0: -12.1, x1: -11.6, z0: 62, z1: 67.6, top: STAIR_TOP + 1.2, bot: STAIR_TOP - 0.1 });
}

// ============================================================
//  RUỘNG VEN ĐÔ (phía tây nam): ruộng lúa nước + ruộng của người chơi + chòi
// ============================================================
let RICE = null, RICE_MAX = 0;
{
  const x0 = -118, x1 = -60, z0 = 13, z1 = 72;
  const gr = new T.PlaneGeometry(x1 - x0, z1 - z0); gr.rotateX(-Math.PI / 2);
  uvScale(gr, (x1 - x0) / 4, (z1 - z0) / 4);
  sm(gr, mat("grass"), (x0 + x1) / 2, 0.02, (z0 + z1) / 2, { shadow: false });
  // bờ rào tre / lưới B40 quanh ruộng (trừ lối vào từ vỉa hè)
  for (const [a, b] of [[x0, -78], [-70, x1]]) { for (let x = a; x < b; x += 2.5) sb(0.1, 1.4, 0.1, mat("wood", 0x8a6a4a), x, 0.7, z0 + 0.3, { detail: true }); sb(b - a, 0.06, 0.06, M(0x7a7a72, 0.6, 0.5), (a + b) / 2, 1.2, z0 + 0.3, { shadow: false }); solidW(a, z0, b, z0 + 0.6, 1.4); }
  solidW(x0, z1 - 0.3, x1, z1 + 0.3, 3); solidW(x1 - 0.3, z0, x1 + 0.3, z1, 3); solidW(x0 - 0.3, z0, x0 + 0.3, z1, 3);
  sb(x1 - x0, 2.4, 0.3, mat("damaged"), (x0 + x1) / 2, 1.2, z1); sb(0.3, 2.4, z1 - z0, mat("damaged"), x1, 1.2, (z0 + z1) / 2);
  // ruộng lúa nước có bờ đất
  const water = mat("water");
  for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) {
    const px = -108 + j * 17, pz = 36 + k * 11;
    sb(15, 0.06, 9.4, water, px, 0.05, pz, { shadow: false });
    for (const s of [-1, 1]) { sb(15.6, 0.35, 0.5, mat("soil"), px, 0.17, pz + s * 4.95, { shadow: false }); sb(0.5, 0.35, 10, mat("soil"), px + s * 7.75, 0.17, pz, { shadow: false }); }
  }
  // lúa: khóm = 3 tấm lá alpha bắt chéo (InstancedMesh, lắc theo gió)
  const it = [];
  for (let k = 0; k < 3; k++) { const pg = new T.PlaneGeometry(0.75, 1.5); pg.translate(0, 0.75, 0); it.push({ g: pg, m: mtx(0, 0, 0, 0, (k / 3) * Math.PI, 0) }); }
  const g = mergeGeos(it);
  const m = addSway(new T.MeshStandardMaterial({ map: TX.riceCard(false), color: lin(0x8fc85a), alphaTest: 0.45, side: T.DoubleSide, roughness: 0.8 }), 0.05);
  const pts = [];
  for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) for (let ix = 0; ix < 26; ix++) for (let iz = 0; iz < 15; iz++)
    pts.push([-108 + j * 17 - 7 + ix * 0.55 + (TX.hash(ix, iz, k) - 0.5) * 0.2, 36 + k * 11 - 4.3 + iz * 0.6 + (TX.hash(iz, ix, k + j) - 0.5) * 0.2, TX.hash(ix + j * 50, iz, 77 + k)]);
  pts.sort((a, b) => a[2] - b[2]);
  RICE = new T.InstancedMesh(g, m, pts.length);
  const d = new T.Object3D();
  pts.forEach((p, k) => { d.position.set(p[0], 0.06, p[1]); d.rotation.y = p[2] * 6.28; d.scale.setScalar(0.85 + p[2] * 0.3); d.updateMatrix(); RICE.setMatrixAt(k, d.matrix); });
  RICE.frustumCulled = false; RICE.castShadow = false; RICE.receiveShadow = true;
  RICE_MAX = pts.length;
  scene.add(RICE);
  // chòi canh ruộng + chuối ven bờ
  const hx = -72, hz = 50;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) sb(0.18, 3.6, 0.18, mat("wood", 0x8a6a4a), hx + a * 2, 1.8, hz + b * 1.6);
  sb(5, 0.2, 4, mat("wood"), hx, 1.2, hz);
  sm(hipRoof(5.6, 4.6, 1.8), mat("tin_rust", 0xd0c0a8), hx, 3.6, hz);
  for (let k = 0; k < 8; k++) tree(-116 + k * 6.5, 0.02, 70, "banana", rr(0.9, 1.2));
  for (let k = 0; k < 4; k++) tree(-62.5, 0.02, 30 + k * 10, "banana", rr(0.9, 1.2));
  propL(ST, "basket", -74, 0.02, 18, 0.3); propL(ST, "jerry", -75, 0.02, 25, 1);
}

// ---------- Ruộng của người chơi (logic gốc: gieo – lớn – thu hoạch) ----------
const plots = [];
const CROP_GEO = (() => { // khóm lúa: 4 tấm lá alpha bắt chéo (bông lúa vẽ sẵn, tô màu xanh / vàng)
  const it = [];
  for (let k = 0; k < 4; k++) { const pg = new T.PlaneGeometry(1.1, 1.9); pg.translate(0, 0.95 - 0.6, 0); it.push({ g: pg, m: mtx(0, 0, 0, 0, (k / 4) * Math.PI, 0) }); }
  return mergeGeos(it);
})();
const CROP_TEX = TX.riceCard(true);
const CROP_GREEN = lin(0x86c050), CROP_RIPE = lin(0xf0c860);
for (let j = 0; j < 2; j++)
  for (let i = 0; i < 3; i++) {
    const x = -72 + i * 3.2, z = 19 + j * 3.4;
    sb(2.6, 0.22, 2.6, mat("soil", 0xd8c0a8), x, 0.11, z, { shadow: false });
    for (const [sx, sz, w, d] of [[0, -1.35, 2.8, 0.2], [0, 1.35, 2.8, 0.2], [-1.35, 0, 0.2, 2.8], [1.35, 0, 0.2, 2.8]])
      sb(w, 0.3, d, mat("wood", 0x9a7a5a), x + sx, 0.15, z + sz);
    const c = new T.Mesh(CROP_GEO, new T.MeshStandardMaterial({ map: CROP_TEX, color: CROP_GREEN.clone(), alphaTest: 0.45, roughness: 0.8, side: T.DoubleSide }));
    c.position.set(x, 0.8, z);
    c.castShadow = true;
    c.visible = false;
    scene.add(c);
    plots.push({ x, z, c, s: 0, t: 0 });
  }
const GROW = 15;
sb(5, 1.4, 0.05, signMat({ title: "RUỘNG CỦA BẠN", sub: "E: gieo hạt / thu hoạch · bán lúa ở chợ", bg: "#2a6a3a", fg: "#ffffff", kind: "board", ar: 3.6 }), -69, 1.6, 15.5);
for (const s of [-1, 1]) sb(0.1, 2.4, 0.1, mat("wood", 0x6a4a2a), -69 + s * 2.3, 1.2, 15.5);

// ============================================================
//  NPC HỎI ĐÁP (mỗi khu một người) + thương nhân + bà bán hàng + rương
// ============================================================
const ROMAN_ = ["I", "II", "III", "IV", "V", "VI"];
function npc(id, x, z, look) {
  const g = person(Object.assign({ still: true, pose: "talk" }, look));
  g.position.set(x, SW, z);
  // tem giấy lơ lửng: số La Mã của khu; học xong đổi sang tem có dấu đỏ "ĐÃ HỌC"
  const todo = TX.marker(ROMAN_[id], false), done = TX.marker(ROMAN_[id], true);
  const m = new T.Sprite(new T.SpriteMaterial({ map: todo, depthWrite: false }));
  m.scale.set(1.1, 1.1, 1);
  m.position.set(x, SW + 3.9, z);
  scene.add(m);
  fl(m, 0.12, 1.4, 0);
  npcs[id] = { x, y: SW, z, g, m, todo, done };
}
// 6 nhân vật hỏi đáp (hư cấu), mỗi người một kiểu
npc(0, -9, -77, { female: true, hair: "long", aodai: true, dress: "#3a6ab8", skin: 1, shoes: "shoe", shoeC: "#2a2420", sleeve: "long" });        // cô giáo áo dài
npc(1, 30, -20, { female: true, hair: "bun", hat: "non", shirt: "#c86a8a", sleeve: "long", apron: "#4a6a9a", pants: "#2a2a30", skin: 0 }); // bà bán hàng
npc(2, -80, -9, { shirt: "#2f5a9a", collar: "shirt", sleeve: "long", pants: "#2f4a7a", hat: "hard", hatC: "#f0c020", shoes: "shoe", shoeC: "#3a2a1a", beard: true }); // công nhân cơ khí
npc(3, 86, 8.5, { shirt: "#f4f2ee", collar: "shirt", pants: "#2a2c34", glasses: true, shoes: "shoe", shoeC: "#1a1410", skin: 1 });   // chủ cửa hàng
npc(4, 9, 75, { shirt: "#e8e4d4", collar: "shirt", pants: "#4a4a40", hat: "coi", hatC: "#5f6a3a", hair: "buzz", hairC: "#8a8a84", shoes: "sandal", shoeC: "#2a2a2a" }); // ông cán bộ mũ cối
npc(5, -9, 70, { shirt: "#f08a2a", print: "AN TOÀN", printC: "#fff", pants: "#2a3a5a", hat: "hard", hatC: "#f4f4f0", shoes: "shoe", shoeC: "#3a2a1a", skin: 0 }); // kỹ sư công trường

const merch = person({ female: true, hair: "bun", hat: "non", shirt: "#8e4a8a", sleeve: "long", pants: "#2a2a30", apron: "#b88a38", still: true });
merch.position.set(SH.x, 0.2, SH.z - 1.4);
const vill = person({ female: true, hair: "bun", hat: "non", shirt: "#4a8a5a", sleeve: "long", pants: "#2a2a30", skin: 1, pose: "walk" });
const CH = { x: -14, y: STAIR_TOP, z: 64.8 };
const chest = new T.Group(); // rương gỗ cũ có quai đồng (model Poly Haven), đặt yên trên sàn giàn giáo
chest.position.set(CH.x, CH.y, CH.z); chest.rotation.y = 0.5;
scene.add(chest);
new T.GLTFLoader(LOADMGR).load("assets/models/wooden_crate_01/wooden_crate_01.gltf", (g) => {
  g.scene.scale.setScalar(U * 1.25);
  g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  chest.add(g.scene);
});
const hero = personBox({ shirt: "#4d6f9a" });
shadowOnly(hero); // góc nhìn thứ nhất: người chơi vô hình nhưng vẫn có bóng

// ============================================================
//  HIỆU ỨNG ĐỘNG: cờ bay, khói, mây
// ============================================================
const FLAG = (() => {
  const g = new T.PlaneGeometry(2.2, 1.4, 12, 6);
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ map: TX.flag(), roughness: 0.7, side: T.DoubleSide }));
  m.position.copy(FLAG_POS);
  m.castShadow = true;
  scene.add(m);
  return { m, base: Float32Array.from(g.attributes.position.array) };
})();
const SMOKE = [];
{
  const st = TX.soft("smoke");
  const srcs = [[-93, 18.6, -45, 6], [44, 2.2, -16, 3]]; // ống khói xưởng, bếp quán trong chợ
  srcs.forEach(([x, y, z, n], si) => {
    for (let k = 0; k < n; k++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: st, color: lin(si ? 0xe8e8e8 : 0xb8b8b8), transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { x, y, z, t: k / n, k: si ? k * 2 + 1 : k * 2, small: !!si };
      scene.add(s);
      SMOKE.push(s);
    }
  });
}
const CLOUDS = [];
{
  const ct = TX.soft("cloud");
  for (let i = 0; i < 14; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.85, fog: false }));
    const sz = (5 + Math.random() * 5) * 9;
    s.scale.set(sz, sz * 0.45, 1);
    s.position.set((Math.random() - 0.5) * 500, 80 + Math.random() * 40, (Math.random() - 0.5) * 500);
    s.userData.v = 0.6 + Math.random() * 0.8;
    scene.add(s);
    CLOUDS.push(s);
  }
}

// ============================================================
//  HOÀN TẤT: dựng cây, gộp mesh tĩnh theo ô lưới, nạp model GLTF
// ============================================================
buildTrees();
const BATCH_STATS = finalizeStatic((x, z) => {
  const cs = 60, ix = Math.floor(x / cs), iz = Math.floor(z / cs);
  return { id: ix + "_" + iz, x: (ix + 0.5) * cs, z: (iz + 0.5) * cs };
});
loadModels(() => { $("load").style.opacity = 0; setTimeout(() => ($("load").style.display = "none"), 600); });
