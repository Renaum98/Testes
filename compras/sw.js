// Service worker do Mercado Inteligente.
// Suba a versão sempre que index.html / style.css / script.js mudarem.
const VERSAO = "v30";
const CACHE_SHELL = `mercado-shell-${VERSAO}`;
const CACHE_RUNTIME = `mercado-runtime-${VERSAO}`;

const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
];

// Hosts que NUNCA podem ser servidos do cache: dados ao vivo e autenticação.
const HOSTS_SEM_CACHE = [
  "firestore.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "www.googleapis.com",
  "apis.google.com",
  "accounts.google.com",
];

// Hosts de assets estáticos de terceiros (SDK, fontes, ícones).
const HOSTS_ASSETS = [
  "www.gstatic.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      /*
       * skipWaiting ANTES do precache, de propósito.
       *
       * Depois do precache, uma única requisição pendurada (rede móvel
       * ruim) segurava a versão nova em "waiting" para sempre: o catch
       * cobre falha, mas requisição que trava nunca rejeita. Assumir
       * primeiro e preencher o cache depois desacopla as duas coisas —
       * no pior caso o cache fica incompleto e o fetch busca na rede.
       */
      await self.skipWaiting();

      const cache = await caches.open(CACHE_SHELL);
      // addAll é tudo-ou-nada; adiciona um a um para não quebrar a instalação
      // caso um recurso isolado falhe.
      await Promise.all(
        SHELL.map((url) =>
          cache
            .add(new Request(url, { cache: "reload" }))
            .catch((e) => console.warn("[sw] falhou precache:", url, e)),
        ),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((n) => n !== CACHE_SHELL && n !== CACHE_RUNTIME)
          .map((n) => caches.delete(n)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (HOSTS_SEM_CACHE.includes(url.hostname)) return;
  if (url.hostname.endsWith(".firebaseapp.com")) return;

  /*
   * "no-cache" força revalidação com o servidor antes de usar a resposta.
   *
   * Sem isso o fetch daqui passa pelo cache HTTP do navegador, e o GitHub
   * Pages manda max-age nos arquivos: mesmo com service worker novo, o
   * index/css/js podiam vir da cópia velha do navegador — e ainda eram
   * gravados assim no cache do app. Não é o mesmo que baixar tudo de novo:
   * é um pedido condicional, e o servidor responde 304 quando nada mudou.
   */
  const semCacheHttp = (requisicao) =>
    new Request(requisicao, { cache: "no-cache" });

  // Navegações: rede primeiro (para pegar atualizações), cache como rede de segurança.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          const resp = preload || (await fetch(semCacheHttp(req)));
          const cache = await caches.open(CACHE_SHELL);
          cache.put("./index.html", resp.clone()).catch(() => {});
          return resp;
        } catch {
          const cache = await caches.open(CACHE_SHELL);
          return (
            (await cache.match("./index.html")) ||
            (await cache.match("./")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  const mesmaOrigem = url.origin === self.location.origin;
  const assetTerceiro = HOSTS_ASSETS.includes(url.hostname);
  if (!mesmaOrigem && !assetTerceiro) return;

  // Arquivos do próprio site (html/css/js/ícones): rede primeiro.
  // O código é editado à mão e publicado direto, então o cache nunca pode
  // "prender" o app numa versão antiga — ele serve só como reserva offline.
  if (mesmaOrigem) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        try {
          const resp = await fetch(semCacheHttp(req));
          if (resp && resp.ok) cache.put(req, resp.clone()).catch(() => {});
          return resp;
        } catch {
          const cacheado = await cache.match(req);
          return cacheado || Response.error();
        }
      })(),
    );
    return;
  }

  // Assets de terceiros (SDK do Firebase, fontes): versionados na URL,
  // então o cache responde na hora e revalida em segundo plano.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_RUNTIME);
      const cacheado = await cache.match(req);

      const rede = fetch(req)
        .then((resp) => {
          // opaque (no-cors) também é guardado: fontes vêm assim em alguns browsers
          if (resp && (resp.ok || resp.type === "opaque")) {
            cache.put(req, resp.clone()).catch(() => {});
          }
          return resp;
        })
        .catch(() => null);

      if (cacheado) return cacheado;
      const resp = await rede;
      return resp || Response.error();
    })(),
  );
});
