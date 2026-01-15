import { state, CONSUMO_VEICULOS, PRECO_GASOLINA_POR_LITRO } from './state.js';
import { mostrarNotificacao } from './utils.js';
import { atualizarExibicaoVeiculo, obterDescricaoVeiculo } from './ui.js';

// ============================================
// GERENCIAMENTO DE VEÍCULOS
// ============================================
export function inicializarConfiguracaoVeiculo() {
  // Carregar veículo salvo
  const veiculoSalvo = localStorage.getItem("veiculoConfig");
  if (veiculoSalvo) {
    state.veiculoSelecionado = JSON.parse(veiculoSalvo);
    console.log("Veículo carregado:", state.veiculoSelecionado);
  } else {
    // Se não tem veículo salvo, mostrar modal após um tempo
    setTimeout(() => {
      if (!state.veiculoSelecionado) {
        console.log("Nenhum veículo configurado, abrindo modal...");
        abrirModalSelecionarVeiculo();
      }
    }, 1500);
  }
}

export function abrirModalSelecionarVeiculo() {
  document.getElementById("modalSelecionarVeiculo").classList.add("active");

  // Se já tem veículo selecionado, mostrar ele
  if (state.veiculoSelecionado) {
    document.getElementById("tipoVeiculo").value = state.veiculoSelecionado.tipo;

    if (state.veiculoSelecionado.tipo === "personalizado") {
      document.getElementById("campoConsumoPersonalizado").style.display =
        "block";
      document.getElementById("consumoPersonalizado").value =
        state.veiculoSelecionado.consumo;
    }
  }
}

export function salvarConfiguracaoVeiculo() {
  const tipoSelecionado = document.getElementById("tipoVeiculo").value;

  if (!tipoSelecionado) {
    mostrarNotificacao("Selecione um tipo de veículo!", "error");
    return;
  }

  let consumo;

  if (tipoSelecionado === "personalizado") {
    const consumoPersonalizado = parseFloat(
      document.getElementById("consumoPersonalizado").value
    );
    if (
      !consumoPersonalizado ||
      consumoPersonalizado < 5 ||
      consumoPersonalizado > 50
    ) {
      mostrarNotificacao(
        "Digite um consumo válido (entre 5 e 50 km/L)!",
        "error"
      );
      return;
    }
    consumo = consumoPersonalizado;
  } else {
    consumo = CONSUMO_VEICULOS[tipoSelecionado];
  }

  // Salvar configuração
  state.veiculoSelecionado = {
    tipo: tipoSelecionado,
    consumo: consumo,
    descricao: obterDescricaoVeiculo(tipoSelecionado),
  };

  // Salvar no localStorage
  localStorage.setItem("veiculoConfig", JSON.stringify(state.veiculoSelecionado));

  // Fechar modal
  document.getElementById("modalSelecionarVeiculo").classList.remove("active");

  // Atualizar exibição
  atualizarExibicaoVeiculo();

  // Mostrar confirmação
  mostrarNotificacao(
    `Veículo configurado: ${state.veiculoSelecionado.descricao} (${consumo} km/L)`,
    "success"
  );

  // Resetar campos
  document.getElementById("tipoVeiculo").value = "";
  document.getElementById("campoConsumoPersonalizado").style.display = "none";
  document.getElementById("consumoPersonalizado").value = "";
}

export function calcularCustoGasolina(kmPercorridos) {
  if (!state.veiculoSelecionado) {
    mostrarNotificacao("Configure seu veículo primeiro!", "error");
    abrirModalSelecionarVeiculo();
    return 0;
  }

  const litrosGastos = kmPercorridos / state.veiculoSelecionado.consumo;
  const custo = litrosGastos * PRECO_GASOLINA_POR_LITRO;
  return parseFloat(custo.toFixed(2));
}