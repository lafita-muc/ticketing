// ============================================================
// Comprobación del formulario: nombre, email y personas son obligatorios.
// El botón de enviar queda desactivado hasta que todo está bien, y cada
// campo muestra su mensaje (en el idioma elegido) cuando la persona lo toca.
// Se usa en registro.html (reservar) y gestionar.html (cambiar datos).
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function limpiarNombre(s) { return String(s || '').trim().replace(/\s+/g, ' '); }

function erroresReserva(nombre, email, personas) {
  const e = {};
  if (limpiarNombre(nombre).length < 2) e.nombre = 'val_name';
  if (!EMAIL_RE.test(String(email || '').trim())) e.email = 'val_email';
  if (!(personas >= 1)) e.personas = 'val_people';
  return e;
}

// ids: { nombre: 'nombre', email: 'email', personas: 'personas' }
// Cada campo necesita un <p id="<id>-err" class="field-error"> debajo.
function conectarValidacion(ids, boton, aviso) {
  const el = id => document.getElementById(id);
  const tocado = {};

  function leer() {
    return {
      nombre: limpiarNombre(el(ids.nombre).value),
      email: el(ids.email).value.trim().toLowerCase(),
      personas: parseInt(el(ids.personas).value, 10)
    };
  }

  function actualizar(mostrarTodo) {
    const v = leer();
    const err = erroresReserva(v.nombre, v.email, v.personas);
    for (const k of ['nombre', 'email', 'personas']) {
      const mostrar = err[k] && (mostrarTodo || tocado[k]);
      el(ids[k]).setAttribute('aria-invalid', mostrar ? 'true' : 'false');
      el(ids[k] + '-err').textContent = mostrar ? t(err[k]) : '';
    }
    const ok = Object.keys(err).length === 0;
    boton.disabled = !ok;
    if (aviso) aviso.hidden = ok;
    return ok;
  }

  for (const k of ['nombre', 'email', 'personas']) {
    const campo = el(ids[k]);
    campo.addEventListener('input', () => actualizar(false));
    campo.addEventListener('change', () => { tocado[k] = true; actualizar(false); });
    campo.addEventListener('blur', () => { tocado[k] = true; actualizar(false); });
  }
  document.addEventListener('langchange', () => actualizar(false));
  actualizar(false);

  return {
    leer,
    comprobar: () => actualizar(true),
    refrescar: () => actualizar(false),
    reiniciar() { for (const k in tocado) delete tocado[k]; actualizar(false); }
  };
}
