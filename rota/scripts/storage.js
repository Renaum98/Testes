import { state } from "./state.js";
import { mostrarNotificacao } from "./utils.js";
import { atualizarListaRotas } from "./ui.js";

// ============================================
// SINCRONIZAÇÃO EM TEMPO REAL (REALTIME LISTENER)
// ============================================
export function carregarDados() {
  if (state.listenerUnsubscribe) {
    console.log("Listener já está ativo.");
    return;
  }

  // Verifica se tem DB e se tem USUÁRIO LOGADO
  const user = window.firebaseDb?.auth?.currentUser;

  if (!state.db || !state.db.db || !user) {
    console.log("Aguardando login ou modo offline...");
    carregarDadosLocal();
    return;
  }

  try {
    // --- CORREÇÃO DE PERMISSÃO ---
    // Adicionamos .where('userId', '==', user.uid)
    // Isso garante que só pedimos as rotas DESTE usuário.
    // O Firebase vai aceitar porque bate com a regra de segurança.

    state.listenerUnsubscribe = state.db.db
      .collection("rotas")
      .where("userId", "==", user.uid) // <--- O PULO DO GATO ESTÁ AQUI
      .orderBy("horarioInicio", "desc")
      .onSnapshot(
        (snapshot) => {
          const rotasAtualizadas = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              horarioInicio: data.horarioInicio?.toDate
                ? data.horarioInicio.toDate().toISOString()
                : data.horarioInicio || new Date().toISOString(),
              horarioFim: data.horarioFim?.toDate
                ? data.horarioFim.toDate().toISOString()
                : data.horarioFim || new Date().toISOString(),
            };
          });

          state.rotas = rotasAtualizadas;
          localStorage.setItem("rotas", JSON.stringify(state.rotas));
          atualizarListaRotas();
        },
        (error) => {
          console.error("Erro no listener:", error);

          // Se o erro for de índice (acontece quando usa Where + OrderBy juntos)
          if (error.code === "failed-precondition") {
            console.error(
              "Falta criar índice no Firebase. Verifique o link no console."
            );
            mostrarNotificacao(
              "Erro de índice no banco. Avise o admin.",
              "error"
            );
          } else if (error.code === "permission-denied") {
            mostrarNotificacao(
              "Sem permissão. Tentando reconectar...",
              "warning"
            );
          } else {
            mostrarNotificacao(
              "Erro de conexão. Usando modo offline.",
              "error"
            );
          }
          carregarDadosLocal();
        }
      );

    console.log("Sincronização em tempo real ativada para usuário:", user.uid);
  } catch (error) {
    console.error("Erro ao iniciar listener:", error);
    carregarDadosLocal();
  }
}

// ============================================
// DADOS LOCAIS (FALLBACK OFFLINE)
// ============================================
export function carregarDadosLocal() {
  const rotasSalvas = localStorage.getItem("rotas");
  if (rotasSalvas) {
    try {
      state.rotas = JSON.parse(rotasSalvas);
      atualizarListaRotas();
    } catch (e) {
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
    const rotaParaSalvar = {
      ...rota,
      horarioInicio: window.firebase.firestore.Timestamp.fromDate(
        new Date(rota.horarioInicio)
      ),
      horarioFim: window.firebase.firestore.Timestamp.fromDate(
        new Date(rota.horarioFim)
      ),
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Remove o ID de dentro do objeto (pois já é o nome do documento)
    delete rotaParaSalvar.id;

    if (state.db && state.db.db) {
      // Salva no Firebase
      // O listener (onSnapshot) vai perceber a mudança e atualizar a tela sozinho
      await state.db.db.collection("rotas").doc(docId).set(rotaParaSalvar);
      console.log("Enviado para o Firebase");
    } else {
      // MODO OFFLINE (Salva manual se não tiver internet/banco)
      const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
      rotasLocais.unshift(rota);
      localStorage.setItem("rotas", JSON.stringify(rotasLocais));

      state.rotas = rotasLocais;
      atualizarListaRotas();
    }
  } catch (error) {
    console.error("Erro ao salvar rota:", error);
    mostrarNotificacao("Erro ao salvar. Verifique sua conexão.", "error");
    throw error; // Repassa o erro para o routes.js saber que falhou
  }
}

// ============================================
// FUNÇÃO PARA PARAR O OUVINTE (Logout)
// ============================================
export function pararSincronizacao() {
  if (state.listenerUnsubscribe) {
    state.listenerUnsubscribe(); // Função do Firebase que cancela o ouvinte
    state.listenerUnsubscribe = null;
    console.log("Sincronização parada.");
  }
}
