import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- AUTENTICAÇÃO ---

const isPWA =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

window.loginGoogle = async function () {
  try {
    if (isPWA) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (error) {
    alert("Erro ao entrar: " + error.message);
  }
};

window.logout = async function () {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Erro ao sair: " + error.message);
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
  console.log("atualizarUIAuth chamado, user:", user);
  const areaLogin = document.getElementById("area-login");
  const appEl = document.getElementById("app");
  const userNome = document.getElementById("user-nome");
  const userFoto = document.getElementById("user-foto");
  const loadingEl = document.getElementById("area-loading");

  // Esconde o loading sempre que o estado for resolvido
  if (loadingEl) loadingEl.style.display = "none";

  if (user) {
    console.log("Usuário logado:", user.displayName);
    areaLogin.style.display = "none";
    appEl.classList.remove("hidden");
    appEl.style.setProperty("display", "block", "important");
    console.log("app hidden?", appEl.classList.contains("hidden"));

    userNome.textContent = user.displayName || user.email;
    if (user.photoURL) {
      userFoto.src = user.photoURL;
      userFoto.style.display = "block";
    }

    iniciarApp();
  } else {
    console.log("Sem usuário — mostrando login");
    areaLogin.style.display = "block";
    appEl.style.setProperty("display", "none", "important");
  }
}

// Listener de autenticação — ponto de entrada do app
onAuthStateChanged(auth, async (user) => {
  // No PWA, captura o resultado do redirect após voltar do Google
  if (isPWA) {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        await salvarUsuarioFirestore(result.user);
      }
    } catch (e) {
      console.error("Erro no redirect result:", e);
    }
  }

  if (user) {
    await salvarUsuarioFirestore(user);
  }
  atualizarUIAuth(user);
});

// --- CONFIGURAÇÃO DA LISTA COMPARTILHADA ---
const ID_LISTA_COMPARTILHADA = "sessao_familiar_unica";
const docRef = doc(db, "lista_ativa", ID_LISTA_COMPARTILHADA);
const docRefHistoricoPrecos = doc(db, "historico_precos", "dados_familia");

// --- ESTADO ---
let carrinho = [];
let listaPrevia = [];
let orcamento = 0;
let ultimosPrecos = {};
let historicoPrecos = {}; // { "Arroz": [{ preco: 10.5, data: timestamp }, ...] }
let isUpdatingFromSnapshot = false;
let appIniciado = false;

// --- PERSISTÊNCIA REMOTA ---

const salvarEstadoRemoto = async () => {
  if (isUpdatingFromSnapshot) return;
  const estado = {
    carrinho,
    listaPrevia,
    orcamento,
    timestamp: Date.now(),
  };
  try {
    await setDoc(docRef, estado);
  } catch (e) {
    console.error("Erro ao sincronizar:", e);
    mostrarNotificacao("Erro de conexão ao salvar", "negativo", "wifi_off");
  }
};

// Salvar histórico de preços no Firestore
const salvarHistoricoPrecos = async () => {
  try {
    await setDoc(docRefHistoricoPrecos, {
      precos: historicoPrecos,
      ultimaAtualizacao: Timestamp.now(),
    });
  } catch (e) {
    console.error("Erro ao salvar histórico de preços:", e);
  }
};

// Carregar histórico de preços do Firestore
const carregarHistoricoPrecos = async () => {
  try {
    const docSnap = await getDoc(docRefHistoricoPrecos);
    if (docSnap.exists()) {
      historicoPrecos = docSnap.data().precos || {};
      console.log("Histórico de preços carregado:", historicoPrecos);
    }
  } catch (e) {
    console.error("Erro ao carregar histórico de preços:", e);
  }
};

// Adicionar preço ao histórico
const adicionarPrecoHistorico = async (nomeProduto, preco) => {
  if (!nomeProduto || !preco) return;

  if (!historicoPrecos[nomeProduto]) {
    historicoPrecos[nomeProduto] = [];
  }

  // Adiciona o novo preço com timestamp
  historicoPrecos[nomeProduto].push({
    preco: preco,
    data: Date.now(),
  });

  // Mantém apenas os últimos 50 registros por produto
  if (historicoPrecos[nomeProduto].length > 50) {
    historicoPrecos[nomeProduto] = historicoPrecos[nomeProduto].slice(-50);
  }

  await salvarHistoricoPrecos();
};

// Calcular estatísticas de preço
const calcularEstatisticasPreco = (nomeProduto) => {
  const historico = historicoPrecos[nomeProduto];
  if (!historico || historico.length === 0) return null;

  const precos = historico.map((h) => h.preco);
  const precoMinimo = Math.min(...precos);
  const precoMaximo = Math.max(...precos);
  const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length;
  const ultimoPreco = precos[precos.length - 1];

  return {
    minimo: precoMinimo,
    maximo: precoMaximo,
    medio: precoMedio,
    ultimo: ultimoPreco,
    totalRegistros: precos.length,
  };
};

const iniciarSincronizacao = () => {
  onSnapshot(docRef, (docSnap) => {
    isUpdatingFromSnapshot = true;

    if (docSnap.exists()) {
      const estado = docSnap.data();
      carrinho = estado.carrinho || [];
      listaPrevia = estado.listaPrevia || [];
      orcamento = estado.orcamento || 0;

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
  try {
    await deleteDoc(docRef);
    carrinho = [];
    orcamento = 0;
    listaPrevia = [];
  } catch (e) {
    console.error("Erro ao limpar:", e);
  }
};

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

window.removerItem = (index) => {
  carrinho.splice(index, 1);
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
        (item, i) => `
      <div class="item-lista">
        <div class="item-info">
          <div class="item-nome">${item.nome}</div>
          <div class="item-detalhes">${item.qtd}x R$ ${item.preco.toFixed(2).replace(".", ",")}</div>
        </div>
        <div class="item-total">R$ ${item.total.toFixed(2).replace(".", ",")}</div>
        <button class="btn-remove" onclick="removerItem(${i})">
          <span class="material-icons">close</span>
        </button>
      </div>`,
      )
      .reverse()
      .join("");
  }

  atualizarListaPendenteVisual();
};

const atualizarListaPendenteVisual = () => {
  const divPendentes = document.getElementById("area-pendentes");
  const painelPendentes = document.getElementById("painel-lista-pendente");
  const badgePendentes = document.getElementById("badge-pendentes");
  const termoBusca = document
    .getElementById("busca-pendente")
    .value.toLowerCase();

  let pendentes = listaPrevia.filter(
    (p) => !carrinho.some((c) => c.nome.toLowerCase() === p.toLowerCase()),
  );
  const totalPendentes = pendentes.length;

  if (termoBusca) {
    pendentes = pendentes.filter((p) => p.toLowerCase().includes(termoBusca));
  }

  // Ordenar alfabeticamente (A-Z)
  pendentes.sort((a, b) =>
    a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
  );

  if (totalPendentes > 0) {
    painelPendentes.classList.remove("hidden");
    badgePendentes.innerText = totalPendentes;

    if (pendentes.length === 0 && termoBusca) {
      divPendentes.innerHTML =
        '<p class="text-center text-muted" style="margin-top:12px;font-size:0.875rem;">Nenhum item encontrado</p>';
    } else {
      divPendentes.innerHTML = pendentes
        .map(
          (item) => `
          <span class="chip-pendente" onclick="selecionarPendente('${item.replace(/'/g, "\\'")}')">
            ${item}
          </span>`,
        )
        .join("");
    }
  } else {
    painelPendentes.classList.add("hidden");
  }
};

window.selecionarPendente = (nomeItem) => {
  document.getElementById("input-nome").value = nomeItem;
  document.getElementById("input-qtd").value = 1;
  document.getElementById("input-preco").focus();

  // Mostrar estatísticas de preço
  const stats = calcularEstatisticasPreco(nomeItem);
  if (stats) {
    mostrarNotificacao(
      `💰 Último: R$ ${stats.ultimo.toFixed(2)} | Mín: R$ ${stats.minimo.toFixed(2)} | Máx: R$ ${stats.maximo.toFixed(2)}`,
      "neutro",
      "analytics",
    );
  }
};

const mostrarNotificacao = (msg, tipo, icone = "info") => {
  const container = document.getElementById("container-notificacoes");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span class="material-icons">${icone}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

const verificarHistoricoPreco = (nome, precoAtual) => {
  if (!precoAtual) return;

  const stats = calcularEstatisticasPreco(nome);
  if (!stats) return;

  const diff = precoAtual - stats.ultimo;
  const diffMinimo = precoAtual - stats.minimo;
  const diffMaximo = precoAtual - stats.maximo;

  // Comparação com o último preço
  if (diff > 0.05) {
    const percentual = ((diff / stats.ultimo) * 100).toFixed(1);
    mostrarNotificacao(
      `📈 Mais caro! Última vez: R$ ${stats.ultimo.toFixed(2)} (+${percentual}%)`,
      "negativo",
      "trending_up",
    );
  } else if (diff < -0.05) {
    const percentual = ((Math.abs(diff) / stats.ultimo) * 100).toFixed(1);
    mostrarNotificacao(
      `📉 Mais barato! Última vez: R$ ${stats.ultimo.toFixed(2)} (-${percentual}%)`,
      "positivo",
      "trending_down",
    );
  }

  // Comparação com melhor preço histórico
  if (diffMinimo < -0.01) {
    mostrarNotificacao(
      `🏆 MELHOR PREÇO! Anterior: R$ ${stats.minimo.toFixed(2)}`,
      "positivo",
      "emoji_events",
    );
  } else if (precoAtual > stats.medio + 0.5) {
    mostrarNotificacao(
      `⚠️ Acima da média! Média histórica: R$ ${stats.medio.toFixed(2)}`,
      "negativo",
      "warning",
    );
  } else if (precoAtual < stats.medio - 0.5) {
    mostrarNotificacao(
      `✅ Abaixo da média! Média: R$ ${stats.medio.toFixed(2)}`,
      "positivo",
      "check_circle",
    );
  }
};

const renderizarListaPreviaEditor = () => {
  const div = document.getElementById("lista-previa-itens");
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
      (item, i) => `
    <div class="item-lista">
      <div class="item-info">
        <div class="item-nome">${item}</div>
      </div>
      <button class="btn-remove" onclick="removerItemPrevia(${i})">
        <span class="material-icons">close</span>
      </button>
    </div>`,
    )
    .join("");
};

// --- INICIALIZAÇÃO DO APP (só após login) ---

function iniciarApp() {
  if (appIniciado) return;
  appIniciado = true;

  // Carregar histórico de preços
  carregarHistoricoPrecos();

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
          inputNome.value = produto;
          listaSugestoes.classList.add("hidden");
          inputPreco.focus();

          // Mostrar estatísticas ao selecionar
          const stats = calcularEstatisticasPreco(produto);
          if (stats) {
            mostrarNotificacao(
              `💰 Último: R$ ${stats.ultimo.toFixed(2)} | Mín: R$ ${stats.minimo.toFixed(2)} | Máx: R$ ${stats.maximo.toFixed(2)}`,
              "neutro",
              "analytics",
            );
          }
        };
        listaSugestoes.appendChild(div);
      });
    } else {
      listaSugestoes.classList.add("hidden");
    }
  });

  // Verificar preço quando digitar
  inputPreco.addEventListener("input", (e) => {
    const nome = inputNome.value.trim();
    const preco = parseFloat(e.target.value);
    if (nome && preco) {
      verificarHistoricoPreco(nome, preco);
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

  // Navegação
  document.getElementById("btn-criar-lista").addEventListener("click", () => {
    document.getElementById("tela-inicial").classList.add("hidden");
    document.getElementById("tela-editor-lista").classList.remove("hidden");
    renderizarListaPreviaEditor();
  });

  document.getElementById("btn-salvar-lista").addEventListener("click", () => {
    salvarEstadoRemoto();
    document.getElementById("tela-editor-lista").classList.add("hidden");
    document.getElementById("tela-inicial").classList.remove("hidden");
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
      const item = inputItemLista.value.trim();
      if (item) {
        listaPrevia.push(item);
        produtosConhecidos.add(item);
        salvarEstadoRemoto();
        inputItemLista.value = "";
        inputItemLista.focus();
        renderizarListaPreviaEditor();
      }
    });

  inputItemLista.addEventListener("keypress", (e) => {
    if (e.key === "Enter")
      document.getElementById("btn-add-item-lista").click();
  });

  window.removerItemPrevia = (idx) => {
    listaPrevia.splice(idx, 1);
    salvarEstadoRemoto();
    renderizarListaPreviaEditor();
  };

  document.getElementById("btn-iniciar").addEventListener("click", () => {
    const valorInput = parseFloat(
      document.getElementById("orcamento-inicial").value,
    );
    if (valorInput) orcamento = valorInput;
    salvarEstadoRemoto();
    document.getElementById("tela-inicial").classList.add("hidden");
    document.getElementById("tela-compras").classList.remove("hidden");
    atualizarUI();
  });

  document
    .getElementById("btn-adicionar")
    .addEventListener("click", async () => {
      const nome = document.getElementById("input-nome").value.trim();
      const qtd = parseFloat(document.getElementById("input-qtd").value) || 1;
      const preco = parseFloat(document.getElementById("input-preco").value);

      if (nome && preco) {
        carrinho.push({ nome, qtd, preco, total: qtd * preco });
        produtosConhecidos.add(nome);

        // Adicionar ao histórico de preços
        await adicionarPrecoHistorico(nome, preco);

        ultimosPrecos[nome] = preco;
        salvarEstadoRemoto();
        document.getElementById("input-nome").value = "";
        document.getElementById("input-preco").value = "";
        document.getElementById("input-qtd").value = 1;
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
      if (!confirm("Deseja finalizar a compra?")) return;

      const total = carrinho.reduce((sum, item) => sum + item.total, 0);
      try {
        // Salvar compra finalizada
        await addDoc(collection(db, "compras_finalizadas"), {
          data: Timestamp.now(),
          total,
          itens: carrinho,
        });

        // Adicionar todos os preços ao histórico
        for (const item of carrinho) {
          await adicionarPrecoHistorico(item.nome, item.preco);
        }

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
      if (confirm("Tem certeza que deseja cancelar tudo?")) {
        await limparEstadoRemoto();
        location.reload();
      }
    });

  // Modal
  const modal = document.getElementById("modal-cupom");
  window.abrirModal = (itens, total) => {
    document.getElementById("conteudo-cupom").innerHTML = itens
      .map(
        (i) => `
      <div class="linha-cupom">
        <span>${i.nome} ${i.qtd}x</span>
        <span>R$ ${i.total.toFixed(2).replace(".", ",")}</span>
      </div>`,
      )
      .join("");
    document.getElementById("total-cupom").innerText =
      `TOTAL: R$ ${total.toFixed(2).replace(".", ",")}`;
    modal.classList.remove("hidden");
  };
  document.querySelector(".close-modal").onclick = () =>
    modal.classList.add("hidden");
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  // Histórico + sincronização
  iniciarSincronizacao();

  (async () => {
    const q = query(
      collection(db, "compras_finalizadas"),
      orderBy("data", "desc"),
    );
    const snap = await getDocs(q);
    const histDiv = document.getElementById("lista-historico");

    if (snap.empty) {
      histDiv.innerHTML = `
        <div class="empty-state">
          <span class="material-icons empty-state-icon">receipt_long</span>
          <p>Nenhuma compra registrada ainda</p>
        </div>`;
    } else {
      histDiv.innerHTML = "";
      snap.forEach((docSnap) => {
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
        histDiv.innerHTML += `
          <div class="historico-card" onclick='abrirModal(${JSON.stringify(d.itens)}, ${d.total})'>
            <div class="historico-data">
              <span class="material-icons">event</span>
              <span>${dataFormatada}</span>
            </div>
            <div class="historico-total">R$ ${d.total.toFixed(2).replace(".", ",")}</div>
          </div>`;
      });
    }
  })();
}
