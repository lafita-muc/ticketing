// ============================================================
// LAFITA — código único + arte generativo para cada inscripción
// ============================================================
// Cada inscripción recibe un código tipo "LAF-7K3QM".
// A partir de ese código se genera SIEMPRE la misma imagen y el mismo
// nombre ("Jaguar Turquesa"), así el equipo puede comprobarlo en la
// entrada mirando la imagen, el nombre o el código.
// ============================================================

const LafitaTicket = (() => {
  // Sin caracteres que se confunden (0/O, 1/I/L)
  const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  const ANIMALES = ['Jaguar', 'Colibrí', 'Tucán', 'Quetzal', 'Cóndor', 'Llama', 'Ajolote', 'Tortuga',
                    'Delfín', 'Guacamaya', 'Puma', 'Iguana', 'Mariposa', 'Flamenco', 'Capibara', 'Armadillo'];
  const ADJETIVOS = ['Azul', 'Verde', 'Turquesa', 'Rosa', 'Violeta', 'Naranja',
                     'Coral', 'Carmesí', 'Añil', 'Lunar', 'Solar', 'Celeste'];

  // Paletas con los colores de LAFITA (verde, lima, turquesa, negro)
  const G = '#6bb288', L = '#d0d500', T = '#0098b2', K = '#111111', W = '#ffffff';
  const PALETAS = [
    [G, L, T, K, W],
    [T, K, G, L, W],
    [K, G, L, T, '#eaf4ee'],
    [G, T, K, L, '#f6f7da'],
    [L, K, T, G, '#e3f2f5'],
    [W, L, G, T, K],
    [L, G, W, T, '#1d5f73'],
    [W, K, L, T, G]
  ];

  function generarCodigo() {
    const bytes = new Uint32Array(5);
    crypto.getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += ALFABETO[b % ALFABETO.length];
    return 'LAF-' + s;
  }

  // Clave de gestión: 12 caracteres (XXXX-XXXX-XXXX). Es el ID de la reserva
  // en Firebase y solo la ve quien reserva: sirve para cambiar o cancelar.
  function generarClave() {
    const bytes = new Uint32Array(12);
    crypto.getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += ALFABETO[b % ALFABETO.length];
    return s;
  }
  function formatearClave(c) { return String(c || '').replace(/(.{4})(?=.)/g, '$1-'); }
  function normalizarClave(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  // Semilla + generador pseudoaleatorio determinista (xmur3 + mulberry32)
  function semilla(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function rng(code) {
    let a = semilla(code);
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function nombreArte(code) {
    const r = rng(code + '#nombre');
    return ANIMALES[Math.floor(r() * ANIMALES.length)] + ' ' + ADJETIVOS[Math.floor(r() * ADJETIVOS.length)];
  }

  // Dibuja una celda con una forma geométrica
  function forma(tipo, x, y, s, color, rot) {
    const cx = x + s / 2, cy = y + s / 2;
    const g = (inner) => `<g transform="rotate(${rot} ${cx} ${cy})">${inner}</g>`;
    switch (tipo) {
      case 0: return `<circle cx="${cx}" cy="${cy}" r="${s * 0.42}" fill="${color}"/>`;
      case 1: return g(`<path d="M${x} ${y} L${x + s} ${y} A${s} ${s} 0 0 1 ${x} ${y + s} Z" fill="${color}"/>`);
      case 2: return g(`<path d="M${x} ${y + s} L${x + s / 2} ${y} L${x + s} ${y + s} Z" fill="${color}"/>`);
      case 3: return `<rect x="${x + s * 0.1}" y="${y + s * 0.1}" width="${s * 0.8}" height="${s * 0.8}" rx="${s * 0.12}" fill="${color}"/>`;
      case 4: return `<path d="M${cx} ${y} L${x + s} ${cy} L${cx} ${y + s} L${x} ${cy} Z" fill="${color}"/>`;
      case 5: return g(`<path d="M${x} ${y} L${x + s} ${y} L${x} ${y + s} Z" fill="${color}"/>`);
      case 6: return `<circle cx="${cx}" cy="${cy}" r="${s * 0.4}" fill="none" stroke="${color}" stroke-width="${s * 0.16}"/>`;
      default: return g(`<rect x="${x}" y="${y}" width="${s}" height="${s / 2}" fill="${color}"/>`);
    }
  }

  // Arte simétrico 6x6 (espejo horizontal): fácil de reconocer de un vistazo
  function svgArte(code, size = 240) {
    const r = rng(code);
    const pal = PALETAS[Math.floor(r() * PALETAS.length)];
    const fondo = pal[4];
    const colores = pal.slice(0, 4);
    const N = 6, pad = size * 0.06, s = (size - pad * 2) / N;
    let celdas = '';
    for (let fila = 0; fila < N; fila++) {
      for (let col = 0; col < N / 2; col++) {
        const tipo = Math.floor(r() * 8);
        const color = colores[Math.floor(r() * colores.length)];
        const rot = [0, 90, 180, 270][Math.floor(r() * 4)];
        const vacia = r() < 0.12;
        if (vacia) continue;
        const y = pad + fila * s;
        const xIzq = pad + col * s;
        const celda = forma(tipo, xIzq, y, s, color, rot);
        celdas += celda;
        // espejo respecto al centro vertical de la imagen
        celdas += `<g transform="translate(${size} 0) scale(-1 1)">${celda}</g>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" fill="${fondo}"/>${celdas}</svg>`;
  }

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Ticket completo (para mostrar y descargar como imagen)
  function svgTicket({ codigo, nombre, titulo, fecha, fechaTexto, hora, lugar, personas }) {
    // Textos en el idioma elegido (i18n.js); si no está cargado, en alemán
    const tr = (k, d) => (typeof t === 'function' ? t(k) : d);
    const cuando = fecha && typeof diaCorto === 'function' ? diaCorto(fecha) : (fechaTexto || '');
    const sufijo = tr('time_suffix', ' Uhr');
    const gente = personas == 1 ? tr('person', 'Person') : tr('persons', 'Personen');
    const nota = tr('ticket_note', 'Reserviert bis 10 Min. vor Beginn · Zahlung an der Kasse, nur bar');
    const W = 600, H = 900;
    const arte = svgArte(codigo, 400).replace('<svg ', '<svg x="100" y="176" ');
    const recorte = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
    const cond = 'Oswald, Arial Narrow, Helvetica Neue, Arial, sans-serif';
    const body = 'Barlow, DIN Pro, Helvetica Neue, Arial, sans-serif';
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="14" fill="#6bb288"/>
  <text x="40" y="104" font-family="${cond}" font-size="44" font-weight="500" letter-spacing="2" fill="#111">LAFITA 2026</text>
  <rect x="452" y="74" width="108" height="32" fill="#6bb288"/>
  <text x="506" y="97" text-anchor="middle" font-family="${body}" font-size="17" font-weight="600" letter-spacing="2" fill="#fff">TICKET</text>
  <rect x="100" y="176" width="400" height="400" fill="none" stroke="#111" stroke-width="3"/>
  ${arte}
  <rect x="100" y="176" width="400" height="400" fill="none" stroke="#111" stroke-width="3"/>
  <text x="${W / 2}" y="622" text-anchor="middle" font-family="${body}" font-size="22" font-weight="600" fill="#4f9670">${esc(nombreArte(codigo))}</text>
  <text x="${W / 2}" y="672" text-anchor="middle" font-family="Courier New, monospace" font-size="46" font-weight="700" letter-spacing="3" fill="#111">${esc(codigo)}</text>
  <rect x="40" y="700" width="520" height="3" fill="#111"/>
  <text x="40" y="748" font-family="${cond}" font-size="32" font-weight="500" fill="#111">${esc(recorte(String(titulo).toUpperCase(), 30))}</text>
  <text x="40" y="784" font-family="${body}" font-size="19" font-weight="600" fill="#111">${esc(cuando)} · ${esc(hora)}${esc(sufijo)} · ${esc(recorte(lugar, 26))}</text>
  <text x="40" y="814" font-family="${body}" font-size="18" fill="#5f5f5f">${esc(recorte(nombre, 36))} · ${personas} ${esc(gente)}</text>
  <text x="40" y="846" font-family="${body}" font-size="16" font-weight="600" fill="#111">${esc(nota.split(' · ')[0])}</text>
  <text x="40" y="868" font-family="${body}" font-size="16" font-weight="600" fill="#111">${esc(nota.split(' · ')[1] || '')}</text>
  <rect x="40" y="880" width="200" height="8" fill="#6bb288"/>
</svg>`;
  }

  function descargarPNG(svg, nombreArchivo) {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2; canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombreArchivo;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    };
    img.src = url;
  }

  return { generarCodigo, generarClave, formatearClave, normalizarClave, nombreArte, svgArte, svgTicket, descargarPNG };
})();
