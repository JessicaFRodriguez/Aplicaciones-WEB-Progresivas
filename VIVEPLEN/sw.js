const CACHE_NAME = 'viveplen-v1';
const URLS_TO_CACHE = [
  '/',
  '/home.html',
  '/login.html',
  '/registro.html',
  '/admin.html',
  '/css/home.css',
  '/css/login.css',
  '/css/registro.css',
  '/css/admin.css',
  '/scripts/home.js',
  '/scripts/login.js',
  '/scripts/registro.js',
  '/scripts/admin.js',
  '/assets/logo.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Instalar
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Archivos cacheados');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activar
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
});

// Interceptar peticiones
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => 
      response || fetch(e.request)
    )
  );
});
