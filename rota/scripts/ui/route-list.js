// ============================================
// ATUALIZAÇÃO DA LISTA DE ROTAS - route-list.js
// ============================================

import { rotas } from '../config/constants.js';

// ============================================
// FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE
// ============================================
export function atualizarListaRotas() {
  const lista = document.getElementById("rotasList");
  const emptyState = document.getElementById("emptyState");

  if (!rotas || rotas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  lista.innerHTML = rotas
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
          
          <!-- ÁREA DE SWIPE (EXCLUIR) -->
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