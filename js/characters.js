// ============================================================
//  NHÂN VẬT – người Việt low-poly tỉ lệ thật, mặt vẽ bằng canvas (nhân vật hư cấu)
//  Mỗi người dùng 1 texture atlas 512×512:
//    trên  (256 px): da đầu + khuôn mặt + tóc (UV cầu, mặt ở u = 0.25)
//    giữa  (128 px): thân áo (UV xoay quanh thân, mặt trước ở u = 0)
//    dưới  (128 px): ô màu đơn (da, quần, giày, mũ…)
//  => người đứng yên gộp thành 1 mesh / 1 draw call; người cử động: 5 mesh.
//  Đơn vị dựng: mét (nhóm được phóng U lần). Gốc tọa độ ở giữa hai bàn chân.
//  API cũ char(body, hair, pack, opt) vẫn dùng được (có legL/legR/armL/armR).
// ============================================================
const SKIN = 0xd9a47c;
const SKINS = ["#d9a47c", "#c8916a", "#e2b48e", "#b98058", "#d6a07a"];
const SW_ = ["skin", "shirt", "pants", "shoe", "hat", "hat2", "hair", "white", "black", "dress", "apron", "sole", "lip", "metal", "straw", "red"];

function hexCss(c) { return typeof c == "number" ? "#" + c.toString(16).padStart(6, "0") : c; }
function shade(css, k) { // làm sáng/tối màu css
  const c = new T.Color(css); c.r = Math.min(1, c.r * k); c.g = Math.min(1, c.g * k); c.b = Math.min(1, c.b * k);
  return "#" + c.getHexString();
}

// ---------- Vẽ atlas cho 1 người ----------
function personAtlas(o) {
  const C = document.createElement("canvas"); C.width = C.height = 512;
  const x = C.getContext("2d");
  const skin = o.skin, hair = o.hairC;
  // --- ô màu đơn (y 384..512, 8×2 ô 64 px) ---
  const sw = { skin, shirt: o.shirt, pants: o.pants, shoe: o.shoeC, hat: o.hatC, hat2: shade(o.hatC, 0.75), hair, white: "#f2f0ea", black: "#1a1816", dress: o.dress || o.shirt, apron: o.apron || "#4a6a9a", sole: "#e8e4dc", lip: "#a8574a", metal: "#9aa0a6", straw: "#d8c28a", red: "#c8231f" };
  SW_.forEach((k, i) => {
    const cx = (i % 8) * 64, cy = 384 + Math.floor(i / 8) * 64;
    x.fillStyle = sw[k]; x.fillRect(cx, cy, 64, 64);
    // chút loang để đỡ phẳng
    const g = x.createLinearGradient(cx, cy, cx, cy + 64); g.addColorStop(0, "rgba(255,255,255,.06)"); g.addColorStop(1, "rgba(0,0,0,.08)");
    x.fillStyle = g; x.fillRect(cx, cy, 64, 64);
  });
  // --- đầu (y 0..256): cả vòng 512 px, mặt ở x = 128 ---
  x.fillStyle = skin; x.fillRect(0, 0, 512, 256);
  const fx = 128;
  // bóng nhẹ hai bên má / dưới cằm
  let g = x.createRadialGradient(fx, 130, 20, fx, 130, 120); g.addColorStop(0, "rgba(255,230,210,.18)"); g.addColorStop(1, "rgba(80,40,20,.22)");
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  // tóc: đỉnh + sau gáy (chừa khuôn mặt hình bầu dục)
  if (o.hair != "bald") {
    x.fillStyle = hair;
    x.beginPath(); x.rect(0, 0, 512, o.hair == "long" ? 66 : 60); x.fill();
    const back = o.hair == "long" ? 250 : o.hair == "bun" ? 200 : 168;
    x.beginPath(); x.rect(fx + 74, 0, 512 - 148, back); x.fill();          // phía sau
    x.beginPath(); x.rect(0, 0, fx - 74, back); x.fill();
    // mai tóc + đường chân tóc răng cưa
    x.beginPath(); x.moveTo(fx - 80, 0);
    for (let i = 0; i <= 16; i++) { const px = fx - 80 + i * 10; x.lineTo(px, 62 + (i % 2) * 6 + (o.hair == "long" ? 6 : 0)); }
    x.lineTo(fx + 80, 0); x.fill();
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(fx + s * 60, 60); x.lineTo(fx + s * 78, 60); x.lineTo(fx + s * 76, o.hair == "long" ? 220 : 140); x.lineTo(fx + s * 66, 100); x.fill(); } // tóc mai
    for (let i = 0; i < 300; i++) { x.fillStyle = "rgba(255,255,255,.05)"; x.fillRect(Math.random() * 512, Math.random() * 60, 1, 6); }
  } else { // hói: tóc bạc lơ thơ hai bên
    x.fillStyle = hair;
    for (const s of [-1, 1]) x.fillRect(fx + s * 70 - (s < 0 ? 40 : 0), 95, 40, 60);
    x.fillRect(fx + 110, 90, 290, 70);
  }
  // lông mày
  x.strokeStyle = shade(hair == "#d8d8d0" ? "#8a8a84" : hair, 0.9); x.lineWidth = 5; x.lineCap = "round";
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(fx + s * 8, 104); x.quadraticCurveTo(fx + s * 20, o.female ? 97 : 100, fx + s * 32, 104); x.stroke(); }
  // mắt
  for (const s of [-1, 1]) {
    const ex = fx + s * 21, ey = 118;
    x.fillStyle = "#f4efe8"; x.beginPath(); x.ellipse(ex, ey, 9, 4.5, 0, 0, 6.28); x.fill();
    x.fillStyle = "#2a1c14"; x.beginPath(); x.arc(ex + s * -1, ey, 4, 0, 6.28); x.fill();
    x.fillStyle = "#fff"; x.fillRect(ex - 2, ey - 2, 2, 2);
    x.strokeStyle = "#2a1c14"; x.lineWidth = 2.5; x.beginPath(); x.ellipse(ex, ey, 9.5, 5, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    if (o.old) { x.strokeStyle = "rgba(90,50,30,.4)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(ex + s * 11, ey + 2); x.lineTo(ex + s * 16, ey + 6); x.stroke(); }
  }
  // mũi (bóng) + cánh mũi
  x.strokeStyle = "rgba(110,60,35,.45)"; x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(fx - 3, 120); x.quadraticCurveTo(fx - 6, 136, fx - 9, 142); x.stroke();
  x.fillStyle = "rgba(90,45,25,.55)"; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(fx + s * 6, 145, 3.5, 2, 0, 0, 6.28); x.fill(); }
  // miệng
  x.fillStyle = o.female ? "#b84a4a" : "#9a5444";
  x.beginPath(); x.ellipse(fx, 162, 13, o.female ? 4.5 : 3.5, 0, 0, 6.28); x.fill();
  x.strokeStyle = "rgba(60,25,15,.7)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(fx - 13, 162); x.quadraticCurveTo(fx, 164, fx + 13, 162); x.stroke();
  if (o.female) { g = x.createRadialGradient(0, 0, 0, 0, 0, 1); for (const s of [-1, 1]) { x.fillStyle = "rgba(220,110,100,.18)"; x.beginPath(); x.ellipse(fx + s * 30, 145, 12, 8, 0, 0, 6.28); x.fill(); } }
  if (o.beard) { x.fillStyle = "rgba(40,30,25,.35)"; x.beginPath(); x.ellipse(fx, 168, 30, 22, 0, 0, Math.PI); x.fill(); x.fillRect(fx - 14, 151, 28, 5); }
  if (o.old) { x.strokeStyle = "rgba(90,50,30,.35)"; x.lineWidth = 1.5; for (const yy of [84, 90]) { x.beginPath(); x.moveTo(fx - 26, yy); x.lineTo(fx + 26, yy); x.stroke(); } for (const s of [-1, 1]) { x.beginPath(); x.moveTo(fx + s * 12, 146); x.quadraticCurveTo(fx + s * 20, 160, fx + s * 18, 172); x.stroke(); } }
  if (o.glasses) { x.strokeStyle = "#151515"; x.lineWidth = 3; for (const s of [-1, 1]) x.strokeRect(fx + s * 21 - 12, 111, 24, 15); x.beginPath(); x.moveTo(fx - 9, 116); x.lineTo(fx + 9, 116); x.stroke(); }
  // tai (đậm hơn ở hai bên)
  x.fillStyle = "rgba(150,80,50,.25)"; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(fx + s * 128, 128, 10, 18, 0, 0, 6.28); x.fill(); }
  // --- thân áo (y 256..384): 512 px quanh thân, mặt trước ở x = 0 và 512 ---
  const ty = 256, th = 128;
  x.fillStyle = o.aodai ? o.dress : o.shirt; x.fillRect(0, ty, 512, th);
  // quần ở phần dưới thân (v < 0.24 => 30 px cuối)
  x.fillStyle = o.aodai ? o.dress : o.pants; x.fillRect(0, ty + th - 30, 512, 30);
  if (!o.aodai) { x.fillStyle = "#2a2420"; x.fillRect(0, ty + th - 32, 512, 4); } // thắt lưng
  if (o.sleeve == "none") { // áo ba lỗ: khoét nách
    x.fillStyle = skin;
    for (const cx of [128, 384]) { x.beginPath(); x.ellipse(cx, ty, 46, 34, 0, 0, 6.28); x.fill(); }
  }
  // cổ áo
  const collar = (cx) => {
    if (o.collar == "shirt") { x.fillStyle = shade(o.shirt, 1.12); x.beginPath(); x.moveTo(cx - 34, ty); x.lineTo(cx, ty + 30); x.lineTo(cx + 34, ty); x.fill(); x.fillStyle = skin; x.beginPath(); x.moveTo(cx - 14, ty); x.lineTo(cx, ty + 22); x.lineTo(cx + 14, ty); x.fill(); for (let k = 0; k < 4; k++) { x.fillStyle = "#eee"; x.fillRect(cx - 2, ty + 34 + k * 22, 4, 4); } }
    else { x.fillStyle = skin; x.beginPath(); x.ellipse(cx, ty, 26, 14, 0, 0, 6.28); x.fill(); x.strokeStyle = shade(o.shirt, 0.7); x.lineWidth = 4; x.beginPath(); x.ellipse(cx, ty, 27, 15, 0, 0, Math.PI); x.stroke(); }
  };
  collar(0); collar(512);
  // kẻ ca rô (sơ mi)
  if (o.plaid) { x.globalAlpha = 0.22; x.fillStyle = "#fff"; for (let k = 0; k < 512; k += 26) x.fillRect(k, ty, 7, th - 32); for (let k = ty; k < ty + th - 32; k += 26) x.fillRect(0, k, 512, 7); x.globalAlpha = 1; }
  // chữ in trước ngực
  if (o.print) {
    x.font = "bold 22px 'Oswald', Arial, sans-serif"; x.textAlign = "center"; x.fillStyle = o.printC || "#ffe14a";
    for (const cx of [0, 512]) { x.fillText(o.print, cx, ty + 58); if (o.num) { x.font = "bold 30px 'Oswald', Arial"; x.fillText(o.num, cx + (cx ? 0 : 0), ty + 88); x.font = "bold 22px 'Oswald', Arial"; } }
    if (o.num) { x.font = "bold 44px 'Oswald', Arial"; x.fillText(o.num, 256, ty + 76); } // số sau lưng
  }
  if (o.apron) { x.fillStyle = o.apron; for (const cx of [0, 512]) x.fillRect(cx - 40, ty + 40, 80, th - 40); }
  // nếp nhăn vải
  for (let k = 0; k < 18; k++) { x.strokeStyle = "rgba(0,0,0,.08)"; x.lineWidth = 2; const px = Math.random() * 512; x.beginPath(); x.moveTo(px, ty + 40 + Math.random() * 40); x.lineTo(px + 10, ty + th - 34); x.stroke(); }
  const t = new T.CanvasTexture(C);
  t.encoding = T.sRGBEncoding; t.anisotropy = 4;
  return t;
}

// UV: ánh xạ toàn bộ uv của geometry vào 1 vùng [u0,v0,u1,v1] hoặc 1 ô màu
const _swUV = (name) => { const i = SW_.indexOf(name); return [((i % 8) + 0.5) / 8, 1 - (384 + Math.floor(i / 8) * 64 + 32) / 512]; };
function uvTo(g, r) {
  const uv = g.attributes.uv;
  if (typeof r == "string") { const [u, v] = _swUV(r); for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v); }
  else for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
  return g;
}
const R_HEAD = [0, 0.5, 1, 1], R_BODY = [0, 0.25, 1, 0.5];
const cyl = (ra, rb, h, seg = 8) => new T.CylinderGeometry(ra, rb, h, seg, 1);

const _pmat = {};
// ---------- Dựng 1 người ----------
// o: { shirt, pants, skin, hair, hairC, hat, hatC, shoes, shoeC, sleeve, shorts, female, old, glasses, beard,
//      print, num, printC, collar, plaid, aodai, dress, apron, pose: "stand"|"sit"|"eat", still, parent }
function personBox(o = {}) {
  o = Object.assign({ shirt: "#c8231f", pants: "#2a2c34", skin: SKINS[0], hair: "short", hairC: "#1a1410", hat: null, hatC: "#5f6a3a", shoes: "sandal", shoeC: "#3a5aa8", sleeve: "short", pose: "stand" }, o);
  o.shirt = hexCss(o.shirt); o.pants = hexCss(o.pants); o.hatC = hexCss(o.hatC); o.hairC = hexCss(o.hairC); o.shoeC = hexCss(o.shoeC);
  if (o.dress) o.dress = hexCss(o.dress);
  if (o.apron) o.apron = hexCss(o.apron);
  // trang phục giống nhau => dùng chung vật liệu (gộp được nhiều người vào 1 draw call)
  const mk_ = JSON.stringify(Object.assign({}, o, { parent: 0, pose: 0, still: 0 }));
  const mat = _pmat[mk_] || (_pmat[mk_] = new T.MeshStandardMaterial({ map: personAtlas(o), roughness: 0.82, envMapIntensity: 0.4 }));
  const sit = o.pose == "sit" || o.pose == "eat";
  const H = o.female ? 0.96 : 1; // tỉ lệ chiều cao
  const hipY = 0.86 * H, shY = 1.39 * H;
  const body = [], legs = [[], []], arms = [[], []];
  const PT = (list, g, r, m) => list.push([uvTo(g, r), m]);
  // --- thân (lathe: hông – eo – ngực – vai – cổ) ---
  const prof = o.female
    ? [[0.135, 0.79], [0.165, 0.9], [0.125, 1.02], [0.15, 1.18], [0.145, 1.32], [0.085, 1.41], [0.045, 1.45], [0.045, 1.52]]
    : [[0.14, 0.79], [0.155, 0.9], [0.145, 1.02], [0.17, 1.2], [0.175, 1.33], [0.1, 1.42], [0.05, 1.46], [0.05, 1.53]];
  const lath = new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y * H)), 10);
  PT(body, lath, R_BODY, new T.Matrix4().makeScale(1, 1, 0.66));
  // váy áo dài (2 tà)
  if (o.aodai) for (const s of [-1, 1]) PT(body, BG(0.26, 0.62, 0.012), "dress", mtx(0, 0.72 * H, s * 0.1));
  if (o.apron) PT(body, BG(0.28, 0.42, 0.01), "apron", mtx(0, 0.78 * H, 0.105));
  // --- đầu ---
  const hy = 1.63 * H;
  const head = new T.SphereGeometry(0.112, 16, 12);
  PT(body, head, R_HEAD, mtx(0, hy, 0.005, 0, 0, 0, 0.92, 1.12, 1.0));
  PT(body, new T.ConeGeometry(0.02, 0.05, 4), "skin", mtx(0, hy - 0.012, 0.112, Math.PI / 2 + 0.35, Math.PI / 4, 0)); // mũi
  for (const s of [-1, 1]) PT(body, new T.SphereGeometry(0.026, 6, 5), "skin", mtx(s * 0.102, hy - 0.005, -0.005, 0, 0, 0, 0.45, 1, 0.8)); // tai
  PT(body, cyl(0.042, 0.048, 0.14, 8), "skin", mtx(0, hy - 0.12, -0.005)); // cổ
  PT(body, new T.SphereGeometry(0.07, 10, 6), "skin", mtx(0, hy - 0.06, 0.03, 0, 0, 0, 1.05, 0.75, 1.0)); // hàm
  if (o.hair != "bald") PT(body, new T.SphereGeometry(0.118, 14, 7, 0, Math.PI * 2, 0, Math.PI * 0.45), "hair", mtx(0, hy + 0.012, -0.012, -0.32, 0, 0, 0.95, 1.12, 1.04));
  if (o.hair == "long" && !o.hat) PT(body, BG(0.2, 0.32, 0.05), "hair", mtx(0, hy - 0.16, -0.085, 0.12));
  if (o.hair == "bun") PT(body, new T.SphereGeometry(0.05, 8, 6), "hair", mtx(0, hy + 0.04, -0.12));
  // --- mũ ---
  if (o.hat == "coi") { // mũ cối
    PT(body, new T.SphereGeometry(0.138, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), "hat", mtx(0, hy + 0.035, 0, 0, 0, 0, 1, 0.85, 1.08));
    PT(body, cyl(0.175, 0.185, 0.012, 18), "hat2", mtx(0, hy + 0.03, 0, 0, 0, 0, 1, 1, 1.12));
    PT(body, cyl(0.012, 0.014, 0.012, 6), "hat2", mtx(0, hy + 0.155, 0));
    PT(body, BG(0.03, 0.01, 0.02), "metal", mtx(0, hy + 0.07, 0.135));
  } else if (o.hat == "cap" || o.hat == "hard") {
    PT(body, new T.SphereGeometry(o.hat == "hard" ? 0.13 : 0.122, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), "hat", mtx(0, hy + 0.035, 0, -0.05, 0, 0, 1, o.hat == "hard" ? 0.95 : 0.8, 1.05));
    PT(body, BG(0.16, 0.012, o.hat == "hard" ? 0.06 : 0.11), "hat2", mtx(0, hy + 0.035, o.hat == "hard" ? 0.13 : 0.15, 0.08));
  } else if (o.hat == "non") { // nón lá
    PT(body, new T.ConeGeometry(0.25, 0.19, 18, 1, true), "straw", mtx(0, hy + 0.125, 0));
  }
  // --- chân (khớp hông; khớp gối) ---
  const thigh = 0.42 * H, shin = 0.4 * H;
  for (const i of [0, 1]) {
    const L = legs[i], knee = sit ? Math.PI / 2 : 0;
    const kneeM = (m) => new T.Matrix4().makeTranslation(0, -thigh, 0).multiply(new T.Matrix4().makeRotationX(knee)).multiply(m);
    if (o.shorts) { PT(L, cyl(0.082, 0.07, thigh * 0.6), "pants", mtx(0, -thigh * 0.3, 0)); PT(L, cyl(0.06, 0.052, thigh * 0.42), "skin", mtx(0, -thigh * 0.79, 0)); }
    else if (o.aodai) PT(L, cyl(0.08, 0.062, thigh), "white", mtx(0, -thigh / 2, 0));
    else PT(L, cyl(0.078, 0.06, thigh), "pants", mtx(0, -thigh / 2, 0));
    PT(L, new T.SphereGeometry(0.058, 7, 5), o.shorts ? "skin" : o.aodai ? "white" : "pants", mtx(0, -thigh, 0));
    PT(L, cyl(0.055, 0.038, shin), o.shorts ? "skin" : o.aodai ? "white" : "pants", kneeM(mtx(0, -shin / 2, 0)));
    // bàn chân + dép
    if (o.shoes == "sandal") { PT(L, BG(0.085, 0.045, 0.22), "skin", kneeM(mtx(0, -shin - 0.035, 0.045))); PT(L, BG(0.1, 0.02, 0.25), "sole", kneeM(mtx(0, -shin - 0.065, 0.045))); PT(L, BG(0.09, 0.025, 0.05), "shoe", kneeM(mtx(0, -shin - 0.03, 0.08))); }
    else PT(L, BG(0.095, 0.075, 0.25), "shoe", kneeM(mtx(0, -shin - 0.04, 0.045)));
  }
  // --- tay (khớp vai; khớp khuỷu) ---
  const up = 0.28 * H, fore = 0.26 * H;
  const elbow = o.pose == "eat" ? -1.1 : sit ? -0.9 : -0.12;
  for (const i of [0, 1]) {
    const A = arms[i];
    const elbM = (m) => new T.Matrix4().makeTranslation(0, -up, 0).multiply(new T.Matrix4().makeRotationX(elbow)).multiply(m);
    const sl = o.sleeve == "none" ? "skin" : "shirt";
    PT(A, new T.SphereGeometry(0.05, 7, 5), o.aodai ? "dress" : sl, mtx(0, -0.01, 0));
    if (o.sleeve == "long" || o.aodai) PT(A, cyl(0.052, 0.042, up), o.aodai ? "dress" : "shirt", mtx(0, -up / 2, 0));
    else if (o.sleeve == "none") PT(A, cyl(0.048, 0.04, up), "skin", mtx(0, -up / 2, 0));
    else { PT(A, cyl(0.052, 0.05, up * 0.5), "shirt", mtx(0, -up * 0.25, 0)); PT(A, cyl(0.045, 0.04, up * 0.52), "skin", mtx(0, -up * 0.74, 0)); }
    PT(A, cyl(0.04, 0.032, fore), o.sleeve == "long" || o.aodai ? (o.aodai ? "dress" : "shirt") : "skin", elbM(mtx(0, -fore / 2, 0)));
    PT(A, BG(0.05, 0.09, 0.03), "skin", elbM(mtx(0, -fore - 0.04, 0.005)));
  }
  // --- lắp ráp ---
  const G = new T.Group();
  const legPos = [[-0.085, hipY], [0.085, hipY]], armPos = [[-(o.female ? 0.17 : 0.19), shY], [o.female ? 0.17 : 0.19, shY]];
  const legRot = sit ? -Math.PI / 2 : 0, armRot = o.pose == "eat" ? -0.55 : sit ? -0.35 : 0;
  const armSpread = sit ? 0.12 : 0.06;
  const scaleM = new T.Matrix4().makeScale(U, U, U);
  // khi ngồi: hạ cả người để mông chạm ghế nhựa (cao ~0.42 m)
  const drop = sit ? 0.44 - hipY : 0;
  if (o.still) {
    const all = [];
    const add = (list, m) => list.forEach(([g, mm]) => all.push({ g, m: new T.Matrix4().multiplyMatrices(m, mm) }));
    const base = new T.Matrix4().multiplyMatrices(scaleM, new T.Matrix4().makeTranslation(0, drop, 0));
    add(body, base);
    legs.forEach((L, i) => add(L, base.clone().multiply(mtx(legPos[i][0], legPos[i][1], 0, legRot, 0, (i ? -1 : 1) * 0.02))));
    arms.forEach((A, i) => add(A, base.clone().multiply(mtx(armPos[i][0], armPos[i][1], 0, armRot, 0, (i ? 1 : -1) * armSpread))));
    const mesh = new T.Mesh(mergeGeos(all), mat);
    all.forEach((a) => a.g.dispose());
    mesh.castShadow = true; mesh.receiveShadow = true;
    G.add(mesh);
  } else {
    const mk = (list) => { const m = new T.Mesh(mergeGeos(list.map(([g, mm]) => ({ g, m: mm }))), mat); list.forEach(([g]) => g.dispose()); m.castShadow = true; m.receiveShadow = true; return m; };
    const root = new T.Group(); root.scale.setScalar(U); root.position.y = drop * U; G.add(root);
    root.add(mk(body));
    const limb = (list, x, y, rx, rz) => { const p = new T.Group(); p.position.set(x, y, 0); p.rotation.set(rx, 0, rz); p.add(mk(list)); root.add(p); return p; };
    G.legL = limb(legs[0], legPos[0][0], legPos[0][1], legRot, 0.02);
    G.legR = limb(legs[1], legPos[1][0], legPos[1][1], legRot, -0.02);
    G.armL = limb(arms[0], armPos[0][0], armPos[0][1], armRot, -armSpread);
    G.armR = limb(arms[1], armPos[1][0], armPos[1][1], armRot, armSpread);
  }
  (o.parent || scene).add(G);
  return G;
}

// ---------- Kho trang phục ngẫu nhiên (hư cấu) ----------
const OUTFITS = [
  { shirt: "#c8231f", print: "VIỆT NAM", num: "10", printC: "#ffe14a", shorts: true },                 // áo đấu đỏ
  { shirt: "#f2f0ea", collar: "shirt", sleeve: "short", pants: "#3a3a44", shoes: "shoe", shoeC: "#2a2420" }, // sơ mi trắng
  { shirt: "#e8e4dc", sleeve: "none", shorts: true, pants: "#3a4a6a" },                                  // áo ba lỗ + quần đùi
  { shirt: "#3a6a9a", collar: "shirt", plaid: true, pants: "#2a2c34" },                                 // sơ mi ca rô
  { shirt: "#5a7a3a", hat: "coi", hatC: "#5f6a3a", pants: "#4a5a3a", hair: "buzz", hairC: "#8a8a84" }, // ông cụ mũ cối
  { shirt: "#2a2a2a", print: "SAIGON", printC: "#fff", pants: "#2a3a5a", hat: "cap", hatC: "#c8231f" },
  { shirt: "#f0c040", print: "GRAB-BIKE", printC: "#1a7a3a", pants: "#2a2c34", hat: "cap", hatC: "#1a7a3a", shoes: "shoe", shoeC: "#3a3a3a" },
  { female: true, hair: "long", shirt: "#e88aa8", pants: "#2a2c44", shoes: "sandal", shoeC: "#c8231f" },
  { female: true, hair: "long", shirt: "#7a5a9a", collar: "shirt", sleeve: "long", pants: "#3a2a2a", hat: "non" },
  { female: true, hair: "long", shirt: "#f2f0ea", print: "I ♥ HN", printC: "#c8231f", pants: "#4a6a9a", shorts: true },
];
function randomPerson(seed, extra) {
  const base = OUTFITS[seed % OUTFITS.length];
  return person(Object.assign({ skin: (seed * 3) % 2, hairC: ["#1a1410", "#2a1a10", "#3a2414"][seed % 3] }, base, extra));
}

// ---------- Tô phở (để trên bàn trước người đang ăn) ----------
const BOWL_GEO = new T.LatheGeometry([[0, 0], [0.035, 0], [0.05, 0.015], [0.09, 0.07], [0.095, 0.075]].map(([a, b]) => new T.Vector2(a * U, b * U)), 14);
const BROTH_GEO = (() => { const g = new T.CircleGeometry(0.085 * U, 14); g.rotateX(-Math.PI / 2); g.translate(0, 0.062 * U, 0); return g; })();
function phoBowl(x, y, z, p) {
  sm(BOWL_GEO, M(0xf2f0ea, 0.3), x, y, z, { p, shadow: false, detail: true });
  sm(BROTH_GEO, M(0xb8783a, 0.2), x, y, z, { p, shadow: false, detail: true });
  for (let k = 0; k < 5; k++) sb(0.04, 0.01, 0.025, M(0x3a8a2a, 0.6), x + Math.cos(k * 1.3) * 0.06, y + 0.11, z + Math.sin(k * 1.3) * 0.06, { p, shadow: false, detail: true });
  sb(0.012, 0.012, 0.42, M(0xd8c08a, 0.6), x + 0.07, y + 0.13, z, { p, rx: 0.3, shadow: false, detail: true }); // đũa
}

// ---------- API cũ: char(body, hair, pack, opt) ----------
function char(body, hair, pack, opt = {}) {
  return personBox(Object.assign({ shirt: hexCss(body), hairC: hexCss(hair), pants: opt.pants != null ? hexCss(opt.pants) : "#2a2c34", hat: opt.hat ? "non" : null, still: opt.still }, opt.look || {}));
}

// Vật liệu "chỉ đổ bóng": nhân vật người chơi vô hình trong góc nhìn thứ nhất nhưng vẫn có bóng
const SHADOW_ONLY = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function shadowOnly(g) { g.traverse((o) => { if (o.isMesh) o.material = SHADOW_ONLY; }); }


// ============================================================
//  NGƯỜI 3D – thân Quaternius "Universal Base Characters" (CC0) + hoạt ảnh
//  "Universal Animation Library" (CC0), đã chọn lọc vào assets/people/ bằng tools/build_people.py.
//  person(o) trả về ngay 1 Group giữ chỗ; khi tài nguyên tải xong, người thật được dựng vào đó:
//   - quần áo: tô lên texture da theo vùng xương (áo / quần / dép), có chữ in trước ngực
//   - tóc, mũ (mũ cối, nón lá, mũ lưỡi trai, mũ bảo hộ), tà áo dài, tạp dề: gắn vào xương
//   - hoạt ảnh: đứng, nói chuyện, đi, ngồi ghế nhựa, ngồi xổm, sửa xe…
//  o: { female, skin (0-4), shirt, pants, sleeve: "short"|"long"|"none", shorts, collar, plaid,
//       print, num, printC, aodai, dress, apron, shoes: "sandal"|"shoe", shoeC, hair: "short"|"buzz"|"long"|"bun"|"bald",
//       hairC, hat: "coi"|"non"|"cap"|"hard", hatC, beard, pose: "stand"|"talk"|"walk"|"sit"|"eat"|"squat"|"fix"|"drive",
//       still, parent }
// ============================================================
const HUMAN = { ready: false, tpl: {}, hair: {}, clips: {}, skin: {}, info: {} };
const HUMANS = [];
const CLIP_OF = { stand: "Idle_Loop", talk: "Idle_Talking_Loop", walk: "Walk_Loop", sit: "Sitting_Idle_Loop", eat: "Sitting_Talking_Loop", squat: "Crouch_Idle_Loop", fix: "Fixing_Kneeling", drive: "Driving_Loop" };
const HAIR_OF = { short: "hair_simpleparted", buzz: "hair_buzzed", long: "hair_long", bun: "hair_buns" };

function person(o = {}) {
  o = Object.assign({ shirt: "#c8231f", pants: "#2a2c34", hairC: "#1a1410", hatC: "#5f6a3a", shoes: "sandal", shoeC: "#3a5aa8", sleeve: "short", pose: "stand" }, o);
  for (const k of ["shirt", "pants", "hatC", "hairC", "shoeC", "dress", "apron", "printC"]) if (o[k] != null) o[k] = hexCss(o[k]);
  const G = new T.Group();
  (o.parent || scene).add(G);
  const h = { G, o };
  HUMANS.push(h);
  if (HUMAN.ready) buildHuman(h);
  return G;
}

// ---------- Tải tài nguyên người ----------
(function loadHumans() {
  const gl = new T.GLTFLoader(LOADMGR), il = new T.ImageLoader(LOADMGR);
  const jobs = [];
  const job = (fn) => jobs.push(new Promise((res) => fn(res)));
  for (const sex of ["male", "female"]) job((res) => gl.load("assets/people/" + sex + ".gltf", (g) => { HUMAN.tpl[sex] = g.scene; res(); }, undefined, res));
  for (const hn of ["hair_simpleparted", "hair_buzzed", "hair_long", "hair_buns", "hair_beard"]) job((res) => gl.load("assets/people/" + hn + ".gltf", (g) => { HUMAN.hair[hn] = g.scene; res(); }, undefined, res));
  job((res) => gl.load("assets/people/anims.glb", (g) => { g.animations.forEach((a) => (HUMAN.clips[a.name] = a)); res(); }, undefined, res));
  for (const k of ["male_dark", "male_light", "female_dark", "female_light"]) job((res) => il.load("assets/people/body_" + k + ".jpg", (img) => { HUMAN.skin[k] = img; res(); }, undefined, res));
  Promise.all(jobs).then(() => {
    if (!HUMAN.tpl.male || !HUMAN.tpl.female) { console.warn("Thiếu model người – dùng nhân vật dựng bằng code"); HUMANS.forEach((h) => h.G.add(personBox(Object.assign({}, h.o, { still: true, parent: h.G })))); return; }
    prepTemplate("male"); prepTemplate("female");
    HUMAN.ready = true;
    HUMANS.forEach(buildHuman);
  });
})();

// ---------- Phân tích thân mẫu: vùng xương của từng đỉnh, vị trí mặt/ngực ----------
function prepTemplate(sex) {
  let body = null, eyes = null;
  HUMAN.tpl[sex].traverse((m) => {
    if (!m.isSkinnedMesh) return;
    // COLOR_0 của bộ Quaternius là 0–255 không chuẩn hóa => tắt, nếu không mắt/lông mày bị cháy trắng
    m.material.vertexColors = false; m.material.needsUpdate = true;
    if (/Eyes/i.test(m.material.name)) { m.material.roughness = 0.35; m.material.envMapIntensity = 0.6; }
    if (/Superhero/i.test(m.material.name)) body = m;
    if (/Eyes/i.test(m.material.name)) eyes = m;
  });
  const g = body.geometry, pos = g.attributes.position, uv = g.attributes.uv, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  // làm phẳng bớt ngực/cơ bụng của mẫu "siêu anh hùng" => dáng mặc áo phông bình thường
  {
    const cap = sex == "female" ? 0.098 : 0.108, keep = sex == "female" ? 0.25 : 0.45, y0 = 0.95, y1 = 1.45;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), z = pos.getZ(i);
      if (y < y0 || y > y1 || z <= cap || Math.abs(pos.getX(i)) > 0.2) continue;
      const w = Math.min(1, (y - y0) / 0.08, (y1 - y) / 0.08); // mềm ở hai mép
      pos.setZ(i, z - (z - cap) * (1 - keep) * w);
    }
    pos.needsUpdate = true;
  }
  const bones = body.skeleton.bones.map((b) => b.name);
  const n = pos.count, bone = new Array(n);
  let headTop = 0;
  for (let i = 0; i < n; i++) {
    let best = 0, bw = -1;
    const ws = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)], js = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)];
    for (let k = 0; k < 4; k++) if (ws[k] > bw) { bw = ws[k]; best = js[k]; }
    bone[i] = bones[best];
    if (/^Head$|neck/.test(bone[i])) headTop = Math.max(headTop, pos.getY(i));
  }
  eyes.geometry.computeBoundingBox();
  const eb = eyes.geometry.boundingBox;
  // điểm in chữ trước ngực / sau lưng: đỉnh gần nhất với vị trí mong muốn
  const nearest = (x, y, z) => { let bi = 0, bd = 1e9; for (let i = 0; i < n; i++) { const d = (pos.getX(i) - x) ** 2 + (pos.getY(i) - y) ** 2 + (pos.getZ(i) - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
  const chestY = headTop * 0.73;
  HUMAN.info[sex] = {
    body, bone, pos, uv, index: g.index, headTop,
    eyeY: (eb.min.y + eb.max.y) / 2, faceZ: eb.max.z,
    // [tâm, điểm phía trên, điểm bên phải người nhìn] để dựng hệ trục chữ trên UV (tự xử lý UV bị lật)
    chest: [nearest(0, chestY, 0.3), nearest(0, chestY + 0.08, 0.3), nearest(0.08, chestY, 0.3)],
    back: [nearest(0, chestY, -0.3), nearest(0, chestY + 0.08, -0.3), nearest(-0.08, chestY, -0.3)],
  };
}

// Vùng trang phục của 1 đỉnh (tư thế chữ T, đơn vị mét)
function clothOf(bone, x, y, z, o, H) {
  const ax = Math.abs(x);
  if (/^Head$|neck/.test(bone)) return null;
  if (/hand|thumb|index|middle|ring|pinky/.test(bone)) return null;
  if (/spine|clavicle/.test(bone)) return o.sleeve == "none" && ax > 0.13 && y > H * 0.74 ? null : "shirt";
  if (/upperarm/.test(bone)) return o.sleeve == "none" ? null : o.sleeve == "long" || ax < H * 0.19 ? "shirt" : null;
  if (/lowerarm/.test(bone)) return o.sleeve == "long" || o.aodai ? "shirt" : null;
  if (bone == "pelvis") return y > H * 0.53 ? "shirt" : "pants";
  if (/thigh/.test(bone)) return o.shorts && y < H * 0.36 ? null : "pants";
  if (/calf/.test(bone)) return o.shorts ? null : y > 0.11 ? "pants" : o.shoes == "shoe" ? "shoe" : null;
  if (bone == "root") return y > H * 0.53 ? "shirt" : y > H * 0.3 ? "pants" : null;
  if (/foot|ball/.test(bone)) {
    if (o.shoes == "shoe") return "shoe";
    if (y < 0.025) return "sole";
    return y > 0.045 && y < 0.075 && z > 0.02 ? "strap" : null; // dép tổ ong: đế + quai
  }
  return null;
}

// ---------- Texture quần áo (canvas 512, tô theo tam giác UV) ----------
const _bodyTex = {};
function bodyTexture(sex, o) {
  const skinKey = sex + ((o.skin ?? 0) % 2 ? "_light" : "_dark");
  const key = skinKey + JSON.stringify([o.shirt, o.pants, o.sleeve, o.shorts, o.shoes, o.shoeC, o.print, o.num, o.printC, o.plaid, o.collar, o.aodai, o.dress, o.apron]);
  if (_bodyTex[key]) return _bodyTex[key];
  const S = 512, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  x.drawImage(HUMAN.skin[skinKey], 0, 0, S, S);
  const I = HUMAN.info[sex], H = I.headTop, idx = I.index.array;
  const paths = {}, colors = { shirt: o.aodai ? o.dress : o.shirt, pants: o.aodai ? "#f2f0ea" : o.pants, shoe: o.shoeC, sole: "#e8e4dc", strap: o.shoeC };
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], cc = idx[t + 2];
    const cx = (I.pos.getX(a) + I.pos.getX(b) + I.pos.getX(cc)) / 3, cy = (I.pos.getY(a) + I.pos.getY(b) + I.pos.getY(cc)) / 3, cz = (I.pos.getZ(a) + I.pos.getZ(b) + I.pos.getZ(cc)) / 3;
    const r = clothOf(I.bone[a], cx, cy, cz, o, H);
    if (!r) continue;
    const p = paths[r] || (paths[r] = new Path2D());
    p.moveTo(I.uv.getX(a) * S, I.uv.getY(a) * S); p.lineTo(I.uv.getX(b) * S, I.uv.getY(b) * S); p.lineTo(I.uv.getX(cc) * S, I.uv.getY(cc) * S); p.closePath();
  }
  for (const r of ["pants", "shirt", "shoe", "sole", "strap"]) {
    const p = paths[r]; if (!p) continue;
    x.fillStyle = x.strokeStyle = colors[r]; x.lineWidth = 2.5; x.lineJoin = "round";
    x.fill(p); x.stroke(p);
    if (r == "shirt" || r == "pants") { // vải: kẻ ca rô, nếp gấp, bóng nhẹ
      x.save(); x.clip(p);
      if (r == "shirt" && o.plaid) { x.globalAlpha = 0.22; x.fillStyle = "#fff"; for (let k = 0; k < S; k += 14) { x.fillRect(k, 0, 4, S); x.fillRect(0, k, S, 4); } x.globalAlpha = 1; }
      // vân vải nhẹ (không phủ texture da lên nữa => không lộ đồ lót / cơ bụng qua áo)
      for (let k = 0; k < 900; k++) { x.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.045)"; x.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 3, 1 + Math.random() * 3); }
      for (let k = 0; k < 60; k++) { x.strokeStyle = "rgba(0,0,0,.07)"; x.lineWidth = 1.5; const px = Math.random() * S, py = Math.random() * S; x.beginPath(); x.moveTo(px, py); x.lineTo(px + 8, py + 18); x.stroke(); }
      x.restore();
    }
  }
  // chữ in trước ngực / số sau lưng
  const stamp = (tri, text, size) => {
    const P0 = [I.uv.getX(tri[0]) * S, I.uv.getY(tri[0]) * S], Pu = [I.uv.getX(tri[1]) * S, I.uv.getY(tri[1]) * S], Pr = [I.uv.getX(tri[2]) * S, I.uv.getY(tri[2]) * S];
    const ex = [(Pr[0] - P0[0]) / 0.08, (Pr[1] - P0[1]) / 0.08], ey = [-(Pu[0] - P0[0]) / 0.08, -(Pu[1] - P0[1]) / 0.08]; // px trên 1 mét
    x.save(); x.transform(ex[0], ex[1], ey[0], ey[1], P0[0], P0[1]); // 1 đơn vị = 1 mét trên thân
    x.font = "bold 1px 'Oswald', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.scale(size, size); x.fillStyle = o.printC || "#ffe14a"; x.fillText(text, 0, 0); x.restore();
  };
  if (o.print && !o.aodai) stamp(I.chest, o.print, 0.05);
  if (o.num && !o.aodai) stamp(I.back, o.num, 0.14);
  const t = new T.CanvasTexture(c);
  t.flipY = false; t.encoding = T.sRGBEncoding; t.anisotropy = 4;
  return (_bodyTex[key] = t);
}
const _hmat = {};
function hairMat(src, color) {
  const k = src.uuid + color;
  if (_hmat[k]) return _hmat[k];
  const m = src.clone(); m.vertexColors = false; m.color = new T.Color(color).convertSRGBToLinear().multiplyScalar(2.2); m.roughness = 0.7; m.metalness = 0; m.envMapIntensity = 0.4;
  return (_hmat[k] = m);
}

// ---------- Mũ / tà áo dài / tạp dề (mét, tọa độ tư thế chữ T) ----------
function hatMesh(o, I) {
  const y = I.eyeY, z = I.faceZ - 0.085, hc = o.hatC, dk = shade(o.hatC, 0.75), list = [];
  if (o.hat == "coi") {
    list.push([new T.SphereGeometry(0.135, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), hc, mtx(0, y + 0.045, z, 0, 0, 0, 1, 0.9, 1.1)]);
    list.push([cyl(0.18, 0.19, 0.012, 20), dk, mtx(0, y + 0.04, z, 0, 0, 0, 1, 1, 1.15)]);
    list.push([cyl(0.014, 0.016, 0.014, 6), dk, mtx(0, y + 0.17, z)]);
  } else if (o.hat == "non") {
    const cone = new T.ConeGeometry(0.27, 0.2, 20, 1, true);
    list.push([cone, "#d8c28a", mtx(0, I.headTop + 0.04, z)]);
  } else if (o.hat == "cap" || o.hat == "hard") {
    const hard = o.hat == "hard";
    list.push([new T.SphereGeometry(hard ? 0.132 : 0.122, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), hc, mtx(0, y + 0.04, z, -0.06, 0, 0, 1, hard ? 0.95 : 0.85, 1.08)]);
    list.push([BG(0.17, 0.012, hard ? 0.06 : 0.11), dk, mtx(0, y + 0.04, z + (hard ? 0.13 : 0.155), 0.1)]);
  }
  if (!list.length) return null;
  return colorMesh(list.map(([g, c, m]) => [g, new T.Color(c).getHex(), m]));
}
function waistMesh(o) {
  const list = [];
  if (o.aodai) for (const s of [-1, 1]) list.push([BG(0.3, 0.6, 0.012), new T.Color(o.dress).getHex(), mtx(0, 0.68, s * 0.12)]);
  if (o.apron) list.push([BG(0.3, 0.42, 0.01), new T.Color(o.apron).getHex(), mtx(0, 0.78, 0.13)]);
  return list.length ? colorMesh(list) : null;
}
// Gắn vật (tọa độ tư thế chữ T trong không gian root) vào 1 xương, giữ nguyên vị trí
// (dùng ma trận bind của xương nên gắn được cả khi người đang chạy hoạt ảnh)
function attachToBone(root, bone, obj) {
  let sk = null;
  root.traverse((m) => { if (!sk && m.isSkinnedMesh) sk = m.skeleton; });
  const i = sk.bones.indexOf(bone);
  const bind = new T.Matrix4().copy(sk.boneInverses[i]); // = nghịch đảo vị trí xương lúc chữ T
  obj.applyMatrix4(bind);
  bone.add(obj);
}

// ---------- Dựng 1 người vào Group giữ chỗ ----------
function buildHuman(h) {
  const o = h.o, sex = o.female ? "female" : "male", I = HUMAN.info[sex];
  const root = T.SkeletonUtils.clone(HUMAN.tpl[sex]);
  const bodyMat = new T.MeshStandardMaterial({ map: bodyTexture(sex, o), roughness: 0.8, envMapIntensity: 0.4, skinning: true }); // r128: vật liệu da phải bật skinning
  root.traverse((m) => {
    if (!m.isMesh) return;
    m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
    if (/Superhero/i.test(m.material.name)) m.material = bodyMat;
    else if (/Hair/i.test(m.material.name)) m.material = hairMat(m.material, o.hair == "bald" ? "#9a9890" : o.hairC);
  });
  const head = root.getObjectByName("Head"), pelvis = root.getObjectByName("pelvis");
  // tóc
  const hk = o.hair == "bald" ? null : HAIR_OF[o.hair || (o.female ? "long" : "short")] || "hair_simpleparted";
  const fix = (src) => { const c = src.clone(); c.traverse((m) => { if (m.isMesh) { m.material = hairMat(m.material, o.hairC); m.castShadow = true; } }); return c; };
  if (hk && !(o.hat && hk == "hair_buns" && o.hat != "non")) attachToBone(root, head, fix(HUMAN.hair[hk]));
  if (o.beard && HUMAN.hair.hair_beard) attachToBone(root, head, fix(HUMAN.hair.hair_beard));
  const hat = hatMesh(o, I); if (hat) attachToBone(root, head, hat);
  const waist = waistMesh(o); if (waist) attachToBone(root, pelvis, waist);
  h.head = head; h.root = root; h.I = I;
  // người nằm trong nhóm tĩnh (đã gộp) => đặt vào scene theo ma trận thế giới
  let holder = h.G, inST = false;
  for (let p = h.G.parent; p; p = p.parent) if (p === ST) inST = true;
  if (inST || !h.G.parent) { holder = new T.Group(); h.G.updateMatrixWorld(true); h.G.matrixWorld.decompose(holder.position, holder.quaternion, holder.scale); scene.add(holder); }
  root.scale.setScalar(U * (o.female ? 0.9 : 0.93)); // người Việt thấp hơn mẫu gốc
  holder.add(root);
  h.holder = holder;
  // hoạt ảnh (lệch pha ngẫu nhiên để không đồng loạt)
  const clip = HUMAN.clips[CLIP_OF[o.pose] || "Idle_Loop"];
  if (clip) {
    h.mixer = new T.AnimationMixer(root);
    const a = h.mixer.clipAction(clip); a.play();
    h.mixer.update(Math.random() * clip.duration);
  }
}

// Cập nhật hoạt ảnh người ở gần; ẩn người ở xa (gọi trong vòng lặp)
const _hp = new T.Vector3();
function updateHumans(dt) {
  if (!HUMAN.ready) return;
  const L = 55 * (GFX.detail / 80), L2 = L * L;
  for (const h of HUMANS) {
    if (!h.root) continue;
    h.holder.getWorldPosition(_hp);
    const d2 = (_hp.x - P.x) ** 2 + (_hp.z - P.z) ** 2;
    const vis = d2 < L2;
    h.root.visible = vis;
    if (vis && h.mixer && d2 < L2 * 0.5) h.mixer.update(dt);
  }
}
