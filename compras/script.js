import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAFvUYHdaNItt6zAbLaYxafzjifRkP0UU",
  authDomain: "compras-158d1.firebaseapp.com",
  projectId: "compras-158d1",
  storageBucket: "compras-158d1.firebasestorage.app",
  messagingSenderId: "740402019679",
  appId: "1:740402019679:web:e3a996f6844ac0f698caea",
};

/**
 * Client ID do cliente OAuth do tipo **Web** do projeto compras-158d1.
 *
 * Pegue em: Firebase Console > Authentication > Sign-in method > Google >
 * "Configuração do SDK da Web" > ID do cliente da Web.
 * Começa com 740402019679- (o número do projeto) e termina em
 * .apps.googleusercontent.com
 *
 * Vazio = o app cai no login por popup do SDK do Firebase, que funciona,
 * mas depende mais do navegador. Preenchido = botão oficial do Google.
 */
const GOOGLE_WEB_CLIENT_ID = "740402019679-c1tfs5uuaq6boo3uujck2ddra4qqcj1r.apps.googleusercontent.com";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- MODO VISITANTE (ENTRADA SEM CONTA) ---
/*
 * O visitante abre o app inteiro, mas desligado do banco.
 *
 * Não é o login anônimo do Firebase, de propósito: o firestore.rules libera
 * tudo por `request.auth != null`, e uma sessão anônima passaria por essa
 * porta. Sem sessão nenhuma, o "não salva nada" não depende de acertar
 * guarda por guarda aqui no código — é o próprio banco que recusa.
 *
 * O que sobra é uma lista prévia por compra, guardada só no localStorage
 * deste aparelho e apagada quando a compra é finalizada ou cancelada.
 */
const CHAVE_ANONIMO = "mercado:modo-visitante";
const CHAVE_ESTADO_ANONIMO = "mercado:compra-visitante";

let modoAnonimo = localStorage.getItem(CHAVE_ANONIMO) === "1";

const definirModoAnonimo = (ligado) => {
  modoAnonimo = ligado;
  try {
    if (ligado) localStorage.setItem(CHAVE_ANONIMO, "1");
    else localStorage.removeItem(CHAVE_ANONIMO);
  } catch (e) {
    console.warn("Não foi possível lembrar o modo visitante:", e);
  }
};

const limparEstadoLocal = () => {
  try {
    localStorage.removeItem(CHAVE_ESTADO_ANONIMO);
  } catch (e) {
    console.warn("Não foi possível limpar a compra deste aparelho:", e);
  }
};

/*
 * Cartão recolhível: o cabeçalho é o botão que abre e fecha o miolo.
 * Fechado, sobra só o título — é o que mantém a tela inicial curta sem
 * precisar tirar nada de lá.
 */
const definirRecolhivelAberto = (id, aberto) => {
  const cartao = document.getElementById(id);
  cartao.classList.toggle("aberto", aberto);
  cartao
    .querySelector(".recolhivel-cabecalho")
    .setAttribute("aria-expanded", String(aberto));
};

const ligarRecolhivel = (id) => {
  const cartao = document.getElementById(id);
  cartao
    .querySelector(".recolhivel-cabecalho")
    .addEventListener("click", () => {
      definirRecolhivelAberto(id, !cartao.classList.contains("aberto"));
    });
};

ligarRecolhivel("aviso-anonimo");
ligarRecolhivel("secao-historico");

// Liga/desliga tudo o que só faz sentido com conta
const aplicarModoNaInterface = (anonimo) => {
  const alternar = (id, escondido) =>
    document.getElementById(id).classList.toggle("hidden", escondido);

  alternar("aviso-anonimo", !anonimo);
  // sempre recolhido ao entrar: aberto, ele rouba a tela inicial
  definirRecolhivelAberto("aviso-anonimo", false);
  alternar("secao-anonimo", !anonimo);
  alternar("secao-historico", anonimo);
  alternar("secao-compartilhar", anonimo);
  alternar("btn-entrar-conta", !anonimo);
  alternar("btn-logout", anonimo);
  alternar("user-avatar-anonimo", !anonimo);
  alternar("conta-avatar-anonimo", !anonimo);
  document.getElementById("conta-foto").classList.toggle("hidden", anonimo);

  // "Recuperar dados antigos" só se esconde à força no modo visitante: com
  // conta, quem decide é o renderizarCompartilhamento (some no grupo herdeiro)
  if (anonimo) {
    document.getElementById("secao-recuperar").classList.add("hidden");
    // análise e sugestões vivem do histórico, que o visitante não tem
    document.getElementById("secao-analise").classList.add("hidden");
    document.getElementById("secao-sugestoes").classList.add("hidden");
  }
};

const entrarComoAnonimo = () => {
  definirModoAnonimo(true);
  atualizarUIAuth(null);
};

// Sair do modo visitante é descartar a compra: ela nunca existiu no banco
const sairDoModoAnonimo = async () => {
  fecharConta();
  const confirmado = await confirmar(
    "Entrar com uma conta?",
    "A lista e o carrinho guardados neste aparelho serão descartados — no modo visitante nada é salvo.",
    "Entrar",
  );
  if (!confirmado) return;

  definirModoAnonimo(false);
  limparEstadoLocal();
  location.reload();
};

document
  .getElementById("btn-anonimo")
  .addEventListener("click", entrarComoAnonimo);
document
  .getElementById("btn-entrar-conta")
  .addEventListener("click", sairDoModoAnonimo);
document
  .getElementById("btn-entrar-conta-inicial")
  .addEventListener("click", sairDoModoAnonimo);

// --- AUTENTICAÇÃO ---

const isPWA =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

// O iPad moderno se apresenta como Mac; o que o entrega é ter toque
const EH_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// O usuário cancelar não é erro: não vale mostrar aviso nem tentar de novo
const CANCELAMENTOS = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/user-cancelled",
]);

const mensagemDeLogin = (erro) => {
  switch (erro?.code) {
    case "auth/unauthorized-domain":
      return "Este endereço não está liberado no Firebase. Adicione-o em Authentication > Settings > Authorized domains.";
    case "auth/network-request-failed":
      return "Sem conexão com o servidor de login. Verifique a internet.";
    case "auth/popup-blocked":
      return "O navegador bloqueou a janela de login. Libere os pop-ups para este app.";
    case "redirect_uri_mismatch":
      return `O Google recusou o endereço de retorno. Adicione ${urlDeRetorno()} em "URIs de redirecionamento autorizados" no cliente OAuth.`;
    case "access_denied":
      return "Login cancelado.";
    case "state-invalido":
      return "A resposta do Google não confere com o pedido. Tente entrar de novo.";
    default:
      return "Não foi possível entrar. Tente de novo.";
  }
};

const mostrarErroLogin = (erro) => {
  console.error("Erro de login:", erro);
  const el = document.getElementById("erro-login");
  el.textContent = `${mensagemDeLogin(erro)} (${erro?.code || erro?.message || erro})`;
  el.classList.remove("hidden");
};

const definirCarregandoLogin = (carregando) => {
  const btn = document.getElementById("btn-login");
  btn.disabled = carregando;
  btn.querySelector("span:last-child").textContent = carregando
    ? "Entrando..."
    : "Entrar com Google";
  btn.querySelector(".material-icons").textContent = carregando
    ? "progress_activity"
    : "login";
  btn.querySelector(".material-icons").classList.toggle("girando", carregando);
};

/**
 * Login com Google — botão oficial do Google Identity Services, em popup.
 *
 * Por que não signInWithRedirect: o app está em renaum98.github.io e o
 * authDomain do Firebase em compras-158d1.firebaseapp.com. Com o
 * particionamento de armazenamento de terceiros (Chrome 115+, Safari/ITP),
 * o SDK não consegue ler a sessão na volta do redirect — o login completa
 * no Google e o app continua achando que ninguém entrou. Era esse o
 * travamento na tela de login do PWA instalado.
 *
 * O GIS resolve na raiz: o popup é janela de primeira parte e o id_token do
 * Google chega na própria página, sem depender de cookie de terceiro. Aqui
 * ele é trocado por uma sessão do Firebase com signInWithCredential, para o
 * SDK do Firestore continuar autenticando sozinho.
 *
 * O botão TEM de ser o desenhado pelo GIS: não existe mais disparo
 * programático, e é o clique nele que abre o popup — o que também impede o
 * navegador de bloquear a janela.
 */
const GIS_SRC = "https://accounts.google.com/gsi/client";

/*
 * Caminho do iPhone instalado (standalone).
 *
 * Ali NADA que dependa de popup funciona: window.open abre no Safari como
 * contexto separado e a resposta nunca volta para o app — confirmado em
 * teste, o retorno de chamada do Google simplesmente não acontece. Vale
 * para o GIS e para o signInWithPopup do SDK.
 *
 * E o signInWithRedirect do Firebase também não serve: ele passa por
 * compras-158d1.firebaseapp.com e depende de armazenamento de terceiro
 * para devolver a sessão, que é justamente o que os navegadores
 * particionaram.
 *
 * Então aqui a página vai direto ao Google e pede que o id_token volte no
 * FRAGMENTO da URL do próprio site (fluxo implícito do OpenID Connect).
 * Nenhuma janela extra, nenhum domínio de terceiro no meio.
 *
 * state e nonce protegem contra reaproveitar uma resposta antiga ou forjada.
 */
const AUTORIZACAO_GOOGLE = "https://accounts.google.com/o/oauth2/v2/auth";
const CHAVE_STATE = "mercado:oauth-state";

const aleatorio = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

// Precisa bater exatamente com o URI autorizado no cliente OAuth
const urlDeRetorno = () =>
  location.origin + location.pathname.replace(/index\.html$/, "");

const entrarPorRedirecionamento = () => {
  const state = aleatorio();
  const nonce = aleatorio();
  // localStorage e não sessionStorage: sobrevive melhor à ida e volta no iOS
  localStorage.setItem(CHAVE_STATE, state);

  const params = new URLSearchParams({
    client_id: GOOGLE_WEB_CLIENT_ID,
    response_type: "id_token",
    scope: "openid email profile",
    redirect_uri: urlDeRetorno(),
    nonce,
    state,
    prompt: "select_account",
  });

  location.href = `${AUTORIZACAO_GOOGLE}?${params}`;
};

// Na volta do Google o token vem no fragmento; troca por sessão do Firebase
const concluirRedirecionamento = async () => {
  if (!location.hash.includes("id_token") && !location.hash.includes("error"))
    return;

  const resposta = new URLSearchParams(location.hash.slice(1));
  const esperado = localStorage.getItem(CHAVE_STATE);
  localStorage.removeItem(CHAVE_STATE);

  // Tira o token da barra de endereço antes de qualquer outra coisa
  history.replaceState(null, "", urlDeRetorno() + location.search);

  const erroGoogle = resposta.get("error");
  if (erroGoogle) {
    mostrarErroLogin({ code: erroGoogle, message: erroGoogle });
    return;
  }

  if (!esperado || resposta.get("state") !== esperado) {
    mostrarErroLogin({ code: "state-invalido" });
    return;
  }

  try {
    await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(resposta.get("id_token")),
    );
  } catch (e) {
    mostrarErroLogin(e);
  }
};

let gisCarregando = null;
let gisIniciado = false;

const carregarGis = () => {
  const pronto = window.google?.accounts?.id;
  if (pronto) return Promise.resolve(pronto);

  gisCarregando ??= new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = GIS_SRC;
    tag.async = true;
    tag.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("O Google Identity Services carregou sem a API esperada."));
    };
    tag.onerror = () => {
      gisCarregando = null;
      reject(new Error("Não foi possível carregar o login do Google (sem rede?)."));
    };
    document.head.appendChild(tag);
  });
  return gisCarregando;
};

// O initialize do GIS é global e só vale uma vez por página
const iniciarGisUmaVez = (gis) => {
  if (gisIniciado) return;
  gisIniciado = true;

  gis.initialize({
    client_id: GOOGLE_WEB_CLIENT_ID,
    ux_mode: "popup",
    auto_select: false,
    callback: async (resposta) => {
      if (!resposta?.credential) {
        mostrarErroLogin(new Error("O Google não devolveu credencial."));
        return;
      }
      try {
        const credencial = GoogleAuthProvider.credential(resposta.credential);
        await signInWithCredential(auth, credencial);
      } catch (e) {
        mostrarErroLogin(e);
      }
    },
  });
};

// Desenha o botão do Google na tela de login; se não der, usa o botão próprio
// No iPhone instalado, popup não volta: o único caminho é o redirecionamento
const PRECISA_REDIRECIONAR = EH_IOS && isPWA;

const prepararLogin = async () => {
  const alvo = document.getElementById("botao-google");
  const proprio = document.getElementById("btn-login");

  if (PRECISA_REDIRECIONAR) {
    alvo.classList.add("hidden");
    proprio.classList.remove("hidden");
    return;
  }

  if (!GOOGLE_WEB_CLIENT_ID.trim()) {
    proprio.classList.remove("hidden");
    return;
  }

  try {
    const gis = await carregarGis();
    iniciarGisUmaVez(gis);
    alvo.innerHTML = "";
    gis.renderButton(alvo, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "signin_with",
      locale: "pt-BR",
      // O GIS não mede o contêiner: sem width explícito ele TRUNCA o rótulo
      // em pt-BR num aparelho de 375px em vez de quebrar a linha.
      width: Math.max(200, Math.min(400, Math.round(alvo.clientWidth) || 300)),
    });
    alvo.classList.remove("hidden");
    proprio.classList.add("hidden");

    // Origem não autorizada no cliente OAuth não vira exceção: o GIS só
    // reclama no console e deixa o contêiner vazio. Sem esta checagem o
    // usuário ficaria sem nenhum botão de entrar.
    setTimeout(() => {
      if (alvo.children.length === 0) {
        console.warn("O GIS não desenhou o botão; usando o login do SDK.");
        alvo.classList.add("hidden");
        proprio.classList.remove("hidden");
      }
    }, 1500);
  } catch (e) {
    console.warn("GIS indisponível, usando o login do SDK:", e);
    alvo.classList.add("hidden");
    proprio.classList.remove("hidden");
  }
};

// Caminho reserva: popup do próprio SDK do Firebase (nunca redirect)
window.loginGoogle = async function () {
  document.getElementById("erro-login").classList.add("hidden");

  // No iPhone instalado não adianta abrir janela: vai por redirecionamento
  if (PRECISA_REDIRECIONAR) {
    entrarPorRedirecionamento();
    return;
  }

  definirCarregandoLogin(true);
  try {
    await signInWithPopup(auth, provider);
  } catch (erro) {
    if (!CANCELAMENTOS.has(erro?.code)) mostrarErroLogin(erro);
  } finally {
    definirCarregandoLogin(false);
  }
};

// Se a página está voltando do Google, conclui antes de qualquer outra coisa
concluirRedirecionamento();

window.logout = async function () {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao sair:", error);
    mostrarNotificacao("Erro ao sair: " + error.message, "negativo", "error");
  }
};

async function salvarUsuarioFirestore(user) {
  const ref = doc(db, "usuarios", user.uid);
  await setDoc(
    ref,
    {
      nome: user.displayName,
      email: user.email,
      foto: user.photoURL,
      ultimoLogin: Timestamp.now(),
    },
    { merge: true },
  );
}

function atualizarUIAuth(user) {
  const areaLogin = document.getElementById("area-login");
  const appEl = document.getElementById("app");
  const userNome = document.getElementById("user-nome");
  const userFoto = document.getElementById("user-foto");
  const loadingEl = document.getElementById("area-loading");

  // Esconde o splash sempre que o estado for resolvido
  loadingEl.classList.add("hidden");

  if (user) {
    areaLogin.classList.add("hidden");
    appEl.classList.remove("hidden");

    userNome.textContent = user.displayName || user.email;
    if (user.photoURL) {
      userFoto.src = user.photoURL;
      userFoto.style.display = "block";
    }

    // Dados da folha de Conta
    document.getElementById("conta-nome").textContent =
      user.displayName || "Sem nome";
    document.getElementById("conta-email").textContent = user.email || "";
    const contaFoto = document.getElementById("conta-foto");
    if (user.photoURL) contaFoto.src = user.photoURL;

    aplicarModoNaInterface(false);
    iniciarApp();
  } else if (modoAnonimo) {
    // Sem conta: o app abre igual, sem histórico e sem compartilhamento
    areaLogin.classList.add("hidden");
    appEl.classList.remove("hidden");

    userNome.textContent = "Visitante";
    userFoto.style.display = "none";

    document.getElementById("conta-nome").textContent = "Visitante";
    document.getElementById("conta-email").textContent = "Entrou sem conta";

    aplicarModoNaInterface(true);
    iniciarApp();
  } else {
    areaLogin.classList.remove("hidden");
    appEl.classList.add("hidden");
    // Só aqui a tela de login tem largura, que o GIS precisa para o botão
    prepararLogin();
  }
}

document.getElementById("btn-login").addEventListener("click", () => {
  window.loginGoogle();
});

// Sem getRedirectResult: o fluxo de redirect foi removido de propósito
// (ver o comentário do login acima).

/*
 * Promessa de escrita do Firestore só resolve quando o servidor confirma —
 * se a conexão travar, ela não resolve NEM rejeita, fica pendurada para
 * sempre. Sem um limite de tempo, o app ficaria parado sem dizer nada.
 */
const LIMITE_PREPARO_MS = 20000;

const comLimite = (promessa, ms) =>
  Promise.race([
    promessa,
    new Promise((_, rejeitar) =>
      setTimeout(() => {
        const e = new Error("Tempo esgotado ao falar com o banco de dados.");
        e.code = "tempo-esgotado";
        rejeitar(e);
      }, ms),
    ),
  ]);

// Sai da tela de login assim que o usuário é reconhecido, para dar sinal de vida
const mostrarSplash = (texto) => {
  document.getElementById("loading-msg").textContent = texto;
  document.getElementById("area-login").classList.add("hidden");
  document.getElementById("area-erro").classList.add("hidden");
  document.getElementById("area-loading").classList.remove("hidden");
};

// Mostra o motivo da falha em vez de deixar o app preso no splash
function mostrarErroInicial(erro) {
  document.getElementById("area-loading").classList.add("hidden");
  document.getElementById("area-login").classList.add("hidden");
  document.getElementById("app").classList.add("hidden");

  let mensagem;
  if (erro?.code === "permission-denied") {
    mensagem =
      "O banco de dados recusou o acesso. Publique as regras do arquivo firestore.rules no console do Firebase — a coleção “grupos” precisa estar liberada.";
  } else if (erro?.code === "tempo-esgotado") {
    mensagem =
      "O banco de dados não respondeu. Pode ser a internet, ou as regras do Firestore bloqueando a coleção “grupos”.";
  } else if (erro?.code === "unavailable" || !navigator.onLine) {
    mensagem =
      "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  } else {
    mensagem = "Algo deu errado ao preparar sua conta.";
  }

  document.getElementById("erro-mensagem").textContent = mensagem;
  document.getElementById("erro-detalhe").textContent =
    erro?.code || erro?.message || String(erro);
  document.getElementById("area-erro").classList.remove("hidden");
}

document
  .getElementById("btn-tentar-novamente")
  .addEventListener("click", () => location.reload());

document.getElementById("btn-sair-erro").addEventListener("click", () => {
  window.logout();
  location.reload();
});

// Listener de autenticação — ponto de entrada do app
onAuthStateChanged(auth, async (user) => {
  usuarioAtual = user;

  // Entrou com conta de verdade: o modo visitante acabou
  if (user && modoAnonimo) {
    definirModoAnonimo(false);
    limparEstadoLocal();
  }

  if (user) {
    // Sai da tela de login na hora: o login já deu certo, e o que vem
    // depois é preparo. Sem isso, qualquer demora aqui parece "não entrou".
    mostrarSplash("Preparando sua conta...");

    // Registro de último acesso: não vale segurar a entrada do app por isso
    salvarUsuarioFirestore(user).catch((e) =>
      console.warn("Não foi possível registrar o acesso:", e),
    );

    try {
      await comLimite(garantirGrupo(user), LIMITE_PREPARO_MS);
    } catch (e) {
      console.error("Erro ao preparar a conta:", e);
      mostrarErroInicial(e);
      return;
    }
  } else {
    pararEscutas();
    document.getElementById("area-erro").classList.add("hidden");
  }

  atualizarUIAuth(user);
});

// --- PWA: SERVICE WORKER, INSTALAÇÃO E CONEXÃO ---

/*
 * Descoberta agressiva de versão nova.
 *
 * Assumir a versão nova já está resolvido: o sw.js chama skipWaiting() na
 * instalação e clients.claim() na ativação, e o controllerchange abaixo
 * recarrega a página. Isso é metade do problema.
 *
 * A outra metade é DESCOBRIR que existe versão nova. Num PWA aberto pela
 * tela de início o navegador praticamente não vai atrás do sw.js sozinho —
 * o iOS em especial —, então um deploy pode ficar parado indefinidamente.
 *
 * O que destrava é registro.update(), a chamada que força a checagem. Daí os
 * três momentos: no registro, de hora em hora com o app aberto, e toda vez
 * que ele volta do segundo plano, que é o caso real de quem fecha e reabre.
 */
const INTERVALO_ATUALIZACAO_MS = 60 * 60 * 1000;
let registroSW = null;

/*
 * Uma versão nova pode ficar parada em "waiting" em vez de assumir — é o
 * que acontece quando o skipWaiting do próprio service worker não vale
 * (iOS é especialmente teimoso nisso). Sem este empurrão, o app checava,
 * baixava a versão nova e continuava rodando a antiga.
 */
const promoverSeEsperando = (registro) => {
  if (registro?.waiting) registro.waiting.postMessage("SKIP_WAITING");
};

const procurarAtualizacao = async () => {
  if (!registroSW) return;
  try {
    await registroSW.update();
    promoverSeEsperando(registroSW);
  } catch {
    /* sem rede: tenta de novo no próximo gatilho */
  }
};

if ("serviceWorker" in navigator) {
  const registrar = async () => {
    try {
      // updateViaCache "none": sem isso o navegador pode responder o
      // sw.js pelo cache HTTP (o GitHub Pages manda cabeçalho de cache)
      // e concluir que nada mudou.
      registroSW = await navigator.serviceWorker.register("sw.js", {
        updateViaCache: "none",
      });

      // Recém-instalado também precisa do empurrão, não só o que já esperava
      registroSW.addEventListener("updatefound", () => {
        const novo = registroSW.installing;
        novo?.addEventListener("statechange", () => {
          if (novo.state === "installed" && navigator.serviceWorker.controller) {
            novo.postMessage("SKIP_WAITING");
          }
        });
      });

      promoverSeEsperando(registroSW);
      procurarAtualizacao();
      setInterval(procurarAtualizacao, INTERVALO_ATUALIZACAO_MS);
    } catch (e) {
      console.warn("Service worker não registrado:", e);
    }
  };

  /*
   * Registrar já, e não só no evento load.
   *
   * Se o módulo executasse depois do load — o que acontece em algumas
   * retomadas de página —, o ouvinte nunca dispararia, o registroSW ficaria
   * nulo e o app NUNCA checaria atualização. Agora o load é só o caminho
   * alternativo para quando a página ainda está carregando.
   */
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });

  /*
   * O iOS não recarrega a página ao reabrir um app que estava suspenso: ele
   * só volta. Dependendo de como a retomada acontece, o que dispara é
   * visibilitychange, pageshow ou focus — então os três chamam a checagem.
   */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") procurarAtualizacao();
  });
  window.addEventListener("pageshow", () => procurarAtualizacao());
  window.addEventListener("focus", () => procurarAtualizacao());

  // Recarrega uma única vez quando uma nova versão assume o controle.
  // O beforeunload já descarrega no Firestore o que estiver pendente.
  let recarregando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregando) return;
    recarregando = true;
    location.reload();
  });
}

const CHAVE_BANNER = "mercado:instalacao-dispensada";
let promptInstalacao = null;

/*
 * Instalar não é igual nos dois lados:
 *
 * No Android o navegador dispara beforeinstallprompt e dá para instalar com
 * um toque. No iOS esse evento não existe — a Apple não expõe instalação por
 * código —, então lá o único caminho é o usuário fazer à mão pelo menu de
 * compartilhar do Safari. Por isso cada plataforma tem seu conteúdo.
 */
const detectarPlataforma = () => {
  if (EH_IOS) return "ios";
  if (/Android/.test(navigator.userAgent)) return "android";
  return "desktop";
};

const PLATAFORMA = detectarPlataforma();

// No iPhone, "Adicionar à Tela de Início" é do Safari
const ehSafariIOS = () => !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

const mostrarBannerInstalar = () => {
  if (isPWA || localStorage.getItem(CHAVE_BANNER) === "1") return;
  document.getElementById("banner-instalar").classList.remove("hidden");
};

const abrirModalInstalar = () => {
  ["instrucoes-android", "instrucoes-ios", "instrucoes-desktop"].forEach((id) =>
    document.getElementById(id).classList.add("hidden"),
  );

  if (PLATAFORMA === "ios") {
    document.getElementById("instrucoes-ios").classList.remove("hidden");
    document
      .getElementById("aviso-safari")
      .classList.toggle("hidden", ehSafariIOS());
  } else {
    const android = PLATAFORMA === "android";
    document
      .getElementById(android ? "instrucoes-android" : "instrucoes-desktop")
      .classList.remove("hidden");

    // Com o prompt em mãos, um botão resolve; sem ele, sobra o passo a passo
    const botao = document.getElementById(
      android ? "btn-instalar-agora" : "btn-instalar-agora-desktop",
    );
    const passos = document.getElementById(
      android ? "passos-android" : "passos-desktop",
    );
    botao.classList.toggle("hidden", !promptInstalacao);
    passos.classList.toggle("hidden", !!promptInstalacao);
  }

  abrirModal(document.getElementById("modal-instalar"));
};

const fecharModalInstalar = () =>
  fecharModal(document.getElementById("modal-instalar"));

const instalarAgora = async () => {
  if (!promptInstalacao) return;
  promptInstalacao.prompt();
  await promptInstalacao.userChoice;
  promptInstalacao = null;
  fecharModalInstalar();
  document.getElementById("banner-instalar").classList.add("hidden");
};

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptInstalacao = e;
  mostrarBannerInstalar();
});

window.addEventListener("appinstalled", () => {
  promptInstalacao = null;
  fecharModalInstalar();
  document.getElementById("banner-instalar").classList.add("hidden");
  mostrarNotificacao("App instalado!", "positivo", "check_circle");
});

// O iOS nunca dispara beforeinstallprompt: o banner precisa aparecer sozinho
if (PLATAFORMA === "ios") mostrarBannerInstalar();

document
  .getElementById("btn-instalar")
  .addEventListener("click", abrirModalInstalar);
document
  .getElementById("btn-instalar-agora")
  .addEventListener("click", instalarAgora);
document
  .getElementById("btn-instalar-agora-desktop")
  .addEventListener("click", instalarAgora);
document
  .getElementById("fechar-instalar")
  .addEventListener("click", fecharModalInstalar);
document.getElementById("modal-instalar").addEventListener("click", (e) => {
  if (e.target.id === "modal-instalar") fecharModalInstalar();
});

document
  .getElementById("btn-fechar-instalar")
  .addEventListener("click", () => {
    localStorage.setItem(CHAVE_BANNER, "1");
    document.getElementById("banner-instalar").classList.add("hidden");
  });

const atualizarConexao = () => {
  document
    .getElementById("indicador-offline")
    .classList.toggle("hidden", navigator.onLine);
};
window.addEventListener("online", () => {
  atualizarConexao();
  mostrarNotificacao("Conexão restabelecida", "positivo", "cloud_done");
});
window.addEventListener("offline", () => {
  atualizarConexao();
  mostrarNotificacao("Você está offline", "negativo", "cloud_off");
});
atualizarConexao();

// --- ABERTURA E FECHAMENTO DAS FOLHAS ---
/*
 * Fechar era um corte seco: o display sumia com a folha ainda no lugar.
 *
 * Aqui ela desce e desbota primeiro, e só depois recebe o `hidden`. O
 * tempo tem de bater com a animação `.modal.fechando` do CSS — mais curto
 * corta a saída pela metade, mais longo deixa a tela travada à toa.
 */
const DURACAO_FECHAR_MODAL = 220;

const abrirModal = (modal) => {
  modal.classList.remove("fechando");
  modal.classList.remove("hidden");
};

const fecharModal = (modal) => {
  if (modal.classList.contains("hidden") || modal.classList.contains("fechando")) {
    return;
  }
  modal.classList.add("fechando");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("fechando");
  }, DURACAO_FECHAR_MODAL);
};

// --- NAVEGAÇÃO ENTRE TELAS ---

const TELAS = {
  "tela-inicial": "Início",
  "tela-editor-lista": "Lista de Compras",
  "tela-compras": "Comprando",
};

let telaAtual = "tela-inicial";

// A ordem das abas é o que dá o sentido do movimento
const ORDEM_TELAS = Object.keys(TELAS);

const mostrarTela = (id, registrarHistorico = true) => {
  if (!TELAS[id] || id === telaAtual) return;

  // O botão "voltar" do Android volta para a tela anterior em vez de fechar o app
  if (registrarHistorico) history.pushState({ tela: id }, "");

  /*
   * Ir para uma aba à direita traz a tela deslizando da direita; voltar
   * traz da esquerda. É o que diz para onde a navegação andou, e o
   * "voltar" do sistema ganha o movimento inverso de graça.
   */
  const avancando = ORDEM_TELAS.indexOf(id) > ORDEM_TELAS.indexOf(telaAtual);
  telaAtual = id;

  Object.keys(TELAS).forEach((tela) => {
    const el = document.getElementById(tela);
    el.classList.toggle("hidden", tela !== id);
  });

  // A classe precisa sair e voltar para a animação recomeçar; o offsetWidth
  // no meio é o que força o navegador a enxergar os dois estados.
  const ativa = document.getElementById(id);
  ativa.classList.remove("entrando-da-direita", "entrando-da-esquerda");
  void ativa.offsetWidth;
  ativa.classList.add(avancando ? "entrando-da-direita" : "entrando-da-esquerda");

  document.querySelectorAll("#tab-bar .tab").forEach((tab) => {
    tab.classList.toggle("ativo", tab.dataset.tela === id);
  });

  document.getElementById("titulo-tela").textContent = TELAS[id];
  document.getElementById("app-content").scrollTo({ top: 0 });
};

history.replaceState({ tela: "tela-inicial" }, "");
window.addEventListener("popstate", (e) => {
  mostrarTela(e.state?.tela || "tela-inicial", false);
});

document.querySelectorAll("#tab-bar .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    mostrarTela(tab.dataset.tela);
    if (tab.dataset.tela === "tela-editor-lista") renderizarListaPreviaEditor();
    if (tab.dataset.tela === "tela-compras") atualizarUI();
  });
});

// --- FOLHA DE CONTA ---

const abrirConta = () => {
  // Some só quando já está instalado; no resto, abre as instruções da plataforma
  document.getElementById("btn-instalar-conta").classList.toggle("hidden", isPWA);
  abrirModal(document.getElementById("modal-conta"));
};

const fecharConta = () => {
  fecharModal(document.getElementById("modal-conta"));
};

document.getElementById("btn-conta-topo").addEventListener("click", abrirConta);
document.getElementById("fechar-conta").addEventListener("click", fecharConta);
document.getElementById("modal-conta").addEventListener("click", (e) => {
  if (e.target.id === "modal-conta") fecharConta();
});

document.getElementById("btn-instalar-conta").addEventListener("click", () => {
  fecharConta();
  abrirModalInstalar();
});

document
  .getElementById("btn-limpar-cache")
  .addEventListener("click", async () => {
    mostrarNotificacao("Buscando atualizações...", "neutro", "refresh");
    try {
      const reg =
        registroSW || (await navigator.serviceWorker?.getRegistration());
      await reg?.update();
      if (reg?.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
        return; // o controllerchange recarrega a página
      }
      mostrarNotificacao("Você já está na versão mais recente", "positivo", "check_circle");
    } catch {
      mostrarNotificacao("Não foi possível verificar agora", "negativo", "error");
    }
  });

// --- DIÁLOGO DE CONFIRMAÇÃO (substitui o confirm() do navegador) ---

const confirmar = (titulo, texto, textoOk = "Confirmar") =>
  new Promise((resolve) => {
    const modal = document.getElementById("modal-confirmar");
    const btnOk = document.getElementById("btn-confirmar-ok");
    const btnCancelar = document.getElementById("btn-confirmar-cancelar");

    document.getElementById("confirmar-titulo").textContent = titulo;
    document.getElementById("confirmar-texto").textContent = texto;
    btnOk.textContent = textoOk;
    abrirModal(modal);

    const encerrar = (resposta) => {
      fecharModal(modal);
      btnOk.removeEventListener("click", aoConfirmar);
      btnCancelar.removeEventListener("click", aoCancelar);
      modal.removeEventListener("click", aoClicarFora);
      resolve(resposta);
    };
    const aoConfirmar = () => encerrar(true);
    const aoCancelar = () => encerrar(false);
    const aoClicarFora = (e) => {
      if (e.target === modal) encerrar(false);
    };

    btnOk.addEventListener("click", aoConfirmar);
    btnCancelar.addEventListener("click", aoCancelar);
    modal.addEventListener("click", aoClicarFora);
  });

// --- GRUPO COMPARTILHADO ---
// Cada grupo é uma "conta conjunta": todos os membros veem e editam a mesma
// lista ativa e o mesmo histórico, ao vivo. O vínculo é permanente — só sai
// quem pede para sair ou quem for removido por outro membro.

// Documento que o app usava antes de existirem grupos. O primeiro usuário a
// entrar depois desta versão herda esses dados (lista ativa + histórico).
const GRUPO_LEGADO = "sessao_familiar_unica";

// Sem 0/O/1/I para não confundir na hora de ditar o código
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let usuarioAtual = null;
let grupoAtual = null; // { id, codigo, dono, membros, membrosInfo }
let docRef = null; // lista_ativa/{grupoId}
let pararEscutaLista = null;
let pararEscutaGrupo = null;

const gerarCodigo = () =>
  Array.from(
    { length: 6 },
    () => ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)],
  ).join("");

const buscarGrupoPorCodigo = async (codigo) => {
  const snap = await getDocs(
    query(collection(db, "grupos"), where("codigo", "==", codigo)),
  );
  return snap.empty ? null : snap.docs[0];
};

const gerarCodigoUnico = async () => {
  for (let i = 0; i < 5; i++) {
    const codigo = gerarCodigo();
    if (!(await buscarGrupoPorCodigo(codigo))) return codigo;
  }
  // Praticamente inalcançável; evita laço infinito
  return gerarCodigo() + Math.floor(Math.random() * 10);
};

const infoMembro = (user) => ({
  nome: user.displayName || user.email || "Sem nome",
  email: user.email || "",
  foto: user.photoURL || "",
});

const pararEscutas = () => {
  if (pararEscutaLista) pararEscutaLista();
  if (pararEscutaGrupo) pararEscutaGrupo();
  pararEscutaLista = null;
  pararEscutaGrupo = null;
};

// Copia o histórico anterior aos grupos para dentro do grupo que herdou os dados
const migrarComprasAntigas = async (grupoId) => {
  const snap = await getDocs(collection(db, "compras_finalizadas"));
  const pendentes = snap.docs.filter((d) => !d.data().grupoId);
  await Promise.all(
    pendentes.map((d) =>
      setDoc(d.ref, { grupoId }, { merge: true }).catch((e) =>
        console.warn("Falha ao migrar compra", d.id, e),
      ),
    ),
  );
  return pendentes.length;
};

const criarGrupo = async (user, { id = null } = {}) => {
  const codigo = await gerarCodigoUnico();
  const dados = {
    codigo,
    dono: user.uid,
    membros: [user.uid],
    membrosInfo: { [user.uid]: infoMembro(user) },
    criadoEm: Timestamp.now(),
  };
  const ref = id
    ? doc(db, "grupos", id)
    : doc(collection(db, "grupos"));
  await setDoc(ref, dados);
  return { id: ref.id, ...dados };
};

const definirGrupoDoUsuario = async (uid, grupoId) => {
  await setDoc(doc(db, "usuarios", uid), { grupoId }, { merge: true });
};

/*
 * Procura os grupos em que o usuário já consta como membro.
 *
 * A lista de membros do grupo é a fonte da verdade; o grupoId gravado em
 * usuarios/{uid} é só um atalho. Confiar só no atalho foi o que gerou a
 * bagunça: cada preparo de conta que morria antes de grava-lo fazia o
 * login seguinte criar um grupo novo e vazio, e a pessoa perdia os dados
 * de vista.
 *
 * O herdeiro tem preferência: é onde mora o histórico de antes dos grupos.
 */
const buscarGrupoDoUsuario = async (uid) => {
  const snap = await getDocs(
    query(collection(db, "grupos"), where("membros", "array-contains", uid)),
  );
  if (snap.empty) return null;

  const legado = snap.docs.find((d) => d.id === GRUPO_LEGADO);
  const escolhido = legado || snap.docs[0];
  return { id: escolhido.id, ...escolhido.data() };
};

/*
 * Descobre (ou cria) o grupo do usuário e liga as escutas ao vivo.
 *
 * Não há mais atalho por usuarios/{uid}.grupoId: a busca pela lista de
 * membros é a única fonte consultada. O atalho podia apontar para um
 * grupo vazio criado por um preparo que falhou, e nesse caso venceria a
 * busca — deixando os dados de verdade invisíveis. O campo continua sendo
 * gravado, como registro, mas não decide mais nada.
 */
const garantirGrupo = async (user) => {
  const existente = await buscarGrupoDoUsuario(user.uid);
  if (existente) {
    await definirGrupoDoUsuario(user.uid, existente.id);
    await migrarSeFaltou(existente);
    aplicarGrupo(existente);
    return;
  }

  // Primeiro login desta versão: herda os dados que o app já tinha
  const snapLegado = await getDoc(doc(db, "grupos", GRUPO_LEGADO));
  if (!snapLegado.exists()) {
    const novo = await criarGrupo(user, { id: GRUPO_LEGADO });
    await definirGrupoDoUsuario(user.uid, novo.id);
    await migrarSeFaltou(novo);
    aplicarGrupo(novo);
    return;
  }

  // O herdeiro existe e é de outra pessoa: começa um grupo próprio
  const novo = await criarGrupo(user);
  await definirGrupoDoUsuario(user.uid, novo.id);
  aplicarGrupo(novo);
};

/*
 * Carimba o grupo nas compras anteriores aos grupos.
 *
 * Fica marcado como feito no próprio grupo, porque a migração pode ter
 * falhado antes (regra do Firestore, conexão) — sem essa marca ela nunca
 * seria tentada de novo e o histórico ficaria invisível para sempre.
 */
const migrarSeFaltou = async (grupo) => {
  if (grupo.id !== GRUPO_LEGADO || grupo.migrado) return;

  try {
    const migradas = await migrarComprasAntigas(grupo.id);
    await setDoc(
      doc(db, "grupos", grupo.id),
      { migrado: true },
      { merge: true },
    );
    grupo.migrado = true;

    if (migradas > 0) {
      mostrarNotificacao(
        `${migradas} ${migradas === 1 ? "compra recuperada" : "compras recuperadas"}`,
        "positivo",
        "history",
      );
    }
  } catch (e) {
    // Entrar no app importa mais; na próxima tentativa ela roda de novo
    console.warn("Não foi possível migrar o histórico antigo:", e);
  }
};

// Troca o grupo ativo: religa a lista compartilhada e a escuta de membros
const aplicarGrupo = (grupo) => {
  pararEscutas();
  grupoAtual = grupo;
  docRef = doc(db, "lista_ativa", grupo.id);
  renderizarCompartilhamento();

  pararEscutaGrupo = onSnapshot(doc(db, "grupos", grupo.id), (snap) => {
    if (!snap.exists()) return;
    const dados = { id: snap.id, ...snap.data() };

    // Removido por outro membro: sai para um grupo novo e vazio
    if (usuarioAtual && !dados.membros?.includes(usuarioAtual.uid)) {
      mostrarNotificacao(
        "Você saiu do grupo compartilhado",
        "neutro",
        "group_off",
      );
      sairParaGrupoNovo();
      return;
    }

    grupoAtual = dados;
    renderizarCompartilhamento();
  });
};

let trocandoDeGrupo = false;

const sairParaGrupoNovo = async () => {
  if (!usuarioAtual || trocandoDeGrupo) return;
  trocandoDeGrupo = true;
  pararEscutas();
  try {
    const novo = await criarGrupo(usuarioAtual);
    await definirGrupoDoUsuario(usuarioAtual.uid, novo.id);
  } catch (e) {
    console.error("Erro ao criar grupo novo:", e);
  }
  location.reload();
};

// --- INTERFACE DE COMPARTILHAMENTO (dentro da folha de Conta) ---

const renderizarCompartilhamento = () => {
  const elCodigo = document.getElementById("codigo-grupo");
  const elMembros = document.getElementById("membros-grupo");
  if (!elCodigo || !grupoAtual) return;

  elCodigo.textContent = grupoAtual.codigo || "------";
  // Já está no grupo com o histórico: não há para onde recuperar
  document
    .getElementById("secao-recuperar")
    .classList.toggle("hidden", grupoAtual.id === GRUPO_LEGADO);

  const membros = grupoAtual.membros || [];
  const info = grupoAtual.membrosInfo || {};

  elMembros.innerHTML = membros
    .map((uid) => {
      const m = info[uid] || { nome: "Membro", email: "" };
      const souEu = uid === usuarioAtual?.uid;
      const foto = m.foto
        ? `<img src="${escapeHtml(m.foto)}" alt="" width="34" height="34">`
        : `<span class="material-icons avatar-vazio">person</span>`;
      const acao = souEu
        ? membros.length > 1
          ? `<button class="btn-membro" data-sair="1">Sair</button>`
          : ""
        : `<button class="btn-membro perigo" data-remover="${escapeHtml(uid)}">Remover</button>`;
      return `
        <div class="membro">
          ${foto}
          <div class="membro-textos">
            <strong>${escapeHtml(m.nome)}${souEu ? " (você)" : ""}</strong>
            <span>${escapeHtml(m.email)}</span>
          </div>
          ${acao}
        </div>`;
    })
    .join("");

  elMembros.querySelectorAll("[data-remover]").forEach((btn) => {
    btn.addEventListener("click", () => removerMembro(btn.dataset.remover));
  });
  elMembros.querySelectorAll("[data-sair]").forEach((btn) => {
    btn.addEventListener("click", sairDoGrupo);
  });
};

const entrarComCodigo = async () => {
  const input = document.getElementById("input-codigo");
  const codigo = input.value.trim().toUpperCase();
  if (!codigo) return;

  if (codigo === grupoAtual?.codigo) {
    mostrarNotificacao("Esse já é o seu próprio código", "negativo", "warning");
    return;
  }

  const encontrado = await buscarGrupoPorCodigo(codigo);
  if (!encontrado) {
    mostrarNotificacao("Código não encontrado", "negativo", "search_off");
    return;
  }

  const dono = encontrado.data().membrosInfo?.[encontrado.data().dono];
  fecharConta();
  const confirmado = await confirmar(
    "Entrar nesta conta compartilhada?",
    `Você passa a ver e editar as listas e compras de ${dono?.nome || "outra pessoa"}. Suas listas atuais deixam de aparecer, mas não são apagadas.`,
    "Entrar",
  );
  if (!confirmado) return;

  try {
    await updateDoc(encontrado.ref, {
      membros: arrayUnion(usuarioAtual.uid),
      [`membrosInfo.${usuarioAtual.uid}`]: infoMembro(usuarioAtual),
    });
    await definirGrupoDoUsuario(usuarioAtual.uid, encontrado.id);
    input.value = "";
    location.reload();
  } catch (e) {
    console.error("Erro ao entrar no grupo:", e);
    mostrarNotificacao("Não foi possível entrar: " + e.message, "negativo", "error");
  }
};

const removerMembro = async (uid) => {
  const nome = grupoAtual?.membrosInfo?.[uid]?.nome || "esta pessoa";
  fecharConta();
  const confirmado = await confirmar(
    "Encerrar o compartilhamento?",
    `${nome} deixa de ver suas listas e compras. Vocês podem se juntar de novo depois com o mesmo código.`,
    "Remover",
  );
  if (!confirmado) return;

  try {
    await updateDoc(doc(db, "grupos", grupoAtual.id), {
      membros: arrayRemove(uid),
    });
    mostrarNotificacao("Compartilhamento encerrado", "positivo", "group_off");
  } catch (e) {
    mostrarNotificacao("Não foi possível remover: " + e.message, "negativo", "error");
  }
};

const sairDoGrupo = async () => {
  fecharConta();
  const confirmado = await confirmar(
    "Sair da conta compartilhada?",
    "Você volta a ter listas e compras só suas. Pode entrar de novo depois com o código.",
    "Sair do grupo",
  );
  if (!confirmado) return;

  try {
    // Ao sair da lista de membros, a própria escuta do grupo cuida da troca
    await updateDoc(doc(db, "grupos", grupoAtual.id), {
      membros: arrayRemove(usuarioAtual.uid),
    });
  } catch (e) {
    mostrarNotificacao("Não foi possível sair: " + e.message, "negativo", "error");
  }
};

/*
 * Recuperação explícita do grupo herdeiro.
 *
 * Entra no grupo ANTES de tentar migrar, e isso importa: a migração lê a
 * coleção de compras sem filtro, e o Firestore avalia a regra documento a
 * documento — se um único for recusado, a consulta inteira falha. Sendo
 * membro do grupo herdeiro, tanto as compras já carimbadas quanto as sem
 * grupo passam.
 */
const recuperarDadosAntigos = async () => {
  const saida = document.getElementById("resultado-recuperacao");
  const mostrar = (texto) => {
    saida.textContent = texto;
    saida.classList.remove("hidden");
  };

  fecharConta();
  const confirmado = await confirmar(
    "Voltar para os dados antigos?",
    "Sua conta passa a apontar para o grupo onde estão suas compras e listas anteriores. O que você tiver cadastrado agora fica no grupo atual.",
    "Recuperar",
  );
  if (!confirmado) return;

  abrirConta();
  mostrar("Procurando...");

  try {
    const refLegado = doc(db, "grupos", GRUPO_LEGADO);
    const snap = await getDoc(refLegado);
    if (!snap.exists()) {
      mostrar("O grupo antigo não existe neste banco de dados.");
      return;
    }

    await updateDoc(refLegado, {
      membros: arrayUnion(usuarioAtual.uid),
      [`membrosInfo.${usuarioAtual.uid}`]: infoMembro(usuarioAtual),
    });
    await definirGrupoDoUsuario(usuarioAtual.uid, GRUPO_LEGADO);

    let migradas = 0;
    try {
      migradas = await migrarComprasAntigas(GRUPO_LEGADO);
      await setDoc(refLegado, { migrado: true }, { merge: true });
    } catch (e) {
      mostrar(
        `Entrou no grupo antigo, mas o histórico não pôde ser carimbado: ${e?.code || e?.message}. Recarregando...`,
      );
      setTimeout(() => location.reload(), 3000);
      return;
    }

    mostrar(`Pronto — ${migradas} compra(s) recuperada(s). Recarregando...`);
    setTimeout(() => location.reload(), 1500);
  } catch (e) {
    mostrar(`Falhou: ${e?.code || e?.message}`);
  }
};

document
  .getElementById("btn-recuperar-dados")
  .addEventListener("click", recuperarDadosAntigos);

document.getElementById("btn-entrar-grupo").addEventListener("click", () => {
  entrarComCodigo();
});

document.getElementById("input-codigo").addEventListener("keypress", (e) => {
  if (e.key === "Enter") entrarComCodigo();
});

document.getElementById("btn-copiar-codigo").addEventListener("click", async () => {
  if (!grupoAtual?.codigo) return;
  try {
    await navigator.clipboard.writeText(grupoAtual.codigo);
    mostrarNotificacao("Código copiado", "positivo", "content_copy");
  } catch {
    mostrarNotificacao("Não foi possível copiar", "negativo", "error");
  }
});

document.getElementById("btn-compartilhar-codigo").addEventListener("click", async () => {
  if (!grupoAtual?.codigo) return;
  const texto = `Entre na nossa lista de compras do Mercado Inteligente com o código ${grupoAtual.codigo}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Mercado Inteligente", text: texto });
    } catch {
      /* cancelado pelo usuário */
    }
  } else {
    try {
      await navigator.clipboard.writeText(texto);
      mostrarNotificacao("Convite copiado", "positivo", "content_copy");
    } catch {
      mostrarNotificacao("Compartilhamento indisponível", "negativo", "error");
    }
  }
});

// --- ESTADO ---
let carrinho = [];
let listaPrevia = [];
let orcamento = 0;
let ultimosPrecos = {};
let isUpdatingFromSnapshot = false;
let appIniciado = false; // Garante que o app não é iniciado duas vezes

// --- PERSISTÊNCIA REMOTA ---

let saveTimer = null;
const SAVE_DEBOUNCE_MS = 400;

/*
 * A compra do visitante mora só neste aparelho.
 *
 * Sem debounce: gravar no localStorage é síncrono e barato, e assim o
 * estado já está no disco se o app for fechado no meio.
 */
const salvarEstadoLocal = () => {
  if (isUpdatingFromSnapshot) return;
  try {
    localStorage.setItem(
      CHAVE_ESTADO_ANONIMO,
      JSON.stringify({
        carrinho,
        listaPrevia,
        orcamento,
        ultimosPrecos,
        timestamp: Date.now(),
      }),
    );
  } catch (e) {
    console.warn("Não foi possível guardar a compra neste aparelho:", e);
  }
};

const carregarEstadoLocal = () => {
  let estado = null;
  try {
    estado = JSON.parse(localStorage.getItem(CHAVE_ESTADO_ANONIMO) || "null");
  } catch (e) {
    console.warn("Compra guardada ilegível; começando do zero:", e);
  }

  if (estado) {
    carrinho = (estado.carrinho || []).map((item) => ({
      ...item,
      id: item.id || gerarId(),
    }));
    listaPrevia = (estado.listaPrevia || []).map((p) =>
      typeof p === "string" ? { id: gerarId(), nome: p } : p,
    );
    orcamento = estado.orcamento || 0;
    if (estado.ultimosPrecos) {
      ultimosPrecos = { ...ultimosPrecos, ...estado.ultimosPrecos };
    }

    if (orcamento > 0) {
      document.getElementById("orcamento-inicial").value = orcamento;
    }
    if (carrinho.length > 0) {
      document.getElementById("aviso-recuperacao").classList.remove("hidden");
    }
  }

  atualizarUI();
  renderizarListaPreviaEditor();
};

const salvarEstadoRemoto = () => {
  if (modoAnonimo) {
    salvarEstadoLocal();
    return;
  }
  if (isUpdatingFromSnapshot || !docRef) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const estado = {
      carrinho,
      listaPrevia,
      orcamento,
      ultimosPrecos,
      timestamp: Date.now(),
    };
    try {
      await setDoc(docRef, estado);
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
      mostrarNotificacao("Erro de conexão ao salvar", "negativo", "wifi_off");
    }
  }, SAVE_DEBOUNCE_MS);
};

const iniciarSincronizacao = () => {
  if (modoAnonimo) {
    carregarEstadoLocal();
    return;
  }
  if (!docRef) return;
  if (pararEscutaLista) pararEscutaLista();
  pararEscutaLista = onSnapshot(docRef, (docSnap) => {
    isUpdatingFromSnapshot = true;

    if (docSnap.exists()) {
      const estado = docSnap.data();
      carrinho = (estado.carrinho || []).map((item) => ({
        ...item,
        id: item.id || gerarId(),
      }));
      listaPrevia = (estado.listaPrevia || []).map((p) =>
        typeof p === "string" ? { id: gerarId(), nome: p } : p,
      );
      orcamento = estado.orcamento || 0;
      if (estado.ultimosPrecos) {
        ultimosPrecos = { ...ultimosPrecos, ...estado.ultimosPrecos };
      }

      if (orcamento > 0) {
        document.getElementById("orcamento-inicial").value = orcamento;
      }
      if (carrinho.length > 0) {
        document.getElementById("aviso-recuperacao").classList.remove("hidden");
      }
    } else {
      carrinho = [];
      listaPrevia = [];
      orcamento = 0;
      document.getElementById("orcamento-inicial").value = "";
    }

    atualizarUI();
    renderizarListaPreviaEditor();
    isUpdatingFromSnapshot = false;
  });
};

const limparEstadoRemoto = async () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (modoAnonimo) {
    limparEstadoLocal();
    carrinho = [];
    orcamento = 0;
    listaPrevia = [];
    return;
  }
  if (!docRef) return;
  try {
    await deleteDoc(docRef);
    carrinho = [];
    orcamento = 0;
    listaPrevia = [];
  } catch (e) {
    console.error("Erro ao limpar:", e);
  }
};

// Flush de mutação pendente antes de fechar/recarregar
window.addEventListener("beforeunload", () => {
  if (modoAnonimo) return; // o localStorage já foi gravado a cada mudança
  if (saveTimer && docRef) {
    clearTimeout(saveTimer);
    saveTimer = null;
    setDoc(docRef, {
      carrinho,
      listaPrevia,
      orcamento,
      ultimosPrecos,
      timestamp: Date.now(),
    }).catch((e) => console.error("Erro no flush:", e));
  }
});

// --- PRODUTOS ---

const produtosBasicos = [
  "Arroz Branco",
  "Arroz Integral",
  "Feijão Carioca",
  "Feijão Preto",
  "Açúcar Refinado",
  "Açúcar Mascavo",
  "Sal Refinado",
  "Sal Grosso",
  "Café em Pó",
  "Cápsulas de Café",
  "Óleo de Soja",
  "Azeite de Oliva",
  "Vinagre",
  "Molho de Tomate",
  "Macarrão Espaguete",
  "Macarrão Parafuso",
  "Farinha de Trigo",
  "Farinha de Mandioca",
  "Milho de Pipoca",
  "Extrato de Tomate",
  "Maionese",
  "Ketchup",
  "Mostarda",
  "Leite Condensado",
  "Creme de Leite",
  "Pão Francês",
  "Pão de Forma",
  "Pão Integral",
  "Biscoito Recheado",
  "Biscoito Salgado",
  "Torrada",
  "Cereal Matinal",
  "Geléia",
  "Mel",
  "Achocolatado em Pó",
  "Aveia",
  "Leite Integral",
  "Leite Desnatado",
  "Leite de Soja",
  "Manteiga com Sal",
  "Margarina",
  "Queijo Mussarela",
  "Queijo Prato",
  "Queijo Parmesão",
  "Requeijão",
  "Iogurte Natural",
  "Iogurte de Frutas",
  "Ovos Brancos",
  "Ovos Caipiras",
  "Presunto",
  "Peito de Peru",
  "Frango (Peito)",
  "Frango (Coxa e Sobrecoxa)",
  "Carne Moída",
  "Bife de Alcatra",
  "Bife de Contra Filé",
  "Linguiça Toscana",
  "Salsicha",
  "Peixe Filé",
  "Bacon",
  "Batata Inglesa",
  "Batata Doce",
  "Cebola",
  "Alho",
  "Tomate",
  "Alface",
  "Cenoura",
  "Abobrinha",
  "Banana Prata",
  "Banana Nanica",
  "Maçã Gala",
  "Maçã Argentina",
  "Laranja",
  "Limão Taiti",
  "Mamão",
  "Melancia",
  "Uva",
  "Abacaxi",
  "Água Mineral",
  "Água com Gás",
  "Refrigerante de Cola",
  "Refrigerante de Guaraná",
  "Suco de Caixa",
  "Suco Concentrado",
  "Cerveja Latão",
  "Vinho Tinto",
  "Vinho Branco",
  "Detergente Líquido",
  "Sabão em Pó",
  "Sabão Líquido",
  "Amaciante",
  "Água Sanitária",
  "Desinfetante",
  "Limpador Multiuso",
  "Esponja de Aço",
  "Esponja de Louça",
  "Saco de Lixo",
  "Papel Higiênico",
  "Sabonete",
  "Shampoo",
  "Condicionador",
  "Pasta de Dente",
  "Escova de Dente",
  "Desodorante Roll-on",
  "Desodorante Aerossol",
  "Fio Dental",
  "Algodão",
  "Hastes Flexíveis",
  "Absorvente",
];
let produtosConhecidos = new Set(produtosBasicos);

// --- FUNÇÕES DE UI ---

const escapeHtml = (str) => {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const gerarId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// --- UNIDADE DE MEDIDA ---
/*
 * Peça (2 caixas de leite) ou balança (0,750 kg de tomate).
 *
 * A conta é a mesma dos dois lados — total = quantidade × preço —, o que
 * muda é o que cada número quer dizer, e por isso os rótulos dos campos
 * trocam junto: em quilo, o preço pedido é o do quilo.
 *
 * Item antigo não tem `unidade`; a falta dela vale como "un".
 */
const UNIDADES = {
  un: {
    rotulo: "un",
    aria: "Medindo em unidades; tocar para usar quilos",
    qtd: { placeholder: "Qtd", min: "1", step: "1", inputmode: "numeric" },
    preco: "Preço unitário",
  },
  kg: {
    rotulo: "kg",
    aria: "Medindo em quilos; tocar para voltar a unidades",
    qtd: { placeholder: "Peso", min: "0.05", step: "0.05", inputmode: "decimal" },
    preco: "Preço por kg",
  },
};

let unidadeAtual = "un";

// 0,750 kg — sem casas decimais à toa quando o peso é redondo
const formatarQtd = (qtd, unidade) => {
  const numero = Number(qtd) || 0;
  if (unidade !== "kg") return String(numero);
  return numero.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
};

const rotuloQtd = (item) =>
  item.unidade === "kg" ? `${formatarQtd(item.qtd, "kg")} kg` : `${item.qtd}x`;

const descricaoItem = (item) => {
  const preco = item.preco.toFixed(2).replace(".", ",");
  return item.unidade === "kg"
    ? `${rotuloQtd(item)} × R$ ${preco}/kg`
    : `${rotuloQtd(item)} R$ ${preco}`;
};

const definirUnidade = (unidade) => {
  unidadeAtual = UNIDADES[unidade] ? unidade : "un";
  const cfg = UNIDADES[unidadeAtual];

  const botao = document.getElementById("btn-unidade");
  botao.textContent = cfg.rotulo;
  botao.dataset.unidade = unidadeAtual;
  botao.setAttribute("aria-label", cfg.aria);

  const campoQtd = document.getElementById("input-qtd");
  campoQtd.placeholder = cfg.qtd.placeholder;
  campoQtd.min = cfg.qtd.min;
  campoQtd.step = cfg.qtd.step;
  campoQtd.inputMode = cfg.qtd.inputmode;

  document.getElementById("input-preco").placeholder = cfg.preco;
};

window.removerItem = (id) => {
  carrinho = carrinho.filter((item) => item.id !== id);
  salvarEstadoRemoto();
  atualizarUI();
};

const atualizarUI = () => {
  const listaDiv = document.getElementById("lista-atual");
  const totalGeral = carrinho.reduce((sum, item) => sum + item.total, 0);
  const saldo = orcamento - totalGeral;

  document.getElementById("txt-total").innerText = totalGeral
    .toFixed(2)
    .replace(".", ",");
  document.getElementById("txt-saldo").innerText = Math.abs(saldo)
    .toFixed(2)
    .replace(".", ",");

  const boxSaldo = document.getElementById("box-saldo");
  const labelSaldo = document.getElementById("label-saldo");

  if (saldo < 0) {
    boxSaldo.classList.add("negativo");
    labelSaldo.innerText = "Ultrapassou";
  } else {
    boxSaldo.classList.remove("negativo");
    labelSaldo.innerText = "Saldo Restante";
  }

  if (carrinho.length === 0) {
    listaDiv.innerHTML = `
      <div class="empty-state">
        <span class="material-icons empty-state-icon">shopping_cart</span>
        <p>Carrinho vazio</p>
      </div>`;
  } else {
    listaDiv.innerHTML = carrinho
      .map(
        (item) => `
      <div class="item-lista">
        <div class="item-info">
          <div class="item-nome">${escapeHtml(item.nome)}</div>
          <div class="item-detalhes">${descricaoItem(item)}</div>
        </div>
        <div class="item-total">R$ ${item.total.toFixed(2).replace(".", ",")}</div>
        <button class="btn-remove" data-id="${escapeHtml(item.id)}">
          <span class="material-icons">close</span>
        </button>
      </div>`,
      )
      .reverse()
      .join("");
    listaDiv.querySelectorAll(".btn-remove[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => window.removerItem(btn.dataset.id));
    });
  }

  atualizarListaPendenteVisual();
  atualizarBadgesTabs();
  atualizarBotaoIniciar();
};

// Com o carrinho já em andamento, o botão da tela inicial retoma a compra
const atualizarBotaoIniciar = () => {
  const emAndamento = carrinho.length > 0;
  document.getElementById("txt-btn-iniciar").textContent = emAndamento
    ? "Continuar Compras"
    : "Iniciar Compras";
  document.getElementById("icone-btn-iniciar").textContent = emAndamento
    ? "arrow_forward"
    : "play_arrow";
};

// Contadores nas abas: itens que faltam comprar e itens já no carrinho
const atualizarBadgesTabs = () => {
  const pendentes = listaPrevia.filter(
    (p) => !carrinho.some((c) => c.nome.toLowerCase() === p.nome.toLowerCase()),
  ).length;

  const definir = (id, valor) => {
    const el = document.getElementById(id);
    el.textContent = valor > 99 ? "99+" : valor;
    el.classList.toggle("hidden", valor === 0);
  };

  definir("tab-badge-lista", pendentes);
  definir("tab-badge-carrinho", carrinho.length);
};

const atualizarListaPendenteVisual = () => {
  const divPendentes = document.getElementById("area-pendentes");
  const painelPendentes = document.getElementById("painel-lista-pendente");
  const badgePendentes = document.getElementById("badge-pendentes");
  const termoBusca = document
    .getElementById("busca-pendente")
    .value.toLowerCase();

  let pendentes = listaPrevia.filter(
    (p) => !carrinho.some((c) => c.nome.toLowerCase() === p.nome.toLowerCase()),
  );
  const totalPendentes = pendentes.length;

  if (termoBusca) {
    pendentes = pendentes.filter((p) =>
      p.nome.toLowerCase().includes(termoBusca),
    );
  }

  if (totalPendentes > 0) {
    painelPendentes.classList.remove("hidden");
    badgePendentes.innerText = totalPendentes;

    if (pendentes.length === 0 && termoBusca) {
      divPendentes.innerHTML =
        '<p class="text-center text-muted" style="margin-top:12px;font-size:0.875rem;">Nenhum item encontrado</p>';
    } else {
      divPendentes.innerHTML = pendentes
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map(
          (item) => `
          <span class="chip-pendente" data-item="${escapeHtml(item.nome)}">
            ${escapeHtml(item.nome)}
          </span>`,
        )
        .join("");
      divPendentes.querySelectorAll(".chip-pendente").forEach((el) => {
        el.addEventListener("click", () => {
          window.selecionarPendente(el.dataset.item);
        });
      });
    }
  } else {
    painelPendentes.classList.add("hidden");
  }
};

window.selecionarPendente = (nomeItem) => {
  document.getElementById("input-nome").value = nomeItem;

  /*
   * O produto entra na unidade em que ele costuma ser comprado. Não é
   * só conforto: gravar tomate em "un" tendo histórico em "kg" mistura
   * duas grandezas e estraga a comparação de preço da próxima vez.
   */
  definirUnidade(unidadeHabitual(nomeItem) || "un");

  const campoQtd = document.getElementById("input-qtd");
  if (unidadeAtual === "kg") {
    // em quilo o peso é sempre da balança; nenhum padrão serve
    campoQtd.value = "";
    campoQtd.focus();
  } else {
    campoQtd.value = 1;
    document.getElementById("input-preco").focus();
  }

  const dica = dicaDePreco(nomeItem);
  if (dica) mostrarNotificacao(dica, "neutro", "info");
};

const mostrarNotificacao = (msg, tipo, icone = "info") => {
  const container = document.getElementById("container-notificacoes");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span class="material-icons">${escapeHtml(icone)}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// --- INTELIGÊNCIA DE COMPRAS ---
/*
 * Tudo daqui para baixo parte de uma regra só: comparar preço é comparar
 * preço POR UNIDADE, nunca o total gasto. Duas compras do mesmo produto
 * quase nunca levam a mesma quantidade — dois pacotes num mês, cinco no
 * outro —, então o total de um mês contra o total do outro mede o tamanho
 * da compra, e não se ela saiu cara ou barata.
 *
 * A referência de cada produto é a média das últimas compras PONDERADA
 * pela quantidade (soma dos valores ÷ soma das quantidades): quem levou 5
 * pacotes a R$ 10 e 1 pacote a R$ 20 pagou, na média, R$ 11,67 o pacote —
 * e não R$ 15, que é o que a média simples diria.
 *
 * Preço de peça e preço de quilo nunca se misturam: são grandezas
 * diferentes, e por isso a unidade entra na chave do índice.
 */

const MAX_COMPRAS_REFERENCIA = 3; // até 3 compras recentes formam a referência
const DIA_MS = 86400000;

let historicoCompras = []; // { id, data, total, itens } — a mais nova primeiro
let historicoProdutos = new Map(); // chave -> { nome, unidade, compras: [...] }

const normalizarNome = (nome) =>
  String(nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const unidadeDe = (item) => (item?.unidade === "kg" ? "kg" : "un");
const chaveProduto = (nome, unidade) => `${normalizarNome(nome)}|${unidade}`;
const moeda = (valor) => (Number(valor) || 0).toFixed(2).replace(".", ",");
const porUnidade = (unidade) => (unidade === "kg" ? "/kg" : "");

// Compra antiga pode não ter `total` gravado; a conta refaz o que falta
const valorDoItem = (item) => {
  const total = Number(item?.total);
  if (Number.isFinite(total) && total > 0) return total;
  return (Number(item?.qtd) || 0) * (Number(item?.preco) || 0);
};

const precoDoItem = (item) => {
  const preco = Number(item?.preco);
  if (Number.isFinite(preco) && preco > 0) return preco;
  const qtd = Number(item?.qtd) || 0;
  return qtd > 0 ? valorDoItem(item) / qtd : 0;
};

const mediana = (numeros) => {
  if (!numeros.length) return 0;
  const ordenados = [...numeros].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2
    ? ordenados[meio]
    : (ordenados[meio - 1] + ordenados[meio]) / 2;
};

const dataCurta = (data) =>
  data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

/*
 * Monta o índice por produto a partir das compras já fechadas.
 *
 * O mesmo produto pode aparecer duas vezes numa compra só (dois pacotes
 * cobrados por preços diferentes). Dentro da compra as linhas viram uma:
 * senão a mesma ida ao mercado pesaria em dobro na média.
 */
const indexarHistorico = (compras) => {
  historicoCompras = compras;
  historicoProdutos = new Map();

  compras.forEach((compra) => {
    const daCompra = new Map();

    (compra.itens || []).forEach((item) => {
      const qtd = Number(item?.qtd) || 0;
      const valor = valorDoItem(item);
      if (qtd <= 0 || valor <= 0) return;

      const unidade = unidadeDe(item);
      const chave = chaveProduto(item.nome, unidade);
      const linha = daCompra.get(chave) || {
        nome: item.nome,
        unidade,
        qtd: 0,
        valor: 0,
      };
      linha.qtd += qtd;
      linha.valor += valor;
      daCompra.set(chave, linha);
    });

    daCompra.forEach((linha, chave) => {
      let produto = historicoProdutos.get(chave);
      if (!produto) {
        // a primeira a chegar é a compra mais recente: é dela o nome que fica
        produto = { nome: linha.nome, unidade: linha.unidade, compras: [] };
        historicoProdutos.set(chave, produto);
      }
      produto.compras.push({
        data: compra.data,
        qtd: linha.qtd,
        valor: linha.valor,
        preco: linha.valor / linha.qtd,
      });
    });
  });
};

/*
 * Preço médio por unidade das últimas compras do produto, ponderado pela
 * quantidade. `ate` corta o histórico numa data — é o que permite julgar
 * uma compra usando só o que já se sabia antes dela.
 */
const precoDeReferencia = (
  nome,
  unidade,
  { ate = null, limite = MAX_COMPRAS_REFERENCIA } = {},
) => {
  const produto = historicoProdutos.get(chaveProduto(nome, unidade));
  if (!produto) return null;

  const compras = (
    ate ? produto.compras.filter((c) => c.data < ate) : produto.compras
  ).slice(0, limite);
  if (!compras.length) return null;

  const qtd = compras.reduce((soma, c) => soma + c.qtd, 0);
  const valor = compras.reduce((soma, c) => soma + c.valor, 0);
  if (qtd <= 0) return null;

  return {
    preco: valor / qtd,
    qtd,
    compras: compras.length,
    ultima: compras[0].data,
  };
};

// Em que unidade esse produto costuma ser comprado (a mais recente vence)
const unidadeHabitual = (nome) => {
  const un = historicoProdutos.get(chaveProduto(nome, "un"));
  const kg = historicoProdutos.get(chaveProduto(nome, "kg"));
  if (un && kg) return kg.compras[0].data > un.compras[0].data ? "kg" : "un";
  if (kg) return "kg";
  if (un) return "un";
  return null;
};

const dicaDePreco = (nome) => {
  const unidade = unidadeHabitual(nome);
  const ref = unidade ? precoDeReferencia(nome, unidade) : null;
  if (ref) {
    return ref.compras > 1
      ? `Costuma sair a R$ ${moeda(ref.preco)}${porUnidade(unidade)}`
      : `Última vez: R$ ${moeda(ref.preco)}${porUnidade(unidade)}`;
  }
  // Sem compra fechada ainda: sobra o preço visto na compra em andamento
  const chave = Object.keys(ultimosPrecos).find(
    (k) => normalizarNome(k) === normalizarNome(nome),
  );
  return chave ? `Última vez: R$ ${moeda(ultimosPrecos[chave])}` : null;
};

// Abaixo dos dois limiares é oscilação de rotina, não vale um aviso
const LIMIAR_REAIS = 0.05;
const LIMIAR_PERCENTUAL = 0.03;

const verificarHistoricoPreco = (nome, precoAtual, unidade = "un") => {
  if (!precoAtual) return;

  const ref = precoDeReferencia(nome, unidade);
  if (!ref) return;

  const diferenca = precoAtual - ref.preco;
  const fracao = Math.abs(diferenca) / ref.preco;
  if (Math.abs(diferenca) < LIMIAR_REAIS || fracao < LIMIAR_PERCENTUAL) return;

  const base = `média de R$ ${moeda(ref.preco)}${porUnidade(unidade)} em ${ref.compras} ${
    ref.compras === 1 ? "compra" : "compras"
  }`;
  const porCento = Math.round(fracao * 100);

  if (diferenca > 0) {
    mostrarNotificacao(
      `${porCento}% mais caro que a ${base}`,
      "negativo",
      "trending_up",
    );
  } else {
    mostrarNotificacao(
      `${porCento}% mais barato que a ${base}`,
      "positivo",
      "trending_down",
    );
  }
};

/*
 * Quanto a compra rendeu contra o preço de costume, item a item:
 * (preço de referência − preço pago) × quantidade. Multiplicar pela
 * quantidade é o que faz cinco pacotes um real mais baratos valerem mais
 * do que um pacote um real mais caro.
 */
const economiaDaCompra = (compra) => {
  let economia = 0;
  let itensComparados = 0;
  if (!compra) return { economia, itensComparados };

  (compra.itens || []).forEach((item) => {
    const qtd = Number(item?.qtd) || 0;
    if (qtd <= 0) return;
    const ref = precoDeReferencia(item.nome, unidadeDe(item), {
      ate: compra.data,
    });
    if (!ref) return;
    economia += (ref.preco - precoDoItem(item)) * qtd;
    itensComparados++;
  });

  return { economia, itensComparados };
};

const rankingDeGastos = (compras, limite = 5) => {
  const porProduto = new Map();

  compras.forEach((compra) => {
    (compra.itens || []).forEach((item) => {
      const valor = valorDoItem(item);
      if (valor <= 0) return;
      const chave = normalizarNome(item.nome);
      const reg = porProduto.get(chave) || {
        nome: item.nome,
        valor: 0,
        qtd: 0,
        unidades: new Set(),
        idas: new Set(),
      };
      reg.valor += valor;
      reg.qtd += Number(item?.qtd) || 0;
      reg.unidades.add(unidadeDe(item));
      reg.idas.add(compra.id);
      porProduto.set(chave, reg);
    });
  });

  return [...porProduto.values()]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
};

const detalheDoRanking = (reg) => {
  const idas = `${reg.idas.size} ${reg.idas.size === 1 ? "compra" : "compras"}`;
  if (reg.unidades.size !== 1) return idas;
  const unidade = [...reg.unidades][0];
  return `${formatarQtd(reg.qtd, unidade)} ${unidade} em ${idas}`;
};

// --- PAINEL DE ANÁLISE (tela inicial) ---

const JANELA_ANALISE = 5; // as últimas N compras entram na conta

const renderizarAnalise = () => {
  const secao = document.getElementById("secao-analise");
  const painel = document.getElementById("painel-analise");

  if (modoAnonimo || historicoCompras.length === 0) {
    secao.classList.add("hidden");
    painel.innerHTML = "";
    return;
  }

  const compras = historicoCompras.slice(0, JANELA_ANALISE);
  const total = compras.reduce((soma, c) => soma + c.total, 0);
  const media = total / compras.length;
  const itensPorCompra = Math.round(
    compras.reduce((soma, c) => soma + (c.itens || []).length, 0) /
      compras.length,
  );
  const periodo =
    compras.length > 1
      ? `de ${dataCurta(compras[compras.length - 1].data)} a ${dataCurta(compras[0].data)}`
      : dataCurta(compras[0].data);

  const { economia, itensComparados } = economiaDaCompra(historicoCompras[0]);
  let economiaHtml;
  if (itensComparados === 0) {
    economiaHtml = `
      <div class="analise-economia">
        <span class="material-icons">insights</span>
        <div class="analise-economia-texto">
          <strong>Ainda sem produto repetido para comparar</strong>
          <small>quando você repetir um produto, eu comparo o preço por unidade</small>
        </div>
      </div>`;
  } else if (Math.abs(economia) < 0.5) {
    economiaHtml = `
      <div class="analise-economia">
        <span class="material-icons">check_circle</span>
        <div class="analise-economia-texto">
          <strong>Preços em linha com os de sempre</strong>
          <small>${itensComparados} ${itensComparados === 1 ? "item comparado" : "itens comparados"} pelo preço por unidade</small>
        </div>
      </div>`;
  } else {
    const economizou = economia > 0;
    economiaHtml = `
      <div class="analise-economia ${economizou ? "positiva" : "negativa"}">
        <span class="material-icons">${economizou ? "savings" : "trending_up"}</span>
        <div class="analise-economia-texto">
          <strong>${economizou ? `Economizou R$ ${moeda(economia)}` : `Pagou R$ ${moeda(-economia)} a mais`} na última compra</strong>
          <small>preço por unidade de ${itensComparados} ${itensComparados === 1 ? "item" : "itens"} contra o que você costuma pagar</small>
        </div>
      </div>`;
  }

  const ranking = rankingDeGastos(compras);
  const maior = ranking.length ? ranking[0].valor : 0;
  const rankingHtml = ranking
    .map((reg) => {
      const largura = maior > 0 ? Math.max(6, (reg.valor / maior) * 100) : 0;
      const fatia = total > 0 ? Math.round((reg.valor / total) * 100) : 0;
      return `
        <div class="barra-produto">
          <div class="barra-topo">
            <span class="barra-nome">${escapeHtml(reg.nome)}</span>
            <strong class="barra-valor">R$ ${moeda(reg.valor)}</strong>
          </div>
          <div class="barra-trilho">
            <div class="barra-cheia" style="width:${largura.toFixed(1)}%"></div>
          </div>
          <small class="barra-detalhe">${escapeHtml(detalheDoRanking(reg))} · ${fatia}% do período</small>
        </div>`;
    })
    .join("");

  secao.classList.remove("hidden");
  painel.innerHTML = `
    <div class="analise-destaques">
      <div class="analise-stat">
        <span class="analise-rotulo">${compras.length === 1 ? "Última compra" : `Últimas ${compras.length} compras`}</span>
        <strong class="analise-valor">R$ ${moeda(total)}</strong>
        <small>${escapeHtml(periodo)}</small>
      </div>
      <div class="analise-stat">
        <span class="analise-rotulo">Média por compra</span>
        <strong class="analise-valor">R$ ${moeda(media)}</strong>
        <small>${itensPorCompra} ${itensPorCompra === 1 ? "item" : "itens"} por vez</small>
      </div>
    </div>
    ${economiaHtml}
    ${ranking.length ? `<div class="analise-titulo">Onde foi o dinheiro</div>${rankingHtml}` : ""}`;
};

// --- SUGESTÕES DE RECOMPRA (tela de lista) ---

/*
 * Cada produto tem um ritmo: sabão em pó a cada dois meses, leite toda
 * semana. O intervalo entre as compras anteriores dá esse ritmo (mediana,
 * para uma ida atípica não desmontar a conta) e, quando o tempo desde a
 * última compra alcança o intervalo, o produto vira sugestão.
 *
 * Produto comprado uma vez só não tem ritmo: entra por um prazo padrão e
 * com prioridade menor, porque tanto pode ser rotina quanto ter sido
 * coisa de uma vez.
 */
const MAX_SUGESTOES = 6;
const INTERVALO_PADRAO_DIAS = 45;
const MATURIDADE_MINIMA = 0.8; // 80% do ritmo já conta como "está na hora"
const MATURIDADE_MAXIMA = 4; // muito além do ritmo: provavelmente largou

const calcularSugestoes = () => {
  if (historicoProdutos.size === 0) return [];

  const agora = Date.now();
  const jaTem = new Set([
    ...listaPrevia.map((p) => normalizarNome(p.nome)),
    ...carrinho.map((c) => normalizarNome(c.nome)),
  ]);

  // un e kg do mesmo produto são o mesmo item na hora de lembrar
  const porNome = new Map();
  historicoProdutos.forEach((produto) => {
    const chave = normalizarNome(produto.nome);
    const reg = porNome.get(chave) || { nome: produto.nome, datas: [] };
    produto.compras.forEach((c) => reg.datas.push(c.data.getTime()));
    porNome.set(chave, reg);
  });

  const sugestoes = [];
  porNome.forEach((reg, chave) => {
    if (jaTem.has(chave)) return;

    const datas = [...new Set(reg.datas)].sort((a, b) => b - a);
    const diasDesde = Math.max(0, Math.round((agora - datas[0]) / DIA_MS));

    if (datas.length >= 2) {
      const intervalos = [];
      for (let i = 0; i < datas.length - 1 && i < 6; i++) {
        intervalos.push((datas[i] - datas[i + 1]) / DIA_MS);
      }
      const ritmo = mediana(intervalos.filter((d) => d >= 1));
      if (!(ritmo > 0)) return;

      const maturidade = diasDesde / ritmo;
      if (maturidade < MATURIDADE_MINIMA || maturidade > MATURIDADE_MAXIMA) {
        return;
      }

      sugestoes.push({ nome: reg.nome, prioridade: 2, maturidade });
    } else {
      if (diasDesde < 30 || diasDesde > 120) return;
      sugestoes.push({
        nome: reg.nome,
        prioridade: 1,
        maturidade: diasDesde / INTERVALO_PADRAO_DIAS,
      });
    }
  });

  return sugestoes
    .sort((a, b) => b.prioridade - a.prioridade || b.maturidade - a.maturidade)
    .slice(0, MAX_SUGESTOES);
};

/*
 * Quanto essa lista deve custar, pelo que esses produtos custaram antes.
 *
 * Por produto: preço médio por unidade × quantidade de costume — que dá
 * no mesmo que o valor médio gasto naquele produto por ida ao mercado.
 * É a quantidade que faz a conta fechar: 12 litros de leite e 1 litro
 * têm o mesmo preço por litro e pesam muito diferente na compra.
 */
const gastoEsperadoDaLista = () => {
  let total = 0;
  let comHistorico = 0;

  listaPrevia.forEach((item) => {
    const unidade = unidadeHabitual(item.nome);
    const ref = unidade ? precoDeReferencia(item.nome, unidade) : null;
    if (!ref) return;
    total += ref.preco * (ref.qtd / ref.compras);
    comHistorico++;
  });

  return {
    total,
    comHistorico,
    semHistorico: listaPrevia.length - comHistorico,
  };
};

const renderizarEstimativa = () => {
  const painel = document.getElementById("painel-estimativa");
  const { total, comHistorico, semHistorico } = gastoEsperadoDaLista();

  // Sem nenhum item conhecido não há estimativa nenhuma a dar
  if (modoAnonimo || comHistorico === 0) {
    painel.classList.add("hidden");
    return;
  }

  painel.classList.remove("hidden");
  document.getElementById("estimativa-valor").textContent = moeda(total);
  document.getElementById("estimativa-detalhe").textContent =
    semHistorico === 0
      ? "pela média das suas últimas compras"
      : `${comHistorico} de ${comHistorico + semHistorico} itens com histórico · ${semHistorico} ainda sem preço conhecido`;
};

const renderizarSugestoes = () => {
  const secao = document.getElementById("secao-sugestoes");
  const painel = document.getElementById("painel-sugestoes");
  const sugestoes = modoAnonimo ? [] : calcularSugestoes();

  if (sugestoes.length === 0) {
    secao.classList.add("hidden");
    painel.innerHTML = "";
    return;
  }

  secao.classList.remove("hidden");
  painel.innerHTML = `
    <div class="sugestoes-lista">
      ${sugestoes
        .map(
          (s) => `
        <button type="button" class="chip-pendente chip-sugestao" data-nome="${escapeHtml(s.nome)}">
          ${escapeHtml(s.nome)}
        </button>`,
        )
        .join("")}
    </div>`;

  painel.querySelectorAll(".chip-sugestao").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nome = btn.dataset.nome;
      if (adicionarItemNaLista(nome)) {
        mostrarNotificacao(
          `${nome} entrou na lista`,
          "positivo",
          "playlist_add",
        );
      }
    });
  });
};

const adicionarItemNaLista = (nome) => {
  const item = String(nome || "").trim();
  if (!item) return false;

  const jaExiste = listaPrevia.some(
    (p) => normalizarNome(p.nome) === normalizarNome(item),
  );
  if (jaExiste) {
    mostrarNotificacao(`"${item}" já está na lista`, "negativo", "warning");
    return false;
  }

  listaPrevia.push({ id: gerarId(), nome: item });
  produtosConhecidos.add(item);
  salvarEstadoRemoto();
  renderizarListaPreviaEditor();
  return true;
};

const renderizarListaPreviaEditor = () => {
  const div = document.getElementById("lista-previa-itens");
  atualizarBadgesTabs();
  renderizarSugestoes();
  renderizarEstimativa();
  if (listaPrevia.length === 0) {
    div.innerHTML = `
      <div class="empty-state">
        <span class="material-icons empty-state-icon">list_alt</span>
        <p>Sua lista está vazia</p>
      </div>`;
    return;
  }
  div.innerHTML = listaPrevia
    .map(
      (item) => `
    <div class="item-lista">
      <div class="item-info">
        <div class="item-nome">${escapeHtml(item.nome)}</div>
      </div>
      <button class="btn-remove" data-id="${escapeHtml(item.id)}">
        <span class="material-icons">close</span>
      </button>
    </div>`,
    )
    .join("");
  div.querySelectorAll(".btn-remove[data-id]").forEach((btn) => {
    btn.addEventListener("click", () =>
      window.removerItemPrevia(btn.dataset.id),
    );
  });
};

// --- HISTÓRICO DE COMPRAS ---

const modalCupom = document.getElementById("modal-cupom");
let compraAberta = null;

const fecharCupom = () => {
  fecharModal(modalCupom);
  compraAberta = null;
};

const abrirCupom = (id, dados, dataFormatada) => {
  compraAberta = { id, dataFormatada };
  const itens = dados.itens || [];

  document.getElementById("cupom-data").textContent = dataFormatada;
  document.getElementById("conteudo-cupom").innerHTML = itens
    .map(
      (i) => `
      <div class="linha-cupom">
        <span>${escapeHtml(i.nome)} ${rotuloQtd(i)}</span>
        <span>R$ ${i.total.toFixed(2).replace(".", ",")}</span>
      </div>`,
    )
    .join("");
  document.getElementById("total-cupom").innerText =
    `TOTAL: R$ ${dados.total.toFixed(2).replace(".", ",")}`;

  abrirModal(modalCupom);
};

modalCupom.querySelector(".close-modal").addEventListener("click", fecharCupom);
modalCupom.addEventListener("click", (e) => {
  if (e.target === modalCupom) fecharCupom();
});

document
  .getElementById("btn-excluir-compra")
  .addEventListener("click", async () => {
    if (!compraAberta) return;
    const { id, dataFormatada } = compraAberta;

    // fecha o cupom antes de perguntar para não empilhar duas folhas
    fecharCupom();
    const confirmado = await confirmar(
      "Excluir esta compra?",
      `O registro de ${dataFormatada} será apagado para sempre. Essa ação não pode ser desfeita.`,
      "Excluir",
    );
    if (!confirmado) return;

    try {
      await deleteDoc(doc(db, "compras_finalizadas", id));
      mostrarNotificacao("Compra excluída", "positivo", "delete");
      await carregarHistorico();
    } catch (e) {
      mostrarNotificacao("Erro ao excluir: " + e.message, "negativo", "error");
    }
  });

const carregarHistorico = async () => {
  const histDiv = document.getElementById("lista-historico");

  // Visitante não tem histórico: a seção inteira fica escondida
  if (modoAnonimo || !grupoAtual) return;

  let snap;
  try {
    // Só o filtro por grupo na consulta; a ordenação é feita aqui embaixo para
    // não precisar de índice composto no Firestore.
    snap = await getDocs(
      query(
        collection(db, "compras_finalizadas"),
        where("grupoId", "==", grupoAtual.id),
      ),
    );
  } catch (e) {
    console.error("Erro ao carregar histórico:", e);
    histDiv.innerHTML = `
      <div class="empty-state">
        <span class="material-icons empty-state-icon">cloud_off</span>
        <p>Não foi possível carregar o histórico</p>
      </div>`;
    return;
  }

  const compras = snap.docs
    .filter((d) => d.data().data)
    .sort((a, b) => b.data().data.toMillis() - a.data().data.toMillis());

  // Fechado, o cabeçalho precisa dizer que tem algo ali dentro
  const badgeHistorico = document.getElementById("badge-historico");
  badgeHistorico.textContent = compras.length > 99 ? "99+" : compras.length;
  badgeHistorico.classList.toggle("hidden", compras.length === 0);

  // Índice de preços por produto: base da comparação e das sugestões
  indexarHistorico(
    compras.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        data: d.data.toDate(),
        total: Number(d.total) || 0,
        itens: d.itens || [],
      };
    }),
  );
  renderizarAnalise();
  renderizarSugestoes();
  renderizarEstimativa();

  if (compras.length === 0) {
    histDiv.innerHTML = `
      <div class="empty-state">
        <span class="material-icons empty-state-icon">receipt_long</span>
        <p>Nenhuma compra registrada ainda</p>
      </div>`;
    return;
  }

  histDiv.innerHTML = "";
  compras.forEach((docSnap) => {
    const d = docSnap.data();

    if (d.itens) {
      d.itens.forEach((i) => {
        produtosConhecidos.add(i.nome);
        if (!ultimosPrecos[i.nome]) ultimosPrecos[i.nome] = i.preco;
      });
    }

    const dataFormatada = d.data.toDate().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const qtdItens = (d.itens || []).length;

    const card = document.createElement("div");
    card.className = "historico-card";
    card.innerHTML = `
        <div class="historico-data">
          <span class="material-icons">event</span>
          <div class="historico-textos">
            <span>${escapeHtml(dataFormatada)}</span>
            <small>${qtdItens} ${qtdItens === 1 ? "item" : "itens"}</small>
          </div>
        </div>
        <div class="historico-fim">
          <div class="historico-total">R$ ${d.total.toFixed(2).replace(".", ",")}</div>
          <span class="material-icons historico-seta">chevron_right</span>
        </div>`;
    card.addEventListener("click", () =>
      abrirCupom(docSnap.id, d, dataFormatada),
    );
    histDiv.appendChild(card);
  });
};

// --- INICIALIZAÇÃO DO APP (só após login) ---

function iniciarApp() {
  if (appIniciado) return;
  appIniciado = true;

  // Autocomplete — Compras
  const inputNome = document.getElementById("input-nome");
  const listaSugestoes = document.getElementById("lista-sugestoes");
  const inputPreco = document.getElementById("input-preco");

  inputNome.addEventListener("input", (e) => {
    const termo = e.target.value.toLowerCase();
    listaSugestoes.innerHTML = "";
    if (termo.length < 1) {
      listaSugestoes.classList.add("hidden");
      return;
    }
    const sugestoes = Array.from(produtosConhecidos)
      .filter((p) => p.toLowerCase().includes(termo))
      .slice(0, 10);
    if (sugestoes.length > 0) {
      listaSugestoes.classList.remove("hidden");
      sugestoes.forEach((produto) => {
        const div = document.createElement("div");
        div.classList.add("item-sugestao");
        div.innerText = produto;
        div.onclick = () => {
          listaSugestoes.classList.add("hidden");
          window.selecionarPendente(produto);
        };
        listaSugestoes.appendChild(div);
      });
    } else {
      listaSugestoes.classList.add("hidden");
    }
  });

  // Autocomplete — Editor
  const inputItemLista = document.getElementById("input-item-lista");
  const listaSugestoesEditor = document.getElementById(
    "lista-sugestoes-editor",
  );

  inputItemLista.addEventListener("input", (e) => {
    const termo = e.target.value.toLowerCase();
    listaSugestoesEditor.innerHTML = "";
    if (termo.length < 1) {
      listaSugestoesEditor.classList.add("hidden");
      return;
    }
    const sugestoes = Array.from(produtosConhecidos)
      .filter((p) => p.toLowerCase().includes(termo))
      .slice(0, 10);
    if (sugestoes.length > 0) {
      listaSugestoesEditor.classList.remove("hidden");
      sugestoes.forEach((produto) => {
        const div = document.createElement("div");
        div.classList.add("item-sugestao");
        div.innerText = produto;
        div.onclick = () => {
          inputItemLista.value = produto;
          listaSugestoesEditor.classList.add("hidden");
          inputItemLista.focus();
        };
        listaSugestoesEditor.appendChild(div);
      });
    } else {
      listaSugestoesEditor.classList.add("hidden");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-group")) {
      listaSugestoes.classList.add("hidden");
      listaSugestoesEditor.classList.add("hidden");
    }
  });

  document.getElementById("busca-pendente").addEventListener("input", () => {
    atualizarListaPendenteVisual();
  });

  // Alterna peça/balança e leva o foco para o número, que é o que muda junto
  document.getElementById("btn-unidade").addEventListener("click", () => {
    definirUnidade(unidadeAtual === "kg" ? "un" : "kg");
    document.getElementById("input-qtd").focus();
    document.getElementById("input-qtd").select();
  });

  // Navegação
  document.getElementById("btn-logout").addEventListener("click", async () => {
    fecharConta();
    if (
      await confirmar("Sair da conta?", "Você precisará entrar de novo.", "Sair")
    ) {
      window.logout();
    }
  });

  document.getElementById("btn-criar-lista").addEventListener("click", () => {
    mostrarTela("tela-editor-lista");
    renderizarListaPreviaEditor();
  });

  document.getElementById("btn-salvar-lista").addEventListener("click", () => {
    salvarEstadoRemoto();
    mostrarTela("tela-inicial");
    if (listaPrevia.length > 0) {
      mostrarNotificacao(
        `Lista salva com ${listaPrevia.length} itens`,
        "positivo",
        "check_circle",
      );
    }
  });

  document
    .getElementById("btn-add-item-lista")
    .addEventListener("click", () => {
      if (!adicionarItemNaLista(inputItemLista.value)) return;
      inputItemLista.value = "";
      listaSugestoesEditor.classList.add("hidden");
      inputItemLista.focus();
    });

  inputItemLista.addEventListener("keypress", (e) => {
    if (e.key === "Enter")
      document.getElementById("btn-add-item-lista").click();
  });

  window.removerItemPrevia = (id) => {
    listaPrevia = listaPrevia.filter((p) => p.id !== id);
    salvarEstadoRemoto();
    renderizarListaPreviaEditor();
  };

  document.getElementById("btn-iniciar").addEventListener("click", () => {
    const valorInput = parseFloat(
      document.getElementById("orcamento-inicial").value,
    );
    if (!isNaN(valorInput) && valorInput >= 0) orcamento = valorInput;
    salvarEstadoRemoto();
    mostrarTela("tela-compras");
    atualizarUI();
  });

  document.getElementById("btn-adicionar").addEventListener("click", () => {
    const nome = document.getElementById("input-nome").value.trim();
    const qtd = parseFloat(document.getElementById("input-qtd").value) || 1;
    const preco = parseFloat(document.getElementById("input-preco").value);

    if (nome && preco) {
      verificarHistoricoPreco(nome, preco, unidadeAtual);
      carrinho.push({
        id: gerarId(),
        nome,
        qtd,
        preco,
        // arredondado no centavo: 0,75 kg × 12,90 dá 9,674999... em ponto flutuante
        total: Math.round(qtd * preco * 100) / 100,
        unidade: unidadeAtual,
      });
      produtosConhecidos.add(nome);
      ultimosPrecos[nome] = preco;
      salvarEstadoRemoto();
      document.getElementById("input-nome").value = "";
      document.getElementById("input-preco").value = "";
      document.getElementById("input-qtd").value = 1;
      // volta para peças junto com os outros campos, para o próximo item
      // não ser gravado em quilo sem querer
      definirUnidade("un");
      document.getElementById("input-nome").focus();
      atualizarUI();
      mostrarNotificacao(
        `${nome} adicionado ao carrinho`,
        "positivo",
        "check_circle",
      );
    } else {
      mostrarNotificacao(
        "Preencha o nome e o preço do produto",
        "negativo",
        "warning",
      );
    }
  });

  inputPreco.addEventListener("keypress", (e) => {
    if (e.key === "Enter") document.getElementById("btn-adicionar").click();
  });

  document
    .getElementById("btn-finalizar")
    .addEventListener("click", async () => {
      if (carrinho.length === 0) {
        mostrarNotificacao("Carrinho vazio", "negativo", "warning");
        return;
      }
      const total = carrinho.reduce((sum, item) => sum + item.total, 0);
      const resumo = `${carrinho.length} ${carrinho.length === 1 ? "item" : "itens"} · Total de R$ ${total
        .toFixed(2)
        .replace(".", ",")}`;

      // Visitante: nada é gravado, só se encerra a compra deste aparelho
      if (modoAnonimo) {
        const encerrar = await confirmar(
          "Encerrar a compra?",
          `${resumo}. No modo visitante ela não é salva e não entra em nenhum histórico.`,
          "Encerrar",
        );
        if (!encerrar) return;

        await limparEstadoRemoto();
        mostrarNotificacao(
          "Compra encerrada — nada foi salvo",
          "positivo",
          "check_circle",
        );
        setTimeout(() => location.reload(), 1500);
        return;
      }

      const confirmado = await confirmar(
        "Finalizar compra?",
        resumo,
        "Finalizar",
      );
      if (!confirmado) return;

      try {
        await addDoc(collection(db, "compras_finalizadas"), {
          data: Timestamp.now(),
          total,
          itens: carrinho,
          grupoId: grupoAtual?.id || null,
          finalizadaPor: usuarioAtual?.displayName || usuarioAtual?.email || "",
        });
        mostrarNotificacao(
          "Compra finalizada com sucesso!",
          "positivo",
          "check_circle",
        );
        await limparEstadoRemoto();
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        mostrarNotificacao(
          "Erro ao finalizar: " + e.message,
          "negativo",
          "error",
        );
      }
    });

  document
    .getElementById("btn-cancelar")
    .addEventListener("click", async () => {
      const confirmado = await confirmar(
        "Cancelar tudo?",
        "O carrinho e a lista atual serão apagados.",
        "Cancelar tudo",
      );
      if (confirmado) {
        await limparEstadoRemoto();
        location.reload();
      }
    });

  // Atalhos do manifest (ex.: ./?tela=lista)
  const atalho = new URLSearchParams(location.search).get("tela");
  if (atalho === "lista") mostrarTela("tela-editor-lista");
  else if (atalho === "compras") mostrarTela("tela-compras");

  // Histórico + sincronização
  iniciarSincronizacao();
  carregarHistorico();
}
