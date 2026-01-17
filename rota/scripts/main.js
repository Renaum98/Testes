import { state } from "./state.js";
import { mostrarNotificacao, baixarRelatorioCSV } from "./utils.js";
import {
  abrirModalRegistrarRota,
  fecharModal,
  mudarPagina,
  atualizarListaRotas,
  atualizarPaginaFinanceiro,
  atualizarPerfilUsuario,
} from "./ui.js";
import { carregarDados, carregarDadosLocal } from "./storage.js";
import { salvarNovaRota, excluirRota } from "./routes.js";

// ============================================
// INICIALIZAÇÃO DO APLICATIVO
// ============================================
function inicializarApp() {
  console.log("Inicializando aplicação...");

  if (window.location.pathname.includes("index.html")) {
    return;
  }

  // Verificar Firebase
  if (!window.firebaseDb || !window.firebaseDb.db) {
    console.error("Firebase não configurado corretamente");
    mostrarNotificacao(
      "Firebase não configurado. Usando modo offline.",
      "warning",
    );
    inicializarModoOffline();
    return;
  }

  // Configurar db global
  state.db = window.firebaseDb;

  console.log("Firebase configurado, inicializando...");

  configurarEventListeners();
  carregarDados();

  // REMOVIDO: Cronômetro (setInterval) não é mais necessário

  console.log("Aplicação inicializada com sucesso");
}

function inicializarModoOffline() {
  console.log("Iniciando modo offline...");
  configurarEventListeners();
  carregarDadosLocal();
}

// ============================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================
function configurarEventListeners() {
  console.log("Configurando event listeners...");

  // ============================================
  // CONFIGURAÇÃO DO PREÇO DA GASOLINA
  // ============================================
  const inputGasolina = document.getElementById("inputPrecoGasolina");

  if (inputGasolina) {
    // 1. Carregar valor salvo (ou usar padrão do state)
    const precoSalvo = localStorage.getItem("precoGasolina");
    if (precoSalvo) {
      state.precoGasolina = parseFloat(precoSalvo);
    }
    inputGasolina.value = state.precoGasolina.toFixed(2);

    // 2. Salvar ao alterar (Evento 'change' ocorre ao sair do campo ou dar enter)
    inputGasolina.addEventListener("change", (e) => {
      let novoPreco = parseFloat(e.target.value);

      if (isNaN(novoPreco) || novoPreco <= 0) {
        mostrarNotificacao("Preço inválido!", "error");
        e.target.value = state.precoGasolina.toFixed(2); // Volta ao anterior
        return;
      }

      state.precoGasolina = novoPreco;
      localStorage.setItem("precoGasolina", novoPreco);
      mostrarNotificacao(
        `Gasolina atualizada: R$ ${novoPreco.toFixed(2)}`,
        "success",
      );
    });
  }
  // 1. Botão "Adicionar Nova Rota" (Abre Modal + Preenche Data)
  const btnRegistrar = document.getElementById("btnRegistrarRota");

  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", (e) => {
      // A. Chama a sua função original de abrir o modal
      // (Verificamos se ela existe antes para não quebrar)
      if (typeof abrirModalRegistrarRota === "function") {
        abrirModalRegistrarRota(e);
      } else {
        // Fallback de segurança: abre o modal na força bruta se a função falhar
        const modal = document.getElementById("modalRegistrarRota");
        if (modal) modal.style.display = "flex";
      }

      // B. Define a Data de Hoje no campo
      const inputData = document.getElementById("inputDataRota");
      if (inputData) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        inputData.value = `${ano}-${mes}-${dia}`;
      }
    });
  }

  // 2. Formulário de Salvar Rota
  // IMPORTANTE: O ID mudou no HTML para 'formRegistrarRota'
  const formRegistrar = document.getElementById("formRegistrarRota");
  if (formRegistrar) {
    formRegistrar.addEventListener("submit", salvarNovaRota);
  } else {
    // Fallback caso o HTML antigo ainda esteja em cache com ID antigo
    const formEncerrarAntigo = document.getElementById("formEncerrarRota");
    if (formEncerrarAntigo)
      formEncerrarAntigo.addEventListener("submit", salvarNovaRota);
  }

  // 3. Botão Cancelar no modal
  // IMPORTANTE: O ID mudou no HTML para 'btnCancelarRegistro'
  const btnCancelar = document.getElementById("btnCancelarRegistro");
  if (btnCancelar) {
    btnCancelar.addEventListener("click", () =>
      fecharModal("modalRegistrarRota"),
    );
  } else {
    // Fallback ID antigo
    const btnCancelarAntigo = document.getElementById("btnCancelarRota");
    if (btnCancelarAntigo)
      btnCancelarAntigo.addEventListener("click", () =>
        fecharModal("modalRegistrarRota"),
      );
  }

  // 4. Navegação
  document.querySelectorAll(".menu-item_link").forEach((link) => {
    const pagina = link.getAttribute("data-pagina");
    if (pagina) {
      link.addEventListener("click", (e) => {
        mudarPagina(e, pagina);

        // Atualizações específicas por página
        if (pagina === "financeiro") {
          atualizarPaginaFinanceiro();
        }
        if (pagina === "config") {
          atualizarPerfilUsuario();
        }
      });
    }
  });

  // 5. Fechar modais (Overlay e ESC)
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal.active")
        .forEach((modal) => modal.classList.remove("active"));
    }
  });

  // ============================================
  // FILTRO DE ROTAS (MÊS/ANO)
  // ============================================
  const filtroRotasInput = document.getElementById("filtroRotasMes");
  if (filtroRotasInput) {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, "0");

    // Define padrão e limites
    filtroRotasInput.value = `${anoAtual}-${mesAtual}`;
    filtroRotasInput.min = `${anoAtual - 1}-${mesAtual}`;
    filtroRotasInput.max = `${anoAtual + 1}-${mesAtual}`;

    // Listener para atualizar lista
    filtroRotasInput.addEventListener("change", () => {
      // Import dinâmico ou chamada direta se importado no topo
      atualizarListaRotas();
    });
  }

  // ============================================
  // EXPORTAR CSV (ABA ROTAS)
  // ============================================
  const btnExportar = document.getElementById("btnExportarCSV");

  if (btnExportar && filtroRotasInput) {
    btnExportar.addEventListener("click", () => {
      const mesSelecionado = filtroRotasInput.value;

      if (!mesSelecionado) {
        baixarRelatorioCSV();
        return;
      }

      // Filtrar rotas do mês selecionado
      const [anoFiltro, mesFiltro] = mesSelecionado.split("-");
      const rotasFiltradas = state.rotas.filter((rota) => {
        const dataRota = new Date(rota.horarioInicio);
        const anoRota = dataRota.getFullYear().toString();
        const mesRota = (dataRota.getMonth() + 1).toString().padStart(2, "0");
        return anoRota === anoFiltro && mesRota === mesFiltro;
      });

      baixarRelatorioCSV(rotasFiltradas);
    });
  }

  // ===========================================
  // CONFIGURAÇÃO DE LOGOUT
  // ===========================================
  const realizarLogout = () => {
    if (confirm("Tem certeza que deseja sair?")) {
      if (window.firebaseDb && window.firebaseDb.auth) {
        window.firebaseDb.auth
          .signOut()
          .then(() => {
            window.location.href = "index.html";
          })
          .catch(() => {
            mostrarNotificacao("Erro ao sair.", "error");
          });
      } else {
        window.location.href = "index.html";
      }
    }
  };

  const btnConfigLogout = document.getElementById("btnConfigLogout");
  if (btnConfigLogout)
    btnConfigLogout.addEventListener("click", realizarLogout);

  const btnLogoutHeader = document.getElementById("btnLogout");
  if (btnLogoutHeader)
    btnLogoutHeader.addEventListener("click", realizarLogout);

  // ============================================
  // FILTRO FINANCEIRO
  // ============================================
  const btnFiltrarFin = document.getElementById("btnFiltrarFinanceiro");
  if (btnFiltrarFin) {
    btnFiltrarFin.addEventListener("click", () => {
      atualizarPaginaFinanceiro();
      mostrarNotificacao("Filtro aplicado!", "success");
    });
  }

  // ============================================
  // CONFIGURAÇÃO DA META MENSAL (COM RESET AUTOMÁTICO)
  // ============================================
  const inputMetaDiaria = document.getElementById("inputMetaDiaria");
  const inputMetaDias = document.getElementById("inputMetaDias");

  if (inputMetaDiaria && inputMetaDias) {
    // Função auxiliar para saber qual é o "Mês Atual" (Ex: "2026-01")
    const obterChaveMes = () => {
      const hoje = new Date();
      return `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, "0")}`;
    };

    // 1. Carregar e Validar se a meta é "fresca"
    const metaSalva = localStorage.getItem("metaMensal");
    const mesAtualKey = obterChaveMes();

    if (metaSalva) {
      try {
        const parsed = JSON.parse(metaSalva);

        // A MÁGICA: Compara o mês salvo com o mês atual
        if (parsed.mesRef === mesAtualKey) {
          // Se for o mesmo mês, carrega normalmente
          state.meta = parsed;
          inputMetaDiaria.value = parsed.diaria || "";
          inputMetaDias.value = parsed.dias || "";
        } else {
          // Se for mês diferente (virou o mês), reseta!
          console.log("Mês virou. Resetando meta.");
          state.meta = { diaria: 0, dias: 0, mesRef: mesAtualKey };

          // Limpa o storage antigo
          localStorage.removeItem("metaMensal");

          // Limpa os inputs visuais
          inputMetaDiaria.value = "";
          inputMetaDias.value = "";

          // (Opcional) Avisa o usuário
          // mostrarNotificacao("Inicie sua meta para este novo mês!", "info");
        }
      } catch (e) {
        console.error("Erro ao ler meta", e);
      }
    }

    // 2. Função de Salvar (Agora inclui o mês)
    const atualizarMeta = () => {
      const diaria = parseFloat(inputMetaDiaria.value) || 0;
      const dias = parseFloat(inputMetaDias.value) || 0;

      // Salva os valores + a referência do mês atual
      state.meta = {
        diaria,
        dias,
        mesRef: obterChaveMes(),
      };

      localStorage.setItem("metaMensal", JSON.stringify(state.meta));

      import("./ui.js").then((ui) => ui.atualizarGraficoMeta());
    };

    // 3. Listeners
    inputMetaDiaria.addEventListener("input", atualizarMeta);
    inputMetaDias.addEventListener("input", atualizarMeta);

    // 4. Inicializar gráfico
    import("./ui.js").then((ui) => ui.atualizarGraficoMeta());
  }

  console.log("Event listeners configurados");
}

// Inicialização DOM
document.addEventListener("DOMContentLoaded", () => {
  if (window.firebaseDb && window.firebaseDb.auth) {
    const user = window.firebaseDb.auth.currentUser;
    if (user) {
      inicializarApp();
    } else {
      const unsubscribe = window.firebaseDb.auth.onAuthStateChanged((user) => {
        if (user) {
          unsubscribe();
          inicializarApp();
        }
      });
      setTimeout(() => {
        if (!window.firebaseDb.auth.currentUser)
          window.location.href = "index.html";
      }, 5000);
    }
  } else {
    inicializarModoOffline();
  }
});

// ============================================
// INICIALIZAÇÃO E PROTEÇÃO DE ROTAS
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Identifica onde estamos pelo CONTEÚDO da página
  // (Mais seguro que olhar a URL, que pode mudar em subpastas)
  const isAppPage =
    !!document.getElementById("app-content") ||
    !!document.querySelector(".navbar");
  const isLoginPage = !isAppPage; // Se não é app, assumimos que é login (index.html)

  // 2. Registro do PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js") // <--- Caminho relativo aqui também
      .then(() => console.log("Service Worker registrado!"))
      .catch((err) => console.error("Erro no SW:", err));
  }

  // 3. Inicialização do Firebase Auth
  if (window.firebaseDb && window.firebaseDb.auth) {
    window.firebaseDb.auth.onAuthStateChanged((user) => {
      if (user) {
        // --- USUÁRIO LOGADO ---
        if (isLoginPage) {
          // Se está na tela de login, manda pro App
          window.location.replace("app.html");
          // .replace é melhor que .href pois não deixa voltar pro login com o botão "Voltar"
        } else {
          // Já está no app, pode iniciar
          inicializarApp();
          // (Se tiver a função de tema que criamos antes, chame ela aqui também: inicializarTema();)
        }
      } else {
        // --- USUÁRIO DESLOGADO ---
        if (isAppPage) {
          // Se está tentando acessar o App sem logar, chuta pro Login
          window.location.replace("index.html");
        }
        // Se já está no login, não faz nada (deixa ele logar)
      }
    });
  } else {
    // MODO OFFLINE / SEM FIREBASE
    // Se não tiver Firebase configurado, deixa entrar no app para testes
    if (isLoginPage) {
      // Opcional: window.location.href = "app.html";
    } else {
      inicializarApp();
    }
  }
});
