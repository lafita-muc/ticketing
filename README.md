# LAFITA Tickets — reservas con código y arte (DE · ES · EN · PT)

Web estática (sin backend propio) que sustituye a los Google Forms: un
formulario por película, generado automáticamente desde `movies.json`.
Cada inscripción se guarda en **Firebase Firestore** y el equipo la ve en
tiempo real en `admin.html`.

Al enviar el formulario, la persona recibe:
- un **código único** (ej. `LAF-7K3QM`),
- un **nombre** fácil de decir (ej. "Jaguar Turquesa"),
- una **imagen generada a partir del código** (siempre la misma para ese código).

Puede descargarla o hacer captura. En la entrada, el equipo busca el
código o el nombre en el panel y ve la misma imagen para comprobarla.
**Es una reserva, no un pago:** la entrada se paga en la taquilla, solo en
efectivo, y la reserva se guarda hasta 10 minutos antes de la función.
Esto se explica en la portada, en el formulario y en el propio ticket.
Las funciones de Gasteig HP8 no usan el formulario: su botón "Tickets ↗"
lleva a la venta online.

La web está en **alemán, español, inglés y portugués** (selector
DE | ES | EN | PT arriba a la derecha). Por defecto usa el idioma del
navegador (alemán si no es ninguno de los cuatro). Para compartir un link
en un idioma concreto, añade `?lang=es` (o `de`, `en`, `pt`), por ejemplo
`registro.html?pelicula=el-deshielo-1125&lang=es`.

Pensada para publicarse gratis con **GitHub Pages** en `lafita.de`.

## Archivos

Todos los archivos van juntos en la misma carpeta (sin subcarpetas), así se
pueden subir a GitHub de una vez, también desde un iPad.

```
index.html          → portada con el programa (reservar / Tickets ↗)
registro.html       → formulario de reserva + ticket con código y arte
gestionar.html      → cambiar o cancelar una reserva con la clave de gestión
admin.html          → panel del equipo (requiere login)
movies.json         → películas y funciones (edítalo cada edición)
style.css           → diseño
i18n.js             → todos los textos en DE / ES / EN / PT
firebase-config.js  → conexión con el proyecto de Firebase
ticket-art.js       → código, clave, nombre de animal y arte del ticket
validacion.js       → comprueba que el formulario esté completo
README.md           → estas instrucciones
```

## 1. Crear el proyecto de Firebase (una sola vez)

1. Ve a https://console.firebase.google.com/ y crea un proyecto nuevo
   (el plan gratuito "Spark" es más que suficiente).
2. En **Compilación → Firestore Database**, pulsa "Crear base de datos"
   → elige modo **producción** → cualquier región cercana (ej. `eur3`).
3. En **Compilación → Authentication → Sign-in method**, habilita
   **Correo electrónico/contraseña**.
4. En **Authentication → Users**, crea manualmente una cuenta (correo +
   contraseña) para cada persona del equipo que deba ver las inscripciones
   en `/admin.html`.
5. En **Configuración del proyecto** (rueda dentada) → pestaña
   **General** → sección "Tus apps" → pulsa el icono `</>` (Web) para
   registrar una app. Copia el objeto `firebaseConfig` que te da
   Firebase y pégalo en `firebase-config.js`, reemplazando los
   valores de ejemplo.

## 2. Configurar las reglas de seguridad de Firestore

En **Firestore Database → Reglas**, sustituye el contenido por esto y
publica:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inscripciones/{clave} {

      // Datos obligatorios y con formato correcto
      function valida(d) {
        return d.nombre is string && d.nombre.size() >= 2 && d.nombre.size() <= 120
          && d.email is string && d.email.size() <= 160 && d.email.matches('.+@.+[.].+')
          && d.personas is int && d.personas >= 1 && d.personas <= 10
          && d.estado in ['activa', 'cancelada']
          && d.codigo is string && d.codigo.size() == 9;
      }

      // Reservar: cualquiera, si todos los campos están bien
      allow create: if clave.size() == 12
                    && valida(request.resource.data)
                    && request.resource.data.estado == 'activa';

      // Ver UNA reserva: solo quien conoce su clave de gestión (el ID)
      allow get: if true;

      // Ver la lista completa: solo el equipo con sesión iniciada
      allow list: if request.auth != null;

      // Cambiar o cancelar: el equipo, o quien tiene la clave, y solo
      // nombre, email, personas y estado (no la película ni el código)
      allow update: if request.auth != null
        || (resource.data.estado == 'activa'
            && valida(request.resource.data)
            && request.resource.data.diff(resource.data).affectedKeys()
                 .hasOnly(['nombre', 'email', 'personas', 'estado', 'modificadoEn']));

      // Borrar del todo: solo el equipo
      allow delete: if request.auth != null;
    }
  }
}
```

Cómo funciona la seguridad:
- Cada reserva tiene **dos códigos**. El **código de entrada** (`LAF-7K3QM`)
  sale en el ticket y se enseña en la puerta. La **clave de gestión**
  (`XXXX-XXXX-XXXX`, 12 caracteres) solo la ve quien reserva, en la página
  de confirmación, y es el ID de la reserva en Firebase.
- Con la clave, en `gestionar.html` la persona puede ver su reserva, cambiar
  nombre, email o número de personas, o **cancelarla**. Una reserva
  cancelada no se borra: queda marcada como "cancelada" en el panel.
- La clave es imposible de adivinar (hay más de 700.000 billones de combinaciones),
  y nadie puede ver la lista de reservas sin iniciar sesión en el panel.
- El formulario no deja enviar nada si falta un campo o el email no es
  válido, y las reglas lo vuelven a comprobar en el servidor.

## 3. Publicar en GitHub Pages (lafita.de)

1. En github.com (también desde el iPad), toca **+ → New repository**,
   ponle un nombre (ej. `lafita-tickets`), márcalo como **Public** y crea
   el repositorio.
2. En el repo vacío toca **"uploading an existing file"** (o
   **Add file → Upload files**), elige **todos los archivos** de esta carpeta
   a la vez (en la app Archivos: Seleccionar → marcar todos) y toca
   **Commit changes**.
3. En el repo: **Settings → Pages** → en "Build and deployment" elige
   "Deploy from a branch" → rama `main`, carpeta `/ (root)` → Guardar.
4. Espera 1-2 minutos; GitHub te dará una URL tipo
   `https://tu-usuario.github.io/lafita-ticketing/`.
5. **Dominio:** lafita.de ya es la web principal del festival, así que la de
   entradas debe ir en un **subdominio**, por ejemplo `tickets.lafita.de`
   (si usaras `lafita.de` directamente, reemplazarías la web principal).
   - En el repo: **Settings → Pages → Custom domain** → escribe
     `tickets.lafita.de` → Save.
   - Quien gestiona el dominio lafita.de añade en su panel de DNS un
     registro **CNAME**: nombre `tickets`, valor `TU-USUARIO.github.io`.
   - Cuando GitHub lo detecte, marca **Enforce HTTPS** (el certificado puede
     tardar hasta 24 h la primera vez).
   - Mientras tanto la web ya funciona en `https://TU-USUARIO.github.io/lafita-tickets/`.

## 4. Añadir/editar películas cada edición

Solo tienes que editar `movies.json`. Cada película es un objeto:

```json
{
  "id": "identificador-unico-sin-espacios",
  "titulo": "Título de la película",
  "sinopsis": "Descripción breve",
  "poster": "URL de una imagen del poster",
  "fecha": "2026-10-10",
  "hora": "19:00",
  "lugar": "Nombre del cine/sala",
  "capacidad": 100,
  "maxEntradasPorPersona": 4
}
```

- `id` debe ser único (se usa en el link `registro.html?pelicula=id`,
  que puedes compartir directamente en redes o por email).
- `poster` es opcional: si lo dejas vacío (`""`) se muestra un arte
  generado automáticamente.
- `maxEntradasPorPersona` es el máximo del desplegable "¿Cuántas personas vienen?".
- `capacidad` es solo informativo.
- `enlaceExterno` (opcional): si una función tiene entradas en otra web
  (ej. las de Gasteig HP8), pon aquí el link. En vez del formulario, el
  botón dice "Tickets ↗" y lleva a ese link. Sin este campo,
  la película usa el formulario con código y arte.
- Puedes tener tantas películas/funciones como quieras en el array.

Después de editar el archivo, haz commit y push — GitHub Pages
actualiza la web automáticamente en 1-2 minutos, sin tocar nada más.

## 5. Cómo lo usa el equipo

1. Entrar en `admin.html` (enlace "Acceso equipo" en el pie de la portada).
2. Iniciar sesión con el correo/contraseña creado en el paso 1.4.
3. La tabla se actualiza sola cuando llegan inscripciones nuevas. Muestra
   la miniatura del arte, el código, el nombre tipo "Jaguar Turquesa",
   los datos de la persona y la película.
4. **En la puerta:** la persona enseña su imagen; escribe el código o el
   nombre del animal en el buscador y comprueba que la miniatura coincide
   y que el estado es "Activa" (las canceladas salen tachadas).
   Los totales de reservas y personas solo cuentan las activas.
5. "Exportar CSV" descarga la lista (filtrada) para abrirla en Excel.

## Cambiar textos o traducciones

Todos los textos de la web están en `i18n.js`, agrupados por idioma
(`de`, `es`, `en`, `pt`). Cambia la frase en los cuatro idiomas y guarda.
Los títulos y datos de las películas (`movies.json`) no se traducen.

## Notas

- No hace falta ningún paso de "build": es HTML/CSS/JS plano, por eso
  funciona directo en GitHub Pages.
- El SDK de Firebase se carga desde su CDN oficial (`gstatic.com`), no
  hace falta instalar nada.
- La imagen del ticket se guarda también en el navegador de la persona:
  si vuelve a abrir el link de la película, ve su ticket otra vez.
- Si en el futuro quieres enviar el ticket por email automáticamente,
  se puede sumar con Firebase Cloud Functions + un servicio de correo.
