// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
// 1. Ve a https://console.firebase.google.com/ y crea un proyecto
//    (gratis, plan "Spark" es suficiente para un festival).
// 2. Dentro del proyecto: "Configuración del proyecto" (rueda dentada)
//    > pestaña "General" > sección "Tus apps" > icono </> (Web).
// 3. Registra una app y copia el objeto "firebaseConfig" que te muestra
//    Firebase, y pégalo aquí abajo reemplazando los valores de ejemplo.
// 4. En el menú lateral activa:
//      - "Firestore Database" > Crear base de datos (modo producción)
//      - "Authentication" > Sign-in method > habilita "Correo/contraseña"
//        y crea un usuario para cada persona del equipo que vaya a ver
//        las reservas en /admin.html
// 5. En Firestore > Reglas, pega las reglas de seguridad que están en
//    el archivo README.md de este proyecto.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyD_mhwFkkb3JHH0hoZOgoWtpw3VAAhLyTE",
  authDomain: "lafita26-4dd5b.firebaseapp.com",
  projectId: "lafita26-4dd5b",
  storageBucket: "lafita26-4dd5b.firebasestorage.app",
  messagingSenderId: "274031886951",
  appId: "1:274031886951:web:cd6f0fa62700b6ef730ac2"
};

// Inicializa Firebase (usa el SDK "compat" cargado por <script> en el HTML,
// así no hace falta ningún paso de build para GitHub Pages).
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
