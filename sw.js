// ===============================
// SERVICE WORKER - VivePlen PWA
// ===============================

const CACHE_NAME = "viveplen-v4"; // Aumenta versión al hacer cambios
const DYNAMIC_CACHE = "viveplen-dynamic-v3";

const URLS_TO_CACHE = [
  "/", // raíz
  "/home.html",
  "/login.html",
  "/registro.html",
  "/admin.html",
  "/css/home.css",
  "/css/login.css",
  "/css/registro.css",
  "/css/admin.css",
  "/scripts/home.js",
  "/scripts/login.js",
  "/scripts/registro.js",
  "/scripts/admin.js",
  "/assets/logo.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/img/edad-adulto.jpg",
  "/img/edad-anciano.jpg",
  "/img/edad-joven-adulto.jpg",
  "/img/edad-joven.jpg",
  "/img/edad-maduro.jpg",
  "/img/modelo-basico.png",
  "/img/modelo-elite.png",
  "/img/modelo-max.png",
  "/img/modelo-plus.png",
  "/img/modelo-pro.png",
  "/img/modelo-ultra.png",
  "/manifest.json"
];

// --- INSTALACIÓN ---
self.addEventListener("install", e => {
  console.log("[SW] Instalando y cacheando recursos...");
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.error("Error al cachear archivos:", err))
  );
});

// --- ACTIVACIÓN ---
self.addEventListener("activate", e => {
  console.log("[SW] Activado. Limpiando caches antiguos...");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// --- INTERCEPTAR PETICIONES ---
self.addEventListener("fetch", e => {
  const requestUrl = new URL(e.request.url);

  // No interceptar llamadas al backend
  if (requestUrl.origin.includes("localhost:3000")) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Guardar en cache dinámico
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request)) // si no hay red, usa cache
  );
});

// --- ACTUALIZACIÓN AUTOMÁTICA ---
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
