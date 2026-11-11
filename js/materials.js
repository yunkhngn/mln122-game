// ============================================================
//  VẬT LIỆU PBR (cache, dùng lại) + HÀM DỰNG HÌNH + GỘP MESH TĨNH
// ============================================================
const _mc = {};

// Vật liệu màu trơn (thay MeshLambertMaterial gốc bằng PBR)
function M(c, rough = 0.85, metal = 0) {
  const k = "c" + c + "_" + rough + "_" + metal;
  if (_mc[k]) return _mc[k];
  const m = new T.MeshStandardMaterial({ color: lin(c), roughness: rough, metalness: metal, envMapIntensity: 0.7 });
  m.userData.bk = "plain_" + rough + "_" + metal; // khóa gộp: cùng độ nhám/kim loại => chung 1 draw call
  return (_mc[k] = m);
}

// Bảng vật liệu có texture: tile = số đơn vị thế giới cho 1 lần lặp texture
// photo: texture ảnh thật trong assets/tex (Poly Haven); tex: texture vẽ bằng code (textures.js)
// grime: phủ vệt bẩn chảy dọc + chân tường ẩm (theo tọa độ thế giới)
const MDEF = {
  plaster:   { photo: "plaster",   tile: 4.2, rough: 1, grime: 1 },     // tường vữa loang ố (nhuộm màu)
  plaster_y: { photo: "plaster_y", tile: 4.2, rough: 1, grime: 1 },
  peel:      { photo: "peel",      tile: 3.4, rough: 1, grime: 0.7 },
  damaged:   { photo: "damaged",   tile: 3.4, rough: 1, grime: 0.6 },
  plaster_b: { photo: "plaster_b", tile: 3.4, rough: 1, grime: 0.8 },
  asphalt:   { photo: "asphalt",   tile: 6,   rough: 1 },
  sidewalk:  { photo: "sidewalk",  tile: 3.4, rough: 1 },
  tile:      { photo: "tile",      tile: 2.2, rough: 0.8 },
  tile2:     { photo: "tile2",     tile: 2.6, rough: 0.8 },
  terrazzo:  { photo: "terrazzo",  tile: 3.4, rough: 0.6 },
  shutter:   { photo: "shutter",   tile: 3.4, rough: 1, metal: 0.4 },
  shutter2:  { photo: "shutter2",  tile: 3.4, rough: 1, metal: 0.4 },
  tin:       { photo: "tin",       tile: 2.6, rough: 0.8, metal: 0.5 },
  tin_rust:  { photo: "tin_rust",  tile: 2.6, rough: 1, metal: 0.3 },
  roof:      { photo: "roof",      tile: 3.4, rough: 1 },
  concrete:  { photo: "concrete",  tile: 4,   rough: 1, grime: 0.5 },
  concrete2: { photo: "concrete2", tile: 4,   rough: 1, grime: 0.6 },
  floor_c:   { photo: "floor_c",   tile: 5,   rough: 1 },
  grass:     { photo: "grass",     tile: 4,   rough: 1 },
  soil:      { photo: "soil",      tile: 3.4, rough: 1 },
  wood:      { photo: "wood",      tile: 3,   rough: 1 },
  rust:      { photo: "rust",      tile: 2.5, rough: 1, metal: 0.5 },
  brick:     { photo: "brick",     tile: 2.6, rough: 1, grime: 0.4 },
  // vẽ bằng code
  glass:     { tex: "glass",       tile: 5,   rough: 0.12, metal: 0.7, env: 1.2 },
  water:     { tex: "water",       tile: 5,   rough: 0.06, metal: 0.15, env: 1.1 },
  leaf:      { tex: "leaf",        tile: 2.5, rough: 0.8 },
  bark:      { tex: "bark",        tile: 2,   rough: 0.95 },
  metal:     { tex: "metal",       tile: 2,   rough: 0.32, metal: 0.9 },
};
// Vệt bẩn theo tọa độ thế giới (không cần UV riêng, nhà gộp vẫn đúng)
const GRIME_TEX = TX.grime();
function addGrime(m, k) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.grimeMap = { value: GRIME_TEX };
    sh.vertexShader = "varying vec3 vGW;\n" + sh.vertexShader.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\n vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = "uniform sampler2D grimeMap; varying vec3 vGW;\n" + sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      float gs = texture2D(grimeMap, vec2((vGW.x + vGW.z) * 0.07, vGW.y * 0.045)).r;
      float gd = 1.0 - (1.0 - smoothstep(0.0, 2.2, vGW.y)) * 0.32;
      diffuseColor.rgb *= mix(1.0, gs * gd, ${k.toFixed(2)});`);
  };
  m.customProgramCacheKey = () => "grime" + k;
  return m;
}
function mat(name, tint = 0xffffff, opt = {}) {
  const k = name + "_" + tint + "_" + JSON.stringify(opt);
  if (_mc[k]) return _mc[k];
  const d = MDEF[name], t = d.photo ? pbr(d.photo) : TX.get(d.tex);
  const m = new T.MeshStandardMaterial({
    map: t.map, color: lin(tint),
    roughness: opt.rough ?? d.rough, metalness: opt.metal ?? d.metal ?? 0,
    envMapIntensity: d.env ?? 0.6, side: opt.side ?? T.FrontSide,
  });
  if (t.normalMap) { m.normalMap = t.normalMap; m.normalScale.set(1, 1); }
  if (t.roughnessMap) m.roughnessMap = t.roughnessMap;
  if (d.grime && opt.grime !== false) addGrime(m, d.grime);
  m.userData.tile = opt.tile ?? d.tile;
  m.userData.bk = name + "_" + JSON.stringify(opt); // khác màu tint vẫn gộp chung (tint -> màu đỉnh)
  return (_mc[k] = m);
}
// Vật liệu biển hiệu (không lặp)
function signMat(o, sub, bg, fg) {
  if (typeof o == "string") o = { title: o, sub, bg, fg };
  const k = "sign" + JSON.stringify(o);
  return _mc[k] || (_mc[k] = new T.MeshStandardMaterial({ map: TX.sign(o), roughness: 0.6, envMapIntensity: 0.4 }));
}
function paperMat(kind, a, b) {
  const k = "paper" + kind + a + b;
  return _mc[k] || (_mc[k] = new T.MeshStandardMaterial({ map: TX.paper(kind, a, b), roughness: 0.85 }));
}

// ---------- Lắc theo gió (vertex shader, rẻ, không tốn CPU) ----------
const U_TIME = { value: 0 };
function addSway(m, amp) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U_TIME;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 swp = instanceMatrix[3].xz;
      #else
        vec2 swp = vec2(0.0);
      #endif
      float swh = max(position.y, 0.0);
      float sww = sin(uTime*1.6 + swp.x*0.43 + swp.y*0.31) + 0.35*sin(uTime*3.3 + swp.x*1.7);
      transformed.x += sww * ${amp.toFixed(5)} * swh * swh;
      transformed.z += sww * ${(amp * 0.6).toFixed(5)} * swh * swh;`);
  };
  m.customProgramCacheKey = () => "sway" + amp;
  return m;
}

// ---------- UV theo kích thước thật (texture không bị kéo giãn) ----------
function uvBox(g, w, h, d, tile) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const f = (i / 4) | 0;
    const su = f < 2 ? d : w, sv = f < 2 ? h : f < 4 ? d : h;
    uv.setXY(i, (uv.getX(i) * su) / tile, (uv.getY(i) * sv) / tile);
  }
}
function uvScale(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

// ============================================================
//  NHÓM TĨNH: mọi vật trang trí không chuyển động được thêm vào ST,
//  cuối cùng gộp theo (vật liệu × đảo) => giảm mạnh draw call.
//  Vật có detail:true được ẩn khi ở xa (LOD theo khoảng cách).
// ============================================================
const ST = new T.Group();
scene.add(ST);
function place(mesh, x, y, z, o) {
  mesh.position.set(x, y, z);
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rz) mesh.rotation.z = o.rz;
  if (o.s) mesh.scale.setScalar(o.s);
  mesh.castShadow = o.shadow !== false;
  mesh.receiveShadow = true;
  if (o.detail) mesh.userData.detail = true;
  (o.p || ST).add(mesh);
  return mesh;
}
const asMat = (m) => (typeof m === "number" ? M(m) : m);
// Hộp tĩnh (tâm ở x,y,z)
function sb(w, h, d, m, x, y, z, o = {}) {
  m = asMat(m);
  const g = new T.BoxGeometry(w, h, d);
  if (m.userData.tile) uvBox(g, w, h, d, m.userData.tile);
  return place(new T.Mesh(g, m), x, y, z, o);
}
// Trụ tĩnh – đáy đặt tại y (giống hàm cyl gốc)
function sc(rt, rb, h, m, x, y, z, o = {}) {
  m = asMat(m);
  const g = new T.CylinderGeometry(rt, rb, h, o.seg || 12, 1, !!o.open);
  if (m.userData.tile) uvScale(g, (Math.PI * 2 * Math.max(rt, rb)) / m.userData.tile, h / m.userData.tile);
  return place(new T.Mesh(g, m), x, y + h / 2, z, o);
}
// Mesh tĩnh bất kỳ
function sm(g, m, x, y, z, o = {}) { return place(new T.Mesh(g, asMat(m)), x, y, z, o); }

// ---------- Gộp nhiều geometry thành 1 (giữ position/normal/uv, tùy chọn color) ----------
function mergeGeos(items, withColor) {
  // items: [{g, m: Matrix4, c: Color?}]
  const parts = [];
  let n = 0;
  for (const it of items) {
    const g = it.g.index ? it.g.toNonIndexed() : it.g.clone();
    if (it.m) g.applyMatrix4(it.m);
    parts.push([g, it.c]);
    n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = withColor ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const [g, c] of parts) {
    const k = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (col) for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += k;
    g.dispose();
  }
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(pos, 3));
  out.setAttribute("normal", new T.BufferAttribute(nor, 3));
  out.setAttribute("uv", new T.BufferAttribute(uv, 2));
  if (col) out.setAttribute("color", new T.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
// Tiện ích: tạo matrix từ vị trí/xoay/scale
const _q = new T.Quaternion(), _e = new T.Euler(), _v = new T.Vector3(), _s = new T.Vector3();
function mtx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new T.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

// Vật liệu dùng màu theo đỉnh (nhân vật, đồ vật nhỏ nhiều màu) – 1 vật liệu cho tất cả
const VCOL = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 });
// Dựng 1 mesh nhiều màu từ danh sách [geometry, hex, matrix]
function colorMesh(list, material = VCOL) {
  const g = mergeGeos(list.map(([geo, hex, m]) => ({ g: geo, m, c: lin(hex) })), true);
  list.forEach(([geo]) => geo.dispose());
  const mesh = new T.Mesh(g, material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
const BG = (w, h, d) => new T.BoxGeometry(w, h, d);

// Vật liệu dùng chung cho mesh đã gộp: màu tint chuyển vào màu đỉnh
const _bm = {};
function batchMat(src) {
  const k = src.userData.bk;
  if (_bm[k]) return _bm[k];
  const m = src.clone();
  m.vertexColors = true; m.color.set(0xffffff);
  m.onBeforeCompile = src.onBeforeCompile; // giữ shader tùy biến (nếu có)
  m.customProgramCacheKey = src.customProgramCacheKey;
  return (_bm[k] = m);
}
// ---------- Gộp toàn bộ ST khi dựng xong thế giới ----------
let DETAIL = []; // mesh chi tiết (LOD)
function finalizeStatic(chunkOf) {
  ST.updateMatrixWorld(true);
  const buckets = new Map();
  ST.traverse((o) => {
    if (!o.isMesh) return;
    let det = false;
    for (let p = o; p; p = p.parent) if (p.userData.detail) { det = true; break; }
    const e = o.matrixWorld.elements, ch = chunkOf(e[12], e[14]);
    const bk = o.material.userData.bk;
    const key = (bk || o.material.uuid) + "|" + ch.id + "|" + det + "|" + o.castShadow;
    if (!buckets.has(key)) buckets.set(key, { mat: bk ? batchMat(o.material) : o.material, vc: !!bk, ch, det, cast: o.castShadow, items: [] });
    buckets.get(key).items.push({ g: o.geometry, m: o.matrixWorld.clone(), c: o.material.color });
  });
  const stats = { before: 0, after: 0 };
  for (const b of buckets.values()) {
    stats.before += b.items.length;
    const mesh = new T.Mesh(mergeGeos(b.items, b.vc), b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = true;
    mesh.userData.cx = b.ch.x; mesh.userData.cz = b.ch.z;
    if (b.det) DETAIL.push(mesh);
    scene.add(mesh);
    stats.after++;
  }
  ST.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  scene.remove(ST);
  return stats;
}
