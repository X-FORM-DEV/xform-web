// X.FORM · Cabida y prefactibilidad en vivo: un edificio de ejemplo que se arma piso a piso.
// Uso, lote y pisos con botones; se puede elegir un piso (clic en el edificio o con las flechas)
// y aparece su planta con las unidades y de dónde salen. Cifras ficticias, marcadas como ejemplo.
//
// Lógica: piso 1 = lobby y comercio al 60 % del lote · piso 2 = podio al 60 % · torre al 45 %
// (oficinas: todo al 60 %) · los dos últimos pisos se retroceden al 36 % y dejan terrazas.
// Núcleo = 40 m² + 5 % de la planta · circulación = 7 % · vendible = planta − núcleo − circulación.
(function(){
  const sec = document.getElementById("modelo"); if (!sec) return;
  const $ = s => sec.querySelector(s);
  const USOS = {
    vivienda: { precio: 9.5,  cd: 4.3, torre: .45, ini: 2, tams: [[42, "Estudio", "Studio", 1.10], [58, "1 alcoba", "1 bed", 1.05], [72, "2 alcobas", "2 bed", 1], [95, "3 alcobas", "3 bed", .96], [130, "Familiar", "Family", .93]], es: ["apto", "aptos"], en: ["apt.", "apts."], p1: ["Lobby y comercio", "Lobby and retail"] },
    oficinas: { precio: 8.8,  cd: 4.6, torre: .60, ini: 1, tams: [[32, "Consultorio", "Suite", 1.08], [55, "Oficina", "Office", 1], [95, "Mediana", "Medium", .96], [180, "Planta libre", "Open floor", .92]], es: ["oficina", "oficinas"], en: ["office", "offices"], p1: ["Lobby y comercio", "Lobby and retail"] },
    hotel:    { precio: 12.5, cd: 5.4, torre: .45, ini: 1, tams: [[22, "Cápsula", "Compact", 1.08], [30, "Estándar", "Standard", 1], [45, "Suite", "Suite", .97], [70, "Apartahotel", "Serviced apt.", .94]], es: ["llave", "llaves"], en: ["key", "keys"], p1: ["Lobby y restaurante", "Lobby and restaurant"] }
  };
  const LOTE_M2 = 3.0, INDIRECTOS = 1.22, MIN = 3, MAX = 24, H1 = 4.5, H = 3.1;
  const st = { uso: "vivienda", lote: 1200, pisos: 10, piso: 5, tam: 2 };
  const tam = () => USOS[st.uso].tams[st.tam];
  const en = () => document.documentElement.lang === "en";
  const fmt = n => Math.round(n).toLocaleString(en() ? "en-US" : "es-CO");
  const mon = n => (n < 0 ? "−" : "") + (en() ? "COP " : "$") + fmt(Math.abs(n)) + " M";

  // ---------- la cabida, piso por piso ----------
  function factor(uso, i, n){
    const u = USOS[uso];
    if (i <= 2) return .60;
    if (n >= 6 && i > n - 2) return u.torre * .8;
    return u.torre;
  }
  // Reparto del piso (nota de Camilo, 22 oct): la unidad elegida se respeta tal cual.
  // Caben n unidades exactas; con lo que sobra se arma el mix: la tipología más grande que quepa,
  // y así hasta que no quepa ni la más pequeña. Ese último resto pasa a área común (no se vende).
  function reparto(vend){
    const ts = USOS[st.uso].tams, elegida = ts[st.tam], grupos = [];
    let resto = vend;
    const n = Math.floor(resto / elegida[0]);
    if (n) { grupos.push({ t: elegida, n, mix: false }); resto -= n * elegida[0]; }
    for (let k = ts.length - 1; k >= 0; k--) {
      const t = ts[k], m = Math.floor(resto / t[0]);
      if (!m) continue;
      const g = grupos.find(x => x.t === t);
      if (g) g.n += m; else grupos.push({ t, n: m, mix: t !== elegida });
      resto -= m * t[0];
    }
    grupos.sort((a, b) => (a.mix - b.mix) || (b.t[0] - a.t[0]));
    return { grupos, resto };
  }
  function pisoInfo(uso, lote, i, n){
    const planta = lote * factor(uso, i, n);
    const nucleo = 40 + planta * .05, circ = planta * .07, vend = planta - nucleo - circ;
    // piso 1: lobby y comercio; el local comercial se vende completo al precio base
    if (i === 1) return { i, planta, nucleo, circ, vend, uds: 0, grupos: [], resto: 0, vendido: vend, ventas: vend * USOS[uso].precio };
    const r = reparto(vend);
    let uds = 0, vendido = 0, ventas = 0;
    r.grupos.forEach(g => { uds += g.n; vendido += g.n * g.t[0]; ventas += g.n * g.t[0] * USOS[uso].precio * g.t[3]; });
    return { i, planta, nucleo, circ, vend, uds, grupos: r.grupos, resto: r.resto, vendido, ventas };
  }
  function calc(uso, lote, n){
    let ac = 0, vend = 0, uds = 0, ventas = 0;
    for (let i = 1; i <= n; i++) { const p = pisoInfo(uso, lote, i, n); ac += p.planta; vend += p.vendido; uds += p.uds; ventas += p.ventas; }
    const costo = ac * USOS[uso].cd * (1 + .01 * Math.max(0, n - 6)) * INDIRECTOS + lote * LOTE_M2, ut = ventas - costo;
    return { ac, vend, uds, ventas, ut, margen: ut / ventas * 100 };
  }
  const nomT = t => en() ? t[2] : t[1];
  const lista = p => p.grupos.map(g => g.n + " × " + g.t[0] + " m²").join(" + ");

  // ---------- números ----------
  function pinta(){
    const u = USOS[st.uso], r = calc(st.uso, st.lote, st.pisos);
    $("#mvPisos").textContent = st.pisos;
    $("#mvAc").textContent = fmt(r.ac) + " m²";
    $("#mvUds").textContent = r.uds + " " + (en() ? u.en : u.es)[1];
    $("#mvVentas").textContent = mon(r.ventas);
    $("#mvUt").textContent = mon(r.ut);
    $("#mvMg").textContent = (r.margen < 0 ? "−" : "") + Math.abs(r.margen).toFixed(1).replace(".", en() ? "." : ",") + " %";
    $("#mvMg").classList.toggle("baja", r.margen < 12);
    planta(); curva();
  }

  // planta del piso elegido y la cadena que explica de dónde salen las unidades
  function planta(){
    const u = USOS[st.uso], p = pisoInfo(st.uso, st.lote, st.piso, st.pisos), nom = (en() ? u.en : u.es);
    $("#mvPisoN").textContent = (en() ? "Floor " : "Piso ") + st.piso;
    const deUno = p.grupos.length === 1;
    $("#mvPisoU").textContent = !p.uds ? u.p1[en() ? 1 : 0]
      : p.uds + " " + nom[p.uds === 1 ? 0 : 1] + " · " + (deUno ? nomT(p.grupos[0].t) : p.grupos.map(g => g.n + " " + nomT(g.t)).join(" + "));
    $("#mvC1").textContent = fmt(st.lote) + " m²";
    $("#mvC2").textContent = Math.round(factor(st.uso, st.piso, st.pisos) * 100) + " %";
    $("#mvC3").textContent = fmt(p.planta) + " m²";
    $("#mvC4").textContent = "− " + fmt(p.nucleo + p.circ) + " m²";
    $("#mvC5").textContent = fmt(p.vend) + " m²";
    $("#mvC6").textContent = p.uds ? lista(p) : "—";
    $("#mvC7").textContent = tam()[0] + " m² · " + nomT(tam());
    $("#mvC8").textContent = p.uds ? fmt(p.resto) + " m²" : "—";
    $("#mvAnt").disabled = st.piso <= 1; $("#mvSig").disabled = st.piso >= st.pisos;

    // dibujo: planta rectangular, pasillo al centro con el núcleo, unidades arriba y abajo
    const W = Math.sqrt(p.planta * 1.6), D = p.planta / W, VW = 300, VH = 190, k = Math.min((VW - 40) / W, (VH - 40) / D);
    const w = W * k, d = D * k, x0 = (VW - w) / 2, y0 = (VH - d) / 2, pas = d * .16, nw = w * .2;
    let g = `<rect class="pl-borde" x="${x0}" y="${y0}" width="${w}" height="${d}"/>`;
    if (!p.uds) {
      g += `<rect class="pl-u" x="${x0 + 4}" y="${y0 + 4}" width="${w - 8}" height="${d - 8}"/><text class="pl-t" x="${VW / 2}" y="${VH / 2 + 4}">${u.p1[en() ? 1 : 0].toUpperCase()}</text>`;
    } else {
      // cada unidad con su área real; el ancho es proporcional al área, y el resto va como área común
      const us = []; p.grupos.forEach(gr => { for (let j = 0; j < gr.n; j++) us.push({ a: gr.t[0], mix: gr.mix }); });
      if (p.resto >= 1) us.push({ a: p.resto, ac: true });
      const total = us.reduce((s, x) => s + x.a, 0); let acum = 0, corte = us.length;
      for (let j = 0; j < us.length; j++) { acum += us[j].a; if (acum >= total / 2) { corte = j + 1; break; } }
      const filas = [us.slice(0, corte), us.slice(corte)], fila = (d - pas) / 2;
      filas.forEach((f, fi) => {
        if (!f.length) return;
        const suma = f.reduce((s, x) => s + x.a, 0), y = y0 + fi * (fila + pas), cy = y + fila / 2; let x = x0;
        f.forEach((un, j) => {
          const uw = w * un.a / suma, cx = x + uw / 2;
          g += `<rect class="${un.ac ? "pl-ac" : un.mix ? "pl-u pl-mix" : "pl-u"}" x="${x + 2}" y="${y + 2}" width="${Math.max(1, uw - 4)}" height="${fila - 4}"/>`;
          if (uw > 24) g += un.ac
            ? `<text class="pl-t" x="${cx}" y="${cy - 2}">AC</text><text class="pl-a" x="${cx}" y="${cy + 10}">${fmt(un.a)} m²</text>`
            : `<text class="pl-t" x="${cx}" y="${cy - 2}">${fi ? "B" : "A"}${j + 1}</text><text class="pl-a" x="${cx}" y="${cy + 10}">${un.a} m²</text>`;
          x += uw;
        });
      });
      const yp = y0 + fila;
      g += `<line class="pl-pas" x1="${x0}" y1="${yp + pas / 2}" x2="${x0 + w}" y2="${yp + pas / 2}"/>`;
      g += `<rect class="pl-nucleo" x="${x0 + (w - nw) / 2}" y="${yp - 4}" width="${nw}" height="${pas + 8}"/>`;
    }
    g += `<text class="pl-cota" x="${VW / 2}" y="${y0 + d + 14}">${W.toFixed(1)} m</text><text class="pl-cota" x="${x0 - 10}" y="${VH / 2}" transform="rotate(-90 ${x0 - 10} ${VH / 2})">${D.toFixed(1)} m</text>`;
    $("#mvPlanta").innerHTML = g;
  }

  function curva(){
    const W = 220, H = 48, pts = [];
    let lo = Infinity, hi = -Infinity;
    for (let n = MIN; n <= MAX; n++) { const m = calc(st.uso, st.lote, n).margen; pts.push(m); lo = Math.min(lo, m); hi = Math.max(hi, m); }
    lo = Math.min(lo, 0); const rng = (hi - lo) || 1;
    const x = i => 4 + i / (MAX - MIN) * (W - 8), y = m => H - 5 - (m - lo) / rng * (H - 12);
    $("#mvLinea").setAttribute("points", pts.map((m, i) => x(i).toFixed(1) + "," + y(m).toFixed(1)).join(" "));
    const i = st.pisos - MIN, best = pts.indexOf(Math.max(...pts));
    $("#mvPunto").setAttribute("cx", x(i)); $("#mvPunto").setAttribute("cy", y(pts[i]));
    $("#mvMejor").setAttribute("cx", x(best)); $("#mvMejor").setAttribute("cy", y(pts[best]));
    $("#mvCero").setAttribute("y1", y(0)); $("#mvCero").setAttribute("y2", y(0));
    $("#mvMejorTxt").textContent = (en() ? "Best margin at " : "Mejor margen en ") + (best + MIN) + (en() ? " floors" : " pisos");
  }

  // ---------- controles ----------
  sec.querySelectorAll("[data-uso]").forEach(b => b.addEventListener("click", () => { st.uso = b.dataset.uso; st.tam = USOS[st.uso].ini; botonesTam(); marca(true); }));
  // tamaño de la unidad: los botones cambian con el uso
  const cajaTam = $("#mvTam");
  function botonesTam(){
    cajaTam.innerHTML = USOS[st.uso].tams.map((t, i) => `<button type="button" data-tam="${i}" aria-pressed="${i === st.tam}">${t[0]} m²<small>${en() ? t[2] : t[1]}</small></button>`).join("");
    cajaTam.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { st.tam = +b.dataset.tam; marca(false); }));
  }
  botonesTam();
  sec.querySelectorAll("[data-lote]").forEach(b => b.addEventListener("click", () => { st.lote = +b.dataset.lote; marca(true); }));
  $("#mvMenos").addEventListener("click", () => { st.pisos = Math.max(MIN, st.pisos - 1); marca(true); });
  $("#mvMas").addEventListener("click", () => { st.pisos = Math.min(MAX, st.pisos + 1); marca(true); });
  $("#mvAnt").addEventListener("click", () => { st.piso = Math.max(1, st.piso - 1); marca(false); });
  $("#mvSig").addEventListener("click", () => { st.piso = Math.min(st.pisos, st.piso + 1); marca(false); });
  function marca(forma){
    st.piso = Math.min(st.piso, st.pisos);
    sec.querySelectorAll("[data-uso]").forEach(b => b.setAttribute("aria-pressed", b.dataset.uso === st.uso));
    sec.querySelectorAll("[data-lote]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.lote === st.lote));
    cajaTam.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.tam === st.tam));
    $("#mvMenos").disabled = st.pisos <= MIN; $("#mvMas").disabled = st.pisos >= MAX;
    pinta(); if (tres) tres(forma);
  }
  let idioma = document.documentElement.lang;
  new MutationObserver(() => { if (document.documentElement.lang === idioma) return; idioma = document.documentElement.lang; botonesTam(); pinta(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // ---------- edificio 3D ----------
  let tres = null;
  const caja = $("#mvVista");
  (function(){
    if (typeof THREE === "undefined" || !caja) return;
    let r; try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" }); } catch (e) { return; }
    caja.appendChild(r.domElement); caja.classList.add("con3d");
    const esc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 3000);
    const LIMA = 0xC8FF3C, PAPEL = 0xF1F0EC;
    const ePapel = new THREE.LineBasicMaterial({ color: PAPEL, transparent: true, opacity: .62 });
    const eSuave = new THREE.LineBasicMaterial({ color: PAPEL, transparent: true, opacity: .25 });
    const eLima = new THREE.LineBasicMaterial({ color: LIMA });
    const fill = new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: .94 });
    const vidrio = new THREE.MeshBasicMaterial({ color: 0x23282a, transparent: true, opacity: .9 });
    const sel = new THREE.MeshBasicMaterial({ color: LIMA, transparent: true, opacity: .22 });
    const raiz = new THREE.Group(); esc.add(raiz);
    const suelo = new THREE.Group(), edif = new THREE.Group(); raiz.add(suelo, edif);
    const caja3 = (w, h, d, m, em, x = 0, y = 0, z = 0) => {
      const g = new THREE.Group(), b = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(b, m), e = new THREE.LineSegments(new THREE.EdgesGeometry(b), em);
      g.add(mesh, e); g.position.set(x, y, z); return g;
    };
    function anillo(rx, rz, op){
      const p = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * Math.PI * 2, w = 1 + .07 * Math.sin(a * 3 + rx * .07) + .04 * Math.cos(a * 5 - rz * .05); p.push(Math.cos(a) * rx * w, 0, Math.sin(a) * rz * w); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color: PAPEL, transparent: true, opacity: op }));
    }
    let pisos = [], lado = 30, alto = 30, objAlto = 30;
    const dims = (i) => { const pl = st.lote * factor(st.uso, i, st.pisos), W = Math.sqrt(pl * 1.6); return [W, pl / W]; };

    tres = function(forma){
      if (forma) {
        while (suelo.children.length) suelo.remove(suelo.children[0]);
        while (edif.children.length) edif.remove(edif.children[0]);
        lado = Math.sqrt(st.lote);
        suelo.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(lado * 1.25, .01, lado)), eLima));
        for (let i = 1; i <= 7; i++) suelo.add(anillo(lado * .8 + i * lado * .2, lado * .7 + i * lado * .18, .24 - i * .025));
        pisos = []; let y = 0;
        for (let i = 1; i <= MAX; i++) {
          if (i > st.pisos) break;
          const [W, D] = dims(i), h = i === 1 ? H1 : H, g = new THREE.Group();
          g.position.y = y; g.userData = { i, h, s: forma ? 0 : 1 };
          // losa que sobresale un poco y volumen del piso
          g.add(caja3(W + .8, .3, D + .8, fill, ePapel, 0, h - .15, 0));
          const v = caja3(W, h - .3, D, i === 1 ? vidrio : fill, i === 1 ? ePapel : eSuave, 0, (h - .3) / 2, 0); v.userData.vol = true; g.add(v);
          // balcones en la torre de vivienda y hotel
          if (i > 2 && st.uso !== "oficinas" && !(st.pisos >= 6 && i > st.pisos - 2)) {
            g.add(caja3(W * .62, .2, 1.6, fill, ePapel, 0, h - .2, D / 2 + .8));
            g.add(caja3(W * .62, .2, 1.6, fill, ePapel, 0, h - .2, -D / 2 - .8));
          }
          // vanos verticales: líneas de fachada
          if (i > 1) { const pts = []; const n = Math.max(3, Math.round(W / 4)); for (let k = 1; k < n; k++) { const x = -W / 2 + k * W / n; pts.push(x, .15, D / 2 + .01, x, h - .3, D / 2 + .01, x, .15, -D / 2 - .01, x, h - .3, -D / 2 - .01); }
            const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.LineSegments(gg, eSuave)); }
          // pérgola en la cubierta
          if (i === st.pisos) { for (let k = -2; k <= 2; k++) g.add(caja3(.18, .18, D * .7, fill, ePapel, k * W * .14, h + 2.4, 0)); g.add(caja3(.2, 2.4, .2, fill, ePapel, -W * .3, h + 1.2, D * .33)); g.add(caja3(.2, 2.4, .2, fill, ePapel, W * .3, h + 1.2, D * .33)); }
          edif.add(g); pisos.push(g); y += h;
        }
        objAlto = y;
      }
      pisos.forEach(g => { const on = g.userData.i === st.piso; g.children.forEach(c => { if (c.userData.vol) { c.children[0].material = on ? sel : (g.userData.i === 1 ? vidrio : fill); c.children[1].material = on ? eLima : (g.userData.i === 1 ? ePapel : eSuave); } }); });
    };
    tres(true);

    // clic sobre un piso para elegirlo; arrastrar gira
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let ang = .75, arrastra = false, x0 = 0, movio = 0;
    caja.addEventListener("pointerdown", e => { arrastra = true; movio = 0; x0 = e.clientX; caja.setPointerCapture(e.pointerId); });
    caja.addEventListener("pointermove", e => { if (!arrastra) return; const dx = e.clientX - x0; movio += Math.abs(dx); ang -= dx * .008; x0 = e.clientX; });
    caja.addEventListener("pointerup", e => {
      arrastra = false; if (movio > 6) return;
      const rc = caja.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hit = ray.intersectObjects(pisos, true)[0];
      if (hit) { let o = hit.object; while (o && !(o.userData && o.userData.i)) o = o.parent; if (o) { st.piso = o.userData.i; marca(false); } }
    });
    function tam(){ const w = caja.clientWidth, h = caja.clientHeight; r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener("resize", tam); tam();

    let vis = false, corre = false;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !corre) cuadro(); }).observe(caja);
    function cuadro(){
      corre = false; if (!vis) return;
      if (!arrastra) ang += .0014;
      alto += (objAlto - alto) * .08;
      pisos.forEach((g, k) => { const d = g.userData; d.s += (1 - d.s) * Math.min(1, .16 + k * .002); g.scale.y = Math.max(.02, d.s); });
      const dist = Math.max(lado * 2.3, alto * 1.65 + lado * 1.1);
      cam.position.set(Math.cos(ang) * dist, alto * .5 + dist * .36, Math.sin(ang) * dist);
      cam.lookAt(0, alto * .42, 0);
      r.render(esc, cam); corre = true; requestAnimationFrame(cuadro);
    }
  })();

  marca(true);
})();
