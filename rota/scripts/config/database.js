// ============================================
// FUNÇÕES DE BANCO DE DADOS - database.js
// ============================================

import { rotaAtual, rotas, db } from './constants.js';

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
export async function carregarDados() {
  try {
    console.log("Carregando dados do Firebase para usuário:", db.getCurrentUser()?.uid);

    // Atualizar último acesso
    await db.atualizarAcesso();

    // Carregar rota atual
    const rotaAtualSnapshot = await db.sistema.rotaAtual.get();

    if (rotaAtualSnapshot.exists) {
      rotaAtual = rotaAtualSnapshot.data();
      console.log("Rota atual encontrada");
      atualizarRotaAberta();
    } else {
      console.log("Nenhuma rota atual encontrada");
    }

    // Carregar histórico de rotas
    const rotasSnapshot = await db.rotas.get();
    rotas = [];

    rotasSnapshot.forEach((doc) => {
      const data = doc.data();
      rotas.push({
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

    console.log(`${rotas.length} rotas carregadas`);
    rotas.sort(
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
// FUNÇÕES DE PERSISTÊNCIA
// ============================================
export async function salvarRotaAtual() {
  try {
    if (rotaAtual && db) {
      await db.sistema.rotaAtual.set(rotaAtual, { merge: true });
      console.log("Rota atual salva no Firebase");
    } else if (rotaAtual) {
      localStorage.setItem("rotaAtual", JSON.stringify(rotaAtual));
      console.log("Rota atual salva localmente");
    } else {
      if (db) {
        await db.sistema.rotaAtual.delete();
      }
      localStorage.removeItem("rotaAtual");
    }
  } catch (error) {
    console.error("Erro ao salvar rota atual:", error);
    localStorage.setItem("rotaAtual", JSON.stringify(rotaAtual));
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
    await db.rotas.doc(docId).set(rotaParaSalvar);
    console.log("Rota salva no Firebase");
    mostrarNotificacao("Rota salva com sucesso!", "success");

    // Remover rota atual
    await db.sistema.rotaAtual.delete();
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

// ============================================
// FUNÇÕES DE DADOS LOCAIS
// ============================================
export function carregarDadosLocal() {
  console.log("Carregando dados locais...");

  const rotaAtualSalva = localStorage.getItem("rotaAtual");
  const rotasSalvas = localStorage.getItem("rotas");

  if (rotaAtualSalva) {
    try {
      rotaAtual = JSON.parse(rotaAtualSalva);
      console.log("Rota atual carregada localmente:", rotaAtual);
      atualizarRotaAberta();
    } catch (e) {
      console.error("Erro ao parsear rota atual:", e);
    }
  }

  if (rotasSalvas) {
    try {
      rotas = JSON.parse(rotasSalvas);
      console.log(`${rotas.length} rotas carregadas localmente`);
      atualizarListaRotas();
    } catch (e) {
      console.error("Erro ao parsear rotas:", e);
      rotas = [];
    }
  }
}