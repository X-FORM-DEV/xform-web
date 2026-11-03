// X.FORM · Sabor (web v4, DESIGN.md §3 «un solo momento con autor por página»).
// Quedan: el plano de La firma que se dibuja con el scroll, la fase activa del proceso y la hora
// de Bogotá. Salieron el cursor de arquitecto, la luz que sigue al mouse, los botones magnéticos,
// la banda de palabras, la barra de avance y las cifras que cuentan.
(function(){
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fino = matchMedia("(pointer: fine)").matches;
  const raiz = document.documentElement;

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
      const f = fs[n - 1]; num.textContent = "Fase " + n; nom.textContent = f.querySelector("h3").textContent;
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

  // ---------- hora de Bogotá en Hablemos ----------
  const reloj = document.getElementById("hora");
  if (reloj) {
    const pon = () => { try { reloj.textContent = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }).format(new Date()); } catch (e) {} };
    pon(); setInterval(pon, 20000);
  }

})();
