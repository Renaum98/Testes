import { state } from "./state.js";
import { mostrarNotificacao } from "./utils.js";
import { fecharModal, atualizarRotaAberta, atualizarListaRotas } from "./ui.js";
import { salvarRotaAtual, salvarRotaFinalizada } from "./storage.js";
import {
  calcularCustoGasolina,
  abrirModalSelecionarVeiculo,
} from "./vehicles.js";

// ============================================
// GERENCIAMENTO DE ROTAS
// ============================================
export async function iniciarRota(event) {
  event.preventDefault();

  const kmInicial = parseFloat(document.getElementById("kmInicial").value);

  if (!kmInicial || kmInicial <= 0) {
    mostrarNotificacao("Digite uma quilometragem válida!", "error");
    return;
  }

  state.rotaAtual = {
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
  if (!state.veiculoSelecionado) {
    mostrarNotificacao("Configure seu veículo primeiro!", "error");
    abrirModalSelecionarVeiculo();
    return;
  }

  const kmFinal = parseFloat(document.getElementById("kmFinal").value);
  const valorRota = parseFloat(document.getElementById("valorRota").value);

  if (!kmFinal || kmFinal <= state.rotaAtual.kmInicial) {
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
  const kmPercorridos = kmFinal - state.rotaAtual.kmInicial;
  const custoGasolina = calcularCustoGasolina(kmPercorridos);
  const lucroLiquido = valorRota - custoGasolina;

  const rotaFinalizada = {
    ...state.rotaAtual,
    kmFinal: kmFinal,
    valor: valorRota,
    horarioFim: new Date().toISOString(),
    kmPercorridos: kmPercorridos,
    custoGasolina: custoGasolina,
    lucroLiquido: lucroLiquido,
    veiculoUtilizado: state.veiculoSelecionado.tipo,
    consumoUtilizado: state.veiculoSelecionado.consumo,
    status: "finalizada",
  };

  await salvarRotaFinalizada(rotaFinalizada);
  state.rotas.unshift(rotaFinalizada);
  state.rotaAtual = null;
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

  state.rotaAtual = null;
  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalEncerrarRota");
  mostrarNotificacao("Rota cancelada", "info");
}

export async function excluirRota(rotaId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir esta rota?\nEsta ação não pode ser desfeita."
    )
  ) {
    // resetarSwipe() deve ser importado ou tratado no contexto de quem chama,
    // mas aqui estamos tratando a lógica de exclusão.
    // resetarSwipe(); // Removido pois é função de UI/Swipe, o clique chama.
    return;
  }

  try {
    // 1. Remover do array local
    state.rotas = state.rotas.filter(
      (rota) => rota.id.toString() !== rotaId.toString()
    );

    // 2. Excluir do Firebase se disponível
    if (state.db) {
      await state.db.rotas.doc(rotaId.toString()).delete();
    }

    // 3. Excluir do localStorage
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    const novasRotasLocais = rotasLocais.filter(
      (rota) => rota.id.toString() !== rotaId.toString()
    );
    localStorage.setItem("rotas", JSON.stringify(novasRotasLocais));

    // 4. Atualizar interface
    atualizarListaRotas();

    mostrarNotificacao("Rota excluída com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao excluir rota:", error);
    mostrarNotificacao("Erro ao excluir rota", "error");
  }
}
