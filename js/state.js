// ============================================================
//  TRẠNG THÁI + KINH TẾ GIÁ LÚA (giữ nguyên logic gốc)
// ============================================================
// Trạng thái
let S = { gold: 30, seeds: 3, wheat: 0, chest: 0, done: [0, 0, 0, 0, 0, 0] };
try {
 Object.assign(S, JSON.parse(localStorage.getItem("dao-nong-trai") || "{}"));
} catch (e) {}
if (!Array.isArray(S.done)) S.done = [0, 0, 0, 0, 0, 0];
const save = () => { try { localStorage.setItem("dao-nong-trai", JSON.stringify(S)); } catch (e) {} };
if (S.chest) chest.visible = false;
const E = {
 D: 1,
 hist: [20, 20, 20, 20, 20, 20, 20, 20],
 note: "Thị trường ổn định.",
};
const price = () => Math.max(4, Math.round(20 * E.D));
const clampD = () => (E.D = Math.min(1.8, Math.max(0.35, E.D)));
setInterval(() => {
 E.D += (1 - E.D) * 0.03;
 clampD();
}, 1000);
setInterval(() => {
 E.hist.push(price());
 E.hist.shift();
}, 4000);
setInterval(() => {
 if (Math.random() < 0.7) {
  E.D *= 0.96;
  E.note = "Nông dân trong làng vừa bán thêm lúa, giá nhích xuống.";
  clampD();
 }
}, 10000);
setInterval(() => {
 const r = Math.random();
 if (r < 0.3) {
  E.D *= 1.4;
  E.note = "Hạn hán: lúa khan hiếm, giá tăng!";
 } else if (r < 0.6) {
  E.D *= 0.7;
  E.note = "Mùa bội thu: lúa dư thừa, giá giảm.";
 } else E.note = "Thị trường ổn định.";
 clampD();
}, 40000);
setInterval(() => {
 try {
  localStorage.setItem("dao-nong-trai", JSON.stringify(S));
 } catch (e) {}
}, 3000);
