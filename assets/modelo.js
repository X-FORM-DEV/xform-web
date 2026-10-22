// X.FORM · Modelo comercial vivo: una factibilidad rápida sobre un lote de ejemplo.
// Tres botones (uso, lote y pisos) y un edificio en 3D que crece piso a piso. Las cifras son
// ficticias y la página lo dice. Lógica: podio de 2 pisos al 60 % del lote y torre al 45 %
// (oficinas: todo al 60 %); costo directo que sube un 1 % por piso desde el sexto.
(function(){
  const sec = document.getElementById("modelo"); if (!sec) return;
  const $ = s => sec.querySelector(s);
  const USOS = {
    vivienda: { precio: 9.5,  cd: 4.3, ef: .80, ud: 70, torre: .45, es: "uds.",   en: "units" },
    oficinas: { precio: 8.8,  cd: 4.6, ef: .85, ud: 55, torre: .60, es: "ofic.",  en: "offices" },
    hotel:    { precio: 12.5, cd: 5.4, ef: .72, ud: 32, torre: .45, es: "llaves", en: "keys" }
  };
  const LOTE_M2 = 3.0, INDIRECTOS = 1.22, MIN = 3, MAX = 24;
  const st = { uso: "vivienda", lote: 1200, pisos: 10 };

  function calc(uso, lote, n){
    const u = USOS[uso], podio = Math.min(2, n), torre = n - podio;
    const ac = podio * lote * .60 + torre * lote * u.torre;
    const vend = ac * u.ef, ventas = vend * u.precio;
    const cd = u.cd * (1 + .01 * Math.max(0, n - 6));
    const costo = ac * cd * INDIRECTOS + lote * LOTE_M2;
    const ut = ventas - costo;
    return { ac, uds: Math.round(vend / u.ud), ventas, ut, margen: ut / ventas * 100 };
  }

  const en = () => document.documentElement.lang === "en";
  const fmt = n => Math.round(n).toLocaleString(en() ? "en-US" : "es-CO");
  const mon = n => (n < 0 ? "−" : "") + (en() ? "COP " : "$") + fmt(Math.abs(n)) + " M";

  // ---------- números ----------
  function pinta(){
    const r = calc(st.uso, st.lote, st.pisos), u = USOS[st.uso];
    $("#mvPisos").textContent = st.pisos;
    $("#mvAc").textContent = fmt(r.ac) + " m²";
    $("#mvUds").textContent = r.uds + " " + (en() ? u.en : u.es);
    $("#mvVentas").textContent = mon(r.ventas);
    $("#mvUt").textContent = mon(r.ut);
    $("#mvMg").textContent = (r.margen < 0 ? "−" : "") + Math.abs(r.margen).toFixed(1).replace(".", en() ? "." : ",") + " %";
    $("#mvMg").classList.toggle("baja", r.margen < 12);
    curva();
  }

  // curva del margen según la altura, con el punto del edificio actual
  function curva(){
    const W = 240, H = 56, pts = [];
    let lo = Infinity, hi = -Infinity;
    for (let n = MIN; n <= MAX; n++) { const m = calc(st.uso, st.lote, n).margen; pts.push(m); lo = Math.min(lo, m); hi = Math.max(hi, m); }
    lo = Math.min(lo, 0); const rng = (hi - lo) || 1;
    const x = i => 4 + i / (MAX - MIN) * (W - 8), y = m => H - 6 - (m - lo) / rng * (H - 14);
    $("#mvLinea").setAttribute("points", pts.map((m, i) => x(i).toFixed(1) + "," + y(m).toFixed(1)).join(" "));
    const i = st.pisos - MIN, best = pts.indexOf(Math.max(...pts));
    $("#mvPunto").setAttribute("cx", x(i)); $("#mvPunto").setAttribute("cy", y(pts[i]));
    $("#mvMejor").setAttribute("cx", x(best)); $("#mvMejor").setAttribute("cy", y(pts[best]));
    $("#mvCero").setAttribute("y1", y(0)); $("#mvCero").setAttribute("y2", y(0));
    $("#mvMejorTxt").textContent = (en() ? "Best margin at " : "Mejor margen en ") + (best + MIN) + (en() ? " floors" : " pisos");
  }

  // ---------- controles ----------
  sec.querySelectorAll("[data-uso]").forEach(b => b.addEventListener("click", () => { st.uso = b.dataset.uso; marca(); }));
  sec.querySelectorAll("[data-lote]").forEach(b => b.addEventListener("click", () => { st.lote = +b.dataset.lote; marca(); }));
  $("#mvMenos").addEventListener("click", () => { st.pisos = Math.max(MIN, st.pisos - 1); marca(); });
  $("#mvMas").addEventListener("click", () => { st.pisos = Math.min(MAX, st.pisos + 1); marca(); });
  function marca(){
    sec.querySelectorAll("[data-uso]").forEach(b => b.setAttribute("aria-pressed", b.dataset.uso === st.uso));
    sec.querySelectorAll("[data-lote]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.lote === st.lote));
    $("#mvMenos").disabled = st.pisos <= MIN; $("#mvMas").disabled = st.pisos >= MAX;
    pinta(); if (tresD) tresD();
  }

  // el selector ES / EN reescribe «lang» cada vez que traduce: solo se repinta si cambió
  let idioma = document.documentElement.lang;
  new MutationObserver(() => { if (document.documentElement.lang === idioma) return; idioma = document.documentElement.lang; pinta(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // ---------- edificio 3D ----------
  let tresD = null;
  const caja = $("#mvVista");
  (function(){
    if (typeof THREE === "undefined" || !caja) return;
    let r; try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch (e) { return; }
    caja.appendChild(r.domElement); caja.classList.add("con3d");
    const esc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 2000);
    const PISO = 3.2, LIMA = 0xC8FF3C, PAPEL = 0xF1F0EC;
    const lineaP = new THREE.LineBasicMaterial({ color: PAPEL, transparent: true, opacity: .55 });
    const lineaL = new THREE.LineBasicMaterial({ color: LIMA });
    const lleno = new THREE.MeshBasicMaterial({ color: 0x151515, transparent: true, opacity: .92 });
    const grupo = new THREE.Group(); esc.add(grupo);

    // terreno: lote + curvas de nivel alrededor
    const suelo = new THREE.Group(); grupo.add(suelo);
    function anillo(rx, rz, op){
      const g = new THREE.BufferGeometry(), p = [];
      for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2, w = 1 + .07 * Math.sin(a * 3 + rx * .07) + .04 * Math.cos(a * 5 - rz * .05); p.push(Math.cos(a) * rx * w, 0, Math.sin(a) * rz * w); }
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color: PAPEL, transparent: true, opacity: op }));
    }
    function hazSuelo(lado){
      while (suelo.children.length) suelo.remove(suelo.children[0]);
      const lot = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(lado, .01, lado)), lineaL);
      suelo.add(lot);
      for (let i = 1; i <= 7; i++) suelo.add(anillo(lado * .72 + i * lado * .22, lado * .72 + i * lado * .2, .26 - i * .025));
    }

    // pisos: hasta 24, se encienden y apagan con una animación corta
    const pisos = [];
    for (let i = 0; i < MAX; i++) {
      const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lleno);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), lineaP);
      g.add(m, e); g.userData = { e, s: 0, obj: 0 }; g.visible = false; grupo.add(g); pisos.push(g);
    }
    let lado = 30, alto = 30, objAlto = 30;
    tresD = function(){
      const u = USOS[st.uso];
      lado = Math.sqrt(st.lote); hazSuelo(lado);
      for (let i = 0; i < MAX; i++) {
        const g = pisos[i], f = i < 2 ? .60 : u.torre, a = lado * Math.sqrt(f);
        g.scale.set(a, PISO * .9, a); g.position.y = i * PISO + PISO * .45;
        g.userData.obj = i < st.pisos ? 1 : 0;
        g.userData.e.material = i === st.pisos - 1 ? lineaL : lineaP;
      }
      objAlto = st.pisos * PISO;
    };
    tresD();

    // cámara: gira despacio sola; arrastrar la gira a mano
    let ang = .8, velo = .0016, arrastra = false, x0 = 0;
    caja.addEventListener("pointerdown", e => { arrastra = true; x0 = e.clientX; caja.setPointerCapture(e.pointerId); });
    caja.addEventListener("pointermove", e => { if (!arrastra) return; ang -= (e.clientX - x0) * .008; x0 = e.clientX; });
    caja.addEventListener("pointerup", () => { arrastra = false; });
    function tam(){ const w = caja.clientWidth, h = caja.clientHeight; r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener("resize", tam); tam();

    let vis = false, corre = false;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !corre) cuadro(); }).observe(caja);
    function cuadro(){
      corre = false; if (!vis) return;
      if (!arrastra) ang += velo;
      alto += (objAlto - alto) * .08;
      pisos.forEach(g => { const d = g.userData; d.s += (d.obj - d.s) * .14; g.visible = d.s > .02; g.scale.y = PISO * .9 * Math.max(.02, d.s); });
      const dist = Math.max(lado * 2.6, alto * 1.9 + lado * 1.2);
      cam.position.set(Math.cos(ang) * dist, alto * .55 + dist * .42, Math.sin(ang) * dist);
      cam.lookAt(0, alto * .42, 0);
      r.render(esc, cam); corre = true; requestAnimationFrame(cuadro);
    }
  })();

  marca();
})();
