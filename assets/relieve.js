// X.FORM · Relieve 3D interactivo de la portada.
// Un terreno dibujado solo con curvas de nivel (el motivo de la marca). El cursor, o el dedo,
// levanta una colina suave donde pasa. Si no hay WebGL, si Three.js no carga o si el visitante
// pidió menos movimiento, la portada sigue con el canvas 2D de siempre (función curvas()).
(function(){
  const hero = document.getElementById("inicio");
  const plano = document.getElementById("curvas");
  if (!hero || !plano) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof THREE === "undefined") return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) { return; }
  const gl = renderer.getContext();
  if (!gl || !(gl.getExtension("OES_standard_derivatives") || renderer.capabilities.isWebGL2)) return;

  const cv = renderer.domElement;
  cv.className = "relieve";
  cv.setAttribute("aria-hidden", "true");
  hero.insertBefore(cv, plano);
  plano.style.display = "none";           // el 3D reemplaza al 2D solo si arrancó bien
  hero.classList.add("con3d");

  const escena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const uni = {
    uT: { value: 0 },
    uMouse: { value: new THREE.Vector2(9, 9) },
    uFuerza: { value: 0 },
    uPaso: { value: 7.0 },
    uRes: { value: new THREE.Vector2(1, 1) }
  };

  // Altura del terreno: ondulaciones lentas + la colina que sigue al cursor.
  const ALTURA = `
    uniform float uT; uniform vec2 uMouse; uniform float uFuerza;
    float h(vec2 p){
      float a = 0.55*sin(p.x*0.55 + uT*0.35) * cos(p.y*0.45 - uT*0.25);
      a += 0.35*sin(p.x*1.10 - p.y*0.80 + uT*0.20);
      a += 0.18*cos(p.x*2.10 + p.y*1.70 - uT*0.30);
      a += 1.10*exp(-dot(p-vec2(1.6,-0.4),p-vec2(1.6,-0.4))*0.18);
      float d = distance(p, uMouse);
      a += uFuerza * 0.95 * exp(-d*d*0.55);
      return a;
    }`;

  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    transparent: true,
    depthWrite: false,
    extensions: { derivatives: true },
    vertexShader: ALTURA + `
      varying float vH; varying vec2 vP;
      void main(){
        vec3 p = position;
        float z = h(p.xy);
        vH = z; vP = p.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, p.y, z, 1.0);
      }`,
    fragmentShader: `
      uniform float uPaso; uniform vec2 uRes;
      varying float vH; varying vec2 vP;
      void main(){
        float v = vH * uPaso;
        float w = fwidth(v);
        float linea = 1.0 - smoothstep(0.0, w*1.25, abs(fract(v - 0.5) - 0.5));
        float m = v / 6.0;
        float maestra = 1.0 - smoothstep(0.0, fwidth(m)*1.3, abs(fract(m - 0.5) - 0.5));
        float borde = smoothstep(9.5, 5.5, length(vP*vec2(0.75,1.0)));
        // detrás del titular (lado izquierdo) el relieve baja para que el texto se lea
        float sx = gl_FragCoord.x / uRes.x;
        float texto = mix(0.35, 1.0, smoothstep(0.18, 0.62, sx));
        vec3 papel = vec3(0.945,0.941,0.925);
        vec3 lima  = vec3(0.784,1.0,0.235);
        vec3 col = mix(papel, lima, maestra);
        float a = max(linea*0.15, maestra*0.32) * borde * texto;
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`
  });

  const geo = new THREE.PlaneGeometry(22, 16, 260, 190);
  const malla = new THREE.Mesh(geo, mat);
  malla.rotation.x = -1.08;
  malla.position.set(2.2, -0.6, 0);
  escena.add(malla);

  cam.position.set(0, 3.2, 10.5);
  cam.lookAt(1.2, -0.6, 0);

  // El cursor se proyecta sobre el plano para saber dónde levantar la colina.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), objetivo = new THREE.Vector2(9, 9);
  let fuerzaObj = 0, px = 0, py = 0;
  function apunta(x, y){
    const r = cv.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    px = ndc.x; py = ndc.y;
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObject(malla)[0];
    if (hit) { const l = malla.worldToLocal(hit.point.clone()); objetivo.set(l.x, l.y); fuerzaObj = 1; }
  }
  hero.addEventListener("pointermove", e => apunta(e.clientX, e.clientY), { passive: true });
  hero.addEventListener("pointerleave", () => { fuerzaObj = 0; });
  hero.addEventListener("touchmove", e => { const t = e.touches[0]; if (t) apunta(t.clientX, t.clientY); }, { passive: true });
  hero.addEventListener("touchend", () => { fuerzaObj = 0; });

  function tam(){
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    uni.uRes.value.set(cv.width, cv.height);
    // en celular el texto ocupa todo el ancho: el relieve baja parejo
    uni.uPaso.value = w < 700 ? 6.0 : 7.0;
    cam.aspect = w / h;
    // en celular la cámara se aleja para que el relieve no se coma el titular
    cam.position.z = w < 700 ? 13.5 : 10.5;
    cam.updateProjectionMatrix();
  }
  addEventListener("resize", tam); tam();

  let vis = true, corriendo = false, t0 = performance.now();
  if ("IntersectionObserver" in window)
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !corriendo) cuadro(); }).observe(hero);

  function cuadro(){
    corriendo = false;
    if (!vis) return;
    const t = (performance.now() - t0) / 1000;
    uni.uT.value = t;
    uni.uMouse.value.lerp(objetivo, 0.08);
    uni.uFuerza.value += (fuerzaObj - uni.uFuerza.value) * 0.05;
    // paralaje leve de la cámara con el cursor
    malla.rotation.z += ((px * 0.12) - malla.rotation.z) * 0.04;
    malla.rotation.x += ((-1.08 + py * 0.06) - malla.rotation.x) * 0.04;
    renderer.render(escena, cam);
    corriendo = true;
    requestAnimationFrame(cuadro);
  }
  cuadro();
})();
