import { state } from './state.js';
import { mostrarNotificacao } from './utils.js';
import { configurarSwipeActions } from './swipe.js';
import { carregarDados } from './storage.js';

// ============================================
// GERENCIAMENTO DE MODAIS
// ============================================
export function abrirModalIniciarRota() {
  if (state.rotaAtual) {
    mostrarNotificacao("Você já tem uma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalIniciarRota").classList.add("active");
}

export function abrirModalEncerrarRota() {
  if (!state.rotaAtual) {
    mostrarNotificacao("Nenhuma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalEncerrarRota").classList.add("active");
}

export function fecharModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// ============================================
// NAVEGAÇÃO
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
// ATUALIZAÇÃO DA INTERFACE
// ============================================
export function atualizarRotaAberta() {
  const container = document.getElementById("rotaAbertaContainer");
  const detalhes = document.getElementById("detalhesRotaAberta");

  if (state.rotaAtual) {
    const inicio = new Date(state.rotaAtual.horarioInicio);
    const agora = new Date();
    const duracao = Math.floor((agora - inicio) / 60000);

    detalhes.innerHTML = `
      <div><strong>Início:</strong> ${inicio.toLocaleTimeString("pt-BR")}</div>
      <div><strong>KM Inicial:</strong> ${state.rotaAtual.kmInicial.toFixed(
        1
      )} km</div>
      <div><strong>Duração:</strong> ${Math.floor(duracao / 60)}h ${
      duracao % 60
    }min</div>
    `;

    container.classList.add("active");
  } else {
    container.classList.remove("active");
  }
}

export function atualizarListaRotas() {
  const lista = document.getElementById("rotasList");
  const emptyState = document.getElementById("emptyState");

  if (!state.rotas || state.rotas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  lista.innerHTML = state.rotas
    .map((rota) => {
      const inicio = new Date(rota.horarioInicio);
      const fim = new Date(rota.horarioFim);
      const duracao = Math.floor((fim - inicio) / 60000);
      const custoGasolina = rota.custoGasolina || 0;
      const lucroLiquido = rota.lucroLiquido || rota.valor - custoGasolina;

      return `
        <div class="rota-item-container" data-rota-id="${rota.id}">
          <div class="rota-item-content">
            <div class="rota-card">
              <div class="rota-card-header">
                <div class="rota-data">${inicio.toLocaleDateString(
                  "pt-BR"
                )}</div>
                <div class="rota-valor">R$ ${
                  rota.valor?.toFixed(2) || "0.00"
                }</div>
              </div>
              <div class="rota-info">
                <div class="info-item">
                  <span class="info-label">Horário</span>
                  <span class="info-value">
                    ${inicio.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - 
                    ${fim.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">KM Percorridos</span>
                  <span class="info-value">${
                    rota.kmPercorridos?.toFixed(1) || "0.0"
                  } km</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Lucro Líquido</span>
                  <span class="info-value" style="color: #10b981; font-weight: 600;">
                    R$ ${lucroLiquido.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="rota-swipe-action delete-action">
            <button class="btn-swipe-delete" data-id="${rota.id}">
              <span class="material-symbols-outlined">delete</span>
              <span>Excluir</span>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  // Configurar os listeners de swipe
  configurarSwipeActions();
}

export function obterDescricaoVeiculo(tipo) {
    const descricoes = {
      moto_125: "Moto 125cc",
      moto_250: "Moto 250cc",
      carro_popular: "Carro Popular 1.0",
      "carro_1.4": "Carro 1.4",
      "carro_1.8": "Carro 1.6-1.8",
      "carro_2.0": "Carro 2.0+",
      caminhonete: "Caminhonete",
      personalizado: "Personalizado",
    };
    return descricoes[tipo] || "Veículo não identificado";
}

export function atualizarExibicaoVeiculo() {
    const btnAlterarVeiculo = document.getElementById("btnAlterarVeiculo");
    if (btnAlterarVeiculo) {
      if (state.veiculoSelecionado) {
        btnAlterarVeiculo.textContent = `🚗 ${state.veiculoSelecionado.descricao} (${state.veiculoSelecionado.consumo} km/L)`;
      } else {
        btnAlterarVeiculo.textContent = "🚗 Configurar Veículo";
      }
    }
}