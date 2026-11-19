// ============================================================
// Plazas por función
// ============================================================
// Cada función tiene 35 plazas para reservar (se puede cambiar por película
// con "capacidad" en movies.json; si lo cambias, cambia también CAP() en
// firestore.rules). La apertura: 170 reservas y "aforo": 190 (el resto se
// vende en taquilla).
//
// Una reserva OCUPA plazas si está "activa" y nadie la marcó como
// "no vino" en la taquilla. Las reservas "en espera" y las canceladas
// no ocupan plazas.
//
// Llegadas por partes: si una reserva es de 4 y de momento llegaron 2, la
// taquilla lo apunta ("llegaron": 2). Las 4 plazas siguen guardadas hasta
// que alguien pulsa "Liberar" ("liberado": true); desde ahí solo ocupa las
// que llegaron y el resto queda libre para otra gente.
//
// El número de plazas ocupadas de cada función se guarda en Firebase
// (colección "funciones") para que la web pública sepa cuántas quedan
// sin poder ver los datos de las reservas.
// ============================================================

const CAPACIDAD_POR_DEFECTO = 35;

// Funciones de München Ticket (Gasteig HP8): el público compra fuera, pero hay
// un formulario escondido para invitados (invitados.html) con un máximo de
// 10 sitios. Si lo cambias, cambia también CAP() en firestore.rules.
const CUPO_INVITADOS = 10;

function capacidadDe(pelicula) {
  if (pelicula && pelicula.enlaceExterno) return pelicula.cupoInvitados || CUPO_INVITADOS;
  return (pelicula && pelicula.capacidad) || CAPACIDAD_POR_DEFECTO;
}

function aporta(r) {
  if (!r) return 0;
  if (r.estado !== 'activa' || r.asistencia === 'no_vino') return 0;
  if (r.liberado) return Math.min(r.llegaron || 0, r.personas || 0);
  return r.personas || 0;
}

// Cuántas personas de una reserva ya pasaron por la taquilla
function llegaronDe(r) {
  if (!r || r.estado !== 'activa') return 0;
  if (typeof r.llegaron === 'number') return Math.min(r.llegaron, r.personas || 0);
  return r.asistencia === 'vino' ? (r.personas || 0) : 0;   // reservas marcadas antes de este cambio
}

// Solo se dice cuántas plazas quedan cuando quedan pocas (10 o menos)
const AVISO_PLAZAS = 10;
function mostrarPlazas(libres) { return libres > 0 && libres <= AVISO_PLAZAS; }

function textoPlazas(libres) {
  if (libres <= 0) return t('full_waitlist');
  if (!mostrarPlazas(libres)) return '';
  if (libres === 1) return t('seats_one');
  return t('seats_left', { n: libres });
}
