const CACHE_NAME = 'classificador-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/filmes.html',
  '/top.html',
  '/reset.css',
  '/estilos/animacoes.css',
  '/estilos/cabecalho.css',
  '/estilos/filmes.css',
  '/estilos/formulario.css',
  '/estilos/top.css',
  '/scripts/addFilme.js',
  '/scripts/classificacao.js',
  '/scripts/estiloCabecalho.js',
  '/scripts/firebaseConfig.js',
  '/scripts/listarFilmes.js'
  // Se tiver imagens na pasta /imagens que usa com frequência, adicione aqui também
  // exemplo: '/imagens/alguma-imagem.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Arquivos em cache!');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna do cache se existir, senão busca na rede
        return response || fetch(event.request);
      })
      .catch(() => {
        // Se estiver offline e não tiver no cache, pode retornar uma página de erro personalizada
        console.log('Falha ao buscar:', event.request.url);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker ativado!');
  // Limpa caches antigos quando atualizar a versão
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});