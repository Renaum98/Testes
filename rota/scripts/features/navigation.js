// ============================================
// NAVEGAÇÃO - navigation.js
// ============================================

import { carregarDados } from '../config/database.js';
import { abrirModalSelecionarVeiculo, salvarConfiguracaoVeiculo } from '../config/vehicle-config.js';
import { abrirModalIniciarRota, abrirModalEncerrarRota, fecharModal } from './modals.js';
import { iniciarRota, encerrarRota, cancelarRota } from './routes.js';

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
// ============================================
export function mudarPagina(event, pagina) {
  event.preventDefault();

  // Atualizar páginas
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".menu-item_link")
    .forEach((l) => l.classList.remove("active"));

  document.getElementById("page-" + pagina).classList.add("active");
  event.currentTarget.classList.add("active");

  // Se for para a página de rotas, recarregar dados
  if (pagina === "rotas") {
    carregarDados();
  }
}

// ============================================
// FUNÇÕES AUXILIARES E EVENT LISTENERS
// ============================================
export function configurarEventListeners() {
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