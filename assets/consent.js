// X.FORM · Aviso de cookies y Google Analytics 4 (Ley 1581 de 2012).
// - GA4 (G-P7VN32C19K) solo se carga después de que el visitante acepta en el aviso.
// - Solo en xform.com.co: en las vistas previas de Netlify y en local nunca se carga, para no ensuciar los datos.
// - Conversiones: clic a WhatsApp (wa.me), clic a correo (mailto:info@) y lectura completa de «Dimensiona tu proyecto».
//   En GA4 hay que marcarlas como «evento clave» (Administrar → Eventos) la primera vez que lleguen.
(function(){
  const GA = "G-P7VN32C19K";
  const CLAVE = "xform-cookies";                 // "si" | "no"
  const h = location.hostname;
  const PROD = h === "xform.com.co" || h === "www.xform.com.co";
  const aviso = document.getElementById("cookies");
  let cargado = false;

  const lee = () => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } };
  const guarda = v => { try { localStorage.setItem(CLAVE, v); } catch (e) {} };

  function cargaGA(){
    if (cargado || !PROD) return; cargado = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ dataLayer.push(arguments); };
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    gtag("js", new Date());
    gtag("config", GA, { anonymize_ip: true });
    const s = document.createElement("script"); s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA;
    document.head.appendChild(s);
  }

  // Envía un evento solo si GA está activo (hubo aceptación y es el sitio real).
  function evento(nombre, datos){ if (cargado && window.gtag) gtag("event", nombre, datos || {}); }
  window.xformEvento = evento;

  function muestra(si){ if (!aviso) return; aviso.hidden = !si; }
  function decide(v){ guarda(v); muestra(false); if (v === "si") cargaGA(); }

  if (aviso) {
    const si = document.getElementById("ckSi"), no = document.getElementById("ckNo");
    if (si) si.addEventListener("click", () => decide("si"));
    if (no) no.addEventListener("click", () => decide("no"));
  }
  // «Preferencias de cookies» en el pie vuelve a abrir el aviso. Si ya había aceptado y ahora rechaza, se recarga sin GA.
  document.querySelectorAll("[data-cookies]").forEach(b => b.addEventListener("click", e => {
    e.preventDefault(); muestra(true);
    const no = document.getElementById("ckNo");
    if (no && cargado) no.addEventListener("click", () => location.reload(), { once: true });
  }));

  const v = lee();
  if (v === "si") cargaGA(); else if (v !== "no") muestra(true);

  // ---------- conversiones ----------
  const seccion = el => { const s = el.closest("section, footer, dialog"); return s && s.id ? s.id : "pagina"; };
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    const href = a.getAttribute("href") || "";
    const dim = a.id === "ctaWa" || a.id === "ctaMail";
    if (/^https:\/\/wa\.me\//i.test(href)) evento("contacto_whatsapp", { ubicacion: seccion(a), desde_dimensiona: dim });
    else if (/^mailto:info@xform\.com\.co/i.test(href)) evento("contacto_correo", { ubicacion: seccion(a), desde_dimensiona: dim });
  }, true);

  // «Dimensiona tu proyecto» no tiene botón de enviar: cuenta cuando el visitante responde las tres preguntas y ve su lectura.
  const form = document.getElementById("dimForm");
  if (form) {
    let enviado = false;
    form.addEventListener("change", () => {
      const g = n => form.querySelector("input[name=" + n + "]:checked");
      const t = g("tipo"), a = g("area"), s = g("etapa");
      if (!(t && a && s) || enviado) return;
      enviado = true;
      evento("dimensiona_proyecto", { tipo: t.value, area: a.dataset.t || a.value, etapa: s.value });
    });
  }
})();
