// X.FORM · Proceso: la Villa Eivissa (Cayetana, Barú) en 3D, sobre fondo transparente,
// cambia con cada fase: 01 el terreno y el lote · 02 volúmenes blancos (maqueta) ·
// 03 líneas técnicas · 04 materiales reales. Se carga solo cuando la sección se acerca.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const caja = document.getElementById("procVista");
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TINTA = 0x1a1a1a, LIMA = 0xc8ff3c;

const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
r.setClearColor(0x000000, 0);
r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
caja.appendChild(r.domElement);

const esc = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
esc.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a0, 1.35));
const sol = new THREE.DirectionalLight(0xfff3e0, 2.6);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.radius = 4;
esc.add(sol, sol.target);

const ctl = new OrbitControls(cam, r.domElement);
ctl.enableZoom = false; ctl.enablePan = false; ctl.enableDamping = true;
ctl.autoRotate = !quieto; ctl.autoRotateSpeed = 0.55;
ctl.minPolarAngle = 0.55; ctl.maxPolarAngle = 1.35;

// grupos que se encienden y apagan con cada fase
const G = { terreno: new THREE.Group(), clay: new THREE.Group(), lineas: new THREE.Group(), real: new THREE.Group() };
Object.values(G).forEach(g => { g.userData.a = 0; g.visible = false; esc.add(g); });
const mats = { terreno: [], clay: [], lineas: [], real: [] };
const OBJ = { 1: { terreno: 1 }, 2: { terreno: .3, clay: 1 }, 3: { terreno: .3, lineas: 1 }, 4: { real: 1 } };
let fase = window.xfFase || 1, base = null, t4 = 0;
const DIST = { 1: 1.6, 2: 1.85, 3: 1.3, 4: 1.75 };
window.xformProceso = { fase: n => { fase = n; } };

const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.16 }));
sombra.rotation.x = -Math.PI / 2; sombra.receiveShadow = true; esc.add(sombra);

const draco = new DRACOLoader().setDecoderPath("assets/vendor/three/draco/");
new GLTFLoader().setDRACOLoader(draco).load("assets/3d/villa-eivissa.glb?v=20261022", gltf => {
  const raiz = gltf.scene;
  const arq = [];
  raiz.traverse(o => {
    if (!o.isMesh) return;
    const cat = o.userData.cat || (o.parent && o.parent.userData.cat) || "arquitectura";
    if (cat === "contexto" || cat === "vecinos") { o.visible = false; return; }
    o.castShadow = cat !== "agua"; o.receiveShadow = true;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => {
      if (m.name === "vidrio") { m.transparent = true; m.opacity = 0.3; m.depthWrite = false; }
      if (m.name === "agua") { m.transparent = true; m.opacity = 0.8; }
      if (m.name === "fantasma") { o.visible = false; }
      m.userData.base = { op: m.opacity, tr: m.transparent };
      if (!mats.real.includes(m)) mats.real.push(m);
    });
    if (cat === "arquitectura" && o.visible) arq.push(o);
  });
  G.real.add(raiz);
  raiz.updateMatrixWorld(true);
  const veg = [];
  raiz.traverse(o => { if (o.isMesh && o.visible && (o.userData.cat || (o.parent && o.parent.userData.cat)) === "vegetacion") veg.push(o); });

  // caja de la arquitectura para encuadrar
  const bb = new THREE.Box3(); arq.filter(o => !/pasto|piedra_piso/.test(o.name)).forEach(o => bb.expandByObject(o));
  const c = bb.getCenter(new THREE.Vector3()), t = bb.getSize(new THREE.Vector3()), R = Math.max(t.x, t.z);

  // en la fase 04 solo queda la vegetación cercana a la casa: la imagen se recorta limpia sobre el blanco
  veg.forEach(o => { const p = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); if (Math.hypot(p.x - c.x, p.z - c.z) > R * 0.5) o.visible = false; });

  // 02 · concepto: el programa por zonas sobre la silueta de la casa y una exploración de materiales
  const fantasma = new THREE.LineBasicMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0 }); fantasma.userData.op = .16;
  mats.clay.push(fantasma);
  const etiqueta = (txt, col = "#1a1a1a") => {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 96; const g = cv.getContext("2d");
    g.font = "500 34px Kievit, 'Helvetica Neue', Arial, sans-serif"; g.fillStyle = col; g.textBaseline = "middle";
    g.fillText(txt.split("").join(String.fromCharCode(8202)), 8, 48);
    const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0, depthTest: false }); m.userData.op = 1; mats.clay.push(m);
    const sp = new THREE.Sprite(m); sp.scale.set(R * .34, R * .064, 1); sp.center.set(0, .5); sp.renderOrder = 10; return sp;
  };
  const largo = t.x >= t.z ? "x" : "z", corte = bb.min.y + t.y * .48;
  const zona = (f0, f1, ya, yb, col, op, txt) => {
    const a = bb.min[largo] + t[largo] * f0, b = bb.min[largo] + t[largo] * f1;
    const sx = largo === "x" ? b - a : t.x * .94, sz = largo === "z" ? b - a : t.z * .94;
    const cx = largo === "x" ? (a + b) / 2 : c.x, cz = largo === "z" ? (a + b) / 2 : c.z;
    const geo = new THREE.BoxGeometry(sx * .96, (yb - ya) * .92, sz * .96);
    const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false }); m.userData.op = op;
    const e = new THREE.LineBasicMaterial({ color: col === LIMA ? 0x7a9e18 : TINTA, transparent: true, opacity: 0 }); e.userData.op = .7;
    mats.clay.push(m, e);
    const box = new THREE.Mesh(geo, m), ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo), e);
    box.position.set(cx, (ya + yb) / 2, cz); ed.position.copy(box.position); G.clay.add(box, ed);
    // la etiqueta va por fuera del volumen: arriba para el piso alto, al pie para el bajo
    const lb = etiqueta(txt); const fuera = largo === "x" ? [0, t.z * .62] : [t.x * .62, 0];
    if (ya > bb.min.y + .1) lb.position.set(cx, yb + R * .05, cz); else lb.position.set(cx + fuera[0], bb.min.y + R * .02, cz + fuera[1]);
    G.clay.add(lb);
  };
  zona(0, .58, bb.min.y, corte, LIMA, .32, "SOCIAL");
  zona(.58, 1, bb.min.y, corte, 0xb9b8b3, .3, "SERVICIO");
  zona(.08, .92, corte, bb.max.y - t.y * .08, 0xe9e6df, .55, "PRIVADO");
  // muestras de materiales, flotando al lado de la casa
  const muestras = [["estuco_blanco", "CAL"], ["madera_teca", "TECA"], ["piedra_piso", "PIEDRA"], ["reborde_arco_terracota", "TERRACOTA"]];
  const lado = R * .06, ym = bb.max.y + R * .2;
  muestras.forEach(([n, txt], i) => {
    const src = mats.real.find(m => m.name === n);
    const m = new THREE.MeshStandardMaterial({ color: src ? src.color : 0xdddddd, roughness: .8, transparent: true, opacity: 0 }); m.userData.op = 1; mats.clay.push(m);
    const cubo = new THREE.Mesh(new THREE.BoxGeometry(lado, lado, lado), m); cubo.castShadow = true;
    const off = (i - 1.5) * lado * 2.6, px = c.x + (largo === "x" ? off : 0), pz = c.z + (largo === "z" ? off : 0);
    cubo.position.set(px, ym, pz); cubo.userData.flota = i; G.clay.add(cubo);
    const lb = etiqueta(txt, "#6e6e6e"); lb.position.set(px - lado * .5, ym - lado * 1.1, pz); lb.scale.multiplyScalar(.6); G.clay.add(lb);
  });
  // 03 · líneas: aristas en tinta, con una pasada de profundidad que oculta las líneas de atrás
  const tinta = new THREE.LineBasicMaterial({ color: TINTA, transparent: true, opacity: 0 });
  const prof = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  mats.lineas.push(tinta);
  arq.forEach(o => {
    if (/vidrio|pasto|piedra_piso/.test(o.name)) return;
    const f = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 40), fantasma); f.applyMatrix4(o.matrixWorld); G.clay.add(f);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), tinta); e.applyMatrix4(o.matrixWorld); G.lineas.add(e);
    const d = new THREE.Mesh(o.geometry, prof); d.applyMatrix4(o.matrixWorld); G.lineas.add(d);
  });

  // 01 · terreno: curvas de nivel alrededor, lote en lima, ejes
  const y0 = bb.min.y + 0.02;
  const linea = (pts, mat) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  const gris = new THREE.LineBasicMaterial({ color: 0x8e9097, transparent: true, opacity: 0 });
  const lima = new THREE.LineBasicMaterial({ color: LIMA, transparent: true, opacity: 0 });
  mats.terreno.push(gris, lima);
  // topografía: curvas de nivel que forman una loma suave al lado del lote
  const lx = c.x + R * 0.55, lz = c.z - R * 0.35;
  for (let i = 0; i < 11; i++) {
    const p = [], rr = R * (1.05 - i * 0.085), y = y0 + i * R * 0.018;
    for (let k = 0; k <= 140; k++) {
      const a = k / 140 * Math.PI * 2, w = 1 + 0.10 * Math.sin(a * 3 + i * 0.5) + 0.06 * Math.cos(a * 5 - i * 0.3);
      p.push(new THREE.Vector3(lx + Math.cos(a) * rr * w * 1.1, y, lz + Math.sin(a) * rr * w * 0.85));
    }
    G.terreno.add(linea(p, gris));
  }
  const m2 = 0.62;
  G.terreno.add(linea([[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, z]) => new THREE.Vector3(c.x + x * t.x * m2, y0, c.z + z * t.z * m2)), lima));
  [-1, 0, 1].forEach(k => {
    G.terreno.add(linea([new THREE.Vector3(c.x + k * t.x * .5, y0, c.z - t.z * .72), new THREE.Vector3(c.x + k * t.x * .5, y0, c.z + t.z * .72)], gris));
    G.terreno.add(linea([new THREE.Vector3(c.x - t.x * .72, y0, c.z + k * t.z * .5), new THREE.Vector3(c.x + t.x * .72, y0, c.z + k * t.z * .5)], gris));
  });

  // sombra y sol
  sombra.scale.set(R * 4, R * 4, 1); sombra.position.set(c.x, y0 - 0.01, c.z);
  sol.position.set(c.x + R * 1.2, c.y + R * 2, c.z + R * 0.8); sol.target.position.copy(c);
  const sc = sol.shadow.camera; sc.left = sc.bottom = -R * 1.4; sc.right = sc.top = R * 1.4; sc.far = R * 6; sc.updateProjectionMatrix();

  // cámara
  ctl.target.set(c.x, c.y - t.y * 0.1, c.z);
  const dist = R * 1.3;
  cam.position.set(c.x + dist * 0.75, c.y + dist * 0.55, c.z + dist * 0.75);
  ctl.update();
  base = { R, c };
  caja.classList.add("listo");
  tam(); cuadro();
}, undefined, e => { caja.classList.add("error"); console.warn("Modelo 3D:", e && e.message); });

function tam(){ const w = caja.clientWidth, h = caja.clientHeight; r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
addEventListener("resize", tam); tam();

function opacidad(nombre, a){
  mats[nombre].forEach(m => {
    if (nombre === "real") {
      const b = m.userData.base, tr = b.tr || a < 0.999;
      m.opacity = b.op * a;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }   // cambiar transparencia obliga a recompilar
    }
    else m.opacity = (m.userData.op ?? 1) * a;
  });
}
let vis = false, corre = false;
new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !corre) cuadro(); }).observe(caja);
function cuadro(){
  corre = false; if (!vis) return;
  const obj = OBJ[fase] || OBJ[1];
  for (const k in G) {
    const g = G[k], meta = obj[k] || 0;
    g.userData.a += (meta - g.userData.a) * (quieto ? 1 : 0.08);
    g.visible = g.userData.a > 0.01; opacidad(k, g.userData.a);
  }
  sombra.material.opacity = 0.16 * G.real.userData.a;
  // fase 04: el modelo gira hasta quedarse quieto y se funde con el render real, sin cielo
  const ahora = performance.now();
  if (fase === 4) { if (!t4) t4 = ahora; ctl.autoRotate = false; caja.classList.toggle("real", ahora - t4 > 1500); }
  else { t4 = 0; ctl.autoRotate = !quieto; caja.classList.remove("real"); }
  G.clay.children.forEach(o => { if (o.userData.flota !== undefined) { o.rotation.y += .006; o.position.y += Math.sin(ahora / 900 + o.userData.flota) * .002; } });
  if (base) {   // la cámara se aleja en la fase 04 para que entren la casa y su jardín
    const v = cam.position.clone().sub(ctl.target), objD = base.R * (DIST[fase] || 1.3) * 1.13;
    v.setLength(v.length() + (objD - v.length()) * 0.06); cam.position.copy(ctl.target).add(v);
  }
  ctl.update(); r.render(esc, cam);
  corre = true; requestAnimationFrame(cuadro);
}
