// ============================================================
//  RENDERER, BẦU TRỜI, ÁNH SÁNG, ENVIRONMENT MAP
//  Three.js r128 – giữ nguyên pipeline WebGLRenderer gốc, chỉ nâng cấp cấu hình.
// ============================================================
const T = THREE,
  $ = (id) => document.getElementById(id);

// Màu hex (sRGB) -> màu tuyến tính, cần khi bật outputEncoding = sRGB
const lin = (hex) => new T.Color(hex).convertSRGBToLinear();

const scene = new T.Scene();
const cam = new T.PerspectiveCamera(FP.fov, innerWidth / innerHeight, 0.08, 420);
cam.rotation.order = "YXZ"; // yaw rồi pitch – chuẩn cho góc nhìn thứ nhất

const R = new T.WebGLRenderer({ antialias: GFX.aa, powerPreference: "high-performance" });
let PR = Math.min(devicePixelRatio || 1, GFX.maxPR); // giới hạn pixel ratio
R.setPixelRatio(PR);
R.setSize(innerWidth, innerHeight);
R.outputEncoding = T.sRGBEncoding;
R.toneMapping = T.ACESFilmicToneMapping;
R.toneMappingExposure = 1.0;
R.shadowMap.enabled = true;
R.shadowMap.type = GFX.soft ? T.PCFSoftShadowMap : T.PCFShadowMap;
document.body.appendChild(R.domElement);
const MAX_ANISO = R.capabilities.getMaxAnisotropy();

addEventListener("resize", () => {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
});

// ---------- Bầu trời gradient + mặt trời (1 draw call) ----------
const SUN_DIR = new T.Vector3(30, 50, 20).normalize(); // cùng hướng nắng với bản gốc
const SKY = {
  top: lin(0x3f86d8),
  hor: lin(0xd4e9f3),
  bot: lin(0xbcd9ea),
  sun: lin(0xfff0d2),
};
function makeSkyMaterial() {
  return new T.ShaderMaterial({
    uniforms: {
      top: { value: SKY.top }, hor: { value: SKY.hor }, bot: { value: SKY.bot },
      sunC: { value: SKY.sun }, sunDir: { value: SUN_DIR },
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top, hor, bot, sunC, sunDir; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.55)) : mix(hor, bot, pow(clamp(-h,0.0,1.0), 0.4));
        float s = max(dot(d, sunDir), 0.0);
        c += sunC * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.22);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
    side: T.BackSide, depthWrite: false, fog: false,
  });
}
const sky = new T.Mesh(new T.SphereGeometry(380, 32, 16), makeSkyMaterial());
sky.frustumCulled = false;
sky.renderOrder = -10;
scene.add(sky);
scene.fog = new T.Fog(SKY.hor.clone(), 90, 300);

// ---------- Environment map (phản xạ) sinh 1 lần từ bầu trời ----------
let ENV_TEX = null;
function makeEnv() { // chỉ sinh khi mức đồ họa cần (Trung bình / Cao)
  if (ENV_TEX) return ENV_TEX;
  const envScene = new T.Scene();
  envScene.add(new T.Mesh(new T.SphereGeometry(50, 32, 16), makeSkyMaterial()));
  // mặt đất ấm phía dưới để phản xạ không quá xanh
  const g = new T.Mesh(new T.CircleGeometry(40, 24), new T.MeshBasicMaterial({ color: lin(0x8a8a6a), side: T.DoubleSide }));
  g.rotation.x = -Math.PI / 2; g.position.y = -12; envScene.add(g);
  const pm = new T.PMREMGenerator(R);
  ENV_TEX = pm.fromScene(envScene, 0).texture;
  pm.dispose();
  envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  return ENV_TEX;
}
if (GFX.env) scene.environment = makeEnv();

// ---------- Ánh sáng: 1 nắng có bóng + 1 hemisphere ----------
const hemi = new T.HemisphereLight(lin(0xcfe2f5), lin(0x7d6c4e), 0.45);
scene.add(hemi);
const sun = new T.DirectionalLight(lin(0xffeacc), 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(GFX.shadow, GFX.shadow);
Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);
