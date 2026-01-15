// ============================================
// GERENCIAMENTO DE ROTAS - routes.js
// ============================================

import { rotaAtual, rotas, veiculoSelecionado } from '../config/constants.js';
import { salvarRotaAtual, salvarRotaFinalizada } from '../config/database.js';
import { calcularCustoGasolina } from '../utils/calculations.js';

// ============================================
// FUNÇÕES DE ROTA
// ============================================
export async function iniciarRota(event) {
  event.preventDefault();

  const kmInicial = parseFloat(document.getElementById("kmInicial").value);

  if (!kmInicial || kmInicial <= 0) {
    mostrarNotificacao("Digite uma quilometragem válida!", "error");
    return;
  }

  rotaAtual = {
    id: Date.now(),
    kmInicial: kmInicial,
    horarioInicio: new Date().toISOString(),
    status: "aberta",
    userId: window.firebaseDb.auth.currentUser?.uid || "offline",
  };

  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalIniciarRota");
  document.getElementById("formIniciarRota").reset();

  mostrarNotificacao("Rota iniciada com sucesso!", "success");
}

export async function encerrarRota(event) {
  event.preventDefault();

  // Verificar se veículo está configurado
  if (!veiculoSelecionado) {
    mostrarNotificacao("Configure seu veículo primeiro!", "error");
    abrirModalSelecionarVeiculo();
    return;
  }

  const kmFinal = parseFloat(document.getElementById("kmFinal").value);
  const valorRota = parseFloat(document.getElementById("valorRota").value);

  if (!kmFinal || kmFinal <= rotaAtual.kmInicial) {
    mostrarNotificacao(
      "A quilometragem final deve ser maior que a inicial!",
      "error"
    );
    return;
  }

  if (!valorRota || valorRota <= 0) {
    mostrarNotificacao("Digite um valor válido!", "error");
    return;
  }

  // Calcular custos
  const kmPercorridos = kmFinal - rotaAtual.kmInicial;
  const custoGasolina = calcularCustoGasolina(kmPercorridos);
  const lucroLiquido = valorRota - custoGasolina;

  const rotaFinalizada = {
    ...rotaAtual,
    kmFinal: kmFinal,
    valor: valorRota,
    horarioFim: new Date().toISOString(),
    kmPercorridos: kmPercorridos,
    custoGasolina: custoGasolina,
    lucroLiquido: lucroLiquido,
    veiculoUtilizado: veiculoSelecionado.tipo,
    consumoUtilizado: veiculoSelecionado.consumo,
    status: "finalizada",
  };

  await salvarRotaFinalizada(rotaFinalizada);
  rotas.unshift(rotaFinalizada);
  rotaAtual = null;
  await salvarRotaAtual();

  atualizarRotaAberta();
  atualizarListaRotas();
  fecharModal("modalEncerrarRota");
  document.getElementById("formEncerrarRota").reset();

  // Mostrar resumo
  mostrarNotificacao(
    `Rota finalizada! Lucro: R$ ${lucroLiquido.toFixed(
      2
    )} (Bruto: R$ ${valorRota.toFixed(
      2
    )} - Combustível: R$ ${custoGasolina.toFixed(2)})`,
    "success"
  );
}

export async function cancelarRota() {
  if (!confirm("Tem certeza que deseja cancelar esta rota?")) return;

  rotaAtual = null;
  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalEncerrarRota");
  mostrarNotificacao("Rota cancelada", "info");
}