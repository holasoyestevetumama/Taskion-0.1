/* Taskion · Service Worker — arranque instantáneo y 100 % offline
   Estrategia
   · Instalación: guarda en caché el "app shell" (HTML, JS, config, manifiesto, iconos).
   · Páginas: se responden desde la caché y se actualizan en segundo plano (siempre revalidando con el servidor).
   · Archivos estáticos: caché primero + actualización en segundo plano.
   · POST/PUT/DELETE y otros orígenes: no se tocan (la cola offline de la app se encarga). */

const CACHE_VERSION = "taskion-v2";   // ← cambia este número cuando publiques una versión nueva

const CORE = ["./", "./index.html", "./app.js", "./config.js", "./manifest.json"];
const OPTIONAL = [
  "./icon-192.png",
  "./icon-512.png",
  "./maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil((async function () {
    const cache = await caches.open(CACHE_VERSION);
    // "reload" evita que la caché HTTP del servidor nos dé una copia vieja
    await cache.addAll(CORE.map(function (u) { return new Request(u, { cache: "reload" }); }));
    await Promise.all(OPTIONAL.map(function (u) {
      return cache.add(new Request(u, { cache: "reload" })).catch(function () {});
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(function (k) { return k.indexOf("taskion-") === 0 && k !== CACHE_VERSION; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;                              // escrituras: cola offline de la app
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;               // APIs y terceros: no se tocan

  // Navegación (abrir la app): siempre el shell guardado → instantáneo y sin conexión
  if (req.mode === "navigate") {
    event.respondWith((async function () {
      const cache = await caches.open(CACHE_VERSION);
      const cached = (await cache.match("./index.html")) || (await cache.match("./"));
      const update = fetch("./index.html", { cache: "no-cache" }).then(function (res) {
        if (res && res.ok && !res.redirected) cache.put("./index.html", res.clone());
        return res;
      }).catch(function () { return null; });
      if (cached) { event.waitUntil(update); return cached; }
      const fresh = await update;
      return fresh || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })());
    return;
  }

  // Resto de archivos propios: caché primero + refresco en segundo plano
  event.respondWith((async function () {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    const update = fetch(req, { cache: "no-cache" }).then(function (res) {
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (cached) { event.waitUntil(update); return cached; }
    const fresh = await update;
    return fresh || new Response("", { status: 504 });
  })());
});
