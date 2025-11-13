// ===============================
// app.js - Registro del Service Worker y PWA
// ===============================

// Registrar el Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registrado:", reg.scope);

      // Detectar nuevas versiones y actualizar automáticamente
      if (reg.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
        window.location.reload();
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("⚡ Nueva versión del SW detectada. Recargando...");
            newWorker.postMessage("SKIP_WAITING");
            window.location.reload();
          }
        });
      });
    } catch (err) {
      console.error("Error al registrar el Service Worker:", err);
    }
  });
}

// ======================================
// PWA INSTALL PROMPT
// ======================================
export let deferredPrompt;

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("📲 PWA lista para instalar");
});

// ======================================
// FUNCIONES GLOBALES
// ======================================
export function mostrarAlerta(msg) {
  alert(msg);
}

// ======================================
// FETCH API EXAMPLE
// ======================================
// Siempre usar la URL completa si estás en Docker
export async function getSession(uid) {
  try {
    const res = await fetch(`http://localhost:3000/api/session`, {
      headers: { "x-uid": uid }
    });
    if (!res.ok) throw new Error("Error en la API");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error al obtener sesión:", err);
    return null;
  }
}
