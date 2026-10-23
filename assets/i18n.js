// X.FORM · Selector de idioma ES / EN.
// La web se escribe en español. La traducción vive en assets/i18n/en.json como pares
// «texto en español» → «texto en inglés», así que Vito traduce sin tocar el HTML.
// - Si el navegador está en inglés y la traducción está completa, la web abre en inglés sola.
// - El botón ES / EN del menú solo aparece cuando en.json tiene al menos el 95 % de los textos.
// - ?lang=en fuerza el inglés para revisar una traducción a medio hacer.
(function(){
  const btn = document.getElementById("lang");
  const ATR = ["alt", "aria-label", "placeholder", "title"];
  const SALTA = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CANVAS: 1 };
  const norma = s => s.replace(/\s+/g, " ").trim();
  const orig = new WeakMap();     // nodo → texto original en español
  const origAtr = new WeakMap();  // elemento → {atributo: texto original}
  let dic = {}, lang = "es", aplicando = false;

  function textos(raiz, fn){
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && SALTA[n.parentElement.tagName]) || !norma(n.nodeValue) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let n; while ((n = w.nextNode())) fn(n);
    (raiz.querySelectorAll ? raiz.querySelectorAll("*") : []).forEach(el => ATR.forEach(a => { if (el.hasAttribute(a) && norma(el.getAttribute(a))) fn(el, a); }));
  }

  function traduce(raiz){
    aplicando = true;
    textos(raiz, (n, a) => {
      if (a) {
        const m = origAtr.get(n) || {}; if (!(a in m)) { m[a] = n.getAttribute(a); origAtr.set(n, m); }
        const es = m[a], en = dic[norma(es)];
        const v = lang === "en" && en ? en : es; if (n.getAttribute(a) !== v) n.setAttribute(a, v);
      } else {
        if (!orig.has(n)) orig.set(n, n.nodeValue);
        const es = orig.get(n), en = dic[norma(es)];
        // conserva los espacios de los bordes para no pegar palabras
        const v = lang === "en" && en ? es.match(/^\s*/)[0] + en + es.match(/\s*$/)[0] : es;
        if (n.nodeValue !== v) n.nodeValue = v;
      }
    });
    document.documentElement.lang = lang;
    if (btn) { btn.textContent = lang === "en" ? "ES" : "EN"; btn.setAttribute("aria-label", lang === "en" ? "Ver en español" : "View in English"); }
    obs.takeRecords();     // descarta los cambios que acabamos de hacer nosotros
    aplicando = false;
  }

  // La ficha de cada proyecto y la calculadora escriben texto nuevo al abrirse: también se traduce.
  const obs = new MutationObserver(ms => {
    if (aplicando || lang === "es") return;
    ms.forEach(m => {
      if (m.type === "characterData") { orig.delete(m.target); traduce(m.target.parentElement || document.body); }
      m.addedNodes.forEach(n => { if (n.nodeType === 3) { orig.delete(n); traduce(n.parentElement); } else if (n.nodeType === 1) traduce(n); });
    });
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true });

  // Para preparar en.json: lista de todos los textos en español que hoy tiene la página.
  window.xformTextos = () => { const s = new Set(); textos(document.body, (n, a) => s.add(norma(a ? n.getAttribute(a) : n.nodeValue))); return [...s]; };

  function guarda(v){ try { localStorage.setItem("xform-lang", v); } catch (e) {} }
  function lee(){ try { return localStorage.getItem("xform-lang"); } catch (e) { return null; } }

  fetch("assets/i18n/en.json", { cache: "no-cache" }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(d => {
    dic = {}; Object.keys(d || {}).forEach(k => { if (k.charAt(0) !== "_" && d[k]) dic[norma(k)] = d[k]; });
    const total = Object.keys(d || {}).filter(k => k.charAt(0) !== "_").length;
    const listo = total > 0 && Object.keys(dic).length / total >= 0.95;
    const forzado = new URLSearchParams(location.search).get("lang");
    const elegido = lee();
    if (forzado === "en" || forzado === "es") lang = forzado;
    else if (listo && elegido) lang = elegido;
    else if (listo && /^en\b/i.test(navigator.language || "")) lang = "en";
    if (btn && (listo || forzado)) btn.hidden = false;
    if (lang === "en") traduce(document.body);
  });

  if (btn) btn.addEventListener("click", () => { lang = lang === "en" ? "es" : "en"; guarda(lang); traduce(document.body); });
})();
