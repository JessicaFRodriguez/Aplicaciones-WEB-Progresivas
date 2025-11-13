// ===============================
// SERVICE WORKER - VivePlen PWA (seguro)
// ===============================

const CACHE_NAME = "viveplen-v6";
const DYNAMIC_CACHE = "viveplen-dynamic-v3";

const URLS_TO_CACHE = [
  "./",
  "./home.html",
  "./login.html",
  "./registro.html",
  "./admin.html",
  "./css/home.css",
  "./css/login.css",
  "./css/registro.css",
  "./css/admin.css",
  "./scripts/home.js",
  "./scripts/login.js",
  "./scripts/registro.js",
  "./scripts/admin.js",
  "./assets/logo.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./img/edad-adulto.jpg",
  "./img/edad-anciano.jpg",
  "./img/edad-joven-adulto.jpg",
  "./img/edad-joven.jpg",
  "./img/edad-maduro.jpg",
  "./img/modelo-basico.png",
  "./img/modelo-elite.png",
  "./img/modelo-max.png",
  "./img/modelo-plus.png",
  "./img/modelo-pro.png",
  "./img/modelo-ultra.png",
  "./manifest.json"
];

// --- INSTALACIÓN ---
self.addEventListener("install", e => {
  console.log("[SW] Instalando y cacheando recursos...");

  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        URLS_TO_CACHE.map(url => cache.add(url))
      );
      const fails = results
        .map((r, i) => (r.status === "rejected" ? URLS_TO_CACHE[i] : null))
        .filter(Boolean);
      if (fails.length) {
        console.warn("[SW] Archivos que no se pudieron cachear:", fails);
      }
      self.skipWaiting();
    })
  );
});

// --- ACTIVACIÓN ---
self.addEventListener("activate", e => {
  console.log("[SW] Activado. Limpiando caches antiguos...");
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// --- INTERCEPTAR PETICIONES ---
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // No cachear peticiones al backend
  if (
    url.origin.includes("localhost:3000") ||
    (url.origin.includes("onrender.com") && url.pathname.startsWith("/api/"))
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// --- ACTUALIZACIÓN AUTOMÁTICA ---
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
