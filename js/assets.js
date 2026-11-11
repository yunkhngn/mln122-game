// ============================================================
//  TÀI NGUYÊN NGOÀI: texture ảnh thật (PBR) + model GLTF (Poly Haven, CC0)
//  - Texture: assets/tex/<khóa>_{diff,nor,arm}.jpg
//  - Model:   assets/models/<tên>/<tên>.gltf
//  Model được vẽ bằng InstancedMesh (mỗi loại vật = vài draw call) và tự ẩn khi ở xa.
//  Cần chạy qua server (Vercel, `npx serve .`), không mở trực tiếp file://.
// ============================================================
const U = 1.68; // 1 mét = 1.68 đơn vị game (nhân vật cao 2.85 ≈ 1.7 m)

// ---------- Màn hình tải ----------
const LOADMGR = new T.LoadingManager();
LOADMGR.onProgress = (url, done, total) => {
  const el = $("loadbar");
  if (el) el.style.width = Math.round((done / total) * 100) + "%";
};
LOADMGR.onError = (url) => console.warn("Không tải được", url);
if (location.protocol === "file:") {
  $("loadmsg").innerHTML = "Game cần chạy qua máy chủ web.<br><small>Chạy <b>npx serve .</b> rồi mở http://localhost:3000, hoặc mở bản đã deploy trên Vercel.</small>";
}

// ---------- Texture ảnh thật ----------
const TEXL = new T.TextureLoader(LOADMGR);
const _pbr = {};
function pbr(key) {
  if (_pbr[key]) return _pbr[key];
  const ld = (suffix, srgb) => {
    const t = TEXL.load("assets/tex/" + key + "_" + suffix + ".jpg");
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = Math.min(GFX.aniso * 2, MAX_ANISO);
    if (srgb) t.encoding = T.sRGBEncoding;
    return t;
  };
  const o = { map: ld("diff", true) };
  if (TEX_GEN.normals) { o.normalMap = ld("nor"); o.roughnessMap = ld("arm"); }
  return (_pbr[key] = o);
}

// ---------- Model GLTF ----------
// h: chiều cao mong muốn (mét) – chuẩn hóa model có tỉ lệ lạ; s: hệ số phóng; node: chỉ lấy các node có tên này
const MODEL_DEF = {
  chair:      { file: "plastic_monobloc_chair_01", lod: 40, h: 0.82 },
  crate:      { file: "plastic_crate_02", lod: 30 },
  aircon:     { file: "exterior_aircon_unit", lod: 45, node: ["exterior_aircon_unit"] },
  aircon_r:   { file: "exterior_aircon_unit", lod: 45, node: ["exterior_aircon_unit_rusted"] },
  fan:        { file: "ceiling_fan", lod: 28, s: 0.8, top: true },
  tube:       { file: "mounted_fluorescent_lights", lod: 30, node: ["mounted_fluorescent_lights_a"], s: 1.3, top: true },
  gas:        { file: "propane_tank", lod: 30, s: 0.85 },
  ubox:       { file: "utility_box_01", lod: 50 },
  pbox:       { file: "power_box_01", lod: 30 },
  shelf:      { file: "steel_frame_shelves_01", lod: 45, h: 1.9 },
  mstool:     { file: "metal_stool_02", lod: 30 },
  wstool:     { file: "painted_wooden_stool", lod: 30, s: 0.8 },
  desk:       { file: "SchoolDesk_01", lod: 45 },
  schair:     { file: "SchoolChair_01", lod: 45, s: 0.92 },
  chalk:      { file: "standing_chalkboard_01", lod: 60 },
  bookshelf:  { file: "wooden_bookshelf_worn", lod: 50 },
  toolcart:   { file: "tool_cart", lod: 40 },
  handtruck:  { file: "hand_truck", lod: 35 },
  tyre:       { file: "old_tyre", lod: 35, s: 0.9 },
  cement:     { file: "cement_bag", lod: 45 },
  basket:     { file: "wicker_basket_02", lod: 24, node: ["wicker_basket_02_base"], s: 2.2 },
  pot:        { file: "pot_enamel_01", lod: 26, s: 2.6 },
  trash:      { file: "trashbag", lod: 35 },
  tv:         { file: "Television_01", lod: 26 },
  plant:      { file: "planter_pot_clay", lod: 32, s: 1.6 },
  jug:        { file: "plastic_bottle_gallon", lod: 20 },
  jerry:      { file: "plastic_jerrycan", lod: 26 },
  wcrate:     { file: "wooden_crate_01", lod: 40 },
  drill:      { file: "drill_press_01", lod: 40 },
  odesk:      { file: "metal_office_desk", lod: 40, s: 0.85 },
  ladder:     { file: "wooden_ladder", lod: 45 },
};
// Danh sách vị trí đặt: key -> [{x,y,z,ry,s,far}]
const PLACE = {};
// Đặt 1 vật (tọa độ thế giới). far:true = luôn hiện (vật lớn), còn lại tự ẩn khi xa.
function prop(key, x, y, z, ry = 0, s = 1, o = {}) {
  if (!MODEL_DEF[key]) throw new Error("Model chưa khai báo: " + key);
  (PLACE[key] || (PLACE[key] = [])).push({ x, y, z, ry, s, far: !!o.far, rx: o.rx || 0, rz: o.rz || 0 });
}
// Đặt vật theo tọa độ cục bộ của 1 nhóm (nhà, quầy…)
const _pv = new T.Vector3();
function propL(G, key, lx, ly, lz, lry = 0, s = 1, o) {
  G.updateMatrixWorld(true);
  G.localToWorld(_pv.set(lx, ly, lz));
  let ry = lry, p = G;
  while (p) { ry += p.rotation.y; p = p.parent; }
  prop(key, _pv.x, _pv.y, _pv.z, ry, s, o);
}

const PROP_MESH = []; // {key, list:[InstancedMesh], items}
let PROPS_READY = false;
function loadModels(onDone) {
  const gl = new T.GLTFLoader(LOADMGR);
  const files = {};
  for (const key in PLACE) (files[MODEL_DEF[key].file] || (files[MODEL_DEF[key].file] = [])).push(key);
  for (const file in files) {
    gl.load("assets/models/" + file + "/" + file + ".gltf", (g) => {
      for (const key of files[file]) buildProp(key, g.scene);
    });
  }
  LOADMGR.onLoad = () => { PROPS_READY = true; updatePropLOD(true); onDone && onDone(); };
}
function buildProp(key, root) {
  const d = MODEL_DEF[key];
  root.updateMatrixWorld(true);
  // gom mesh cần lấy
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (d.node) { let ok = false; for (let p = o; p; p = p.parent) if (d.node.includes(p.name)) ok = true; if (!ok) return; }
    parts.push(o);
  });
  // khung bao để căn đáy về y=0 và tâm về x=z=0
  const box = new T.Box3();
  parts.forEach((o) => { o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)); });
  const size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  let k = (d.s || 1) * U;
  if (d.h) k = (d.h / size.y) * U * (d.s || 1);
  const fix = new T.Matrix4().makeScale(k, k, k).multiply(new T.Matrix4().makeTranslation(-c.x, d.top ? -box.max.y : -box.min.y, -c.z));
  const items = PLACE[key];
  const list = parts.map((o) => {
    const g = o.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(fix, o.matrixWorld));
    const m = o.material;
    m.envMapIntensity = 0.6;
    const im = new T.InstancedMesh(g, m, items.length);
    im.castShadow = size.y * k > 1.2; im.receiveShadow = true;
    im.frustumCulled = false; // r128 không tính bounds theo instance
    scene.add(im);
    return im;
  });
  PROP_MESH.push({ key, list, items, mats: items.map((p) => new T.Matrix4().compose(new T.Vector3(p.x, p.y, p.z), new T.Quaternion().setFromEuler(new T.Euler(p.rx, p.ry, p.rz)), new T.Vector3(p.s, p.s, p.s))) });
}
// Ẩn vật nhỏ ở xa: dựng lại danh sách instance trong tầm nhìn (4 lần/giây)
function updatePropLOD(all) {
  if (!PROPS_READY) return;
  const q = GFX.detail / 80; // Thấp 0.56 · Trung bình 1 · Cao 1.75
  for (const pm of PROP_MESH) {
    const L = (MODEL_DEF[pm.key].lod || 40) * q, d2 = L * L;
    let n = 0;
    for (let i = 0; i < pm.items.length; i++) {
      const p = pm.items[i], dx = p.x - P.x, dz = p.z - P.z;
      if (!all && !p.far && dx * dx + dz * dz > d2) continue;
      for (const im of pm.list) im.setMatrixAt(n, pm.mats[i]);
      n++;
    }
    for (const im of pm.list) { im.count = n; im.instanceMatrix.needsUpdate = true; }
  }
}
