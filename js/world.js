// ============================================================
//  THẾ GIỚI: 6 hòn đảo + cầu + chủ đề từng đảo + NPC + ruộng + rương
//  Vị trí, bán kính, độ cao đảo, cầu, NPC, ruộng, quầy, rương giữ NGUYÊN như bản gốc
//  (va chạm / tương tác không đổi). Chỉ phần hình ảnh được làm lại.
// ============================================================
const isl = [], bridges = [], floaters = [], byId = [], npcs = [];

// ---------- Cây (gom lại để vẽ bằng InstancedMesh) ----------
const TREES = [];
const NO_TREE = [ // [x0,x1,z0,z1] – chỗ có nhà, không trồng cây
  [12.3, 18.8, -2.4, 7.8], [8.6, 13.4, 11.4, 14.6], [-8.2, -3.8, -16.6, -13.4],   // đảo chợ
  [61, 70.8, 0, 5.8], [60.2, 69.9, -10, -1.8],                                     // đảo Việt Nam
  [7.6, 14.4, 46.6, 51.4],                                                           // nhà kho cảng
];
function tree(x, y, z, kind) {
  for (const b of NO_TREE) if (x > b[0] && x < b[1] && z > b[2] && z < b[3]) return;
  TREES.push({ x, y, z, k: kind, s: 0.85 + Math.random() * 0.35, r: Math.random() * 6.28 });
}

// Đá lơ lửng có bề mặt gồ ghề
function rockGeo(size, seed) {
  const g = new T.DodecahedronGeometry(size, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (TX.hash(Math.round(p.getX(i) * 50), Math.round(p.getY(i) * 50), Math.round(p.getZ(i) * 50) + seed) - 0.5) * 0.45;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return uvScale(g, 0.5, 0.5);
}
// Khối đá hình nón dưới đảo, bề mặt méo tự nhiên
function islandRock(r, h, seed) {
  const segs = 28, rings = 7, g = new T.ConeGeometry(r, h, segs, rings, true), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ring = Math.round(((y + h / 2) / h) * rings); // 0 = mép trên (nối với viền đảo)
    if (ring == 0) continue;
    const seg = Math.round(((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * segs) % segs;
    const k = 1 + (TX.hash(seg, ring, seed) - 0.5) * 0.5;
    p.setXYZ(i, x * k, y + (TX.hash(seg, ring, seed + 9) - 0.5) * 0.6, z * k);
  }
  g.computeVertexNormals();
  g.rotateX(Math.PI);
  return uvScale(g, (Math.PI * 2 * r) / 9, h / 9);
}

function island(x, y, z, r, n, id, col) {
  const paved = id == 2 || id == 3 || id == 5;
  const topM = paved ? mat("concrete", id == 3 ? 0xdfe2e4 : 0xcfcac0) : mat("grass", id == 0 ? 0xf4f6e2 : 0xffffff);
  const disc = new T.CircleGeometry(r, 56); disc.rotateX(-Math.PI / 2);
  uvScale(disc, (2 * r) / topM.userData.tile, (2 * r) / topM.userData.tile);
  sm(disc, topM, x, y, z, { shadow: false });
  if (paved) { // viền cỏ quanh đảo lát bê tông
    const ring = new T.RingGeometry(r - 1.6, r, 56, 1); ring.rotateX(-Math.PI / 2);
    sm(uvScale(ring, r / 3, r / 3), mat("grass"), x, y + 0.015, z, { shadow: false });
  }
  const rim = new T.CylinderGeometry(r, r * 0.96, 1.2, 56, 1, true);
  sm(uvScale(rim, (Math.PI * 2 * r) / 3, 0.4), mat("soil"), x, y - 0.6, z, { shadow: false });
  sm(islandRock(r * 0.96, r * 1.3, id * 31 + 7), mat("rock"), x, y - 1.2 - r * 0.65, z, { shadow: false });
  const o = { x, y, z, r, id };
  isl.push(o);
  byId[id] = o;
  const kinds = id == 4 ? ["palm", "banana"] : id == 1 ? ["bang", "palm", "bang"] : ["bang"];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, d = r * (0.8 + Math.random() * 0.12);
    tree(x + Math.cos(a) * d, y, z + Math.sin(a) * d, kinds[i % kinds.length]);
  }
  for (let i = 0; i < 3; i++) { // đá nhỏ lơ lửng
    const k = new T.Mesh(rockGeo(0.6 + Math.random(), id * 3 + i), mat("rock"));
    k.position.set(x + (Math.random() - 0.5) * r * 3, y - 4 - Math.random() * 5, z + (Math.random() - 0.5) * r * 3);
    scene.add(k);
    floaters.push({ m: k, y0: k.position.y, s: 1, p: i, a: 0.5, r: 0.3 });
  }
}
const fl = (m, a, s, r) => floaters.push({ m, y0: m.position.y, s: s || 1.5, p: Math.random() * 6, a: a || 0.3, r: r || 0 });

//        x    y   z   r  cây id  màu   (giữ nguyên bản gốc)
island(0, 0, 0, 20, 14, 1);
island(-58, 4, -18, 13, 4, 0, 0xa7c46a);
island(-25, 7, -58, 13, 3, 2, 0x9aa08a);
island(30, 3, -55, 13, 2, 3, 0xb4bcc4);
island(60, 6, -2, 13, 4, 4, 0x7fcf5a);
island(8, 7, 58, 14, 2, 5, 0xc9c6b0);

// ---------- Cầu gỗ (logic va chạm giữ nguyên) ----------
function bridge(a, b) {
  const A = byId[a], B = byId[b], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const sx = A.x + ux * (A.r - 1.5), sz = A.z + uz * (A.r - 1.5), ex = B.x - ux * (B.r - 1.5), ez = B.z - uz * (B.r - 1.5);
  const len = Math.hypot(ex - sx, ez - sz);
  bridges.push({ sx, sz, ux, uz, len, ya: A.y, yb: B.y, w: 2.2 });
  const g = new T.Group();
  g.rotation.order = "YXZ";
  g.position.set((sx + ex) / 2, (A.y + B.y) / 2 - 0.15, (sz + ez) / 2);
  g.rotation.y = Math.atan2(ux, uz);
  g.rotation.x = -Math.atan((B.y - A.y) / len);
  ST.add(g);
  const plank = mat("wood"), beam = mat("wood", 0x8a6a52), post = M(0x5a3e26, 0.9);
  sb(4.4, 0.3, len, plank, 0, 0, 0, { p: g });
  sb(0.35, 0.45, len, beam, -1.7, -0.36, 0, { p: g });
  sb(0.35, 0.45, len, beam, 1.7, -0.36, 0, { p: g });
  const np = Math.max(2, Math.round(len / 2.4));
  for (let i = 0; i <= np; i++) {
    const zz = -len / 2 + (i * len) / np;
    for (const s of [-2.12, 2.12]) sb(0.16, 1.2, 0.16, post, s, 0.7, zz, { p: g });
  }
  for (const s of [-2.12, 2.12]) {
    sb(0.12, 0.12, len, post, s, 1.28, 0, { p: g });
    sb(0.05, 0.05, len, M(0xb8a27a, 0.95), s, 0.75, 0, { p: g, shadow: false, detail: true }); // dây thừng
  }
}
[[1, 0], [1, 2], [1, 3], [1, 4], [1, 5], [0, 2], [2, 3], [3, 4], [4, 5]].forEach((p) => bridge(p[0], p[1]));

// ============================================================
//  CHỦ ĐỀ TỪNG ĐẢO
// ============================================================
{ // 0 Tri thức: thư viện cổ kiểu đình/văn miếu, tháp bút
  const o = byId[0], x = o.x, y = o.y, z = o.z;
  const stone = mat("concrete", 0xece2cc), lacquer = M(0x8e2618, 0.45), woodD = mat("wood", 0x6a4630);
  sb(10, 0.3, 8, stone, x, y + 0.15, z);
  sb(3.2, 0.15, 0.9, stone, x, y + 0.075, z + 4.4);
  for (const a of [-4.5, 4.5]) for (const b of [-3, 3]) {
    sb(0.95, 0.3, 0.95, stone, x + a, y + 0.45, z + b);
    sc(0.3, 0.34, 4.3, lacquer, x + a, y + 0.6, z + b, { seg: 14 });
  }
  for (const b of [-3, 3]) sb(10.2, 0.36, 0.36, woodD, x, y + 4.75, z + b);
  for (const a of [-4.5, 4.5]) sb(0.36, 0.36, 6.4, woodD, x + a, y + 4.75, z);
  sm(hipRoof(11.8, 9.8, 2.7), mat("roof"), x, y + 4.93, z);
  sb(2.6, 0.3, 0.3, mat("roof", 0xa86858), x, y + 7.65, z);
  for (const s of [-1, 1]) sm(new T.ConeGeometry(0.16, 0.9, 6), mat("roof", 0xa86858), x + s * 1.35, y + 7.95, z, { rz: -s * 0.5 });
  for (const a of [-1, 1]) for (const b of [-1, 1]) // đầu đao cong vút
    sm(new T.ConeGeometry(0.1, 0.7, 6), mat("roof", 0xa86858), x + a * 5.9, y + 5.2, z + b * 4.9, { rx: b * 0.45, rz: -a * 0.45 });
  // giá sách
  const shelf = mat("wood", 0x5a3a24);
  for (let k = 0; k < 4; k++) {
    const sx = x - 3 + k * 2, sz = z - 3;
    sb(1.6, 2.6, 0.6, shelf, sx, y + 1.6, sz);
    for (let r = 0; r < 3; r++) for (let b = 0; b < 6; b++)
      sb(0.2, 0.55 + TX.hash(k, r * 7 + b, 3) * 0.15, 0.4, [0x8a3a2a, 0x2f5a8a, 0x4a7a3a, 0x9a6a2a, 0xd8c8a0][(k + r + b) % 5], sx - 0.55 + b * 0.22, y + 0.65 + r * 0.8, sz + 0.12, { detail: true, shadow: false });
  }
  // án thư + bồ đoàn
  sb(2.2, 0.12, 1.0, mat("wood", 0x6a3a22), x, y + 1.0, z + 0.5);
  sb(2.0, 0.6, 0.8, mat("wood", 0x5a3020), x, y + 0.6, z + 0.5);
  // tháp bút đá
  const tw = new T.CylinderGeometry(0.4, 1.35, 9, 4, 1); tw.rotateY(Math.PI / 4);
  sm(uvScale(tw, 2, 3), mat("concrete", 0xd6ccba), x + 8, y + 4.5, z + 4);
  sm(new T.ConeGeometry(0.42, 1.4, 12), mat("concrete", 0xcfc4b0), x + 8, y + 9.7, z + 4);
  // chum gốm
  const jar = new T.LatheGeometry([[0, 0], [0.4, 0.04], [0.6, 0.4], [0.55, 0.8], [0.38, 0.95], [0.4, 1]].map((p) => new T.Vector2(p[0], p[1])), 16);
  sm(jar, M(0x6e4a2a, 0.3), x - 8, y, z + 4, { s: 2 });
  sm(jar, M(0x5a6a5a, 0.3), x - 9.5, y, z - 3, { s: 1.2 });
  // sách bay lơ lửng (giữ nguyên chuyển động gốc)
  for (let k = 0; k < 5; k++) {
    const b = colorMesh([[BG(0.9, 0.15, 0.7), [0xe05a4a, 0x4a8ae0, 0xe0c04a][k % 3], mtx(0, 0, 0)], [BG(0.82, 0.11, 0.64), 0xf4efe0, mtx(0.05, 0, 0)]]);
    b.position.set(x - 4 + k * 2, y + 7, z + (k % 2) * 2);
    scene.add(b);
    fl(b, 0.4, 1.5, 1.5);
  }
}

// ---------- 1 Chợ (đảo trung tâm) ----------
stall(6, 0, 13, 0xd9503f, "HOA QUẢ TƯƠI");
stall(11, 0, 13, 0x3f7ad9, "RAU SẠCH");
stall(-6, 0, -15, 0xe0b030, "GẠO – NGŨ CỐC");
stool(7.5, 0, 11.2); stool(4.4, 0, 11.4, 0x2f6ad9); stool(-4.6, 0, -13.2);
// dãy nhà ống phía đông + vỉa hè + cột điện
const H1 = tubeHouse({ x: 15.6, y: 0, z: 0.4, ry: -Math.PI / 2, floors: 3, color: FACADE[0], sign: ["TẠP HÓA MINH ANH", "Bia – Nước ngọt – Bánh kẹo", "#c8231f", "#ffe14a"] });
const H2 = tubeHouse({ x: 15.6, y: 0, z: 4.9, ry: -Math.PI / 2, floors: 2, color: FACADE[1], roof: "tin", sign: ["PHỞ BÒ GIA TRUYỀN", "Phở tái – chín – bò viên", "#1d4f9c", "#ffffff"] });
sb(2.6, 0.06, 9.4, mat("paving"), 11.55, 0.03, 2.65, { shadow: false });
sb(0.25, 0.18, 9.4, mat("concrete", 0xbab6ae), 10.18, 0.09, 2.65, { shadow: false });
{
  const PA = pole(10.6, 0, -2.6, 9.5, Math.PI / 2), PB = pole(10.6, 0, 8.2, 9.5, Math.PI / 2);
  cables(PA, PB);
  cable(PA[0], H1.attach, 0.3); cable(PB[2], H2.attach, 0.3);
  cable(PA[1], new T.Vector3(9, 3.2, -4), 0.5); // dây kéo sang quầy thương nhân
}
motorbike(11.3, 0, 1.6, 0.4, 0xb0202a);
motorbike(11.6, 0, 5.8, -0.3, 0x24467a);
teaCorner(11.4, 0, 3.7);

{ // 2 Sản xuất: nhà máy
  const o = byId[2], x = o.x, y = o.y, z = o.z;
  sb(10.4, 0.6, 6.4, mat("concrete", 0xa8a49c), x, y + 0.3, z - 2);
  sb(10, 5, 6, mat("tin", 0xa3adb8), x, y + 2.5, z - 2);
  sb(11, 0.5, 7, mat("tin", 0x56606c), x, y + 5.2, z - 2);
  for (const k of [-3.5, 0, 3.5]) sb(1.8, 0.6, 5, mat("glass", 0x9ab0c0), x + k, y + 5.7, z - 2);
  sb(8.6, 0.9, 0.05, mat("glass", 0x8fa4b4), x, y + 3.6, z + 1.03);
  sb(2.8, 3.3, 0.1, mat("tin", 0x6c7884), x + 2.6, y + 1.65, z + 1.05);
  sb(3.2, 0.7, 0.12, signMat("NHÀ MÁY SẢN XUẤT", "", "#244a7a", "#ffffff"), x - 2.4, y + 2.4, z + 1.08);
  for (const a of [-3, 3]) {
    sc(0.5, 0.7, 8, mat("brick"), x + a, y + 5, z - 2, { seg: 14 });
    sc(0.56, 0.56, 0.35, M(0x3a3a3a), x + a, y + 12.2, z - 2, { seg: 14 });
    sc(0.62, 0.62, 0.3, M(0xd8d8d8), x + a, y + 10.2, z - 2, { seg: 14 });
  }
  // bánh răng quay (giữ chuyển động gốc)
  const gear = (R, c) => {
    const it = [{ g: new T.CylinderGeometry(R * 0.82, R * 0.82, 0.5, 20), m: mtx(0, 0, 0) }, { g: new T.CylinderGeometry(R * 0.25, R * 0.25, 0.7, 12), m: mtx(0, 0, 0) }];
    const nT = Math.round(R * 7);
    for (let k = 0; k < nT; k++) { const a = (k / nT) * Math.PI * 2; it.push({ g: BG(0.38, 0.5, 0.42), m: mtx(Math.cos(a) * R * 0.88, 0, Math.sin(a) * R * 0.88, 0, -a, 0) }); }
    const m = new T.Mesh(mergeGeos(it), M(c, 0.35, 0.8)); m.castShadow = true; m.receiveShadow = true; return m;
  };
  const g1 = gear(1.8, 0xd9a21b); g1.position.set(x - 7, y + 0.25, z + 4); scene.add(g1); fl(g1, 0, 1, 1.2);
  const g2 = gear(1.2, 0xe0762a); g2.position.set(x - 4.5, y + 0.25, z + 6); scene.add(g2); fl(g2, 0, 1, -1.8);
  // băng chuyền + thùng hàng
  sb(9, 0.25, 1.4, M(0x22262c, 0.9), x + 1, y + 0.82, z + 3);
  sb(9.2, 0.18, 0.12, mat("metal", 0x9a9fa6), x + 1, y + 0.82, z + 2.3);
  sb(9.2, 0.18, 0.12, mat("metal", 0x9a9fa6), x + 1, y + 0.82, z + 3.7);
  for (let k = 0; k < 6; k++) for (const s of [2.3, 3.7]) sb(0.12, 0.7, 0.12, mat("metal", 0x6a7078), x - 3.2 + k * 1.7, y + 0.35, z + s);
  for (let k = 0; k < 3; k++) sb(1.6, 1.6, 1.6, mat("wood", 0xe09060), x - 3 + k * 3.5, y + 1.75, z + 3);
  // thùng phuy, pallet
  for (let k = 0; k < 4; k++) sc(0.4, 0.4, 1.2, M([0x2f5a9a, 0x2f5a9a, 0xb03a2a, 0x2f5a9a][k], 0.5, 0.4), x + 5.8 + (k % 2) * 0.85, y, z + 1.6 + (k > 1 ? 0.85 : 0), { detail: true, seg: 12 });
  sb(1.6, 0.18, 1.2, mat("wood", 0xb89a70), x - 5.8, y + 0.09, z - 4.6, { detail: true });
}

{ // 3 Cạnh tranh: khu doanh nghiệp (tòa nhà kính)
  const o = byId[3], x = o.x, y = o.y, z = o.z;
  const tower = (w, h, d, tx, tz, tint, label, bg) => {
    sb(w, h, d, mat("glass", tint), tx, y + h / 2, tz);
    sb(w + 0.3, 0.5, d + 0.3, mat("concrete", 0xd8d8d4), tx, y + h + 0.25, tz);
    sb(w + 0.4, 1.6, d + 0.4, mat("concrete", 0xc4c2bc), tx, y + 0.8, tz);
    sb(0.8, 0.5, 0.6, M(0xdedede, 0.5), tx - w * 0.2, y + h + 0.75, tz, { detail: true });
    if (label) {
      sb(w * 0.9, 0.8, 0.1, signMat(label, "", bg, "#ffffff"), tx, y + h - 0.8, tz + d / 2 + 0.06);
      sc(0.04, 0.04, 2.4, M(0xcccccc, 0.3, 0.8), tx + w * 0.25, y + h + 0.5, tz, { detail: true, seg: 5 });
    }
  };
  tower(3, 18, 3, x - 2.5, z, 0xff9a8a, "CÔNG TY A", "#b8261c");
  tower(3, 16, 3, x + 2.5, z, 0x9ab8ff, "CÔNG TY B", "#1d4f9c");
  [9, 14, 7, 12, 16, 8].forEach((h, k) => {
    const a = (k / 6) * 6.28 + 0.5;
    tower(2.6, h, 2.6, x + Math.cos(a) * 8, z + Math.sin(a) * 8, [0xc0d4e0, 0xa8c0d0, 0xd4e0ea][k % 3]);
  });
  sb(5, 0.2, 5, mat("paving", 0xd8d4d0), x, y + 0.1, z + 5, { shadow: false });
  sc(1.1, 1.2, 0.5, mat("concrete", 0xe0dcd4), x, y + 0.2, z + 5, { seg: 20 });
  sc(0.9, 0.9, 0.06, mat("water", 0x9fc8d8), x, y + 0.66, z + 5, { seg: 20, shadow: false });
  for (const s of [-1.9, 1.9]) sb(1.6, 0.4, 0.5, mat("wood", 0x9a7050), x + s, y + 0.4, z + 7, { detail: true });
}

{ // 4 Việt Nam: làng quê (ruộng lúa, nhà cấp 4) + phố (nhà ống, cột điện, cờ đỏ sao vàng)
  const o = byId[4], x = o.x, y = o.y, z = o.z;
  // ruộng lúa nước có bờ
  for (let k = 0; k < 3; k++) {
    const pz = z - 6 + k * 4.5;
    sb(5, 0.1, 4, mat("water"), x - 6, y + 0.06, pz, { shadow: false });
    sb(5.5, 0.3, 0.35, mat("soil"), x - 6, y + 0.15, pz - 2.15, { shadow: false });
    sb(5.5, 0.3, 0.35, mat("soil"), x - 6, y + 0.15, pz + 2.15, { shadow: false });
    sb(0.35, 0.3, 4.3, mat("soil"), x - 8.65, y + 0.15, pz, { shadow: false });
    sb(0.35, 0.3, 4.3, mat("soil"), x - 3.35, y + 0.15, pz, { shadow: false });
  }
  villageHouse(x + 5, y, z - 5, 0);
  tubeHouse({ x: x + 3.6, y, z: z + 4.8, ry: Math.PI, floors: 3, color: FACADE[2], d: 5, sign: ["CÀ PHÊ SÁNG", "Cà phê đen đá – Bạc xỉu", "#3a2a1e", "#ffd45e"] });
  tubeHouse({ x: x + 8.1, y, z: z + 4.8, ry: Math.PI, floors: 2, color: FACADE[4], d: 5, roof: "tin", sign: ["SỬA XE MÁY", "Vá săm – Thay nhớt", "#c8231f", "#ffffff"] });
  sb(9.2, 0.06, 1.6, mat("paving"), x + 5.85, y + 0.03, z + 1.6, { shadow: false });
  const PA = pole(x + 0.9, y, z + 0.9, 9, 0), PB = pole(x + 10.6, y, z + 0.9, 9, 0);
  cables(PA, PB);
  motorbike(x + 6.5, y, z + 1.4, 1.4, 0x1e1e1e);
  teaCorner(x + 2.2, y, z + 1.0);
  // cột cờ (lá cờ là vật động, xem FLAG)
  sc(0.08, 0.11, 7.4, mat("metal", 0xe6e6e6), x - 1, y, z + 5, { seg: 10 });
  sm(new T.SphereGeometry(0.16, 10, 8), M(0xe0b030, 0.3, 0.9), x - 1, y + 7.45, z + 5);
  sc(0.5, 0.6, 0.3, mat("concrete", 0xd0ccc4), x - 1, y, z + 5, { seg: 12 });
}

{ // 5 Tương lai: cảng container + khu công nghiệp
  const o = byId[5], x = o.x, y = o.y, z = o.z;
  const C = [0xc84a3a, 0x3f6ab9, 0xd8a530, 0x3a8a5a];
  for (let k = 0; k < 6; k++) {
    const cx = x - 7.6 + (k % 3) * 4.4, cy = y + 0.9 + (k > 2 ? 1.8 : 0), c = C[k % 4];
    sb(4.2, 1.8, 1.8, mat("tin", c, { tile: 1.6 }), cx, cy, z - 3);
    sb(0.08, 1.7, 1.7, M(c, 0.6, 0.3), cx + 2.12, cy, z - 3);
    for (const s of [-0.4, 0.4]) sb(0.05, 1.6, 0.05, M(0x777777, 0.4, 0.8), cx + 2.17, cy, z - 3 + s, { detail: true, shadow: false });
  }
  // cẩu giàn
  const yel = M(0xe0a81b, 0.45, 0.4);
  for (const s of [-1, 1]) sb(0.45, 9, 0.45, yel, x + 6, y + 4.5, z + 2 + s * 1.2);
  sb(0.5, 0.5, 3, yel, x + 6, y + 9, z + 2);
  sb(9, 0.5, 0.6, yel, x + 3, y + 9.3, z + 2);
  sb(1.4, 1.2, 1.4, mat("glass", 0xe0e8f0), x + 5.4, y + 8.3, z + 2);
  sb(0.05, 3, 0.05, M(0x222222), x + 0.6, y + 7.6, z + 2, { shadow: false });
  sb(0.4, 0.3, 0.4, M(0x333333, 0.4, 0.8), x + 0.6, y + 6.0, z + 2);
  // tàu chở hàng
  sb(9, 1.0, 3, M(0x23364e, 0.55, 0.3), x - 2, y + 1.1, z + 7);
  sb(9, 0.55, 3, M(0x9a2a22, 0.6), x - 2, y + 0.3, z + 7);
  const bow = new T.CylinderGeometry(1.5, 1.5, 1.55, 3); bow.rotateY(Math.PI / 2);
  sm(bow, M(0x23364e, 0.55, 0.3), x + 2.5, y + 0.82, z + 7, { s: 1 });
  sb(9, 0.12, 3, mat("wood", 0x8a7a6a), x - 2, y + 1.66, z + 7);
  sb(2, 2, 2.4, M(0xeeeeee, 0.5), x - 5, y + 2.6, z + 7);
  sb(2.05, 0.4, 2.45, mat("glass", 0x7a8ea0), x - 5, y + 3.2, z + 7);
  sc(0.2, 0.25, 1.2, M(0xc8231f), x - 5.5, y + 3.6, z + 7, { seg: 10 });
  sb(1.6, 1.2, 1.3, mat("tin", 0xc84a3a, { tile: 1.6 }), x, y + 2.2, z + 7);
  sb(1.6, 1.2, 1.3, mat("tin", 0x3f6ab9, { tile: 1.6 }), x + 2, y + 2.2, z + 7);
  // nhà kho + ống khói
  sb(6, 4, 4, mat("tin", 0x8e9caa), x + 3, y + 2, z - 9);
  sb(6.4, 0.3, 4.4, mat("tin", 0x4a6a8a), x + 3, y + 4.1, z - 9);
  sb(2.4, 2.8, 0.08, mat("tin", 0x5a6670), x + 2, y + 1.4, z - 6.96);
  sb(4, 0.6, 0.1, signMat("CẢNG BIỂN – LOGISTICS", "", "#0f5a7a", "#ffffff"), x + 3, y + 3.4, z - 6.94);
  sc(0.45, 0.6, 6, mat("brick"), x + 5, y + 4, z - 9, { seg: 12 });
  // cọc neo tàu & vạch an toàn
  for (let k = 0; k < 4; k++) sc(0.2, 0.25, 0.5, M(0x2a2a2a, 0.5, 0.6), x - 6 + k * 2.6, y, z + 5.1, { seg: 10, detail: true });
  sb(10, 0.02, 0.25, M(0xe8c020, 0.7), x - 2, y + 0.02, z + 4.6, { shadow: false });
}

// ---------- NPC hỏi đáp (giữ nguyên vị trí) ----------
function npc(id, dx, dz, body, opt) {
  const o = byId[id], x = o.x + dx, z = o.z + dz, g = char(body, 0x3a2a1a, 0xc98a3a, Object.assign({ still: true }, opt));
  g.position.set(x, o.y, z);
  const m = new T.Mesh(new T.OctahedronGeometry(0.45), new T.MeshBasicMaterial({ color: lin(0x5fe0ff), toneMapped: false }));
  m.position.set(x, o.y + 3.8, z);
  scene.add(m);
  fl(m, 0.2, 2, 2);
  npcs[id] = { x, y: o.y, z, g, m };
}
npc(0, 0, 6, 0x6a4a9a); npc(1, 0, 13, 0xc0603a, { hat: true }); npc(2, 0, 6.5, 0xd98a2b);
npc(3, 0, 10, 0x3a3f4a); npc(4, -1, 9, 0x4a8a5a, { hat: true }); npc(5, -5, 10, 0x2f6a9a);

// ---------- Biển mây phía dưới (sprite mềm thay cho khối cầu) ----------
const CLOUDS = [];
{
  const ct = TX.soft("cloud");
  for (let i = 0; i < 14; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, opacity: 0.9, fog: true }));
    const sz = (4 + Math.random() * 4) * 5;
    s.scale.set(sz, sz * 0.5, 1);
    s.position.set((Math.random() - 0.5) * 240, -14 + Math.random() * 10, (Math.random() - 0.5) * 240);
    s.userData.v = 0.3 + Math.random() * 0.4;
    scene.add(s);
    CLOUDS.push(s);
  }
}

// ---------- Ruộng của người chơi (logic gốc) ----------
const plots = [];
const CROP_GEO = (() => { // khóm lúa có bông
  const it = [];
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * 6.28, t = 0.12 + (k % 3) * 0.1, h = 1.0 + (k % 4) * 0.08;
    it.push({ g: BG(0.06, h, 0.025), m: mtx(Math.cos(a) * 0.08, h / 2, Math.sin(a) * 0.08, Math.sin(a) * t, 0, -Math.cos(a) * t) });
    if (k % 2 == 0) it.push({ g: new T.SphereGeometry(0.07, 5, 4), m: mtx(Math.cos(a) * (0.1 + h * t), h + 0.05, Math.sin(a) * (0.1 + h * t), 0, 0, 0, 0.8, 2.2, 0.8) });
  }
  const g = mergeGeos(it); g.translate(0, -0.6, 0); return g;
})();
const CROP_GREEN = lin(0x5fae3a), CROP_RIPE = lin(0xe9c34a);
for (let j = 0; j < 2; j++)
  for (let i = 0; i < 3; i++) {
    const x = -11 + i * 3,
      z = 3 + j * 3;
    sb(2.4, 0.2, 2.4, mat("soil", 0xd8c0a8), x, 0.1, z, { shadow: false });
    for (const [sx, sz, w, d] of [[0, -1.25, 2.6, 0.18], [0, 1.25, 2.6, 0.18], [-1.25, 0, 0.18, 2.6], [1.25, 0, 0.18, 2.6]])
      sb(w, 0.28, d, mat("wood", 0x9a7a5a), x + sx, 0.14, z + sz);
    const c = new T.Mesh(CROP_GEO, new T.MeshStandardMaterial({ color: CROP_GREEN.clone(), roughness: 0.75, side: T.DoubleSide }));
    c.position.set(x, 0.8, z);
    c.castShadow = true;
    c.visible = false;
    scene.add(c);
    plots.push({ x, z, c, s: 0, t: 0 });
  }
const GROW = 15;

// ---------- Thương nhân + dân làng + rương ----------
const SH = { x: 9, z: -5 };
{
  sb(3.4, 1, 1.4, mat("wood", 0xb08860), SH.x, 0.5, SH.z);
  sb(3.6, 0.1, 1.6, mat("wood", 0x8a6040), SH.x, 1.05, SH.z);
  sb(3.9, 0.08, 2.4, mat("tin", 0xd9503f, { rough: 0.7, metal: 0.05 }), SH.x, 3.45, SH.z, { rx: 0.12 });
  for (const [sx, sz, h] of [[-1.75, 0.95, 3.3], [1.75, 0.95, 3.3], [-1.75, -0.95, 3.6], [1.75, -0.95, 3.6]]) sb(0.1, h, 0.1, RAIL, SH.x + sx, h / 2, SH.z + sz);
  sb(3.2, 0.6, 0.08, signMat("THU MUA LÚA", "Bán hạt giống – Giá theo thị trường", "#c8231f", "#ffe14a"), SH.x, 2.85, SH.z + 0.98);
  for (let k = 0; k < 4; k++) sm(new T.SphereGeometry(0.42, 10, 8), M(0xa8905e, 0.95), SH.x - 1.4 + k * 0.9, 0.36, SH.z + 1.25, { detail: true });
  sb(0.4, 0.3, 0.4, M(0xc8231f, 0.5), SH.x + 1.1, 1.25, SH.z);   // cân đồng hồ
  sc(0.15, 0.15, 0.04, M(0xf4f4f0, 0.3), SH.x + 1.1, 1.42, SH.z + 0.2, { rx: Math.PI / 2, seg: 12, detail: true });
}
const merch = char(0x8e4a8a, 0x3a2a1a, 0xc98a3a, { still: true });
merch.position.set(SH.x, 0, SH.z - 1.2);
const vill = char(0x4a8a5a, 0x9a6a2a, 0x6b4a2b, { hat: true, pants: 0x2a2a30 });
const CH = { x: byId[5].x + 9, y: byId[5].y, z: byId[5].z - 5 };
const chest = new T.Group();
{
  const body = new T.Mesh(BG(1.2, 0.56, 0.8), mat("wood", 0xd08848, { tile: 1.2 }));
  const lid = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 1.2, 12, 1, false, 0, Math.PI), mat("wood", 0xd08848, { tile: 1.2 }));
  lid.rotation.z = Math.PI / 2; lid.position.y = 0.28;
  const gold = M(0xe6b23a, 0.25, 0.95);
  const bands = new T.Mesh(mergeGeos([{ g: BG(0.1, 0.6, 0.84), m: mtx(-0.4, 0, 0) }, { g: BG(0.1, 0.6, 0.84), m: mtx(0.4, 0, 0) }, { g: BG(0.2, 0.22, 0.06), m: mtx(0, 0.15, 0.42) }]), gold);
  [body, lid, bands].forEach((m) => { m.castShadow = true; chest.add(m); });
  chest.position.set(CH.x, CH.y + 0.4, CH.z);
  scene.add(chest);
}
const hero = char(0x4d6f9a, 0xe8c05a, 0x8a5a32);
shadowOnly(hero); // góc nhìn thứ nhất: người chơi vô hình nhưng vẫn có bóng

// ============================================================
//  CÂY: InstancedMesh (6 draw call cho toàn bộ cây)
// ============================================================
const LEAF = addSway(new T.MeshStandardMaterial({ map: TX.get("leaf").map, color: lin(0xffffff), roughness: 0.8, side: T.DoubleSide, envMapIntensity: 0.5 }), 0.0022);
const BARK = mat("bark");
function frond(len, wid, up, droop, shape) {
  const g = new T.PlaneGeometry(wid, len, 2, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i), yy = p.getY(i) + len / 2, t = yy / len;
    const w = shape == "banana" ? 0.35 + Math.sin(Math.PI * t) * 0.9 : 1 - t * 0.85;
    const fwd = yy * Math.cos(up), h = yy * Math.sin(up) - droop * yy * yy - Math.abs(x0 * w) * 0.35;
    p.setXYZ(i, x0 * w, h, fwd);
  }
  g.computeVertexNormals();
  return g;
}
const TREE_DEF = {
  bang: () => {
    const trunk = [{ g: new T.CylinderGeometry(0.16, 0.3, 3.8, 7), m: mtx(0, 1.9, 0) },
      { g: new T.CylinderGeometry(0.07, 0.13, 1.8, 5), m: mtx(0.45, 3.3, 0, 0, 0, -0.8) },
      { g: new T.CylinderGeometry(0.07, 0.12, 1.6, 5), m: mtx(-0.35, 3.1, 0.2, 0.3, 0, 0.8) }];
    const can = [];
    [[0, 4.6, 0, 1.75], [1.0, 4.1, 0.4, 1.3], [-0.9, 4.2, -0.3, 1.35], [0.1, 5.3, -0.5, 1.2], [-0.3, 4.0, 1.0, 1.15]].forEach(([x, y, z, r], k) => {
      const s = new T.SphereGeometry(1, 9, 7), p = s.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const j = 1 + (TX.hash(Math.round(p.getX(i) * 40), Math.round(p.getY(i) * 40), Math.round(p.getZ(i) * 40) + k) - 0.5) * 0.35;
        p.setXYZ(i, p.getX(i) * j, p.getY(i) * j, p.getZ(i) * j);
      }
      can.push({ g: s, m: mtx(x, y, z, 0, k, 0, r, r * 0.72, r) });
    });
    return [trunk, can];
  },
  palm: () => {
    const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(0.25, 2.6, 0), new T.Vector3(0.7, 5.2, 0), new T.Vector3(1.2, 7.2, 0)]);
    const trunk = [{ g: new T.TubeGeometry(curve, 10, 0.17, 7, false), m: mtx(0, 0, 0) }];
    const can = [];
    for (let k = 0; k < 9; k++) can.push({ g: frond(3.3, 0.75, 0.55, 0.17), m: mtx(1.2, 7.1, 0, 0, (k / 9) * 6.28, 0) });
    for (let k = 0; k < 3; k++) can.push({ g: new T.SphereGeometry(0.2, 7, 5), m: mtx(1.2 + Math.cos(k * 2) * 0.25, 6.85, Math.sin(k * 2) * 0.25) });
    return [trunk, can];
  },
  banana: () => {
    const trunk = [{ g: new T.CylinderGeometry(0.15, 0.24, 2.3, 8), m: mtx(0, 1.15, 0) }];
    const can = [];
    for (let k = 0; k < 7; k++) can.push({ g: frond(2.5, 0.95, 0.95, 0.24, "banana"), m: mtx(0, 2.2, 0, 0, (k / 7) * 6.28 + k * 0.3, 0) });
    return [trunk, can];
  },
};
function buildTrees() {
  const im = new T.Object3D();
  for (const kind in TREE_DEF) {
    const list = TREES.filter((t) => t.k == kind);
    if (!list.length) continue;
    const [tr, ca] = TREE_DEF[kind]();
    for (const [items, m] of [[tr, BARK], [ca, LEAF]]) {
      const g = mergeGeos(items);
      items.forEach((i) => i.g.dispose());
      const I = new T.InstancedMesh(g, m, list.length);
      list.forEach((t, k) => { im.position.set(t.x, t.y, t.z); im.rotation.set(0, t.r, 0); im.scale.setScalar(t.s); im.updateMatrix(); I.setMatrixAt(k, im.matrix); });
      I.castShadow = true; I.receiveShadow = true;
      I.frustumCulled = false; // r128 không tính bounds theo instance
      scene.add(I);
    }
  }
}

// ---------- Lúa trên ruộng đảo Việt Nam (InstancedMesh, lắc theo gió) ----------
let RICE = null, RICE_MAX = 0;
{
  const o = byId[4], it = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * 6.28, t = 0.15 + (k % 3) * 0.08, h = 0.9 + (k % 3) * 0.15;
    it.push({ g: BG(0.05, h, 0.02), m: mtx(Math.cos(a) * 0.05, h / 2, Math.sin(a) * 0.05, Math.sin(a) * t, a, -Math.cos(a) * t) });
  }
  const g = mergeGeos(it);
  const m = addSway(new T.MeshStandardMaterial({ color: lin(0x86b44c), roughness: 0.75, side: T.DoubleSide }), 0.05);
  const pts = [];
  for (let k = 0; k < 3; k++) for (let ix = 0; ix < 11; ix++) for (let iz = 0; iz < 9; iz++)
    pts.push([o.x - 8.2 + ix * 0.44 + (TX.hash(ix, iz, k) - 0.5) * 0.15, o.z - 6 + k * 4.5 - 1.75 + iz * 0.44 + (TX.hash(iz, ix, k + 5) - 0.5) * 0.15, TX.hash(ix, iz, 77 + k)]);
  pts.sort((a, b) => a[2] - b[2]); // thứ tự ngẫu nhiên: giảm mật độ đều khi hạ chất lượng
  RICE = new T.InstancedMesh(g, m, pts.length);
  const d = new T.Object3D();
  pts.forEach((p, k) => { d.position.set(p[0], o.y + 0.08, p[1]); d.rotation.y = p[2] * 6.28; d.scale.setScalar(0.85 + p[2] * 0.3); d.updateMatrix(); RICE.setMatrixAt(k, d.matrix); });
  RICE.frustumCulled = false; RICE.castShadow = false; RICE.receiveShadow = true;
  RICE_MAX = pts.length;
  scene.add(RICE);
}

// ---------- Lá cờ bay (cập nhật đỉnh mỗi khung, 91 đỉnh) ----------
const FLAG = (() => {
  const o = byId[4];
  const g = new T.PlaneGeometry(2.2, 1.4, 12, 6);
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ map: TX.flag(), roughness: 0.7, side: T.DoubleSide }));
  m.position.set(o.x + 0.1, o.y + 6.4, o.z + 5);
  m.castShadow = true;
  scene.add(m);
  return { m, base: Float32Array.from(g.attributes.position.array) };
})();

// ---------- Khói ống khói (số hạt cố định, không cấp phát trong vòng lặp) ----------
const SMOKE = [];
{
  const o = byId[2], st = TX.soft("smoke");
  for (const a of [-3, 3]) for (let k = 0; k < 6; k++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: st, color: lin(0xd0d0d0), transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { x: o.x + a, y: o.y + 13, z: o.z - 2, t: k / 6, k };
    scene.add(s);
    SMOKE.push(s);
  }
}

// ---------- Hoàn tất: dựng cây + gộp mesh tĩnh theo đảo ----------
buildTrees();
const BATCH_STATS = finalizeStatic((x, z) => {
  let best = { id: "x", x: 0, z: 0 }, bd = 1e9;
  for (const i of isl) { const d = Math.hypot(x - i.x, z - i.z); if (d < i.r + 10 && d < bd) { bd = d; best = i; } }
  return best;
});
