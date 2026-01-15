import { state } from "./state.js";
import { mostrarNotificacao } from "./utils.js";
// CORREÇÃO AQUI: Removemos 'atualizarExibicaoVeiculo' desta linha
import {
  inicializarConfiguracaoVeiculo,
  abrirModalSelecionarVeiculo,
  salvarConfiguracaoVeiculo,
} from "./vehicles.js";

// CORREÇÃO AQUI: Adicionamos 'atualizarExibicaoVeiculo' nesta linha
import {
  abrirModalIniciarRota,
  abrirModalEncerrarRota,
  fecharModal,
  mudarPagina,
  atualizarRotaAberta,
  atualizarExibicaoVeiculo,
} from "./ui.js";

import { carregarDados, carregarDadosLocal } from "./storage.js";
import { iniciarRota, encerrarRota, cancelarRota } from "./routes.js";

// ============================================
// INICIALIZAÇÃO DO APLICATIVO
// ============================================
function inicializarApp() {
  console.log("Inicializando aplicação...");

  // Verificar se estamos na página de login
  if (window.location.pathname.includes("index.html")) {
    return;
  }

  // Verificar se Firebase está configurado
  if (!window.firebaseDb || !window.firebaseDb.db) {
    console.error("Firebase não configurado corretamente");
    mostrarNotificacao(
      "Firebase não configurado. Usando modo offline.",
      "warning"
    );

    // Inicializar modo offline
    inicializarModoOffline();
    return;
  }

  // Configurar db global
  state.db = window.firebaseDb;

  console.log("Firebase configurado, inicializando...");

  // Inicializar configurações
  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();
  configurarEventListeners();

  // Carregar dados
  carregarDados();

  // Configurar atualização periódica
  setInterval(() => {
    if (state.rotaAtual) {
      atualizarRotaAberta();
    }
  }, 60000);

  console.log("Aplicação inicializada com sucesso");
}

function inicializarModoOffline() {
  console.log("Iniciando modo offline...");
  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();
  configurarEventListeners();
  carregarDadosLocal();
}

// ============================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================
function configurarEventListeners() {
  console.log("Configurando event listeners...");

  // Botões principais
  const btnRegistrar = document.getElementById("btnRegistrarRota");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", abrirModalIniciarRota);
  }

  const btnRotaAberta = document.getElementById("btnRotaAberta");
  if (btnRotaAberta) {
    btnRotaAberta.addEventListener("click", abrirModalEncerrarRota);
  }

  // Navegação
  document.querySelectorAll(".menu-item_link").forEach((link) => {
    const pagina = link.getAttribute("data-pagina");
    if (pagina) {
      link.addEventListener("click", (e) => mudarPagina(e, pagina));
    }
  });

  // Formulários
  const formIniciar = document.getElementById("formIniciarRota");
  if (formIniciar) {
    formIniciar.addEventListener("submit", iniciarRota);
  }

  const btnCancelarIniciar = document.getElementById("btnCancelarIniciar");
  if (btnCancelarIniciar) {
    btnCancelarIniciar.addEventListener("click", () =>
      fecharModal("modalIniciarRota")
    );
  }

  const formEncerrar = document.getElementById("formEncerrarRota");
  if (formEncerrar) {
    formEncerrar.addEventListener("submit", encerrarRota);
  }

  const btnCancelarRota = document.getElementById("btnCancelarRota");
  if (btnCancelarRota) {
    btnCancelarRota.addEventListener("click", cancelarRota);
  }

  // Fechar modais ao clicar fora
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  // Configuração de veículo
  const tipoVeiculoSelect = document.getElementById("tipoVeiculo");
  if (tipoVeiculoSelect) {
    tipoVeiculoSelect.addEventListener("change", function (e) {
      const campoPersonalizado = document.getElementById(
        "campoConsumoPersonalizado"
      );
      campoPersonalizado.style.display =
        e.target.value === "personalizado" ? "block" : "none";
    });
  }

  // Botão salvar veículo
  const btnSalvarVeiculo = document.getElementById("btnSalvarVeiculo");
  if (btnSalvarVeiculo) {
    btnSalvarVeiculo.addEventListener("click", salvarConfiguracaoVeiculo);
  }

  // Botão alterar veículo
  const btnAlterarVeiculo = document.getElementById("btnAlterarVeiculo");
  if (btnAlterarVeiculo) {
    btnAlterarVeiculo.addEventListener("click", abrirModalSelecionarVeiculo);
  }

  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      if (confirm("Tem certeza que deseja sair?")) {
        if (window.firebaseDb && window.firebaseDb.auth) {
          window.firebaseDb.auth
            .signOut()
            .then(() => {
              window.location.href = "index.html";
            })
            .catch((error) => {
              console.error("Erro ao fazer logout:", error);
              mostrarNotificacao("Erro ao sair. Tente novamente.", "error");
            });
        } else {
          window.location.href = "index.html";
        }
      }
    });
  }

  // Fechar modal com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.active").forEach((modal) => {
        modal.classList.remove("active");
      });
    }
  });

  console.log("Event listeners configurados");
}

// ============================================
// INICIALIZAÇÃO APÓS CARREGAMENTO DO DOM
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM completamente carregado");

  // Verificar se o usuário está autenticado
  if (window.firebaseDb && window.firebaseDb.auth) {
    const user = window.firebaseDb.auth.currentUser;

    if (user) {
      console.log("Usuário já autenticado, inicializando app...");
      inicializarApp();
    } else {
      // Aguardar autenticação
      console.log("Aguardando autenticação...");
      const unsubscribe = window.firebaseDb.auth.onAuthStateChanged((user) => {
        if (user) {
          console.log("Usuário autenticado via listener");
          unsubscribe(); // Parar de ouvir
          inicializarApp();
        }
      });

      // Timeout para caso o Firebase não responda
      setTimeout(() => {
        const currentUser = window.firebaseDb.auth.currentUser;
        if (!currentUser) {
          console.log("Timeout de autenticação, redirecionando...");
          window.location.href = "index.html";
        }
      }, 5000);
    }
  } else {
    console.error("Firebase não carregado. Usando modo offline.");
    inicializarModoOffline();
  }
});
