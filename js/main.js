// ============================================================
//  VÒNG LẶP GAME – giữ nguyên thứ tự & thời gian mô phỏng của bản gốc
//  (dt bị giới hạn 0.05s như cũ). Phần hình ảnh tách riêng ở visualUpdate().
// ============================================================
// Áp dụng mức đồ họa ngay (không cần tải lại trang)
function applyGfx(k) {
  GFXS.q = k; GFX = QUALITY[k]; saveGfx();
  PR = Math.min(devicePixelRatio || 1, GFX.maxPR);
  R.setPixelRatio(PR); R.setSize(innerWidth, innerHeight);
  sun.shadow.mapSize.set(GFX.shadow, GFX.shadow);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  R.shadowMap.type = GFX.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
  R.shadowMap.needsUpdate = true;
  CLOUDS.forEach((c, i) => (c.visible = i < GFX.clouds));
  SMOKE.forEach((s) => (s.visible = s.userData.k < GFX.smoke));
  RICE.count = Math.round(RICE_MAX * GFX.rice);
  const env = GFX.env ? makeEnv() : null;
  if (scene.environment !== env) {
    scene.environment = env;
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  }
  hemi.intensity = env ? 0.45 : 0.85; // bù ánh sáng môi trường khi tắt env map
  if (GFX_OPEN) renderGfx();
}
applyGfx(GFXS.q);

const camTarget = new T.Vector3();
let bobT = 0, lodT = 0, frame = 0;
// đo hiệu năng
const PERF = { acc: 0, n: 0, fps: 0, ms: 0, worst: 0, adaptT: 0 };

function visualUpdate(dt, moving) {
  // camera góc nhìn thứ nhất (đặt trực tiếp, không trễ)
  const sp = moving && onG ? (keys.ShiftLeft ? 11 : 7) : 0;
  if (sp) bobT += dt * sp * 1.25;
  const bob = sp ? Math.sin(bobT) * FP.bob : 0;
  cam.position.set(P.x, P.y + FP.eye + bob, P.z);
  cam.rotation.set(pitch, yaw, Math.sin(bobT * 0.5) * (sp ? 0.004 : 0));
  const fov = keys.ShiftLeft && moving ? FP.fovRun : FP.fov;
  if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix(); }
  sky.position.copy(cam.position);
  // nắng đi theo người chơi; bám lưới để bóng ít bị rung
  const snap = 84 / GFX.shadow;
  camTarget.set(Math.round(P.x / snap) * snap, P.y, Math.round(P.z / snap) * snap);
  sun.position.set(camTarget.x + 30, camTarget.y + 50, camTarget.z + 20);
  sun.target.position.copy(camTarget);
  if (GFX.shadowEvery > 1) { R.shadowMap.autoUpdate = false; if (frame % GFX.shadowEvery == 0) R.shadowMap.needsUpdate = true; }
  else R.shadowMap.autoUpdate = true;

  U_TIME.value = tt;
  // cờ bay
  const pa = FLAG.m.geometry.attributes.position, b = FLAG.base;
  for (let i = 0; i < pa.count; i++) {
    const x = b[i * 3], k = (x + 1.1) / 2.2;
    pa.array[i * 3 + 2] = Math.sin(x * 2.4 - tt * 5) * 0.14 * k + Math.sin(b[i * 3 + 1] * 3 - tt * 3) * 0.04 * k;
  }
  pa.needsUpdate = true;
  if (frame % 3 == 0) FLAG.m.geometry.computeVertexNormals();
  // khói
  for (const s of SMOKE) {
    if (!s.visible) continue;
    const u = s.userData;
    u.t += dt * 0.18;
    if (u.t > 1) u.t -= 1;
    const t = u.t;
    const k = u.small ? 0.35 : 1;
    s.position.set(u.x + (Math.sin(t * 3 + u.k) * 0.6 + t * 3) * k, u.y + t * 9 * k, u.z + t * 1.5 * k);
    const sz = (1.4 + t * 4.5) * k;
    s.scale.set(sz, sz, 1);
    s.material.opacity = Math.sin(t * Math.PI) * 0.55;
  }
  // mây trôi chậm
  for (const c of CLOUDS) { c.position.x += c.userData.v * dt; if (c.position.x > 260) c.position.x = -260; }
  // LOD: ẩn chi tiết nhỏ ở xa (4 lần/giây)
  lodT += dt;
  if (lodT > 0.25) {
    lodT = 0;
    const d2 = GFX.detail * GFX.detail;
    for (const m of DETAIL) { const dx = m.userData.cx - P.x, dz = m.userData.cz - P.z; m.visible = dx * dx + dz * dz < d2; }
    updatePropLOD(false);
  }
  // người chơi (chỉ đổ bóng) – vung tay theo bước chân
  hero.armL.rotation.x = -hero.legL.rotation.x * 0.8;
  hero.armR.rotation.x = -hero.legR.rotation.x * 0.8;
  updateHumans(dt);
}

function adapt(rawMs) {
  PERF.acc += rawMs; PERF.n++; PERF.worst = Math.max(PERF.worst, rawMs);
  PERF.adaptT += rawMs;
  if (PERF.adaptT < 1000) return;
  PERF.ms = PERF.acc / PERF.n; PERF.fps = 1000 / PERF.ms;
  // độ phân giải động: chỉ đổi render scale, không đụng tới mô phỏng
  if (GFXS.auto && !document.hidden) {
    const maxPR = Math.min(devicePixelRatio || 1, GFX.maxPR), minPR = Math.min(GFX.minPR, maxPR);
    let np = PR;
    if (PERF.ms > 22 && PR > minPR) np = Math.max(minPR, PR - 0.15);
    else if (PERF.ms < 13 && PR < maxPR) np = Math.min(maxPR, PR + 0.1);
    if (np != PR) { PR = np; R.setPixelRatio(PR); R.setSize(innerWidth, innerHeight); }
  }
  if (PERF_ON) {
    const i = R.info;
    $("perf").innerHTML = "FPS <b>" + PERF.fps.toFixed(0) + "</b> · " + PERF.ms.toFixed(1) + " ms (tệ nhất " + PERF.worst.toFixed(0) + ")<br>Draw calls " + i.render.calls + " · Tam giác " + (i.render.triangles / 1000).toFixed(1) + "k<br>Geometry " + i.memory.geometries + " · Texture " + i.memory.textures + "<br>Chất lượng " + GFX.name + " · pixel ratio " + PR.toFixed(2);
  }
  PERF.acc = PERF.n = PERF.adaptT = PERF.worst = 0;
}

let last = performance.now(),
  acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const raw = now - last;
  const dt = Math.min(0.05, raw / 1000);
  last = now;
  tt += dt;
  frame++;
  const kk = Q || GFX_OPEN ? {} : keys;
  if (kk.ArrowLeft) yaw += dt * 2;
  if (kk.ArrowRight) yaw -= dt * 2;
  const mx = (kk.KeyD ? 1 : 0) - (kk.KeyA ? 1 : 0),
    mz = (kk.KeyW ? 1 : 0) - (kk.KeyS ? 1 : 0),
    sp = kk.ShiftLeft ? 11 : 7;
  let dx = -Math.sin(yaw) * mz + Math.cos(yaw) * mx,
    dz = -Math.cos(yaw) * mz - Math.sin(yaw) * mx;
  const l = Math.hypot(dx, dz);
  if (l > 0) {
    dx /= l;
    dz /= l;
    P.x += dx * sp * dt;
    P.z += dz * sp * dt;
    hero.rotation.y = Math.atan2(dx, dz);
  }
  if (kk.Space && onG) {
    vy = 11;
    onG = false;
  }
  vy -= 22 * dt;
  P.y += vy * dt;
  collide();
  const g = groundAt(P.x, P.y, P.z);
  if (vy <= 0 && P.y <= g) {
    P.y = g;
    vy = 0;
    onG = true;
  } else if (P.y > g + 0.05) onG = false;
  if (P.y < -30) {
    P.x = 0;
    P.y = 0;
    P.z = 8;
    vy = 0;
    say("Bạn bị kẹt! Quay lại ngã tư.");
  }
  hero.position.set(P.x, P.y, P.z);
  const sw = l > 0 && onG ? Math.sin(tt * 12) * 0.7 : 0;
  hero.legL.rotation.x = sw;
  hero.legR.rotation.x = -sw;
  merch.rotation.y = Math.atan2(
    P.x - merch.position.x,
    P.z - merch.position.z,
  );
  { // đi qua lại dọc lối chợ, quay đầu ở hai đầu
    const ph = tt * 0.09, s = Math.sin(ph);
    vill.position.set(VILL_C.x + s * VILL_C.r, 0.2, VILL_C.z);
    vill.rotation.y = Math.cos(ph) >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  for (const f of floaters) {
    f.m.position.y = f.y0 + Math.sin(tt * f.s + f.p) * f.a;
    f.m.rotation.y += dt * f.r;
  }
  npcs.forEach((n) => { if (Math.hypot(P.x - n.x, P.z - n.z) < 14) n.g.rotation.y = Math.atan2(P.x - n.x, P.z - n.z); });
  if (ibT > 0 && (ibT -= dt) <= 0) $("ib").style.opacity = 0;

  for (const p of plots) {
    if (p.s == 1) {
      p.t += dt;
      if (p.t >= GROW) p.s = 2;
    }
    p.c.visible = p.s > 0;
    if (p.s) {
      const k = p.s == 2 ? 1 : 0.25 + (0.75 * p.t) / GROW;
      p.c.scale.set(k, k, k);
      p.c.position.y = 0.2 + 0.6 * k;
      p.c.material.color.copy(p.s == 2 ? CROP_RIPE : CROP_GREEN);
    }
  }
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) $("toast").style.opacity = 0;
  }
  acc += dt;
  if (acc > 0.2) {
    acc = 0;
    hud();
  }
  visualUpdate(dt, l > 0);
  R.render(scene, cam);
  adapt(raw);
}
syncLockHint();
requestAnimationFrame(loop);
