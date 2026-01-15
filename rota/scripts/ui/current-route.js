// ============================================
// EXIBIÇÃO DA ROTA ATUAL - current-route.js
// ============================================

import { rotaAtual } from '../config/constants.js';

// ============================================
// FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE
// ============================================
export function atualizarRotaAberta() {
  const container = document.getElementById("rotaAbertaContainer");
  const detalhes = document.getElementById("detalhesRotaAberta");

  if (rotaAtual) {
    const inicio = new Date(rotaAtual.horarioInicio);
    const agora = new Date();
    const duracao = Math.floor((agora - inicio) / 60000);

    detalhes.innerHTML = `
      <div><strong>Início:</strong> ${inicio.toLocaleTimeString("pt-BR")}</div>
      <div><strong>KM Inicial:</strong> ${rotaAtual.kmInicial.toFixed(
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