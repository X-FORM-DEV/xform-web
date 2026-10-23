// X.FORM · Sabor: cifras que cuentan, cursor de arquitecto, luz que sigue al mouse, botones
// magnéticos, banda de palabras que corre con el scroll, barra de avance y hora de Bogotá.
// Todo respeta «reducir movimiento» y en pantallas táctiles se apaga lo que depende del mouse.
(function(){
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fino = matchMedia("(pointer: fine)").matches;
  const raiz = document.documentElement;

  // ---------- cifras que cuentan al aparecer ----------
  const cifras = [...document.querySelectorAll(".facts b, .kpis b")];
  function nodoTexto(el){ for (const n of el.childNodes) if (n.nodeType === 3 && /\d/.test(n.nodeValue)) return n; return null; }
  function cuenta(el){
    const n = nodoTexto(el); if (!n) return;
    const orig = n.nodeValue, m = orig.match(/([\d.,]+)/); if (!m) return;
    const fin = parseFloat(m[1].replace(/\./g, "").replace(",", ".")), miles = m[1].includes(".") || fin >= 1000;
    if (quieto || !fin) return;
    const t0 = performance.now(), T = 1600;
    (function paso(t){
      const k = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - k, 4), v = Math.round(fin * e);
      n.nodeValue = k < 1 ? orig.replace(m[1], miles ? v.toLocaleString("es-CO") : String(v)) : orig;
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { cuenta(e.target); io.unobserve(e.target); } }), { threshold: .6 });
    cifras.forEach(c => io.observe(c));
  }

  // ---------- plano de La firma: se dibuja trazo a trazo con el scroll ----------
  // Cada trazo lleva su turno (data-o, de 1 a 10): ejes, lindero, muros, ventanas, puertas,
  // mobiliario, cotas y al final los nombres de los espacios. Sin JavaScript queda dibujado entero.
  const plano = document.querySelector("[data-plano]");
  if (plano) {
    const piezas = [...plano.querySelectorAll("[data-o]")].map(el => ({ el, o: +el.dataset.o, tx: el.tagName === "text" }));
    const N = 10, DUR = .22;
    let ultimo = -1;
    function dibuja(){
      const r = plano.getBoundingClientRect(), vh = innerHeight;
      // empieza cuando el plano asoma por abajo y termina cuando llega a la mitad de la pantalla
      const p = quieto ? 1 : Math.max(0, Math.min(1, (vh * 1.05 - r.top) / (vh * .62 + r.height * .35)));
      if (Math.abs(p - ultimo) < .002) return; ultimo = p;
      piezas.forEach(({ el, o, tx }) => {
        const ini = (o - 1) / N * (1 - DUR), k = Math.max(0, Math.min(1, (p - ini) / DUR));
        if (tx) el.style.setProperty("--a", k); else el.style.setProperty("--d", 1 - k);
      });
    }
    addEventListener("scroll", dibuja, { passive: true }); addEventListener("resize", dibuja); dibuja();
  }

  // ---------- Proceso: la fase activa sigue al scroll; un clic la fija ----------
  const sec = document.getElementById("proceso");
  if (sec) {
    const fs = [...sec.querySelectorAll(".fase")], nom = document.getElementById("procNom"), num = document.getElementById("procNum");
    let fija = 0, actual = 0;
    const pon = n => {
      if (n === actual) return; actual = n; window.xfFase = n;
      fs.forEach(f => f.classList.toggle("on", +f.dataset.f === n));
      const f = fs[n - 1]; num.textContent = "0" + n; nom.textContent = f.querySelector("h3").textContent;
      if (window.xformProceso) window.xformProceso.fase(n);
    };
    fs.forEach(f => {
      const go = () => { fija = performance.now() + 5000; pon(+f.dataset.f); };
      f.addEventListener("click", go); f.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    const porScroll = () => {
      if (performance.now() < fija) return;
      const y = innerHeight * .5; let mejor = 1, d = Infinity;
      fs.forEach(f => { const r = f.getBoundingClientRect(), c = r.top + r.height / 2, dd = Math.abs(c - y); if (dd < d) { d = dd; mejor = +f.dataset.f; } });
      pon(mejor);
    };
    addEventListener("scroll", porScroll, { passive: true }); pon(1); actual = 1;
    // el visor 3D se carga solo cuando la sección se acerca
    const vista = document.getElementById("procVista");
    if (vista && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => {
        if (!es[0].isIntersecting) return; io.disconnect();
        import("./proceso3d.mjs?v=20261022f").catch(e => { vista.classList.add("error"); console.warn("Proceso 3D:", e && e.message); });
      }, { rootMargin: "700px 0px" });
      io.observe(vista);
    }
  }

  // ---------- fotos de proyectos y fases: escalonadas ----------
  document.querySelectorAll(".cards .card").forEach((c, i) => c.style.setProperty("--d", (i % 3) * 0.12 + "s"));
  document.querySelectorAll(".fases .fase").forEach((c, i) => c.style.setProperty("--d", i * 0.22 + "s"));
  document.querySelectorAll(".srv article").forEach((c, i) => c.style.setProperty("--d", i * 0.1 + "s"));

  // ---------- barra de avance en el menú ----------
  const barra = document.createElement("i"); barra.className = "avance"; barra.setAttribute("aria-hidden", "true");
  const hd = document.getElementById("top"); if (hd) hd.appendChild(barra);
  let ultimoY = scrollY, vel = 0;
  function alScroll(){
    const max = raiz.scrollHeight - innerHeight;
    barra.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
  }
  addEventListener("scroll", alScroll, { passive: true }); alScroll();

  // ---------- banda de palabras: corre sola y acelera con el scroll ----------
  const banda = document.querySelector(".banda-pista");
  if (banda && !quieto) {
    let x = 0, vis = true;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(banda);
    (function anda(){
      vel += ((scrollY - ultimoY) - vel) * .1; ultimoY = scrollY;
      if (vis) {
        x -= .45 + Math.abs(vel) * .35;
        const w = banda.scrollWidth / 2; if (-x > w) x += w;
        banda.style.transform = "translate3d(" + x + "px,0,0) skewX(" + Math.max(-8, Math.min(8, -vel * .25)) + "deg)";
      }
      requestAnimationFrame(anda);
    })();
  }

  // ---------- hora de Bogotá en Hablemos ----------
  const reloj = document.getElementById("hora");
  if (reloj) {
    const pon = () => { try { reloj.textContent = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date()); } catch (e) {} };
    pon(); setInterval(pon, 20000);
  }

  if (!fino || quieto) return;

  // ---------- cursor de arquitecto ----------
  const punto = document.createElement("div"), aro = document.createElement("div");
  punto.className = "cur-punto"; aro.className = "cur-aro"; aro.innerHTML = "<span></span>";
  [punto, aro].forEach(e => { e.setAttribute("aria-hidden", "true"); document.body.appendChild(e); });
  raiz.classList.add("con-cursor");
  let mx = innerWidth / 2, my = innerHeight / 2, ax = mx, ay = my;
  addEventListener("pointermove", e => {
    mx = e.clientX; my = e.clientY;
    punto.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    const t = e.target.closest ? e.target : null;
    const card = t && t.closest(".card"), vista = t && t.closest("#mvVista"), enlace = t && t.closest("a,button,label,input");
    aro.classList.toggle("ver", !!card); aro.classList.toggle("girar", !!vista && !card); aro.classList.toggle("link", !!enlace && !card && !vista);
    aro.firstChild.textContent = card ? (raiz.lang === "en" ? "VIEW" : "VER") : vista ? (raiz.lang === "en" ? "DRAG" : "GIRA") : "";
    const claro = t && t.closest(".light,.white,dialog.ficha");
    aro.classList.toggle("claro", !!claro); punto.classList.toggle("claro", !!claro);
  }, { passive: true });
  document.addEventListener("pointerleave", () => { aro.style.opacity = punto.style.opacity = 0; });
  document.addEventListener("pointerenter", () => { aro.style.opacity = punto.style.opacity = ""; });
  (function sigue(){ ax += (mx - ax) * .18; ay += (my - ay) * .18; aro.style.transform = "translate3d(" + ax + "px," + ay + "px,0)"; requestAnimationFrame(sigue); })();

  // ---------- luz que sigue al mouse en los servicios ----------
  document.querySelectorAll(".srv article").forEach(a => {
    a.addEventListener("pointermove", e => {
      const r = a.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      a.style.setProperty("--mx", x * 100 + "%"); a.style.setProperty("--my", y * 100 + "%");
      a.style.transform = "perspective(900px) rotateX(" + ((.5 - y) * 4) + "deg) rotateY(" + ((x - .5) * 5) + "deg)";
    });
    a.addEventListener("pointerleave", () => { a.style.transform = ""; });
  });

  // ---------- botones magnéticos ----------
  document.querySelectorAll(".btn, nav.menu a.cta, .mv-cta").forEach(b => {
    b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * .18 + "px," + (e.clientY - r.top - r.height / 2) * .28 + "px)"; });
    b.addEventListener("pointerleave", () => { b.style.transform = ""; });
  });
})();
