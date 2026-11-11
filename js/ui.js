// ============================================================
//  GIAO DIỆN: HUD, hộp hỏi đáp (giữ nguyên), bảng đồ họa, bảng hiệu năng
// ============================================================
function drawSpark() {
  const c = $("sp").getContext("2d");
  c.clearRect(0, 0, 140, 36);
  const h = E.hist,
    mx = Math.max(...h, 30),
    mn = Math.min(...h, 10);
  c.strokeStyle = "#ffd45e";
  c.lineWidth = 2;
  c.beginPath();
  h.forEach((v, i) => {
    const x = i * (140 / (h.length - 1)),
      y = 34 - ((v - mn) / (mx - mn)) * 30;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.stroke();
}

// ---------- Hỏi đáp (logic gốc; thêm nhả/khóa chuột) ----------
function qbox(h) { $("qz").innerHTML = '<div class="qb">' + h + "</div>"; $("qz").style.display = "flex"; }
function closeQ() { Q = null; $("qz").style.display = "none"; requestLock(); syncLockHint(); }
function openQuiz(i) { Q = { i, k: 0, sc: 0, a: -1 }; for (const k in keys) keys[k] = 0; releaseLock(); syncLockHint(); renderQ(); }
function renderQ() {
  const d = DATA[Q.i], n = d.q.length;
  if (Q.k >= n) {
    const first = !S.done[Q.i];
    S.done[Q.i] = 1; save();
    const dn = S.done.reduce((a, b) => a + (b ? 1 : 0), 0);
    qbox("<h2>🎉 Hoàn thành " + d.t + "!</h2><p>Bạn trả lời đúng <b style='color:#c4811a'>" + Q.sc + "/" + n + "</b> câu.</p><p class='cr'>💎 " + (first ? "Bạn nhận được 1 Tinh thể Tri thức!" : "Bạn đã có Tinh thể Tri thức của đảo này.") + "</p><p>Tiến độ: " + dn + "/6 đảo (" + Math.round((dn / 6) * 100) + "%)" + (dn == 6 ? " – Chúc mừng, bạn đã khám phá cả sáu hòn đảo!" : "") + '</p><button class="go" onclick="closeQ()">Tiếp tục khám phá</button>');
    return;
  }
  const q = d.q[Q.k];
  qbox('<div class="hd">Chương ' + d.c + " · " + d.t + '</div><div class="bar"><i style="width:' + (Q.k / n) * 100 + '%"></i></div><div class="sm">Câu ' + (Q.k + 1) + "/" + n + "</div><h3>" + q[0] + "</h3>" +
    q[1].map((o, j) => '<button class="op" id="o' + j + '" onclick="pick(' + j + ')"><b>' + "ABCD"[j] + ".</b>" + o + "</button>").join("") + '<div id="fb"></div>');
}
function pick(j) {
  if (!Q || Q.a >= 0) return;
  Q.a = j;
  const q = DATA[Q.i].q[Q.k], ok = j == q[2];
  if (ok) Q.sc++;
  $("o" + j).classList.add(ok ? "ok" : "no");
  $("o" + q[2]).classList.add("ok");
  document.querySelectorAll(".op").forEach((b) => (b.disabled = true));
  $("fb").innerHTML = '<p class="' + (ok ? "g" : "r") + '"><b class="' + (ok ? "g" : "r") + '">' + (ok ? "✔ Chính xác!" : "✘ Chưa đúng.") + "</b> " + q[3] + '</p><button class="go" onclick="nextQ()">' + (Q.k + 1 >= DATA[Q.i].q.length ? "Hoàn thành" : "Câu tiếp theo") + "</button>";
}
function nextQ() { Q.k++; Q.a = -1; renderQ(); }

function syncLockHint() { $("lock").style.display = locked() || Q || GFX_OPEN ? "none" : "flex"; }

// ---------- HUD (gốc) ----------
const MARK_ON = lin(0xffd45e), MARK_OFF = lin(0x5fe0ff);
function hud() {
  const n = near();
  let h = "";
  if (n) {
    if (n.type == "plot") {
      const p = n.o;
      h =
        p.s == 0
          ? "E: gieo hạt (còn " + S.seeds + ")"
          : p.s == 1
            ? "Cây đang lớn " + Math.floor((p.t / GROW) * 100) + "%"
            : "E: thu hoạch";
    } else if (n.type == "shop")
      h = "E: bán lúa mì (" + price() + " vàng) · B: mua hạt giống (8 vàng)";
    else if (n.type == "quiz") h = "E: trò chuyện – " + DATA[n.id].t + " (Chương " + DATA[n.id].c + ")" + (S.done[n.id] ? " ✓ đã hoàn thành" : "");
    else h = "E: mở rương (+150 vàng)";
  }
  $("hint").textContent = h;
  $("hint").style.display = h ? "block" : "none";
  $("cross").classList.toggle("on", !!h);
  let cur = -1;
  for (const o of isl) if (Math.hypot(P.x - o.x, P.z - o.z) < o.r && Math.abs(P.y - o.y) < 3) cur = o.id;
  if (cur != curI) {
    curI = cur;
    if (cur >= 0) {
      $("ib").innerHTML = "<h2>" + ICON[cur] + " " + DATA[cur].t + "</h2><div>Chương " + DATA[cur].c + ": " + DATA[cur].d + "</div>";
      $("ib").style.opacity = 1; $("ib").style.transform = "translate(-50%,0)"; ibT = 4.5;
    }
  }
  $("me").innerHTML = "<b>SÁU HÒN ĐẢO</b><br>📍 " + (cur >= 0 ? DATA[cur].t : "Trên cầu / giữa trời") + "<br>Vàng: <b>" + S.gold + "</b> · Hạt: <b>" + S.seeds + "</b> · Lúa: <b>" + S.wheat + "</b>";
  const pr = price(),
    pv = E.hist[E.hist.length - 2];
  $("pr").innerHTML =
    "<b>" + pr + "</b> vàng " + (pr > pv ? "▲" : pr < pv ? "▼" : "–");
  $("note").textContent = E.note;
  const dn = S.done.reduce((a, b) => a + (b ? 1 : 0), 0);
  $("gl").innerHTML = "Đã hoàn thành: <b>" + dn + "/6</b> đảo · <b>" + Math.round((dn / 6) * 100) + "%</b> · 💎 <b>" + dn + "</b><br>" +
    ICON.map((ic, k) => '<span class="ch' + (S.done[k] ? " d" : "") + (k == cur ? " c" : "") + '" title="' + DATA[k].t + '">' + ic + "</span>").join("") + (S.chest ? "" : "<br><small>○ Tìm rương vàng trên Đảo Tương Lai</small>");
  npcs.forEach((n, k) => n.m.material.color.copy(S.done[k] ? MARK_ON : MARK_OFF));
  drawSpark();
}

// ---------- Bảng đồ họa (G) ----------
let GFX_OPEN = false;
function renderGfx() {
  $("gfx").innerHTML = '<div class="qb gb"><h2>⚙️ Đồ họa</h2><p class="sm">Chỉ thay đổi hình ảnh – không ảnh hưởng gameplay.</p>' +
    Object.keys(QUALITY).map((k) => '<button class="op' + (GFXS.q == k ? " ok" : "") + '" onclick="applyGfx(\'' + k + '\')"><b>' + QUALITY[k].name + "</b> · bóng " + QUALITY[k].shadow + "px · độ phân giải ≤ " + QUALITY[k].maxPR + "x</button>").join("") +
    '<label class="row"><input type="checkbox" ' + (GFXS.auto ? "checked" : "") + ' onchange="GFXS.auto=this.checked;saveGfx()"> Tự động giảm độ phân giải khi FPS thấp</label>' +
    '<label class="row">Độ nhạy chuột <input type="range" min="0.3" max="2.5" step="0.1" value="' + GFXS.sens + '" oninput="GFXS.sens=+this.value;saveGfx()"></label>' +
    '<p class="sm">Độ phân giải texture & normal map áp dụng ở lần tải trang tiếp theo.</p><button class="go" onclick="toggleGfx()">Đóng (G)</button></div>';
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
