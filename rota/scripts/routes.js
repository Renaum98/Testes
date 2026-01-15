import { state, PRECO_GASOLINA_POR_LITRO } from './state.js';
import { mostrarNotificacao } from './utils.js';
import { fecharModal, atualizarRotaAberta, atualizarListaRotas } from './ui.js';
import { salvarRotaAtual, salvarRotaFinalizada } from './storage.js';

// ============================================
// INICIAR ROTA (Apenas cronômetro)
// ============================================
export async function iniciarRota(event) {
  if (event) event.preventDefault();
  if (state.rotaAtual) {
    mostrarNotificacao("Você já tem uma rota em andamento!", "info");
    return;
  }
  state.rotaAtual = {
    id: Date.now(),
    horarioInicio: new Date().toISOString(),
    status: "aberta",
    userId: window.firebaseDb.auth.currentUser?.uid || "offline",
  };
  await salvarRotaAtual();
  atualizarRotaAberta();
  const modalInicio = document.getElementById("modalIniciarRota");
  if(modalInicio) modalInicio.classList.remove("active");
  mostrarNotificacao("Rota iniciada! O tempo está contando.", "success");
}

// ============================================
// ENCERRAR ROTA (Salva exatamente o que foi digitado)
// ============================================
export async function encerrarRota(event) {
  event.preventDefault();

  // Elementos do DOM
  const elPlataforma = document.getElementById("plataformaRota");
  const elKm = document.getElementById("kmPercorridoInput"); // ID TEM QUE SER IGUAL AO DO HTML
  const elConsumo = document.getElementById("consumoInput");
  const elValor = document.getElementById("valorRota");

  // Captura valores brutos
  const plataforma = elPlataforma.value;
  const kmPercorrido = parseFloat(elKm.value);
  const consumoVeiculo = parseFloat(elConsumo.value);
  const valorRecebido = parseFloat(elValor.value);

  // Debug para você ver no console o que está acontecendo
  console.log("--- FINALIZANDO ROTA ---");
  console.log("Plataforma:", plataforma);
  console.log("KM Digitado (Bruto):", elKm.value);
  console.log("KM Interpretado:", kmPercorrido);

  // Validações
  if (isNaN(kmPercorrido) || kmPercorrido <= 0) {
    mostrarNotificacao("Erro: Digite um KM válido!", "error");
    return;
  }
  if (!consumoVeiculo || consumoVeiculo <= 0) {
    mostrarNotificacao("Digite o consumo médio!", "error");
    return;
  }
  if (isNaN(valorRecebido)) {
    mostrarNotificacao("Digite o valor da rota!", "error");
    return;
  }

  // CÁLCULO FINANCEIRO APENAS (Não afeta o KM salvo)
  // Custo = (KM / KmPorLitro) * Preço
  const litrosGastos = kmPercorrido / consumoVeiculo;
  const custoGasolina = litrosGastos * PRECO_GASOLINA_POR_LITRO;
  const lucroLiquido = valorRecebido - custoGasolina;

  const horarioFim = new Date().toISOString();
  const inicio = new Date(state.rotaAtual.horarioInicio);
  const fim = new Date(horarioFim);
  const duracaoMinutos = Math.floor((fim - inicio) / 60000);

  const rotaFinalizada = {
    ...state.rotaAtual,
    horarioFim: horarioFim,
    duracaoMinutos: duracaoMinutos,
    plataforma: plataforma,
    
    // AQUI: Salva EXATAMENTE o que entrou no input
    kmPercorridos: kmPercorrido, 
    
    consumoUtilizado: consumoVeiculo,
    valor: valorRecebido,
    custoGasolina: parseFloat(custoGasolina.toFixed(2)),
    lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
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

  mostrarNotificacao(
    `Rota salva! KM: ${kmPercorrido} | Lucro: R$ ${lucroLiquido.toFixed(2)}`,
    "success"
  );
}

// ... Manter cancelarRota e excluirRota iguais ...
export async function cancelarRota() {
  if (!confirm("Tem certeza que deseja cancelar?")) return;
  state.rotaAtual = null;
  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalEncerrarRota");
  mostrarNotificacao("Rota cancelada", "info");
}

export async function excluirRota(rotaId) {
    if (!confirm("Tem certeza que deseja excluir esta rota?")) return;
    try {
      state.rotas = state.rotas.filter((rota) => rota.id.toString() !== rotaId.toString());
      if (state.db) {
        await state.db.rotas.doc(rotaId.toString()).delete();
      }
      const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
      const novasRotasLocais = rotasLocais.filter((rota) => rota.id.toString() !== rotaId.toString());
      localStorage.setItem("rotas", JSON.stringify(novasRotasLocais));
      atualizarListaRotas();
      mostrarNotificacao("Rota excluída com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao excluir rota:", error);
      mostrarNotificacao("Erro ao excluir rota", "error");
    }
}