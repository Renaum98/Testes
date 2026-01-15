// ============================================
// CÁLCULOS - calculations.js
// ============================================

import { veiculoSelecionado, PRECO_GASOLINA_POR_LITRO } from '../config/constants.js';
import { mostrarNotificacao } from '../ui/notifications.js';
import { abrirModalSelecionarVeiculo } from '../config/vehicle-config.js';

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================
export function calcularCustoGasolina(kmPercorridos) {
  if (!veiculoSelecionado) {
    mostrarNotificacao("Configure seu veículo primeiro!", "error");
    abrirModalSelecionarVeiculo();
    return 0;
  }

  const litrosGastos = kmPercorridos / veiculoSelecionado.consumo;
  const custo = litrosGastos * PRECO_GASOLINA_POR_LITRO;
  return parseFloat(custo.toFixed(2));
}