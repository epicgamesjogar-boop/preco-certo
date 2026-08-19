// Service worker mínimo — só o necessário para o navegador
// considerar o app "instalável" na tela inicial.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // passthrough simples — sem cache offline por enquanto
  event.respondWith(fetch(event.request));
});
