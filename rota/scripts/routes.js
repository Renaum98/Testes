import { state } from "./state.js";
import { mostrarNotificacao, fecharModal } from "./utils.js";
import { salvarRotaFinalizada } from "./storage.js";

// ============================================
// SALVAR NOVA ROTA (ADAPTADO AO SEU HTML)
// ============================================
export async function salvarNovaRota(event) {
  event.preventDefault();

  // 1. Pegar Elementos usando os IDs EXATOS do seu HTML
  const elData = document.getElementById("inputDataRota");
  const elPlataforma = document.getElementById("plataformaRota"); // ID Corrigido
  const elKm = document.getElementById("kmPercorridoInput"); // ID Corrigido
  const elConsumo = document.getElementById("consumoInput"); // ID Corrigido (Km/L)
  const elValor = document.getElementById("valorRota"); // ID Corrigido

  // 2. Validação de Segurança (Evita o erro "null")
  if (!elPlataforma || !elKm || !elValor || !elConsumo) {
    console.error("ERRO CRÍTICO: IDs do HTML não batem com o JS.");
    return;
  }

  // 3. Conversão de Valores
  const plataforma = elPlataforma.value;
  const kmPercorridos = parseFloat(elKm.value.replace(",", ".")) || 0;
  const consumoVeiculo = parseFloat(elConsumo.value.replace(",", ".")) || 10; // Padrão 10 se vazio
  const valorTotal = parseFloat(elValor.value.replace(",", ".")) || 0;

  // 4. Cálculo do Custo e Lucro
  // Fórmula: (KM / Consumo) * Preço da Gasolina
  const precoGasolina = state.precoGasolina || 6.35; // Pega do estado ou usa padrão
  const litrosGastos = kmPercorridos / consumoVeiculo;
  const custoGasolina = litrosGastos * precoGasolina;
  const lucroLiquido = valorTotal - custoGasolina;

  // 5. Lógica de Data (Manual ou Atual)
  let dataReferencia = new Date(); // Por padrão é AGORA

  if (elData && elData.value) {
    // Se preencheu data manual (YYYY-MM-DD)
    const partes = elData.value.split("-");
    const ano = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1;
    const dia = parseInt(partes[2]);

    // Aplica a data mantendo o horário atual
    dataReferencia.setFullYear(ano);
    dataReferencia.setMonth(mes);
    dataReferencia.setDate(dia);
  }

  // Simula duração (Fim agora, Inicio 30min atrás)
  const dataFim = new Date(dataReferencia);
  const dataInicio = new Date(dataReferencia);
  dataInicio.setMinutes(dataInicio.getMinutes() - 30);

  // 6. Montar Objeto da Rota
  const novaRota = {
    id: Date.now(),
    plataforma: plataforma,
    kmPercorridos: kmPercorridos,
    valor: valorTotal,
    consumoUtilizado: consumoVeiculo, // Salva quanto o carro fez por litro
    custoGasolina: parseFloat(custoGasolina.toFixed(2)),
    lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),

    // Datas
    horarioInicio: dataInicio.toISOString(),
    horarioFim: dataFim.toISOString(),

    status: "finalizada",
    userId: window.firebaseDb?.auth?.currentUser?.uid || "offline",
    veiculoId: state.veiculoSelecionado?.id || "padrao",
  };

  try {
    // 7. Salvar
    await salvarRotaFinalizada(novaRota);

    // 8. Limpar e Resetar Data para Hoje
    fecharModal("modalRegistrarRota");
    document.getElementById("formRegistrarRota").reset();

    // Preenche a data de hoje novamente para facilitar o próximo lançamento
    if (elData) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const dia = String(hoje.getDate()).padStart(2, "0");
      elData.value = `${ano}-${mes}-${dia}`;
    }

    mostrarNotificacao(
      `Rota salva! Lucro: R$ ${lucroLiquido.toFixed(2)}`,
      "success",
    );
  } catch (error) {
    console.error(error);
    mostrarNotificacao("Erro ao processar rota.", "error");
  }
}

// ============================================
// EXCLUIR ROTA (Mantido igual)
// ============================================
export async function excluirRota(rotaId) {
  if (!confirm("Tem certeza que deseja excluir esta rota?")) return;

  try {
    const user = window.firebaseDb?.auth?.currentUser;

    if (state.db && state.db.db && user) {
      await state.db.db
        .collection("usuarios")
        .doc(user.uid)
        .collection("rotas")
        .doc(rotaId.toString())
        .delete();

      console.log("Rota excluída do Firebase");
    } else {
      const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
      const novasRotas = rotasLocais.filter(
        (r) => r.id.toString() !== rotaId.toString(),
      );
      localStorage.setItem("rotas", JSON.stringify(novasRotas));
      state.rotas = novasRotas;
      import("./ui.js").then((ui) => ui.atualizarListaRotas());
    }

    mostrarNotificacao("Rota excluída!", "success");
  } catch (error) {
    console.error("Erro ao excluir:", error);
    mostrarNotificacao("Erro ao excluir rota.", "error");
  }
}
