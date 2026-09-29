// ============================================================
// Recomendador con IA — LAFITA Tickets
// ============================================================
// Recibe { prompt, lang, hoy } desde index.html, lee el programa
// (movies.json) y le pide a Claude hasta 3 funciones con una razón
// en el idioma de la persona. Devuelve:
//   { entendido: "…", recomendaciones: [{ id, razon }] }
// La clave de la API vive aquí (secreto de Cloudflare), nunca en la web.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";

const IDIOMAS = { de: "alemán", es: "español", en: "inglés", pt: "portugués" };
const MAX_PROMPT = 500;

const ESQUEMA = {
  type: "object",
  properties: {
    entendido: { type: "string" },
    recomendaciones: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, razon: { type: "string" } },
        required: ["id", "razon"],
        additionalProperties: false,
      },
    },
  },
  required: ["entendido", "recomendaciones"],
  additionalProperties: false,
};

const SISTEMA = `Eres el recomendador de LAFITA, el festival de cine latinoamericano de Múnich.
Recibes el programa del festival (JSON) y lo que una persona del público escribe: cuándo puede ir, qué le apetece, películas o cineastas que le gustan, temas, actores, etc.

Elige hasta 3 funciones del programa que mejor encajen y explica en una o dos frases, en el idioma pedido, por qué cada una encaja con lo que escribió. Tono cercano, concreto y honesto.

Reglas:
- Usa solo la información del programa (trama, reparto, dirección, temas, sinopsis, fecha, hora, sala). No inventes datos de las películas.
- Si la persona compara con un cineasta o película que no está en el programa (p. ej. "algo como David Lynch"), explica qué rasgos del programa se parecen (tono, temas, atmósfera), sin afirmar que la película es "de" ese estilo si no lo dice el programa.
- Respeta lo que diga de día, hora o duración. Si nada lo cumple del todo, recomienda lo más cercano y dilo claramente en la razón.
- No recomiendes funciones con fecha anterior a "hoy".
- Si la petición no tiene nada que ver con elegir película, devuelve "recomendaciones" vacío.
- "entendido": resumen muy breve (máx. 8 palabras) de lo que buscas, en el idioma pedido.
- "id": exactamente el campo "id" de la función.`;

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

// Solo lo que la IA necesita de cada función
function compacto(p) {
  return {
    id: p.id, titulo: p.titulo, fecha: p.fecha, hora: p.hora, sala: p.lugar,
    sinopsis: p.sinopsis, direccion: p.direccion, reparto: p.reparto,
    generos: p.generos, temas: p.temas, trama: p.trama && (p.trama.es || p.trama.en),
    duracion: p.duracion, venta: p.enlaceExterno ? "online" : "reserva en la web",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (request.method !== "POST") return json(env, { error: "method" }, 405);

    let entrada;
    try { entrada = await request.json(); } catch { return json(env, { error: "json" }, 400); }
    const prompt = String(entrada.prompt || "").trim().slice(0, MAX_PROMPT);
    const lang = IDIOMAS[entrada.lang] ? entrada.lang : "de";
    const hoy = /^\d{4}-\d{2}-\d{2}$/.test(entrada.hoy || "") ? entrada.hoy : new Date().toISOString().slice(0, 10);
    if (!prompt) return json(env, { error: "prompt" }, 400);

    const programa = await (await fetch(env.PROGRAMA_URL, { cf: { cacheTtl: 300 } })).json();
    const ids = new Set(programa.map((p) => p.id));

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    let respuesta;
    try {
      respuesta = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
        system: SISTEMA,
        messages: [{
          role: "user",
          content: `PROGRAMA:\n${JSON.stringify(programa.map(compacto))}\n\nHOY: ${hoy}\nIDIOMA DE LA RESPUESTA: ${IDIOMAS[lang]}\n\nLO QUE ESCRIBE LA PERSONA:\n${prompt}`,
        }],
      });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return json(env, { error: "ocupado" }, 429);
      if (e instanceof Anthropic.APIError) return json(env, { error: "ia" }, 502);
      throw e;
    }

    if (respuesta.stop_reason === "refusal") return json(env, { entendido: "", recomendaciones: [] });
    const texto = respuesta.content.find((b) => b.type === "text")?.text || "{}";
    let datos;
    try { datos = JSON.parse(texto); } catch { return json(env, { error: "formato" }, 502); }

    datos.recomendaciones = (datos.recomendaciones || []).filter((r) => ids.has(r.id)).slice(0, 3);
    return json(env, datos);
  },
};
