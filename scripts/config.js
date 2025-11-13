// ===== CONFIGURACIÓN GLOBAL DEL FRONTEND =====

// Dirección base del backend Node.js
const BACKEND_URL = "http://localhost:3000";

// La hacemos accesible en toda la app
window.BACKEND_URL = BACKEND_URL;

// ===== FUNCIONES AUXILIARES =====

// Construir una URL completa del backend
window.api = (path) => `${BACKEND_URL}${path.startsWith("/") ? path : "/" + path}`;

// Manejador de errores estándar
window.handleError = (error, msg = "Error de conexión con el servidor") => {
  console.error("❌", msg, error);
  alert(msg);
};

