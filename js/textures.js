// ============================================================
//  TEXTURE THỦ TỤC (procedural) – vẽ bằng canvas lúc tải trang.
//  Không tải ảnh ngoài => nhẹ, chạy offline, dễ chỉnh màu/hoa văn ở đây.
//  Tất cả đều tileable (lặp liền mạch). Normal map được sinh từ heightmap.
// ============================================================
const TX = (() => {
  const S = TEX_GEN.size;
  const cache = {};

  // ---- noise tileable ----
  function hash(x, y, s) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vn(x, y, px, py, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
    const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fcache = {};
  // fbm(px, py, octaves, seed): chu kỳ px*py ô, trả về Float32Array S*S trong [0,1]
  function fbm(px, py, oct, seed) {
    const k = px + "_" + py + "_" + oct + "_" + seed;
    if (fcache[k]) return fcache[k];
    const out = new Float32Array(S * S);
    let amp = 0.5, tot = 0;
    for (let o = 0; o < oct; o++) {
      const ppx = px << o, ppy = py << o, sx = ppx / S, sy = ppy / S;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) out[y * S + x] += vn(x * sx, y * sy, ppx, ppy, seed + o * 17) * amp;
      tot += amp; amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return (fcache[k] = out);
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sst = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h || w; return c; }

  // Vẽ từng pixel: fn(x,y,i,o) ghi o[0..2]=RGB (0-255), o[3]=height (0-1)
  function paint(fn) {
    const c = canvas(S), ctx = c.getContext("2d"), img = ctx.createImageData(S, S), d = img.data;
    const h = new Float32Array(S * S), o = [0, 0, 0, 0.5];
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = y * S + x;
        o[3] = 0.5; fn(x, y, i, o);
        d[i * 4] = o[0]; d[i * 4 + 1] = o[1]; d[i * 4 + 2] = o[2]; d[i * 4 + 3] = 255; h[i] = o[3];
      }
    ctx.putImageData(img, 0, 0);
    return { c, ctx, h };
  }
  function normalFromHeight(h, str) {
    const c = canvas(S), ctx = c.getContext("2d"), img = ctx.createImageData(S, S), d = img.data;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const l = h[y * S + ((x - 1 + S) % S)], r = h[y * S + ((x + 1) % S)];
        const u = h[((y - 1 + S) % S) * S + x], dn = h[((y + 1) % S) * S + x];
        const nx = -(r - l) * str, ny = -(u - dn) * str, len = Math.hypot(nx, ny, 1), i = (y * S + x) * 4;
        d[i] = (nx / len * 0.5 + 0.5) * 255; d[i + 1] = (ny / len * 0.5 + 0.5) * 255; d[i + 2] = (1 / len * 0.5 + 0.5) * 255; d[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  function tex(c, srgb, repeat = true) {
    const t = new T.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = Math.min(MAX_ANISO, GFX.aniso);
    if (srgb) t.encoding = T.sRGBEncoding;
    return t;
  }

  // ---------------- Định nghĩa từng chất liệu ----------------
  const GEN = {
    grass() { // cỏ nhiệt đới, có mảng đất
      const a = fbm(4, 4, 4, 11), b = fbm(48, 48, 2, 12), d = fbm(3, 3, 3, 13);
      return [paint((x, y, i, o) => {
        const n = a[i], f = 0.82 + 0.36 * b[i], dirt = sst(0.62, 0.78, d[i]) * 0.75;
        o[0] = mix(mix(70, 112, n) * f, 124 * f, dirt); o[1] = mix(mix(112, 148, n) * f, 102 * f, dirt);
        o[2] = mix(mix(40, 56, n) * f, 70 * f, dirt); o[3] = b[i] * 0.6 + n * 0.4;
      }), 2.5];
    },
    soil() {
      const a = fbm(6, 6, 4, 21), b = fbm(64, 64, 1, 22);
      return [paint((x, y, i, o) => {
        const n = a[i], sp = b[i] > 0.8 ? 1.25 : 1;
        o[0] = mix(78, 116, n) * sp; o[1] = mix(56, 84, n) * sp; o[2] = mix(38, 58, n) * sp; o[3] = n * 0.7 + b[i] * 0.3;
      }), 3];
    },
    rock() { // đá có vân tầng
      const a = fbm(4, 4, 5, 31), c = fbm(16, 16, 2, 32);
      return [paint((x, y, i, o) => {
        const s = 0.5 + 0.5 * Math.sin((y / S) * Math.PI * 2 * 6 + a[i] * 7), t = 0.45 * a[i] + 0.3 * s + 0.25 * c[i];
        o[0] = mix(72, 150, t); o[1] = mix(68, 140, t); o[2] = mix(64, 126, t); o[3] = t;
      }), 4];
    },
    planks() { // ván gỗ cầu (8 tấm / ô)
      const g = fbm(2, 32, 3, 41), w = fbm(4, 4, 3, 42), rows = 8, rh = S / rows;
      return [paint((x, y, i, o) => {
        const ry = Math.floor(y / rh), fy = (y % rh) / rh, tone = 0.82 + 0.3 * hash(ry, 3, 5);
        const jx = hash(ry, 7, 9) * S, joint = Math.abs(x - jx) < S / 200 + 1;
        const gap = fy < 0.07 || fy > 0.95 || joint, gr = 0.75 + 0.5 * g[i], grey = w[i] * 0.45;
        if (gap) { o[0] = 38; o[1] = 30; o[2] = 24; o[3] = 0; return; }
        o[0] = mix(150 * tone * gr, 128, grey); o[1] = mix(104 * tone * gr, 118, grey); o[2] = mix(64 * tone * gr, 104, grey);
        o[3] = 0.7 + 0.3 * g[i];
      }), 3];
    },
    plaster() { // tường vôi/sơn có vết ố mưa và ẩm chân tường – màu trắng để tint
      const n = fbm(6, 6, 4, 51), st = fbm(40, 1, 2, 52), sp = fbm(24, 24, 2, 53);
      return [paint((x, y, i, o) => {
        const top = 1 - y / S, streak = sst(0.52, 0.8, st[i]) * Math.pow(top, 1.4) * 0.28;
        const damp = sst(0.72, 1, y / S) * (0.4 + 0.6 * n[i]) * 0.22, spots = sst(0.7, 0.85, sp[i]) * 0.1;
        const v = 240 * (1 - (n[i] - 0.5) * 0.1 - streak - damp - spots);
        o[0] = v; o[1] = v * 0.985; o[2] = v * 0.95; o[3] = n[i] * 0.6 + sp[i] * 0.4;
      }), 1.2];
    },
    roof() { // ngói đỏ xếp hàng
      const m = fbm(4, 4, 4, 61), rows = 8, cols = 8, rh = S / rows, cw = S / cols;
      return [paint((x, y, i, o) => {
        const ry = Math.floor(y / rh), fy = (y % rh) / rh, xo = x + (ry % 2) * cw * 0.5;
        const cx = Math.floor(xo / cw), fx = (xo % cw) / cw, curv = Math.sin(fx * Math.PI);
        const tone = 0.8 + 0.35 * hash(cx % cols, ry, 7), sh = fy > 0.84 ? 0.55 : 1, moss = sst(0.6, 0.85, m[i]) * 0.35;
        const k = tone * (0.68 + 0.4 * curv) * sh;
        o[0] = mix(176 * k, 90, moss); o[1] = mix(86 * k, 92, moss); o[2] = mix(54 * k, 58, moss); o[3] = curv * 0.6 + (1 - fy) * 0.4;
      }), 4];
    },
    tin() { // tôn sóng (để tint màu), có gỉ sét
      const r = fbm(5, 5, 4, 71), d = fbm(40, 2, 2, 72);
      return [paint((x, y, i, o) => {
        const c = 0.5 + 0.5 * Math.sin((x / S) * Math.PI * 2 * 14), rust = sst(0.66, 0.82, r[i]) * 0.8;
        const v = 215 * (0.72 + 0.28 * c) * (0.9 + 0.1 * d[i]);
        o[0] = mix(v, 150, rust); o[1] = mix(v, 92, rust); o[2] = mix(v, 60, rust); o[3] = c;
      }), 3.5];
    },
    paving() { // gạch lát vỉa hè đỏ 4x4
      const n = fbm(6, 6, 4, 81), cells = 4, cs = S / cells, gw = Math.max(2, S / 128);
      return [paint((x, y, i, o) => {
        const fx = x % cs, fy = y % cs, grout = fx < gw || fy < gw, t = hash(Math.floor(x / cs), Math.floor(y / cs), 3);
        if (grout) { o[0] = 92; o[1] = 86; o[2] = 80; o[3] = 0; return; }
        const k = (0.85 + 0.25 * t) * (0.85 + 0.25 * n[i]);
        o[0] = 172 * k; o[1] = 92 * k; o[2] = 70 * k; o[3] = 0.8 + 0.2 * n[i];
      }), 3];
    },
    asphalt() {
      const n = fbm(8, 8, 3, 91);
      return [paint((x, y, i, o) => {
        const sp = hash(x, y, 9), v = 50 + n[i] * 22 + (sp > 0.94 ? 38 : 0) - (sp < 0.04 ? 12 : 0);
        o[0] = v; o[1] = v; o[2] = v * 1.05; o[3] = sp * 0.5 + n[i] * 0.5;
      }), 2];
    },
    concrete() { // bê tông có vết nứt
      const n = fbm(4, 4, 5, 101), f = fbm(64, 64, 1, 102);
      const r = paint((x, y, i, o) => {
        const v = 156 + (n[i] - 0.5) * 46 + (f[i] - 0.5) * 16;
        o[0] = v; o[1] = v * 0.985; o[2] = v * 0.95; o[3] = n[i] * 0.6 + f[i] * 0.4;
      });
      const ctx = r.ctx; ctx.strokeStyle = "rgba(55,52,48,.45)"; ctx.lineWidth = Math.max(1, S / 300);
      for (let k = 0; k < 5; k++) { // vết nứt ngẫu nhiên (cố định theo seed)
        let px = hash(k, 1, 103) * S, py = hash(k, 2, 103) * S, a = hash(k, 3, 103) * 6.28;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let s = 0; s < 14; s++) { a += (hash(k, s, 104) - 0.5) * 1.2; px += Math.cos(a) * S / 40; py += Math.sin(a) * S / 40; ctx.lineTo(px, py); }
        ctx.stroke();
      }
      return [r, 0.6];
    },
    glass() { // mặt dựng kính văn phòng 4x4 ô
      const cells = 4, cs = S / cells, fw = cs * 0.1;
      return [paint((x, y, i, o) => {
        const fx = x % cs, fy = y % cs, frame = fx < fw || fy < fw || fy > cs - fw * 0.6;
        if (frame) { o[0] = 78; o[1] = 82; o[2] = 88; o[3] = 1; return; }
        const t = hash(Math.floor(x / cs), Math.floor(y / cs), 5), g = 1 - fy / cs;
        const cur = t > 0.75 ? 1.35 : 1;
        o[0] = (70 + 30 * g) * cur; o[1] = (96 + 34 * g) * cur; o[2] = (122 + 36 * g) * cur; o[3] = 0;
      }), 3];
    },
    water() { // nước ruộng đục
      const n = fbm(5, 5, 4, 111), r = fbm(32, 32, 2, 112);
      return [paint((x, y, i, o) => {
        const t = n[i]; o[0] = mix(56, 92, t); o[1] = mix(72, 104, t); o[2] = mix(52, 74, t); o[3] = r[i];
      }), 0.6];
    },
    leaf() {
      const n = fbm(8, 8, 3, 121), f = fbm(32, 32, 2, 122);
      return [paint((x, y, i, o) => {
        const k = 0.78 + 0.44 * f[i]; o[0] = mix(46, 96, n[i]) * k; o[1] = mix(88, 140, n[i]) * k; o[2] = mix(32, 50, n[i]) * k; o[3] = f[i];
      }), 2];
    },
    bark() {
      const n = fbm(24, 2, 3, 131);
      return [paint((x, y, i, o) => {
        const k = 0.7 + 0.5 * n[i]; o[0] = 98 * k; o[1] = 76 * k; o[2] = 56 * k; o[3] = n[i];
      }), 4];
    },
    brick() { // gạch đỏ
      const n = fbm(6, 6, 3, 141), rows = 8, rh = S / rows, bw = S / 4, mw = Math.max(2, S / 110);
      return [paint((x, y, i, o) => {
        const ry = Math.floor(y / rh), xo = x + (ry % 2) * bw * 0.5, mort = (y % rh) < mw || (xo % bw) < mw;
        if (mort) { o[0] = 170; o[1] = 162; o[2] = 150; o[3] = 0; return; }
        const k = (0.8 + 0.3 * hash(Math.floor(xo / bw), ry, 2)) * (0.88 + 0.2 * n[i]);
        o[0] = 150 * k; o[1] = 72 * k; o[2] = 52 * k; o[3] = 0.8;
      }), 3];
    },
    metal() { // kim loại chải xước
      const n = fbm(2, 64, 2, 151), m = fbm(4, 4, 3, 152);
      return [paint((x, y, i, o) => {
        const v = 168 + (n[i] - 0.5) * 40 - m[i] * 20; o[0] = v; o[1] = v * 1.01; o[2] = v * 1.03; o[3] = n[i];
      }), 1];
    },
  };

  function get(name) {
    if (cache[name]) return cache[name];
    const [r, nstr] = GEN[name]();
    const out = { map: tex(r.c, true) };
    if (TEX_GEN.normals) out.normalMap = tex(normalFromHeight(r.h, nstr * (S / 256)), false);
    return (cache[name] = out);
  }

  // ---- Biển hiệu phố Việt (vẽ chữ lên canvas, có vết ố / rỉ / bạc màu) ----
  // o: { title, sub, top, bg, fg, kind: "vinyl" | "wood" | "board" | "plain", font, ar (tỉ lệ ngang/dọc) }
  const SIGNS = [], signCache = {};
  const FONT = { bold: "'Oswald', 'Arial Narrow', Arial, sans-serif", round: "'Be Vietnam Pro', Arial, sans-serif", script: "'Pacifico', 'Brush Script MT', cursive" };
  function drawSign(c, o, seed) {
    const w = c.width, h = c.height, x = c.getContext("2d");
    const R = (k) => hash(seed, k, 77);
    x.clearRect(0, 0, w, h);
    if (o.kind == "wood") { // ván gỗ bạc màu
      x.fillStyle = o.bg || "#b07a45"; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 90; k++) {
        const yy = R(k) * h, a = 0.05 + R(k + 300) * 0.12;
        x.strokeStyle = R(k + 600) > 0.5 ? "rgba(60,30,10," + a + ")" : "rgba(255,230,180," + a * 0.7 + ")";
        x.lineWidth = 1 + R(k + 900) * 3; x.beginPath(); x.moveTo(0, yy);
        for (let s = 0; s <= 8; s++) x.lineTo((s / 8) * w, yy + Math.sin(s * 1.3 + k) * 4 * R(k + 50));
        x.stroke();
      }
      for (let k = 1; k < 3; k++) { x.fillStyle = "rgba(40,20,5,.35)"; x.fillRect(0, (k * h) / 3 - 2, w, 3); }
    } else {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, o.bg || "#c8231f"); g.addColorStop(1, o.bg2 || o.bg || "#c8231f");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      if (o.kind != "plain") { // viền
        x.strokeStyle = o.border || "rgba(255,255,255,.85)"; x.lineWidth = h * 0.035;
        x.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h * 0.1 > 0 ? h - h * 0.1 : 0);
      }
    }
    x.textAlign = "center"; x.textBaseline = "middle";
    const fit = (txt, size, y, font, color, stroke) => {
      let s = size;
      const set = () => (x.font = (font == FONT.script ? "" : "bold ") + s + "px " + font);
      set();
      while (x.measureText(txt).width > w * 0.9 && s > 8) { s -= 2; set(); }
      if (stroke) { x.lineJoin = "round"; x.strokeStyle = stroke; x.lineWidth = s * 0.14; x.strokeText(txt, w / 2, y); }
      x.fillStyle = color; x.fillText(txt, w / 2, y);
    };
    const fg = o.fg || "#ffe14a", f = FONT[o.font || "bold"];
    if (o.top) fit(o.top, h * 0.15, h * 0.17, FONT.round, o.topc || "#ffffff");
    const ty = o.top ? (o.sub ? 0.5 : 0.58) : o.sub ? 0.4 : 0.53;
    fit(o.title, h * (o.sub || o.top ? 0.42 : 0.56), h * ty, f, fg, o.stroke);
    if (o.sub) fit(o.sub, h * 0.15, h * (o.top ? 0.83 : 0.8), FONT.round, o.subc || "#ffffff");
    // phong hóa: bạc màu, vệt nước chảy, rỉ góc, đốm bẩn
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = "rgba(255,250,235," + (0.06 + R(1) * 0.12) + ")"; x.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const sx = R(k + 10) * w, sw = 2 + R(k + 40) * 10, sh = h * (0.2 + R(k + 70) * 0.8);
      const gr = x.createLinearGradient(0, 0, 0, sh);
      gr.addColorStop(0, "rgba(50,35,20," + (0.08 + R(k + 90) * 0.18) + ")"); gr.addColorStop(1, "rgba(50,35,20,0)");
      x.fillStyle = gr; x.fillRect(sx, 0, sw, sh);
    }
    for (let k = 0; k < 4; k++) { // rỉ sét ở mép
      const cx = R(k + 200) > 0.5 ? w * R(k + 210) : (R(k + 220) > 0.5 ? 0 : w), cy = R(k + 230) * h, rr = h * (0.1 + R(k + 240) * 0.25);
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, "rgba(110,55,20,.45)"); gr.addColorStop(1, "rgba(110,55,20,0)");
      x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
    for (let k = 0; k < 60; k++) { x.fillStyle = "rgba(0,0,0," + (0.03 + R(k + 400) * 0.07) + ")"; x.fillRect(R(k + 500) * w, R(k + 600) * h, 2 + R(k + 700) * 16, 1 + R(k + 800) * 6); }
    const bot = x.createLinearGradient(0, h * 0.7, 0, h); bot.addColorStop(0, "rgba(30,20,10,0)"); bot.addColorStop(1, "rgba(30,20,10,.25)");
    x.fillStyle = bot; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "source-over";
  }
  function sign(o) {
    if (typeof o == "string") o = { title: arguments[0], sub: arguments[1], bg: arguments[2], fg: arguments[3] };
    const k = JSON.stringify(o);
    if (signCache[k]) return signCache[k];
    const ar = o.ar || 4, w = 1024, h = Math.round(w / ar), c = canvas(w, h);
    let seed = 0; for (let i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) | 0;
    drawSign(c, o, seed);
    const t = tex(c, true, false);
    SIGNS.push({ c, o, seed, t });
    return (signCache[k] = t);
  }
  // Vẽ lại biển khi web font (Oswald, Be Vietnam Pro, Pacifico) tải xong
  function redrawSigns() { for (const s of SIGNS) { drawSign(s.c, s.o, s.seed); s.t.needsUpdate = true; } for (const f of PAPERS) { f.draw(); f.t.needsUpdate = true; } }
  if (document.fonts) document.fonts.ready.then(redrawSigns);

  // ---- Giấy dán tường: lịch, thực đơn, áp phích (canvas nhỏ) ----
  const PAPERS = [];
  function paper(kind, a, b) {
    const k = "paper" + kind + a + b;
    if (cache[k]) return cache[k];
    const c = canvas(256, kind == "menu" ? 384 : 320), x = c.getContext("2d"), w = c.width, h = c.height;
    const draw = () => {
      x.textAlign = "center"; x.textBaseline = "middle";
      if (kind == "calendar") {
        x.fillStyle = "#f4efe2"; x.fillRect(0, 0, w, h);
        x.fillStyle = "#c8231f"; x.fillRect(0, 0, w, h * 0.3);
        x.fillStyle = "#ffe14a"; x.font = "bold 34px " + FONT.round; x.fillText("LỊCH " + (a || "2026"), w / 2, h * 0.15);
        x.fillStyle = "#c8231f"; x.font = "bold 120px " + FONT.bold; x.fillText(b || "12", w / 2, h * 0.6);
        x.fillStyle = "#333"; x.font = "bold 22px " + FONT.round; x.fillText("Âm lịch: 23", w / 2, h * 0.88);
      } else if (kind == "menu") { // bảng thực đơn quán
        x.fillStyle = "#1d2a22"; x.fillRect(0, 0, w, h);
        x.strokeStyle = "#c9a96a"; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12);
        x.fillStyle = "#ffd45e"; x.font = "bold 40px " + FONT.bold; x.fillText(a || "THỰC ĐƠN", w / 2, 44);
        const items = (b || "Phở tái|Phở chín|Bún chả|Cơm rang|Trà đá").split("|");
        x.font = "26px " + FONT.round; x.textAlign = "left";
        items.forEach((it, i) => { x.fillStyle = "#f4efe2"; x.fillText(it, 22, 100 + i * 52); x.textAlign = "right"; x.fillStyle = "#ffd45e"; x.fillText((30 + i * 5) + "k", w - 22, 100 + i * 52); x.textAlign = "left"; });
      } else { // áp phích quảng cáo
        const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, a || "#2f6ad9"); g.addColorStop(1, "#111");
        x.fillStyle = g; x.fillRect(0, 0, w, h);
        x.fillStyle = "#fff"; x.font = "bold 44px " + FONT.bold; x.fillText(b || "KHUYẾN MÃI", w / 2, h * 0.3);
        x.fillStyle = "#ffe14a"; x.font = "bold 70px " + FONT.bold; x.fillText("-50%", w / 2, h * 0.6);
      }
      x.fillStyle = "rgba(120,90,40,.12)"; x.fillRect(0, 0, w, h);
    };
    draw();
    const t = tex(c, true, false);
    PAPERS.push({ draw, t });
    return (cache[k] = t);
  }

  // ---- Chùm lá (tấm có alpha) cho cây kiểu "card" ----
  function leafCard(kind) {
    const k = "leafcard" + kind;
    if (cache[k]) return cache[k];
    const s = 512, c = canvas(s), x = c.getContext("2d");
    const big = kind == "bang", n = big ? 150 : 520, L = big ? 34 : 15;
    for (let i = 0; i < n; i++) {
      const r = hash(i, 1, kind.length), a = hash(i, 2, 9) * 6.28, d = Math.pow(hash(i, 3, 9), 0.6) * s * 0.46;
      const px = s / 2 + Math.cos(a) * d, py = s / 2 + Math.sin(a) * d * 0.85;
      const shade = 0.55 + 0.45 * (1 - d / (s * 0.46)) * 0.6 + r * 0.25;
      const gch = big ? [70, 120, 40] : [62, 108, 38];
      x.save(); x.translate(px, py); x.rotate(hash(i, 4, 9) * 6.28);
      x.fillStyle = "rgb(" + Math.round(gch[0] * shade + (r > 0.92 ? 60 : 0)) + "," + Math.round(gch[1] * shade + (r > 0.92 ? 40 : 0)) + "," + Math.round(gch[2] * shade) + ")";
      x.beginPath(); x.ellipse(0, 0, L * (0.7 + r * 0.6), L * 0.42 * (0.7 + r * 0.6), 0, 0, 6.28); x.fill();
      x.strokeStyle = "rgba(20,40,10,.35)"; x.lineWidth = 1; x.beginPath(); x.moveTo(-L * 0.6, 0); x.lineTo(L * 0.6, 0); x.stroke();
      x.restore();
    }
    // vài cành nhỏ
    x.strokeStyle = "rgba(70,50,30,.8)"; x.lineWidth = 3;
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(s / 2, s / 2); x.lineTo(s / 2 + Math.cos(i) * s * 0.3, s / 2 + Math.sin(i) * s * 0.25); x.stroke(); }
    const t = tex(c, true, false);
    return (cache[k] = t);
  }

  // ---- Vệt bẩn chảy dọc tường (xám, tileable theo chiều ngang) ----
  function grime() {
    if (cache.grime) return cache.grime;
    const s = 256, c = canvas(s), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const sx = hash(i, 1, 5) * s, sw = 2 + hash(i, 2, 5) * 12, y0 = hash(i, 3, 5) * s, len = s * (0.15 + hash(i, 4, 5) * 0.5);
      const g = x.createLinearGradient(0, y0, 0, y0 + len);
      const a = 0.08 + hash(i, 5, 5) * 0.22;
      g.addColorStop(0, "rgba(40,36,30," + a + ")"); g.addColorStop(1, "rgba(40,36,30,0)");
      x.fillStyle = g;
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0]) x.fillRect(sx + ox, y0 + oy, sw, len);
    }
    const t = tex(c, false, true);
    return (cache.grime = t);
  }

  function flag() { // Quốc kỳ: nền đỏ sao vàng năm cánh
    const w = 384, h = 256, c = canvas(w, h), x = c.getContext("2d");
    x.fillStyle = "#da251d"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#ffff00"; x.beginPath();
    const cx = w / 2, cy = h / 2, R1 = h * 0.3, R2 = R1 * 0.382;
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? R2 : R1;
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    x.closePath(); x.fill();
    return tex(c, true, false);
  }

  function soft(kind) { // sprite mây / khói mềm
    const s = 128, c = canvas(s), x = c.getContext("2d");
    const blobs = kind == "cloud" ? 9 : 4;
    for (let k = 0; k < blobs; k++) {
      const bx = s * (0.3 + 0.4 * hash(k, 1, kind.length)), by = s * (0.38 + 0.24 * hash(k, 2, kind.length)), br = s * (0.18 + 0.14 * hash(k, 3, kind.length));
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    }
    const t = tex(c, true, false);
    return t;
  }


  // ---- Khóm lúa (alpha): lá mảnh cong, sáng dần lên ngọn; vẽ màu nhạt để tô (tint) xanh hoặc vàng ----
  function riceCard(ripe) {
    const k = "rice" + ripe;
    if (cache[k]) return cache[k];
    const W = 128, H = 256, c = canvas(W, H), x = c.getContext("2d");
    for (let i = 0; i < 46; i++) {
      const r = hash(i, 1, 41), r2 = hash(i, 2, 41), lean = (r - 0.5) * 1.5, len = H * (0.55 + 0.42 * r2);
      const x0 = W / 2 + (hash(i, 3, 41) - 0.5) * 14, tipx = x0 + lean * W * 0.45, tipy = H - len;
      const g = x.createLinearGradient(0, H, 0, tipy);
      const b = 0.72 + 0.28 * hash(i, 4, 41);
      g.addColorStop(0, "rgba(" + Math.round(150 * b) + "," + Math.round(170 * b) + "," + Math.round(110 * b) + ",1)");
      g.addColorStop(1, "rgba(" + Math.round(235 * b) + "," + Math.round(245 * b) + "," + Math.round(190 * b) + ",1)");
      x.strokeStyle = g; x.lineWidth = 2.6 - r * 1.2; x.lineCap = "round";
      x.beginPath(); x.moveTo(x0, H); x.quadraticCurveTo(x0 + lean * 10, H - len * 0.6, tipx, tipy); x.stroke();
    }
    if (ripe) for (let i = 0; i < 9; i++) { // bông lúa trĩu hạt
      let px = W / 2 + (hash(i, 5, 42) - 0.5) * 50, py = H * (0.12 + 0.12 * hash(i, 6, 42)); const dir = hash(i, 7, 42) > 0.5 ? 1 : -1;
      for (let j = 0; j < 14; j++) { x.fillStyle = "rgba(255,246,200," + (0.85 - j * 0.03) + ")"; x.beginPath(); x.ellipse(px, py, 2.4, 3.6, dir * 0.6, 0, 6.28); x.fill(); px += dir * (1.4 + j * 0.25); py += 3 + j * 0.2; }
    }
    const t = tex(c, true, false);
    return (cache[k] = t);
  }
  // ---- Lá chuối (alpha): phiến dài, gân giữa, gân xiên, mép rách ----
  function bananaLeaf() {
    if (cache.banana) return cache.banana;
    const W = 128, H = 512, c = canvas(W, H), x = c.getContext("2d");
    x.beginPath(); x.moveTo(W / 2, H);
    for (let i = 0; i <= 20; i++) { const t = i / 20, w = Math.sin(Math.PI * Math.min(1, t * 1.05)) * W * 0.47; x.lineTo(W / 2 + w, H - t * H); }
    for (let i = 20; i >= 0; i--) { const t = i / 20, w = Math.sin(Math.PI * Math.min(1, t * 1.05)) * W * 0.47; x.lineTo(W / 2 - w, H - t * H); }
    x.closePath();
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#5a8a2a"); g.addColorStop(0.5, "#7aae3a"); g.addColorStop(1, "#4e7e24");
    x.fillStyle = g; x.fill();
    x.strokeStyle = "rgba(30,60,10,.35)"; x.lineWidth = 1;
    for (let yy = H - 20; yy > 20; yy -= 7) for (const s of [-1, 1]) { x.beginPath(); x.moveTo(W / 2, yy); x.lineTo(W / 2 + s * W * 0.48, yy - 26); x.stroke(); }
    x.fillStyle = "#c8d89a"; x.fillRect(W / 2 - 2.5, 0, 5, H); // gân giữa
    x.globalCompositeOperation = "destination-out"; // vết rách do gió
    for (let i = 0; i < 14; i++) { const yy = 40 + hash(i, 1, 51) * (H - 80), s = hash(i, 2, 51) > 0.5 ? 1 : -1; x.beginPath(); x.moveTo(W / 2 + s * 8, yy); x.lineTo(W / 2 + s * W * 0.5, yy - 24); x.lineTo(W / 2 + s * W * 0.5, yy - 21); x.lineTo(W / 2 + s * 9, yy + 2); x.fill(); }
    x.globalCompositeOperation = "source-over";
    const t = tex(c, true, false);
    return (cache.banana = t);
  }
  // ---- Nón lá: vòng lá xếp lớp (theo chiều cao) + nan tre (theo vòng) ----
  function nonLa() {
    if (cache.non) return cache.non;
    const W = 256, H = 128, c = canvas(W, H), x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#e9dcae"); g.addColorStop(1, "#cdb57a");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) { x.fillStyle = "rgba(120,90,40," + (0.04 + hash(i, 1, 61) * 0.06) + ")"; x.fillRect(hash(i, 2, 61) * W, hash(i, 3, 61) * H, 1, 3 + hash(i, 4, 61) * 9); }
    for (let yy = 6; yy < H; yy += 9) { x.fillStyle = "rgba(110,80,35,.35)"; x.fillRect(0, yy, W, 1.5); x.fillStyle = "rgba(255,250,225,.35)"; x.fillRect(0, yy + 2, W, 1); }
    for (let i = 0; i < 32; i++) { x.fillStyle = "rgba(120,90,45,.16)"; x.fillRect((i / 32) * W, 0, 1.5, H); }
    const t = tex(c, true, false);
    return (cache.non = t);
  }


  // ---- Mặt tiền nhà nền (lặp được): 2 tầng × 2 gian, cửa sổ kính/chớp, chuồng cọp, cục nóng, gờ ban công, vệt mưa ----
  function facade() {
    if (cache.facade) return cache.facade;
    const S2 = 512, c = canvas(S2), x = c.getContext("2d"), C = S2 / 2;
    x.fillStyle = "#dcd4c2"; x.fillRect(0, 0, S2, S2);
    for (let i = 0; i < 2500; i++) { x.fillStyle = "rgba(90,80,60," + hash(i, 1, 71) * 0.06 + ")"; x.fillRect(hash(i, 2, 71) * S2, hash(i, 3, 71) * S2, 2, 2); }
    for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
      const ox = cx * C, oy = cy * C, kind = (cx + cy * 2) % 4;
      x.fillStyle = "#b8b2a4"; x.fillRect(ox, oy + C - 18, C, 18);            // gờ ban công / sàn
      x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(ox, oy + C - 2, C, 4);
      const wx = ox + 64, wy = oy + 40, ww = 128, wh = 150;
      if (kind == 3) { // cửa chớp gỗ xanh
        x.fillStyle = "#3f6a52"; x.fillRect(wx, wy, ww, wh);
        x.fillStyle = "rgba(0,0,0,.25)"; for (let yy = wy + 6; yy < wy + wh; yy += 10) x.fillRect(wx + 4, yy, ww - 8, 3);
        x.fillStyle = "#2a3e30"; x.fillRect(wx + ww / 2 - 2, wy, 4, wh);
      } else {
        const g = x.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, "#5c6e7c"); g.addColorStop(1, "#2a333c");
        x.fillStyle = g; x.fillRect(wx, wy, ww, wh);
        x.fillStyle = "rgba(220,235,245,.25)"; x.fillRect(wx + 8, wy + 8, 30, wh - 16);
        x.strokeStyle = "#ece6da"; x.lineWidth = 6; x.strokeRect(wx, wy, ww, wh); x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
      }
      if (kind == 1 || kind == 2) { // chuồng cọp
        x.strokeStyle = "rgba(30,32,34,.9)"; x.lineWidth = 3;
        for (let bx = wx - 10; bx <= wx + ww + 10; bx += 12) { x.beginPath(); x.moveTo(bx, wy - 12); x.lineTo(bx, wy + wh + 8); x.stroke(); }
        x.strokeRect(wx - 10, wy - 12, ww + 20, wh + 20); x.beginPath(); x.moveTo(wx - 10, wy + wh / 2); x.lineTo(wx + ww + 10, wy + wh / 2); x.stroke();
      }
      if (kind != 3) { x.fillStyle = "#e8e6e0"; x.fillRect(ox + 198, oy + 26, 46, 30); x.fillStyle = "#6a6a66"; x.beginPath(); x.arc(ox + 221, oy + 41, 10, 0, 6.28); x.fill(); } // cục nóng điều hòa
    }
    for (let i = 0; i < 40; i++) { // vệt mưa chảy
      const sx = hash(i, 4, 71) * S2, sy = hash(i, 5, 71) * S2, len = 60 + hash(i, 6, 71) * 160, g = x.createLinearGradient(0, sy, 0, sy + len);
      g.addColorStop(0, "rgba(60,50,35,.22)"); g.addColorStop(1, "rgba(60,50,35,0)"); x.fillStyle = g; x.fillRect(sx, sy, 3 + hash(i, 7, 71) * 8, len);
    }
    const t = tex(c, true, true);
    return (cache.facade = { map: t });
  }
  // ---- Vân vỏ hoa quả / rau (đốm nhỏ, dùng chung với màu đỉnh) ----
  function speckle() {
    if (cache.speckle) return cache.speckle;
    const c = canvas(128), x = c.getContext("2d");
    x.fillStyle = "#f2f2f2"; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { const v = 170 + Math.round(hash(i, 1, 81) * 80); x.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; x.fillRect(hash(i, 2, 81) * 128, hash(i, 3, 81) * 128, 1 + hash(i, 4, 81) * 2, 1 + hash(i, 5, 81) * 2); }
    const t = tex(c, true, true);
    return (cache.speckle = t);
  }
  // ---- Tem lơ lửng trên đầu NPC: số La Mã trên giấy; học xong => dấu đỏ "ĐÃ HỌC" ----
  function marker(roman, done) {
    const k = "mk" + roman + done;
    if (cache[k]) return cache[k];
    const c = canvas(128), x = c.getContext("2d");
    const draw = () => {
      x.clearRect(0, 0, 128, 128);
      x.fillStyle = "#efe3c4"; x.beginPath(); x.arc(64, 64, 54, 0, 6.28); x.fill();
      x.strokeStyle = "#3b2b1d"; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 54, 0, 6.28); x.stroke();
      x.setLineDash([4, 4]); x.lineWidth = 1.5; x.beginPath(); x.arc(64, 64, 46, 0, 6.28); x.stroke(); x.setLineDash([]);
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillStyle = done ? "#8a7a64" : "#3b2b1d"; x.font = "700 46px " + FONT.bold; x.fillText(roman, 64, 62);
      if (done) {
        x.save(); x.translate(64, 64); x.rotate(-0.35);
        x.strokeStyle = "#b03a2b"; x.lineWidth = 4; x.strokeRect(-50, -15, 100, 30);
        x.fillStyle = "#b03a2b"; x.font = "700 20px " + FONT.bold; x.fillText("ĐÃ HỌC", 0, 1); x.restore();
      }
    };
    draw();
    const t = tex(c, true, false);
    PAPERS.push({ draw, t });
    return (cache[k] = t);
  }
  // ---- Bảng nhãn hàng tạp hóa 4×4 (tên hàng chung chung, không nhãn hiệu thật) ----
  const GOODS = [["MÌ TÔM", "#f2c21a", "#c8231f"], ["BIA LON", "#1f7a3a", "#f2f2ea"], ["NƯỚC MẮM", "#8a3a14", "#f6e2b0"], ["DẦU ĂN", "#f0d040", "#1d4f9c"],
    ["BỘT GIẶT", "#2a6ad0", "#ffffff"], ["SỮA ĐẶC", "#f4f0e6", "#1d4f9c"], ["BÁNH QUY", "#c8231f", "#ffe14a"], ["NƯỚC NGỌT", "#e0302a", "#ffffff"],
    ["MUỐI", "#f4f4f0", "#2a6ad0"], ["ĐƯỜNG", "#f4ecd8", "#8a3a14"], ["CÀ PHÊ", "#3a2416", "#e8c070"], ["CHÈ", "#2a6a2a", "#f2e8c0"],
    ["KẸO", "#e86aa8", "#ffffff"], ["XÀ PHÒNG", "#8ac8e8", "#1d3f6c"], ["NƯỚC SUỐI", "#d8ecf8", "#1d4f9c"], ["MÌ GÓI", "#e8601a", "#fff3c0"]];
  function goods() {
    if (cache.goods) return cache.goods;
    const c = canvas(512), x = c.getContext("2d");
    const draw = () => GOODS.forEach(([name, bg, fg], i) => {
      const ox = (i % 4) * 128, oy = Math.floor(i / 4) * 128;
      x.fillStyle = bg; x.fillRect(ox, oy, 128, 128);
      x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(ox, oy + 8, 128, 14);
      x.fillStyle = fg; x.fillRect(ox + 10, oy + 40, 108, 3); x.fillRect(ox + 10, oy + 90, 108, 3);
      x.textAlign = "center"; x.textBaseline = "middle"; x.font = "700 22px " + FONT.bold;
      let sz = 22; while (x.measureText(name).width > 112 && sz > 10) { sz -= 2; x.font = "700 " + sz + "px " + FONT.bold; }
      x.fillText(name, ox + 64, oy + 66);
      x.font = "600 10px " + FONT.round; x.fillText("Hàng Việt", ox + 64, oy + 108);
    });
    draw();
    const t = tex(c, true, false);
    PAPERS.push({ draw, t });
    return (cache.goods = t);
  }

  return { get, sign, flag, soft, hash, paper, leafCard, grime, redrawSigns, riceCard, bananaLeaf, nonLa, facade, speckle, marker, goods };
})();
