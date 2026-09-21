// ============================================================
// Plazas por función
// ============================================================
// Cada sala tiene 30 plazas (se puede cambiar por película con
// "capacidad" en movies.json; si lo cambias, cambia también CAP() en
// firestore.rules).
//
// Una reserva OCUPA plazas si está "activa" y nadie la marcó como
// "no vino" en la taquilla. Las reservas "en espera" y las canceladas
// no ocupan plazas.
//
// El número de plazas ocupadas de cada función se guarda en Firebase
// (colección "funciones") para que la web pública sepa cuántas quedan
// sin poder ver los datos de las reservas.
// ============================================================

const CAPACIDAD_POR_DEFECTO = 30;

function capacidadDe(pelicula) {
  return (pelicula && pelicula.capacidad) || CAPACIDAD_POR_DEFECTO;
}

function aporta(r) {
  if (!r) return 0;
  return (r.estado === 'activa' && r.asistencia !== 'no_vino') ? (r.personas || 0) : 0;
}

function textoPlazas(libres) {
  if (libres <= 0) return t('full_waitlist');
  if (libres === 1) return t('seats_one');
  return t('seats_left', { n: libres });
}
