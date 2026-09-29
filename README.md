# LAFITA Tickets

Web de reserva de entradas para **LAFITA – Lateinamerikanische Filmtage München 2026** (25.–29.11.2026).

Disponible en **alemán, español, inglés y portugués**.

## Qué hace

- **Recomendador en la portada:** la persona escribe lo que quiera, en cualquiera de los 4 idiomas: *"Me gusta mucho David Lynch y quiero algo así"*, *"algo tierno sobre la infancia"*, *"con Asia Argento"*, *"el viernes por la noche, algo chileno"*, *"Doku am Wochenende"*… Debajo del cuadro hay una pista de qué escribir (un día, un género, una película que le guste…). La web recomienda hasta 3 funciones con **el porqué** (✓ lo que encaja, ! lo que no, y las plazas libres). Cada película tiene su **trama, dirección y reparto** (botón *Trama y reparto*, en el programa y en las recomendaciones). Debajo sigue el programa completo con los tickets.
  - **Sin IA (siempre funciona, gratis):** `recomendador.js` entiende día, hora, tipo, género, país, duración, **temas y tono** (misterio, ternura, humor negro, migración…), **referencias** a cineastas y películas conocidas (Lynch, Almodóvar, Haneke, *Parásitos*…), nombres del **reparto** y palabras de la **trama**.
  - **Con IA (opcional):** si se configura el servicio de `ia/` (ver abajo), entiende cualquier frase y escribe razones a medida. Si el servicio no responde, la web usa sola el recomendador sin IA.
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
| Películas, fechas, horas, salas, plazas (`capacidad`), trama y reparto | `movies.json` |
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
  "maxEntradasPorPersona": 4,
  "generos": ["drama"]
}
```

Campos para el recomendador (opcionales, ya rellenados para 2026 a partir de fuentes públicas: festivales, prensa, fichas de las películas):

| Campo | Qué es |
|---|---|
| `trama` | `{ "de": "…", "es": "…", "en": "…", "pt": "…" }` – se muestra en *Trama y reparto* |
| `direccion`, `reparto` | Texto y lista de nombres |
| `generos` | `drama`, `comedia`, `thriller`, `terror`, `romance`, `musica`, `politica`, `familia`, `lgbtiq`, `juventud` |
| `temas` | Tono y temas: `misterio`, `onirico`, `inquietante`, `oscuro`, `noir`, `humor_negro`, `ternura`, `melancolia`, `infancia`, `memoria`, `duelo`, `mujeres`, `masculinidad`, `violencia`, `venganza`, `herencia`, `esoterico`, `rock`, `tango`, `guitarra`, `migracion`, `arte`, `biografia`, `amistad`, `nieve`, `desierto`, `playa`, `selva`, `huida`, `blanco_negro`, `personal` |
| `tipo`, `duracion`, `paises` | Solo si la `sinopsis` no lo dice (p. ej. `"tipo": "documental"`, `"duracion": 80`, `"paises": ["Costa Rica"]` con nombres en alemán) |

Si una película no tiene un género o tema, el recomendador no lo inventa. El tipo (ficción/documental/cortos), los países y la duración los saca de la `sinopsis` si no se ponen aparte.

## Recomendador con IA (opcional)

Sin esto, el recomendador ya funciona. Con esto, entiende cualquier frase y escribe razones a medida usando Claude (Anthropic). La clave de la API **no puede ir en la web** (cualquiera la vería), por eso va en un pequeño servicio gratuito de Cloudflare (`ia/`):

1. Crear una clave en [console.anthropic.com](https://console.anthropic.com) y poner allí un **límite de gasto mensual** (cada recomendación cuesta aprox. 3–5 céntimos).
2. Crear una cuenta gratis en [Cloudflare](https://dash.cloudflare.com) e instalar [Node.js](https://nodejs.org).
3. En `ia/wrangler.toml`, revisar `PROGRAMA_URL` (dirección pública de `movies.json`) y `ORIGEN_PERMITIDO` (dirección de la web de tickets).
4. En la carpeta `ia/`:
   ```bash
   npm install
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # pega la clave
   npx wrangler deploy                         # muestra la dirección del servicio
   ```
5. Pegar esa dirección en `recomendador.js`: `const RECOMENDADOR_IA_URL = 'https://lafita-recomendador….workers.dev';`

La IA solo usa la información de `movies.json` (no inventa datos) y siempre devuelve funciones del programa. Si tarda más de 25 s, falla o se acaba el límite de gasto, la web usa el recomendador sin IA.

Si cambias la `capacidad` de una sala, cambia también `CAP()` en `firestore.rules` y vuelve a publicar las reglas en Firebase.

Los cambios se ven en la web 1–2 minutos después de guardarlos en GitHub.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Portada: recomendador + programa |
| `recomendador.js` | Entiende el texto del recomendador y elige las películas (y dirección del servicio de IA) |
| `ia/` | Servicio opcional de IA para el recomendador (Cloudflare Worker) |
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
