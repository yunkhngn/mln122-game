// ============================================================
//  ĐIỀU KHIỂN GÓC NHÌN THỨ NHẤT + VẬT LÝ + TƯƠNG TÁC
//  Vật lý (tốc độ 7/11, nhảy 11, trọng lực 22, groundAt, hồi sinh) và
//  logic tương tác (near / act / buy) giữ nguyên bản gốc.
// ============================================================
const keys = {};
let yaw = -1.0,   // hướng nhìn ban đầu: về phía khu chợ và dãy nhà ống
  pitch = -0.05,
  drag = false;
const P = { x: 0, y: 0, z: 8 };
let Q = null, curI = -1, ibT = 0;
let vy = 0,
  onG = true,
  tt = 0;

// ---------- Khóa con trỏ (Pointer Lock) ----------
const locked = () => document.pointerLockElement === R.domElement;
function requestLock() {
  if (Q || GFX_OPEN || locked()) return;
  try { const p = R.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function releaseLock() { if (locked()) document.exitPointerLock(); }
document.addEventListener("pointerlockchange", () => { $("lock").style.display = locked() || Q || GFX_OPEN ? "none" : "flex"; });

addEventListener("keydown", (e) => {
  if (Q) {
    e.preventDefault();
    const n = DATA[Q.i].q.length;
    if (e.code == "Escape") closeQ();
    else if (e.code == "Enter" || e.code == "Space") { if (Q.k >= n) closeQ(); else if (Q.a >= 0) nextQ(); }
    else if (Q.k < n && Q.a < 0) { const j = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase()); if (j >= 0 && e.key.length == 1) pick(j); }
    return;
  }
  if (e.code == "KeyG") return toggleGfx();
  if (e.code == "KeyP") return togglePerf();
  if (GFX_OPEN) { if (e.code == "Escape") toggleGfx(); return; }
  keys[e.code] = 1;
  if (e.code == "Space") e.preventDefault();
  if (e.code == "KeyE") act();
  if (e.code == "KeyB") buy();
});
addEventListener("keyup", (e) => (keys[e.code] = 0));
addEventListener("blur", () => { for (const k in keys) keys[k] = 0; });

R.domElement.onpointerdown = () => { drag = true; requestLock(); };
addEventListener("pointerup", () => (drag = false));
addEventListener("pointermove", (e) => {
  if (Q || GFX_OPEN) return;
  if (locked()) {
    const s = FP.sens * GFXS.sens;
    yaw -= e.movementX * s;
    pitch -= e.movementY * s;
  } else if (drag) { // dự phòng khi trình duyệt chặn pointer lock: kéo chuột để nhìn
    yaw -= e.movementX * 0.006;
    pitch -= e.movementY * 0.006;
  }
  pitch = Math.max(-1.45, Math.min(1.45, pitch));
});

const groundAt = (x, y, z) => {
  let g = -1e9;
  for (const i of isl) {
    const dx = x - i.x,
      dz = z - i.z;
    if (dx * dx + dz * dz < i.r * i.r && i.y <= y + 0.6) g = Math.max(g, i.y);
  }
  for (const b of bridges) {
    const rx = x - b.sx, rz = z - b.sz, t = rx * b.ux + rz * b.uz, pp = rx * b.uz - rz * b.ux;
    if (t >= 0 && t <= b.len && Math.abs(pp) < b.w) {
      const h = b.ya + ((b.yb - b.ya) * t) / b.len;
      if (h <= y + 0.6) g = Math.max(g, h);
    }
  }
  return g;
};

function near() {
  const c = plots.map((p) => ({
    type: "plot",
    o: p,
    x: p.x,
    y: 0,
    z: p.z,
    r: 2.2,
  }));
  c.push({ type: "shop", x: SH.x, y: 0, z: SH.z, r: 4 });
  npcs.forEach((n, id) => c.push({ type: "quiz", id, x: n.x, y: n.y, z: n.z, r: 4 }));
  if (!S.chest) c.push({ type: "chest", x: CH.x, y: CH.y, z: CH.z, r: 3 });
  let b = null,
    bd = 1e9;
  for (const t of c) {
    const d = Math.hypot(P.x - t.x, P.z - t.z);
    if (d < t.r && Math.abs(P.y - t.y) < 2.5 && d < bd) {
      bd = d;
      b = t;
    }
  }
  return b;
}
let toastT = 0;
function say(m) {
  $("toast").textContent = m;
  $("toast").style.opacity = 1;
  toastT = 2.5;
}
function act() {
  const n = near();
  if (!n) return;
  if (n.type == "plot") {
    const p = n.o;
    if (p.s == 0) {
      if (S.seeds < 1)
        return say("Hết hạt giống. Ra quầy thương nhân, nhấn B để mua.");
      S.seeds--;
      p.s = 1;
      p.t = 0;
    } else if (p.s == 2) {
      p.s = 0;
      S.wheat++;
      say("+1 lúa mì");
    } else say("Cây vẫn đang lớn…");
  } else if (n.type == "shop") {
    if (S.wheat < 1) return say("Bạn chưa có lúa mì để bán.");
    const pr = price();
    S.wheat--;
    S.gold += pr;
    E.D *= 0.94;
    clampD();
    say("Bán 1 lúa mì được " + pr + " vàng");
  } else if (n.type == "quiz") openQuiz(n.id);
  else if (n.type == "chest") {
    S.chest = 1;
    S.gold += 150;
    chest.visible = false;
    say("Mở rương trên đảo cao: +150 vàng!");
  }
}
function buy() {
  const n = near();
  if (!n || n.type != "shop") return;
  if (S.gold < 8) return say("Không đủ vàng (hạt giống 8 vàng).");
  S.gold -= 8;
  S.seeds++;
  say("Mua 1 hạt giống (-8 vàng)");
}
