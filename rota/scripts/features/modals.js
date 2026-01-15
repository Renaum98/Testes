// ============================================
// CONTROLE DE MODAIS - modals.js
// ============================================

import { rotaAtual } from '../config/constants.js';

// ============================================
// FUNÇÕES DE INTERFACE - MODAIS
// ============================================
export function abrirModalIniciarRota() {
  if (rotaAtual) {
    mostrarNotificacao("Você já tem uma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalIniciarRota").classList.add("active");
}

export function abrirModalEncerrarRota() {
  if (!rotaAtual) {
    mostrarNotificacao("Nenhuma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalEncerrarRota").classList.add("active");
}

export function fecharModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}