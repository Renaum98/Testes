// ============================================
// ARQUIVO PRINCIPAL - app.js
// ============================================

// Importar configurações globais

import { config } from "./config/constants.js"; // Adicione este

// Importar módulos
import {
  inicializarConfiguracaoVeiculo,
  atualizarExibicaoVeiculo,
} from "./config/vehicle-config.js";
import {
  carregarDados,
  carregarDadosLocal,
  salvarRotaAtual,
  salvarRotaFinalizada,
} from "./config/database.js";
import { configurarEventListeners } from "./features/navigation.js";
import { configurarSwipeActions } from "./features/swipe.js";

// ============================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ============================================
function inicializarApp() {
  console.log("Inicializando aplicação...");

  // Verificar se estamos na página de login
  if (window.location.pathname.includes("index.html")) {
    return;
  }

  // Verificar se Firebase está configurado
  if (!window.firebaseDb || !window.firebaseDb.db) {
    console.error("Firebase não configurado. Usando modo offline.");
    mostrarNotificacao(
      "Firebase não configurado. Usando modo offline.",
      "warning"
    );
    inicializarModoOffline();
    return;
  }

  console.log("Firebase configurado, inicializando...");

  // ATUALIZE AQUI - use config.db em vez de db
  config.db = window.firebaseDb; // Agora funciona porque config.db é uma propriedade

  // Inicializar configurações
  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();
  configurarEventListeners();

  // Carregar dados - passe config.db
  carregarDados(config.db);

  // Configurar atualização periódica
  setInterval(() => {
    if (config.rotaAtual) {
      // Use config.rotaAtual
      atualizarRotaAberta();
    }
  }, 60000);

  console.log("Aplicação inicializada com sucesso");
}

// ============================================
// FUNÇÃO DE INICIALIZAÇÃO OFFLINE
// ============================================
function inicializarModoOffline() {
  console.log("Iniciando modo offline...");
  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();
  configurarEventListeners();
  carregarDadosLocal();
}

// ============================================
// INICIALIZAÇÃO QUANDO O DOM ESTÁ PRONTO
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
