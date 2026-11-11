// ============================================================
//  NHÂN VẬT – giữ cấu trúc gốc (Group + legL/legR), thêm tay, giày, mặt, nón lá.
//  Mỗi nhân vật chỉ 5 draw call (thân + 2 chân + 2 tay) nhờ gộp màu theo đỉnh.
// ============================================================
const SKIN = 0xd9a47c;
function char(body, hair, pack, opt = {}) {
  const g = new T.Group();
  const pants = opt.pants ?? 0x3d3f4a, shoe = opt.shoe ?? 0x2a2420;
  const parts = [
    [BG(0.88, 1.05, 0.48), body, mtx(0, 1.55, 0)],                     // áo
    [BG(0.9, 0.16, 0.5), pants, mtx(0, 1.04, 0)],                      // thắt lưng/quần
    [BG(0.22, 0.14, 0.22), SKIN, mtx(0, 2.13, 0)],                     // cổ
    [new T.SphereGeometry(0.31, 14, 10), SKIN, mtx(0, 2.42, 0, 0, 0, 0, 1, 1.08, 1)], // đầu
    [new T.SphereGeometry(0.335, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, mtx(0, 2.44, -0.04, -0.32, 0, 0, 1, 1.1, 1)], // tóc (lệch ra sau, chừa mặt)
    [BG(0.14, 0.03, 0.02), 0x8a4a3a, mtx(0, 2.29, 0.3)],               // miệng
    [BG(0.07, 0.05, 0.02), 0x1a1410, mtx(-0.11, 2.47, 0.3)],           // mắt
    [BG(0.07, 0.05, 0.02), 0x1a1410, mtx(0.11, 2.47, 0.3)],
    [BG(0.66, 0.7, 0.16), pack, mtx(0, 1.65, -0.33)],                  // ba lô / túi
  ];
  if (opt.hat) parts.push( // nón lá
    [new T.ConeGeometry(0.62, 0.42, 18), 0xd8c28a, mtx(0, 2.86, 0)]);
  // NPC đứng yên (opt.still): gộp cả người thành 1 mesh => 1 draw call
  const limb = (x, y, list) => {
    const p = new T.Group(); p.position.set(x, y, 0); g.add(p);
    if (opt.still) { const off = new T.Matrix4().makeTranslation(x, y, 0); list.forEach((it) => parts.push([it[0], it[1], off.clone().multiply(it[2])])); }
    else p.add(colorMesh(list));
    return p;
  };
  g.legL = limb(-0.22, 1, [[BG(0.3, 0.84, 0.32), pants, mtx(0, -0.42, 0)], [BG(0.32, 0.16, 0.44), shoe, mtx(0, -0.92, 0.06)]]);
  g.legR = limb(0.22, 1, [[BG(0.3, 0.84, 0.32), pants, mtx(0, -0.42, 0)], [BG(0.32, 0.16, 0.44), shoe, mtx(0, -0.92, 0.06)]]);
  g.armL = limb(-0.56, 2.02, [[BG(0.24, 0.5, 0.26), body, mtx(0, -0.2, 0)], [BG(0.18, 0.52, 0.2), SKIN, mtx(0, -0.68, 0)]]);
  g.armR = limb(0.56, 2.02, [[BG(0.24, 0.5, 0.26), body, mtx(0, -0.2, 0)], [BG(0.18, 0.52, 0.2), SKIN, mtx(0, -0.68, 0)]]);
  g.add(colorMesh(parts));
  scene.add(g);
  return g;
}
// Vật liệu "chỉ đổ bóng": nhân vật người chơi vô hình trong góc nhìn thứ nhất nhưng vẫn có bóng
const SHADOW_ONLY = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
function shadowOnly(g) { g.traverse((o) => { if (o.isMesh) o.material = SHADOW_ONLY; }); }
