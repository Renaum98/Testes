import { state } from "./state.js";
import { mostrarNotificacao, fecharModal } from "./utils.js";
import { salvarRotaFinalizada } from "./storage.js";

// ============================================
// SALVAR NOVA ROTA (ADAPTADO AO SEU HTML)
// ============================================
export async function salvarNovaRota(event) {
  event.preventDefault();

  // --- CORREÇÃO 1: PEGAR O BOTÃO PARA BLOQUEAR/DESBLOQUEAR ---
  // Procura o botão de submit dentro do formulário que disparou o evento
  const btnSubmit = event.target.querySelector('button[type="submit"]');
  const textoOriginal = btnSubmit ? btnSubmit.textContent : "Salvar";

  // Bloqueia o botão imediatamente para evitar cliques duplos
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Salvando...";
  }

  // 1. Pegar Elementos
  const elData = document.getElementById("inputDataRota");
  const elPlataforma = document.getElementById("plataformaRota");
  const elKm = document.getElementById("kmPercorridoInput");
  const elConsumo = document.getElementById("consumoInput");
  const elValor = document.getElementById("valorRota");

  try {
    // 2. Validação
    if (!elPlataforma || !elKm || !elValor || !elConsumo) {
      throw new Error(
        "Elementos do formulário não encontrados (IDs incorretos).",
      );
    }

    // 3. Conversão
    const plataforma = elPlataforma.value;
    const kmPercorridos = parseFloat(elKm.value.replace(",", ".")) || 0;
    const consumoVeiculo = parseFloat(elConsumo.value.replace(",", ".")) || 10;
    const valorTotal = parseFloat(elValor.value.replace(",", ".")) || 0;

    // Validação extra de valores zerados (Opcional, mas recomendado)
    if (kmPercorridos === 0 || valorTotal === 0) {
      throw new Error("Preencha o KM e o Valor corretamente.");
    }

    // 4. Cálculos
    const precoGasolina = state.precoGasolina || 6.35;
    const litrosGastos = kmPercorridos / consumoVeiculo;
    const custoGasolina = litrosGastos * precoGasolina;
    const lucroLiquido = valorTotal - custoGasolina;

    // 5. Data
    let dataReferencia = new Date();
    if (elData && elData.value) {
      const partes = elData.value.split("-");
      const ano = parseInt(partes[0]);
      const mes = parseInt(partes[1]) - 1;
      const dia = parseInt(partes[2]);
      dataReferencia.setFullYear(ano);
      dataReferencia.setMonth(mes);
      dataReferencia.setDate(dia);
    }

    const dataFim = new Date(dataReferencia);
    const dataInicio = new Date(dataReferencia);
    dataInicio.setMinutes(dataInicio.getMinutes() - 30);

    // 6. Objeto
    const novaRota = {
      id: Date.now(),
      plataforma: plataforma,
      kmPercorridos: kmPercorridos,
      valor: valorTotal,
      consumoUtilizado: consumoVeiculo,
      custoGasolina: parseFloat(custoGasolina.toFixed(2)),
      lucroLiquido: parseFloat(lucroLiquido.toFixed(2)),
      horarioInicio: dataInicio.toISOString(),
      horarioFim: dataFim.toISOString(),
      status: "finalizada",
      userId: window.firebaseDb?.auth?.currentUser?.uid || "offline",
      veiculoId: state.veiculoSelecionado?.id || "padrao",
    };

    // 7. Salvar (Await)
    await salvarRotaFinalizada(novaRota);

    // 8. Sucesso e Limpeza
    fecharModal("modalRegistrarRota");
    document.getElementById("formRegistrarRota").reset();

    // Resetar data para hoje
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
    mostrarNotificacao(error.message || "Erro ao processar rota.", "error");
  } finally {
    // --- CORREÇÃO 2: O FINALLY SEMPRE RODA ---
    // Isso garante que o botão SEMPRE volte a funcionar,
    // independente se deu sucesso ou erro.
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoOriginal; // Volta o texto para "Salvar Rota"
    }
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
