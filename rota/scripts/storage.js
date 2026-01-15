import { state } from './state.js';
import { mostrarNotificacao } from './utils.js';
import { atualizarRotaAberta, atualizarListaRotas } from './ui.js';

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
export async function carregarDados() {
  try {
    console.log(
      "Carregando dados do Firebase para usuário:",
      state.db.getCurrentUser()?.uid
    );

    // Atualizar último acesso
    await state.db.atualizarAcesso();

    // Carregar rota atual
    const rotaAtualSnapshot = await state.db.sistema.rotaAtual.get();

    if (rotaAtualSnapshot.exists) {
      state.rotaAtual = rotaAtualSnapshot.data();
      console.log("Rota atual encontrada");
      atualizarRotaAberta();
    } else {
      console.log("Nenhuma rota atual encontrada");
    }

    // Carregar histórico de rotas
    const rotasSnapshot = await state.db.rotas.get();
    state.rotas = [];

    rotasSnapshot.forEach((doc) => {
      const data = doc.data();
      state.rotas.push({
        id: doc.id,
        ...data,
        // Converter timestamps do Firestore
        horarioFim: data.horarioFim
          ? data.horarioFim.toDate
            ? data.horarioFim.toDate().toISOString()
            : data.horarioFim
          : new Date().toISOString(),
        horarioInicio: data.horarioInicio
          ? data.horarioInicio.toDate
            ? data.horarioInicio.toDate().toISOString()
            : data.horarioInicio
          : new Date().toISOString(),
      });
    });

    console.log(`${state.rotas.length} rotas carregadas`);
    state.rotas.sort(
      (a, b) =>
        new Date(b.horarioFim || b.horarioInicio) -
        new Date(a.horarioFim || a.horarioInicio)
    );
    atualizarListaRotas();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    mostrarNotificacao("Usando dados locais", "info");
    carregarDadosLocal();
  }
}

// ============================================
// DADOS LOCAIS (OFFLINE)
// ============================================
export function carregarDadosLocal() {
  console.log("Carregando dados locais...");

  const rotaAtualSalva = localStorage.getItem("rotaAtual");
  const rotasSalvas = localStorage.getItem("rotas");

  if (rotaAtualSalva) {
    try {
      state.rotaAtual = JSON.parse(rotaAtualSalva);
      console.log("Rota atual carregada localmente:", state.rotaAtual);
      atualizarRotaAberta();
    } catch (e) {
      console.error("Erro ao parsear rota atual:", e);
    }
  }

  if (rotasSalvas) {
    try {
      state.rotas = JSON.parse(rotasSalvas);
      console.log(`${state.rotas.length} rotas carregadas localmente`);
      atualizarListaRotas();
    } catch (e) {
      console.error("Erro ao parsear rotas:", e);
      state.rotas = [];
    }
  }
}

// ============================================
// PERSISTÊNCIA DE DADOS
// ============================================
export async function salvarRotaAtual() {
  try {
    if (state.rotaAtual && state.db) {
      await state.db.sistema.rotaAtual.set(state.rotaAtual, { merge: true });
      console.log("Rota atual salva no Firebase");
    } else if (state.rotaAtual) {
      localStorage.setItem("rotaAtual", JSON.stringify(state.rotaAtual));
      console.log("Rota atual salva localmente");
    } else {
      if (state.db) {
        await state.db.sistema.rotaAtual.delete();
      }
      localStorage.removeItem("rotaAtual");
    }
  } catch (error) {
    console.error("Erro ao salvar rota atual:", error);
    localStorage.setItem("rotaAtual", JSON.stringify(state.rotaAtual));
  }
}

export async function salvarRotaFinalizada(rota) {
  try {
    const docId = rota.id.toString();

    const rotaParaSalvar = {
      ...rota,
      kmPercorridos: rota.kmFinal - rota.kmInicial,
      status: "finalizada",
      horarioInicio: firebase.firestore.Timestamp.fromDate(
        new Date(rota.horarioInicio)
      ),
      horarioFim: firebase.firestore.Timestamp.fromDate(new Date()),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userId: window.firebaseDb.auth.currentUser?.uid || "offline",
    };

    delete rotaParaSalvar.id;

    // Salvar usando a nova estrutura
    await state.db.rotas.doc(docId).set(rotaParaSalvar);
    console.log("Rota salva no Firebase");
    mostrarNotificacao("Rota salva com sucesso!", "success");

    // Remover rota atual
    await state.db.sistema.rotaAtual.delete();
  } catch (error) {
    console.error("Erro ao salvar rota:", error);
    mostrarNotificacao("Salvando localmente...", "info");

    // Salvar localmente
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    rotasLocais.unshift(rota);
    localStorage.setItem("rotas", JSON.stringify(rotasLocais));

    localStorage.removeItem("rotaAtual");

    mostrarNotificacao("Rota salva localmente!", "success");
  }
}