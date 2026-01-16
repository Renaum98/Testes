import { state } from './state.js';
import { mostrarNotificacao } from './utils.js';
import { fecharModal, atualizarListaRotas } from './ui.js';
import { salvarRotaFinalizada } from './storage.js';

// ============================================
// SALVAR NOVA ROTA (DIRETO)
// ============================================
export async function salvarNovaRota(event) {
  event.preventDefault();

  // Elementos do DOM
  const elPlataforma = document.getElementById("plataformaRota");
  const elKm = document.getElementById("kmPercorridoInput");
  const elConsumo = document.getElementById("consumoInput");
  const elValor = document.getElementById("valorRota");

  // Captura valores
  const plataforma = elPlataforma.value;
  const kmPercorrido = parseFloat(elKm.value);
  const consumoVeiculo = parseFloat(elConsumo.value);
  const valorRecebido = parseFloat(elValor.value);

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

  // Cálculos Financeiros
  const litrosGastos = kmPercorrido / consumoVeiculo;
  
  // AQUI MUDOU: Usa o preço configurado no state (Input da Home)
  // Se por acaso estiver 0 ou inválido, usa um fallback de segurança (ex: 6.00)
  const precoGasolinaAtual = state.precoGasolina || 0;
  const custoGasolina = litrosGastos * precoGasolinaAtual;
  
  const lucroLiquido = valorRecebido - custoGasolina;

  // Data atual
  const agora = new Date().toISOString();

  // Objeto Rota Completo
  const novaRota = {
    id: Date.now(),
    horarioInicio: agora, // Data do registro
    horarioFim: agora,    // Data do registro
    duracaoMinutos: 0,    // Sem timer, duração é irrelevante
    plataforma: plataforma,
    kmPercorridos: kmPercorrido,
    consumoUtilizado: consumoVeiculo,
    valor: valorRecebido,
    custoGasolina: parseFloat(custoGasolina.toFixed(2)),
    lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
    status: "finalizada",
    userId: window.firebaseDb.auth.currentUser?.uid || "offline",
  };

  // Salvar no Banco/Local
  await salvarRotaFinalizada(novaRota);

  // Atualizar Estado Local (Memória)
  state.rotas.unshift(novaRota);

  // UI: Atualizar lista, fechar modal e limpar form
  atualizarListaRotas();
  fecharModal("modalRegistrarRota");
  document.getElementById("formRegistrarRota").reset();

  mostrarNotificacao(
    `Rota salva! Lucro: R$ ${lucroLiquido.toFixed(2)}`,
    "success"
  );
}

// ============================================
// EXCLUIR ROTA
// ============================================
export async function excluirRota(rotaId) {
  if (!confirm("Tem certeza que deseja excluir esta rota?")) return;
  
  try {
    // 1. Remove do estado local (memória)
    state.rotas = state.rotas.filter(
      (rota) => rota.id.toString() !== rotaId.toString()
    );

    // 2. Remove do Firebase (se online)
    if (state.db) {
      await state.db.rotas.doc(rotaId.toString()).delete();
    }

    // 3. Remove do LocalStorage (backup offline)
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    const novasRotasLocais = rotasLocais.filter(
      (rota) => rota.id.toString() !== rotaId.toString()
    );
    localStorage.setItem("rotas", JSON.stringify(novasRotasLocais));

    // 4. Atualiza a interface
    atualizarListaRotas();

    mostrarNotificacao("Rota excluída!", "success");
  } catch (error) {
    console.error("Erro ao excluir rota:", error);
    mostrarNotificacao("Erro ao excluir rota", "error");
  }
}