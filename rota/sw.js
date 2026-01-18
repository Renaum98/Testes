const CACHE_NAME = "rotatrack-v4"; // Mudei para v2 para forçar atualização
const urlsToCache = [
  "./",
  "./index.html",
  "./inicio.html",
  "./styles/components.css",
  "./styles/layout.css",
  "./styles/main.css",
  "./styles/routes.css",
  "./styles/state.css",
  "./styles/storage.css",
  "./styles/swipe.css",
  "./styles/ui.css",
  "./styles/utils.css",
  "./js/main.js",
  "./js/auth.js",
  "./js/routes.js",
  "./js/state.js",
  "./js/storage.js",
  "./js/ui.js",
  "./js/utils.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

// 1. INSTALAÇÃO (Salva os arquivos)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache aberto");
      return cache.addAll(urlsToCache);
    }),
  );
});

// 2. ATIVAÇÃO (Limpa caches antigos se você mudar a versão)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// 3. INTERCEPTAR PEDIDOS (Serve o cache se estiver offline)
self.addEventListener("fetch", (event) => {
  // Ignora requisições do Firebase/Google (deixa a lib do Firebase tratar isso)
  if (
    event.request.url.includes("firestore") ||
    event.request.url.includes("googleapis")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Se achou no cache, retorna. Se não, busca na rede.
      return response || fetch(event.request);
    }),
  );
});
