import { state } from "./state.js";
import { mostrarNotificacao } from "./utils.js";
import {
  abrirModalEncerrarRota,
  fecharModal,
  mudarPagina,
  atualizarRotaAberta,
  atualizarPerfilUsuario,
  atualizarPaginaFinanceiro,
} from "./ui.js";
import { carregarDados, carregarDadosLocal } from "./storage.js";
import { iniciarRota, encerrarRota, cancelarRota } from "./routes.js";

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
      "warning"
    );
    inicializarModoOffline();
    return;
  }

  // Configurar db global
  state.db = window.firebaseDb;

  console.log("Firebase configurado, inicializando...");

  configurarEventListeners();
  carregarDados();

  // Cronômetro
  setInterval(() => {
    if (state.rotaAtual) {
      atualizarRotaAberta();
    }
  }, 60000);

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

  // Botão Registrar Rota (Início imediato)
  const btnRegistrar = document.getElementById("btnRegistrarRota");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", iniciarRota);
  }

  // Botão da Rota em Andamento (Abre o Modal de Encerrar)
  const btnRotaAberta = document.getElementById("btnRotaAberta");
  if (btnRotaAberta) {
    btnRotaAberta.addEventListener("click", abrirModalEncerrarRota);
  }

  // Navegação
  document.querySelectorAll(".menu-item_link").forEach((link) => {
    const pagina = link.getAttribute("data-pagina");
    if (pagina) {
      link.addEventListener("click", (e) => {
        mudarPagina(e, pagina);
        
        // Se entrou na página financeiro, atualiza os dados
        if (pagina === "financeiro") {
          atualizarPaginaFinanceiro();
        }
      });
    }
  });

  // Formulário de Encerrar
  const formEncerrar = document.getElementById("formEncerrarRota");
  if (formEncerrar) {
    formEncerrar.addEventListener("submit", encerrarRota);
  }

  // Botão Cancelar no modal
  const btnCancelarRota = document.getElementById("btnCancelarRota");
  if (btnCancelarRota) {
    btnCancelarRota.addEventListener("click", cancelarRota);
  }

  // Fechar modais (Overlay)
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  // Fechar com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.active").forEach((modal) => {
        modal.classList.remove("active");
      });
    }
  });

  // ===========================================
  // CONFIGURAÇÃO DE LOGOUT (Header e Aba Config)
  // ===========================================

  // Função unificada de logout
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

  // 2. Botão Grande na Aba Configurações (NOVO)
  const btnConfigLogout = document.getElementById("btnConfigLogout");
  if (btnConfigLogout) {
    btnConfigLogout.addEventListener("click", realizarLogout);
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
            .catch(() => {
              mostrarNotificacao("Erro ao sair.", "error");
            });
        } else {
          window.location.href = "index.html";
        }
      }
    });
  }
  // ============================================
  // FILTRO FINANCEIRO
  // ============================================
  const btnFiltrarFin = document.getElementById("btnFiltrarFinanceiro");
  if (btnFiltrarFin) {
    btnFiltrarFin.addEventListener("click", () => {
      atualizarPaginaFinanceiro(); // Chama a função quando clica no filtro
      mostrarNotificacao("Filtro aplicado!", "success");
    });
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
