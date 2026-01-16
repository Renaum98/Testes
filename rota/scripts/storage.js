import { state } from './state.js';
import { mostrarNotificacao } from './utils.js';
import { atualizarListaRotas } from './ui.js';

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
export async function carregarDados() {
  try {
    // Verifica se o DB está pronto antes de tentar usar
    if (state.db) {
        await state.db.atualizarAcesso();
    }

    // Se estiver offline ou sem DB, carrega local
    if (!state.db) {
        carregarDadosLocal();
        return;
    }

    const rotasSnapshot = await state.db.rotas.get();
    state.rotas = [];

    rotasSnapshot.forEach((doc) => {
      const data = doc.data();
      state.rotas.push({
        id: doc.id,
        ...data,
        // Tratamento robusto de datas
        horarioInicio: data.horarioInicio?.toDate ? data.horarioInicio.toDate().toISOString() : (data.horarioInicio || new Date().toISOString()),
        horarioFim: data.horarioFim?.toDate ? data.horarioFim.toDate().toISOString() : (data.horarioFim || new Date().toISOString())
      });
    });

    // Ordena do mais recente para o mais antigo
    state.rotas.sort((a, b) => new Date(b.horarioInicio) - new Date(a.horarioInicio));
    
    atualizarListaRotas();
    
  } catch (error) {
    console.error("Erro ao carregar do Firebase:", error);
    mostrarNotificacao("Erro ao carregar dados online. Usando versão local.", "info");
    carregarDadosLocal();
  }
}

// ============================================
// DADOS LOCAIS (FALLBACK)
// ============================================
export function carregarDadosLocal() {
  const rotasSalvas = localStorage.getItem("rotas");
  if (rotasSalvas) {
    try {
        state.rotas = JSON.parse(rotasSalvas);
        atualizarListaRotas();
    } catch(e) {
        console.error("Erro ao ler localStorage", e);
    }
  }
}

// ============================================
// SALVAR ROTA
// ============================================
export async function salvarRotaFinalizada(rota) {
  try {
    const docId = rota.id.toString();
    
    // Prepara objeto para o Firestore (converte datas para Timestamp)
    // O window.firebase é necessário porque estamos usando CDN
    const rotaParaSalvar = {
      ...rota,
      horarioInicio: window.firebase.firestore.Timestamp.fromDate(new Date(rota.horarioInicio)),
      horarioFim: window.firebase.firestore.Timestamp.fromDate(new Date(rota.horarioFim)),
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    };

    delete rotaParaSalvar.id;

    if (state.db) {
      await state.db.rotas.doc(docId).set(rotaParaSalvar);
      console.log("Salvo no Firebase");
    } 
    
    // SEMPRE salva no LocalStorage como backup/cache
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    rotasLocais.unshift(rota);
    localStorage.setItem("rotas", JSON.stringify(rotasLocais));
    
    if(!state.db) console.log("Salvo apenas localmente (Offline)");

  } catch (error) {
    console.error("Erro ao salvar rota:", error);
    mostrarNotificacao("Erro ao salvar. Verifique sua conexão.", "error");
  }
}