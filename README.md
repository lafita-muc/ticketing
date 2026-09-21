# LAFITA Tickets

Web de reserva de entradas para **LAFITA – Lateinamerikanische Filmtage München 2026** (25.–29.11.2026).

Disponible en **alemán, español, inglés y portugués**.

## Qué hace

- **Programa por días** con todas las funciones del festival.
- **Kulturzentrum Luise y Werkstattkino:** el público reserva su entrada con un formulario corto: nombre, correo y número de personas, todo obligatorio. Es una **reserva, no un pago**: se paga en la taquilla, **solo en efectivo**, y la reserva se guarda hasta **10 minutos antes** de la función.
- **Gasteig HP8:** estas funciones no usan el formulario. El botón **Tickets ↗** lleva a la venta online.
- **Ticket con código y arte:** al reservar, cada persona recibe un ticket con:
  - un **código de entrada** (ej. `LAF-7K3QM`),
  - un nombre fácil de decir (ej. "Jaguar Turquesa"),
  - una **imagen única** generada a partir del código.

  Lo puede descargar o guardar como captura y enseñarlo en la entrada.
- **Cambiar o cancelar:** cada reserva tiene además una **clave de gestión** privada (`XXXX-XXXX-XXXX`). Con ella, en *Cambiar o cancelar tu reserva*, la persona puede corregir sus datos o cancelar la reserva.
- **Panel del equipo** (`admin.html`, con usuario y contraseña):
  - todas las reservas en tiempo real,
  - búsqueda por código, nombre, email o animal,
  - filtro por película,
  - estado (activa / cancelada),
  - totales de reservas y personas,
  - exportar a CSV / Excel.

## En la entrada

1. La persona enseña su ticket.
2. El equipo busca el código o el nombre del animal en el panel.
3. Comprueba que la imagen coincide y que la reserva está **activa**. Las canceladas salen tachadas.
4. Cobra en efectivo.

## Actualizar la web

| Qué | Dónde |
|---|---|
| Películas, fechas, horas, salas | `movies.json` |
| Funciones con venta externa | campo `enlaceExterno` en `movies.json` |
| Textos en los 4 idiomas | `i18n.js` |
| Colores y diseño | `style.css` |

Cada película en `movies.json`:

```json
{
  "id": "el-deshielo-1125",
  "titulo": "EL DESHIELO",
  "sinopsis": "Spielfilm · Chile, USA, Spanien, Mexiko 2026 · 108 min · Regie: Manuela Martelli",
  "poster": "",
  "fecha": "2026-11-25",
  "hora": "18:30",
  "lugar": "Kulturzentrum Luise",
  "maxEntradasPorPersona": 4
}
```

Los cambios se ven en la web 1–2 minutos después de guardarlos en GitHub.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Programa |
| `registro.html` | Formulario de reserva y ticket |
| `gestionar.html` | Cambiar o cancelar una reserva |
| `admin.html` | Panel del equipo |
| `movies.json` | Películas y funciones |
| `i18n.js` | Textos (DE · ES · EN · PT) |
| `style.css` | Diseño |
| `ticket-art.js` | Código, clave e imagen del ticket |
| `validacion.js` | Comprobación del formulario |
| `firebase-config.js` | Conexión con la base de datos (Firebase) |
| `firestore.rules` | Reglas de seguridad de la base de datos |
