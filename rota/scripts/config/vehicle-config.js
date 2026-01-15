// ============================================
// CONFIGURAÇÃO DE VEÍCULO - vehicle-config.js
// ============================================

import { config, CONSUMO_VEICULOS } from "./constants.js";

// ============================================
// FUNÇÕES DE VEÍCULO
// ============================================
export function inicializarConfiguracaoVeiculo() {
  // Carregar veículo salvo
  const veiculoSalvo = localStorage.getItem("veiculoConfig");
  if (veiculoSalvo) {
    config.veiculoSelecionado = JSON.parse(veiculoSalvo);
    console.log("Veículo carregado:", config.veiculoSelecionado);
  } else {
    // Se não tem veículo salvo, mostrar modal após um tempo
    setTimeout(() => {
      if (!config.veiculoSelecionado) {
        // VERIFIQUE A PROPRIEDADE, NÃO O OBJETO
        console.log("Nenhum veículo configurado, abrindo modal...");
        abrirModalSelecionarVeiculo();
      }
    }, 1500);
  }
}

export function abrirModalSelecionarVeiculo() {
  document.getElementById("modalSelecionarVeiculo").classList.add("active");

  // Se já tem veículo selecionado, mostrar ele
  if (config.veiculoSelecionado) {
    // VERIFIQUE A PROPRIEDADE
    document.getElementById("tipoVeiculo").value =
      config.veiculoSelecionado.tipo;

    if (config.veiculoSelecionado.tipo === "personalizado") {
      document.getElementById("campoConsumoPersonalizado").style.display =
        "block";
      document.getElementById("consumoPersonalizado").value =
        config.veiculoSelecionado.consumo;
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

  // ATUALIZE A PROPRIEDADE, NÃO O OBJETO INTEIRO
  config.veiculoSelecionado = {
    tipo: tipoSelecionado,
    consumo: consumo,
    descricao: obterDescricaoVeiculo(tipoSelecionado),
  };

  // Salvar no localStorage
  localStorage.setItem(
    "veiculoConfig",
    JSON.stringify(config.veiculoSelecionado)
  );

  // Fechar modal
  document.getElementById("modalSelecionarVeiculo").classList.remove("active");

  // Atualizar exibição
  atualizarExibicaoVeiculo();

  // Mostrar confirmação
  mostrarNotificacao(
    `Veículo configurado: ${config.veiculoSelecionado.descricao} (${consumo} km/L)`,
    "success"
  );

  // Resetar campos
  document.getElementById("tipoVeiculo").value = "";
  document.getElementById("campoConsumoPersonalizado").style.display = "none";
  document.getElementById("consumoPersonalizado").value = "";
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
    if (config.veiculoSelecionado) {
      btnAlterarVeiculo.textContent = `🚗 ${config.veiculoSelecionado.descricao} (${config.veiculoSelecionado.consumo} km/L)`;
    } else {
      btnAlterarVeiculo.textContent = "🚗 Configurar Veículo";
    }
  }
}
