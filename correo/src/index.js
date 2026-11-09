// ============================================================
// Correo de confirmación — LAFITA Tickets
// ============================================================
// registro.html llama a este servicio justo después de guardar una
// reserva, enviando solo { clave }. El servicio:
//   1. lee ESA reserva en Firebase (la clave es el ID del documento),
//   2. comprueba que se acaba de crear (máx. 15 min),
//   3. manda el correo a la dirección guardada en la reserva,
//      en el idioma en que se hizo (DE · ES · EN · PT).
// Así nadie puede usarlo para mandar correos a otras direcciones ni
// con otro texto. El envío se hace con Brevo (gratis hasta 300/día).
// La clave de Brevo vive aquí (secreto de Cloudflare), nunca en la web.
// ============================================================

const VENTANA_MIN = 15; // solo reservas creadas hace menos de esto

// Valores por defecto: así el archivo se puede pegar tal cual en el editor
// web de Cloudflare y solo hay que añadir el secreto BREVO_API_KEY.
// (Las variables de wrangler.toml o del panel de Cloudflare tienen prioridad.)
const POR_DEFECTO = {
  ORIGEN_PERMITIDO: "https://lafita-muc.github.io",
  WEB_URL: "https://lafita-muc.github.io/ticketing",
  REMITENTE: "ticket@lafita.de",
  REMITENTE_NOMBRE: "LAFITA Tickets",
  CONTACTO: "ticket@lafita.de",
  FIREBASE_PROJECT: "lafita26-4dd5b",
  FIREBASE_API_KEY: "AIzaSyD_mhwFkkb3JHH0hoZOgoWtpw3VAAhLyTE",
};

const TXT = {
  de: {
    locale: "de-DE",
    asunto_ok: "Deine Reservierung bei LAFITA: {titulo}",
    asunto_espera: "Warteliste LAFITA: {titulo}",
    hola: "Hallo {nombre},",
    ok: "deine Reservierung ist gespeichert.",
    espera: "die Vorstellung ist gerade voll – du stehst auf der <b>Warteliste</b>. Wenn Plätze frei werden, bestätigen wir deine Reservierung. Komm trotzdem zur Kasse: 15 Minuten vor Beginn werden nicht abgeholte Tickets vergeben.",
    pelicula: "Film", cuando: "Wann", donde: "Wo", personas: "Personen", codigo: "Einlass-Code",
    pago: "<b>Das ist eine Reservierung, keine Zahlung.</b> Bezahlt wird an der Kasse, nur in bar. <b>Wir halten deinen Platz nur bis 15 Minuten vor Beginn</b> – danach geht er an andere.",
    gestion: "Ticket ansehen, Daten ändern oder stornieren",
    clave: "Deine Verwaltungsnummer (nicht weitergeben):",
    ayuda: "Fragen zur Reservierung? Schreib an {mail}.",
    hora: " Uhr",
  },
  es: {
    locale: "es-ES",
    asunto_ok: "Tu reserva en LAFITA: {titulo}",
    asunto_espera: "Lista de espera LAFITA: {titulo}",
    hola: "Hola, {nombre}:",
    ok: "tu reserva está guardada.",
    espera: "la función está completa ahora mismo y estás en la <b>lista de espera</b>. Si se liberan plazas, confirmamos tu reserva. Ven igualmente a la taquilla: 15 minutos antes se dan las entradas no recogidas.",
    pelicula: "Película", cuando: "Cuándo", donde: "Dónde", personas: "Personas", codigo: "Código de entrada",
    pago: "<b>Esto es una reserva, no un pago.</b> Se paga en la taquilla, solo en efectivo. <b>Solo guardamos tu sitio hasta 15 minutos antes</b> de la función; después pasa a otra persona.",
    gestion: "Ver tu entrada, cambiar los datos o cancelar",
    clave: "Tu clave de gestión (no la compartas):",
    ayuda: "¿Dudas con la reserva? Escribe a {mail}.",
    hora: " h",
  },
  en: {
    locale: "en-GB",
    asunto_ok: "Your LAFITA reservation: {titulo}",
    asunto_espera: "LAFITA waitlist: {titulo}",
    hola: "Hi {nombre},",
    ok: "your reservation is saved.",
    espera: "the screening is full right now, so you're on the <b>waitlist</b>. If seats free up, we'll confirm your reservation. Come to the box office anyway: 15 minutes before the start, uncollected tickets are given out.",
    pelicula: "Film", cuando: "When", donde: "Where", personas: "People", codigo: "Entry code",
    pago: "<b>This is a reservation, not a payment.</b> Pay at the box office, cash only. <b>We only hold your seat until 15 minutes before</b> the screening; after that it goes to someone else.",
    gestion: "See your ticket, change your details or cancel",
    clave: "Your management key (don't share it):",
    ayuda: "Questions about your reservation? Write to {mail}.",
    hora: "",
  },
  pt: {
    locale: "pt-BR",
    asunto_ok: "Sua reserva no LAFITA: {titulo}",
    asunto_espera: "Lista de espera LAFITA: {titulo}",
    hola: "Olá, {nombre},",
    ok: "sua reserva está guardada.",
    espera: "a sessão está esgotada agora e você está na <b>lista de espera</b>. Se liberarem lugares, confirmamos sua reserva. Venha mesmo assim à bilheteria: 15 minutos antes os ingressos não retirados são liberados.",
    pelicula: "Filme", cuando: "Quando", donde: "Onde", personas: "Pessoas", codigo: "Código de entrada",
    pago: "<b>Isto é uma reserva, não um pagamento.</b> Pague na bilheteria, só em dinheiro. <b>Só guardamos o seu lugar até 15 minutos antes</b> da sessão; depois ele passa para outra pessoa.",
    gestion: "Ver seu ingresso, alterar os dados ou cancelar",
    clave: "Sua chave de gestão (não a compartilhe):",
    ayuda: "Dúvidas sobre a reserva? Escreva para {mail}.",
    hora: "",
  },
};

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ORIGEN_PERMITIDO || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(env) },
  });
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rellenar = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

// Firestore REST devuelve { fields: { nombre: { stringValue }, personas: { integerValue } … } }
function plano(fields = {}) {
  const o = {};
  for (const [k, v] of Object.entries(fields)) {
    o[k] = v.stringValue ?? v.timestampValue ?? (v.integerValue != null ? Number(v.integerValue) : v.booleanValue);
  }
  return o;
}

function fechaBonita(fecha, locale) {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      .format(new Date(fecha + "T12:00:00Z"));
  } catch { return fecha; }
}

function correo(r, env) {
  const L = TXT[r.idioma] || TXT.de;
  const espera = r.estado === "espera";
  const mail = env.CONTACTO;
  const enlace = `${env.WEB_URL.replace(/\/$/, "")}/gestionar.html?clave=${r.clave}`;
  const clave = r.clave.replace(/(.{4})(?=.)/g, "$1-");
  const cuando = `${fechaBonita(r.fecha, L.locale)}, ${r.hora}${L.hora}`;
  const fila = (k, v) => `<tr><td style="padding:4px 16px 4px 0;color:#5f5f5f">${k}</td><td style="padding:4px 0"><b>${v}</b></td></tr>`;

  const asunto = rellenar(espera ? L.asunto_espera : L.asunto_ok, { titulo: r.peliculaTitulo });
  const html = `<!doctype html><html><body style="margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:16px;line-height:1.5">
<div style="max-width:560px;margin:0 auto;padding:24px 20px">
  <div style="border-bottom:3px solid #111;padding-bottom:10px;margin-bottom:20px">
    <span style="font-size:26px;font-weight:bold;letter-spacing:.04em">LAFITA</span>
    <span style="background:#6bb288;color:#fff;font-size:12px;font-weight:bold;letter-spacing:.08em;padding:3px 8px;margin-left:6px">TICKETS</span>
  </div>
  <p>${esc(rellenar(L.hola, { nombre: r.nombre }))}<br>${espera ? L.espera : L.ok}</p>
  <table style="border-collapse:collapse;margin:16px 0">
    ${fila(L.pelicula, esc(r.peliculaTitulo))}
    ${fila(L.cuando, esc(cuando))}
    ${fila(L.donde, esc(r.lugar))}
    ${fila(L.personas, esc(r.personas))}
    ${espera ? "" : fila(L.codigo, `${esc(r.codigo)} · ${esc(r.nombreArte)}`)}
  </table>
  <p style="background:#eaf4ee;border-left:4px solid #6bb288;padding:10px 14px">${L.pago}</p>
  <p><a href="${enlace}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;font-weight:bold">${L.gestion}</a></p>
  <p style="font-size:14px;color:#5f5f5f">${L.clave} <b style="color:#111;font-family:monospace">${clave}</b></p>
  <p style="font-size:14px;color:#5f5f5f;border-top:1px solid #dcdcdc;padding-top:12px">${rellenar(L.ayuda, { mail: `<a href="mailto:${mail}">${mail}</a>` })}<br>LAFITA · Lateinamerikanische Filmtage München</p>
</div></body></html>`;

  const quitar = (s) => s.replace(/<[^>]+>/g, "");
  const texto = [
    rellenar(L.hola, { nombre: r.nombre }), quitar(espera ? L.espera : L.ok), "",
    `${L.pelicula}: ${r.peliculaTitulo}`, `${L.cuando}: ${cuando}`, `${L.donde}: ${r.lugar}`, `${L.personas}: ${r.personas}`,
    espera ? null : `${L.codigo}: ${r.codigo} · ${r.nombreArte}`, "",
    quitar(L.pago), "", `${L.gestion}: ${enlace}`, `${L.clave} ${clave}`, "", rellenar(L.ayuda, { mail }),
  ].filter((l) => l !== null).join("\n");

  return { asunto, html, texto };
}

export default {
  async fetch(request, entorno) {
    const env = { ...POR_DEFECTO, ...entorno };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== "POST") return json(env, { error: "method" }, 405);

    let entrada;
    try { entrada = await request.json(); } catch { return json(env, { error: "json" }, 400); }
    const clave = String(entrada.clave || "");
    if (!/^[2-9A-HJKMNP-Z]{12}$/.test(clave)) return json(env, { error: "clave" }, 400);

    // No mandar dos veces el mismo correo (por si se pulsa o se recarga)
    const marca = new Request(`https://correo.lafita.internal/enviado/${clave}`);
    if (await caches.default.match(marca)) return json(env, { ok: true, repetido: true });

    // Leer la reserva en Firebase (las reglas permiten leer UNA reserva con su clave)
    const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT}/databases/(default)/documents/inscripciones/${clave}?key=${env.FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (res.status === 404) return json(env, { error: "no existe" }, 404);
    if (!res.ok) return json(env, { error: "firebase" }, 502);
    const r = { ...plano((await res.json()).fields), clave };

    if (!r.email || !["activa", "espera"].includes(r.estado)) return json(env, { error: "estado" }, 409);
    const creado = Date.parse(r.creadoEn || "");
    if (!creado || Date.now() - creado > VENTANA_MIN * 60 * 1000) return json(env, { error: "antigua" }, 409);

    const { asunto, html, texto } = correo(r, env);
    const envio = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        sender: { name: env.REMITENTE_NOMBRE, email: env.REMITENTE },
        replyTo: { email: env.CONTACTO },
        to: [{ email: r.email, name: r.nombre }],
        subject: asunto,
        htmlContent: html,
        textContent: texto,
        tags: ["reserva", r.estado],
      }),
    });
    if (!envio.ok) {
      console.log("Brevo", envio.status, await envio.text());
      return json(env, { error: "envio" }, 502);
    }

    await caches.default.put(marca, new Response("1", { headers: { "Cache-Control": "max-age=86400" } }));
    return json(env, { ok: true });
  },
};
