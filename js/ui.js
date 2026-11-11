// ============================================================
//  GIAO DIỆN "giấy bao cấp": sổ ghi chép, bản đồ phường, bảng yết giá, phiếu tem,
//  đề kiểm tra (hỏi đáp – logic gốc), bảng đồ họa, bảng hiệu năng. Không dùng emoji.
// ============================================================
const INK = { paper: "#ede1c5", paper2: "#e1d1ae", block: "#cdb994", ink: "#3b2b1d", ink2: "#6b5a47", ink3: "#93836d", red: "#b03a2b", blue: "#2f4e8e", green: "#3f7a4f", road: "#f7efda" };
const DPR = Math.min(2, devicePixelRatio || 1);
function hiDPI(c) { // canvas sắc nét trên màn hình retina, vẽ theo đơn vị CSS
  const w = c.width, h = c.height;
  c.width = w * DPR; c.height = h * DPR;
  const x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0);
  return { x, w, h };
}

// ---------- Biểu đồ giá trên giấy ô li ----------
const SP = hiDPI($("sp"));
function drawSpark() {
  const { x: c, w, h } = SP, hist = E.hist;
  c.clearRect(0, 0, w, h);
  c.strokeStyle = "rgba(47,78,142,.18)"; c.lineWidth = 1;
  for (let i = 0; i <= w; i += 8) { c.beginPath(); c.moveTo(i + 0.5, 0); c.lineTo(i + 0.5, h); c.stroke(); }
  for (let j = 0; j <= h; j += 8) { c.beginPath(); c.moveTo(0, j + 0.5); c.lineTo(w, j + 0.5); c.stroke(); }
  const mx = Math.max(...hist, 30), mn = Math.min(...hist, 10);
  const px = (i) => 4 + i * ((w - 8) / (hist.length - 1)), py = (v) => h - 5 - ((v - mn) / (mx - mn)) * (h - 10);
  c.strokeStyle = INK.ink; c.lineWidth = 1.6; c.lineJoin = "round";
  c.beginPath(); hist.forEach((v, i) => (i ? c.lineTo(px(i), py(v)) : c.moveTo(px(i), py(v)))); c.stroke();
  const L = hist.length - 1;
  c.fillStyle = INK.red; c.beginPath(); c.arc(px(L), py(hist[L]), 2.6, 0, 6.28); c.fill();
}

// ============================================================
//  BẢN ĐỒ PHƯỜNG (Bắc ở trên). Nền vẽ 1 lần từ dữ liệu va chạm SOLID, lớp trên cập nhật theo người chơi.
// ============================================================
const MAP = hiDPI($("map"));
const MR = 128;                                   // nửa bề rộng vùng bản đồ (đơn vị thế giới)
const mxp = (x) => ((x + MR) / (2 * MR)) * MAP.w, myp = (z) => ((z + MR) / (2 * MR)) * MAP.h;
function buildMapBase() {
  const c = document.createElement("canvas"); c.width = MAP.w * DPR; c.height = MAP.h * DPR;
  const x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0);
  const W = MAP.w, H = MAP.h, k = W / (2 * MR);
  x.fillStyle = INK.paper; x.fillRect(0, 0, W, H);
  // lưới tọa độ mảnh
  x.strokeStyle = "rgba(107,90,71,.12)"; x.lineWidth = 0.5;
  for (let g = -120; g <= 120; g += 20) { x.beginPath(); x.moveTo(mxp(g), 0); x.lineTo(mxp(g), H); x.moveTo(0, myp(g)); x.lineTo(W, myp(g)); x.stroke(); }
  // ruộng ven đô: gạch chéo xanh
  x.save(); x.beginPath(); x.rect(mxp(-118), myp(13), (118 - 60) * k, (72 - 13) * k); x.clip();
  x.fillStyle = "rgba(63,122,79,.12)"; x.fillRect(0, 0, W, H);
  x.strokeStyle = "rgba(63,122,79,.45)"; x.lineWidth = 0.6;
  for (let i = -H; i < W; i += 4) { x.beginPath(); x.moveTo(i, H); x.lineTo(i + H, 0); x.stroke(); }
  x.restore();
  // nhà và khối xây (hộp va chạm cao): nâu nhạt, viền mực
  x.fillStyle = INK.block; x.strokeStyle = INK.ink3; x.lineWidth = 0.4;
  for (const b of SOLID) {
    if (b.top < 2.4 || b.x1 - b.x0 > 80 || b.z1 - b.z0 > 80) continue;
    const rx = mxp(b.x0), ry = myp(b.z0), rw = Math.max(0.8, (b.x1 - b.x0) * k), rh = Math.max(0.8, (b.z1 - b.z0) * k);
    x.fillRect(rx, ry, rw, rh); x.strokeRect(rx, ry, rw, rh);
  }
  // đường phố: nền sáng, mép kẻ đôi
  x.fillStyle = INK.road;
  x.fillRect(0, myp(-ROAD), W, ROAD * 2 * k); x.fillRect(mxp(-ROAD), 0, ROAD * 2 * k, H);
  x.strokeStyle = INK.ink2; x.lineWidth = 0.8;
  for (const s of [-ROAD, ROAD]) {
    x.beginPath(); x.moveTo(0, myp(s)); x.lineTo(mxp(-ROAD), myp(s)); x.moveTo(mxp(ROAD), myp(s)); x.lineTo(W, myp(s)); x.stroke();
    x.beginPath(); x.moveTo(mxp(s), 0); x.lineTo(mxp(s), myp(-ROAD)); x.moveTo(mxp(s), myp(ROAD)); x.lineTo(mxp(s), H); x.stroke();
  }
  // tên phố
  x.fillStyle = INK.ink2; x.font = "600 5.5px 'IBM Plex Mono', monospace"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText("PHỐ CHỢ", mxp(66), myp(0)); x.fillText("PHỐ CHỢ", mxp(-66), myp(0));
  for (const z of [-66, 66]) { x.save(); x.translate(mxp(0), myp(z)); x.rotate(-Math.PI / 2); x.fillText("PHỐ VĂN HÓA", 0, 0); x.restore(); }
  // ranh giới các khu chủ đề: nét đứt đỏ
  x.setLineDash([3, 2]); x.strokeStyle = "rgba(176,58,43,.7)"; x.lineWidth = 0.9;
  for (const l of LOTS) if (!(l[0] < -100 && l[2] > 0)) x.strokeRect(mxp(l[0]), myp(l[2]), (l[1] - l[0]) * k, (l[3] - l[2]) * k);
  x.setLineDash([]);
  x.fillStyle = INK.green; x.font = "600 5.5px 'IBM Plex Mono', monospace"; x.fillText("RUỘNG", mxp(-88), myp(52));
  // khung đôi + la bàn
  x.strokeStyle = INK.ink; x.lineWidth = 1.2; x.strokeRect(1, 1, W - 2, H - 2);
  x.lineWidth = 0.5; x.strokeRect(4, 4, W - 8, H - 8);
  const cx = W - 16, cy = 18;
  x.fillStyle = INK.ink; x.beginPath(); x.moveTo(cx, cy - 9); x.lineTo(cx + 4, cy + 3); x.lineTo(cx, cy); x.lineTo(cx - 4, cy + 3); x.closePath(); x.fill();
  x.font = "700 8px 'Oswald', sans-serif"; x.fillText("B", cx, cy + 9);
  return c;
}
let MAP_BASE = buildMapBase();
function drawMap(cur) {
  const { x, w, h } = MAP;
  x.clearRect(0, 0, w, h);
  x.drawImage(MAP_BASE, 0, 0, w, h);
  x.textAlign = "center"; x.textBaseline = "middle";
  // quầy thu mua lúa
  x.fillStyle = INK.ink; x.fillRect(mxp(SH.x) - 2, myp(SH.z) - 2, 4, 4);
  // rương vàng (dấu x đỏ) khi chưa mở
  if (!S.chest) {
    const a = mxp(CH.x), b = myp(CH.z);
    x.strokeStyle = INK.red; x.lineWidth = 1.6; x.beginPath(); x.moveTo(a - 3, b - 3); x.lineTo(a + 3, b + 3); x.moveTo(a + 3, b - 3); x.lineTo(a - 3, b + 3); x.stroke();
  }
  // 6 khu: số La Mã trong vòng tròn; xong => dấu đỏ; đang đứng => vòng xanh
  for (const z of ZONES) {
    const a = mxp(z.x), b = myp(z.z), done = !!S.done[z.id];
    x.fillStyle = done ? INK.red : INK.paper; x.strokeStyle = done ? INK.red : INK.ink; x.lineWidth = 1.2;
    x.beginPath(); x.arc(a, b, 6.5, 0, 6.28); x.fill(); x.stroke();
    if (z.id == cur) { x.strokeStyle = INK.blue; x.lineWidth = 1.6; x.beginPath(); x.arc(a, b, 9, 0, 6.28); x.stroke(); }
    x.fillStyle = done ? INK.paper : INK.ink; x.font = "700 6.5px 'Oswald', sans-serif"; x.fillText(ROMAN[z.id], a, b + 0.5);
  }
  // người chơi: mũi tên mực xanh + quạt tầm nhìn
  const a = mxp(P.x), b = myp(P.z), ang = Math.atan2(-Math.sin(yaw), -Math.cos(yaw)); // hướng nhìn trên bản đồ
  x.save(); x.translate(a, b); x.rotate(ang);
  x.fillStyle = "rgba(47,78,142,.16)"; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 17, -0.55, 0.55); x.closePath(); x.fill();
  x.fillStyle = INK.blue; x.strokeStyle = INK.paper; x.lineWidth = 1;
  x.beginPath(); x.moveTo(5.5, 0); x.lineTo(-3.5, 3.5); x.lineTo(-1.5, 0); x.lineTo(-3.5, -3.5); x.closePath(); x.fill(); x.stroke();
  x.restore();
}

// ---------- Phiếu tem: dựng 6 con tem một lần ----------
const TEMS = ROMAN.map((r, k) => {
  const t = document.createElement("div");
  t.className = "tem"; t.title = DATA[k].t + " (Chương " + DATA[k].c + ")";
  t.innerHTML = '<span class="no">' + r + '</span><span class="nm">' + ZONE_SHORT[k] + '</span><i class="dau">Đã học</i>';
  $("stamps").appendChild(t);
  return t;
});

// ============================================================
//  ĐỀ KIỂM TRA (logic gốc; thêm nhả/khóa chuột)
// ============================================================
function qbox(h) { $("qz").innerHTML = '<div class="qb" role="dialog" aria-modal="true">' + h + "</div>"; $("qz").style.display = "flex"; }
function closeQ() { Q = null; $("qz").style.display = "none"; requestLock(); syncLockHint(); }
function openQuiz(i) { Q = { i, k: 0, sc: 0, a: -1 }; for (const k in keys) keys[k] = 0; releaseLock(); syncLockHint(); renderQ(); }
function qHead(d, right) {
  return '<div class="qhead"><div class="t">Đề kiểm tra · Chương ' + d.c + "<small>" + d.t + " · " + d.d + '</small></div><div class="qno">' + right + "</div></div>";
}
function renderQ() {
  const d = DATA[Q.i], n = d.q.length;
  if (Q.k >= n) {
    // chỉ được đóng dấu tem khi làm đúng hết bài kiểm tra
    const pass = Q.sc == n, had = !!S.done[Q.i];
    if (pass && !had) { S.done[Q.i] = 1; save(); }
    const dn = S.done.reduce((a, b) => a + (b ? 1 : 0), 0);
    qbox(qHead(d, Q.sc + "/" + n) +
      '<p class="done-h">' + (pass ? "Đạt · " : "Chưa đạt · ") + d.t + "</p>" +
      '<p class="score">Trả lời đúng <b>' + Q.sc + " trên " + n + "</b> câu." + (pass ? "" : " Cần đúng cả " + n + " câu mới được đóng dấu tem.") + "</p>" +
      '<span class="bigstamp' + (pass ? "" : " fail") + '">' + (pass ? (had ? "Tem " + ROMAN[Q.i] + " đã có" : "Đã đóng dấu tem " + ROMAN[Q.i]) : "Chưa đạt") + "</span>" +
      '<p class="sm">Phiếu tem: ' + dn + "/6 khu (" + Math.round((dn / 6) * 100) + "%)" + (dn == 6 ? ". Đã đi hết sáu khu phố." : "") + "</p>" +
      (pass ? '<button class="go" onclick="closeQ()">Tiếp tục đi phố</button>'
            : '<button class="go" onclick="retryQ()">Làm lại (R)</button> <button class="go ghost" onclick="closeQ()">Để sau</button>'));
    return;
  }
  const q = d.q[Q.k];
  qbox(qHead(d, "Câu " + (Q.k + 1) + "/" + n) +
    '<div class="qdots">' + d.q.map((_, j) => '<i class="' + (j < Q.k ? "on" : j == Q.k ? "now" : "") + '"></i>').join("") + "</div>" +
    "<h3>" + q[0] + "</h3>" +
    q[1].map((o, j) => '<button class="op" id="o' + j + '" onclick="pick(' + j + ')"><b>' + "ABCD"[j] + "</b><span>" + o + "</span></button>").join("") + '<div id="fb"></div>');
}
function pick(j) {
  if (!Q || Q.a >= 0) return;
  Q.a = j;
  const q = DATA[Q.i].q[Q.k], ok = j == q[2];
  if (ok) Q.sc++;
  $("o" + j).classList.add(ok ? "ok" : "no");
  $("o" + q[2]).classList.add("ok");
  document.querySelectorAll(".op").forEach((b) => (b.disabled = true));
  $("fb").innerHTML = '<p><span class="verdict ' + (ok ? "g" : "r") + '">' + (ok ? "Đúng" : "Chưa đúng") + "</span>" + q[3] + '</p><button class="go" onclick="nextQ()">' + (Q.k + 1 >= DATA[Q.i].q.length ? "Nộp bài" : "Câu tiếp theo") + "</button>";
}
function nextQ() { Q.k++; Q.a = -1; renderQ(); }
function retryQ() { Q = { i: Q.i, k: 0, sc: 0, a: -1 }; renderQ(); }

function syncLockHint() { $("lock").style.display = locked() || Q || GFX_OPEN ? "none" : "flex"; }

// ============================================================
//  HUD – cập nhật 5 lần/giây (chỉ đổi chữ/lớp, không dựng lại HTML)
// ============================================================
const MARK_ON = lin(0xd8402e), MARK_OFF = lin(0x5fe0ff);
const K = (k) => "<kbd>" + k + "</kbd> ";
let lastHint = null;
function hud() {
  const n = near();
  let h = "";
  if (n) {
    if (n.type == "plot") {
      const p = n.o;
      h = p.s == 0 ? K("E") + "gieo hạt (còn " + S.seeds + ")" : p.s == 1 ? "Lúa đang lớn " + Math.floor((p.t / GROW) * 100) + "%" : K("E") + "thu hoạch";
    } else if (n.type == "shop") h = K("E") + "bán lúa (" + price() + " vàng) · " + K("B") + "mua hạt giống (8 vàng)";
    else if (n.type == "quiz") h = K("E") + "trò chuyện: " + DATA[n.id].t + " (Chương " + DATA[n.id].c + ")" + (S.done[n.id] ? " · đã đóng dấu" : "");
    else h = K("E") + "mở rương (+150 vàng)";
  }
  if (h !== lastHint) { $("hint").innerHTML = h; $("hint").style.display = h ? "block" : "none"; lastHint = h; }
  $("cross").classList.toggle("on", !!h);
  let cur = -1;
  for (const o of ZONES) if (Math.hypot(P.x - o.x, P.z - o.z) < o.r) cur = o.id;
  if (cur != curI) {
    curI = cur;
    if (cur >= 0) {
      $("ib").innerHTML = '<header class="band">Khu ' + ROMAN[cur] + " · Chương " + DATA[cur].c + "</header><h2>" + DATA[cur].t + "</h2><p>" + DATA[cur].d + "</p>";
      $("ib").style.opacity = 1; $("ib").style.transform = "translate(-50%,0)"; ibT = 4.5;
    }
  }
  // sổ ghi chép
  $("loc").textContent = cur >= 0 ? DATA[cur].t : "Trên phố";
  $("v-gold").textContent = S.gold; $("v-seed").textContent = S.seeds; $("v-rice").textContent = S.wheat;
  // bảng yết giá
  const pr = price(), pv = E.hist[E.hist.length - 2], tr = $("trend");
  $("pr").textContent = pr;
  tr.textContent = pr > pv ? "▲" : pr < pv ? "▼" : "=";
  tr.className = "trend" + (pr > pv ? " up" : pr < pv ? " dn" : "");
  tr.title = pr > pv ? "Giá tăng" : pr < pv ? "Giá giảm" : "Giá đứng";
  $("note").textContent = E.note;
  // phiếu tem
  const dn = S.done.reduce((a, b) => a + (b ? 1 : 0), 0);
  $("v-done").textContent = dn + "/6 · " + Math.round((dn / 6) * 100) + "%";
  TEMS.forEach((t, k) => { t.classList.toggle("d", !!S.done[k]); t.classList.toggle("c", k == cur); });
  $("task").classList.toggle("done", !!S.chest);
  npcs.forEach((n, k) => { const t = S.done[k] ? n.done : n.todo; if (n.m.material.map !== t) { n.m.material.map = t; n.m.material.needsUpdate = true; } });
  drawSpark();
  drawMap(cur);
}

// ---------- Bảng đồ họa (G) ----------
let GFX_OPEN = false;
function renderGfx() {
  $("gfx").innerHTML = '<div class="qb gb"><h2>Đồ họa</h2><p class="sm">Chỉ đổi hình ảnh, không ảnh hưởng cách chơi.</p>' +
    Object.keys(QUALITY).map((k, i) => '<button class="op' + (GFXS.q == k ? " ok" : "") + '" onclick="applyGfx(\'' + k + '\')"><b>' + (i + 1) + "</b><span>" + QUALITY[k].name + " · bóng " + QUALITY[k].shadow + "px · độ phân giải tối đa " + QUALITY[k].maxPR + "x</span></button>").join("") +
    '<label class="row"><input type="checkbox" ' + (GFXS.auto ? "checked" : "") + ' onchange="GFXS.auto=this.checked;saveGfx()"> Tự giảm độ phân giải khi FPS thấp</label>' +
    '<label class="row">Độ nhạy chuột <input type="range" min="0.3" max="2.5" step="0.1" value="' + GFXS.sens + '" oninput="GFXS.sens=+this.value;saveGfx()"></label>' +
    '<p class="sm">Độ phân giải texture áp dụng ở lần tải trang sau.</p><button class="go" onclick="toggleGfx()">Đóng (G)</button></div>';
}
function toggleGfx() {
  GFX_OPEN = !GFX_OPEN;
  if (GFX_OPEN) { for (const k in keys) keys[k] = 0; releaseLock(); renderGfx(); }
  $("gfx").style.display = GFX_OPEN ? "flex" : "none";
  if (!GFX_OPEN) requestLock();
  syncLockHint();
}
// ---------- Bảng hiệu năng (P) ----------
let PERF_ON = false;
function togglePerf() { PERF_ON = !PERF_ON; $("perf").style.display = PERF_ON ? "block" : "none"; }
// Bản đồ nền dùng font web: vẽ lại khi font tải xong
if (document.fonts) document.fonts.ready.then(() => { MAP_BASE = buildMapBase(); });
// Bảng hướng dẫn phím tự ẩn sau 15 giây (phím H để gọi lại)
setTimeout(() => $("ct").classList.add("off"), 15000);
