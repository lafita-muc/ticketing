# LAFITA Tickets

Web de reserva de entradas para **LAFITA – Lateinamerikanische Filmtage München 2026** (25.–29.11.2026).

Disponible en **alemán, español, inglés y portugués**.

## Qué hace

- **Programa por días** con todas las funciones y las **plazas libres** en directo.
- **Kulturzentrum Luise y Werkstattkino** (30 plazas por función): el público reserva con un formulario corto (nombre, correo y número de personas, todo obligatorio). Es una **reserva, no un pago**: se paga en la taquilla, **solo en efectivo**, y la reserva se guarda hasta **10 minutos antes** de la función.
- **Lista de espera:** cuando una función está completa, las nuevas reservas quedan **en espera** y la persona lo ve claramente (en pantalla y en el ticket). Si se liberan plazas, el equipo la confirma.
- **Gasteig HP8:** estas funciones no usan el formulario; el botón **Tickets ↗** lleva a la venta online.
- **Ticket con código y arte:** código de entrada (ej. `LAF-7K3QM`), un nombre fácil de decir ("Jaguar Turquesa") y una imagen única generada a partir del código.
- **Cambiar o cancelar:** cada reserva tiene una **clave de gestión** privada (`XXXX-XXXX-XXXX`) para corregir los datos o cancelar. Una vez que la taquilla la marca (vino / no vino), ya no se puede cambiar.
- **Panel del equipo** (`admin.html`, con usuario y contraseña):
  - **ocupación de cada función**: 30 casillas con reservado / vino / libre, y cuántas personas hay en espera; tocando una función se filtra la lista;
  - por reserva: **✓ Vino**, **✗ No vino** (libera las plazas), **Cancelar**, **Confirmar** (desde la lista de espera), **Deshacer** y **Borrar**;
  - búsqueda por código, nombre, email o animal; totales; exportar a CSV / Excel.

## En la taquilla

1. La persona enseña su ticket. Buscar su código o su animal en el panel.
2. Comprobar que la imagen coincide y marcar **✓ Vino** (y cobrar en efectivo).
3. **10 minutos antes** de empezar: marcar **✗ No vino** a quien no llegó. Esas plazas quedan libres en la ocupación y se pueden dar a gente en espera o a quien venga sin reserva (**Confirmar** a los de la lista de espera).

## Actualizar la web

| Qué | Dónde |
|---|---|
| Películas, fechas, horas, salas, plazas (`capacidad`) | `movies.json` |
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
  "capacidad": 30,
  "maxEntradasPorPersona": 4
}
```

Si cambias la `capacidad` de una sala, cambia también `CAP()` en `firestore.rules` y vuelve a publicar las reglas en Firebase.

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
| `plazas.js` | Cálculo de plazas libres y lista de espera |
| `firebase-config.js` | Conexión con la base de datos (Firebase) |
| `firestore.rules` | Reglas de seguridad de la base de datos |
