import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ============================
// 🔧 Configuração do Firebase
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyATcKzRQ5IzxRXAGhUvySWLQvsT-858r4g",
  authDomain: "filmes-cb4a9.firebaseapp.com",
  projectId: "filmes-cb4a9",
  storageBucket: "filmes-cb4a9.firebasestorage.app",
  messagingSenderId: "867531338215",
  appId: "1:867531338215:web:8cebf9649b83651c6ecd42"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ======================================
// 🧠 Função de capitalização
// ======================================
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(palavra => palavra.trim() !== "")
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
}

// ======================================
// 📋 Manipulação do formulário
// ======================================
document.addEventListener("DOMContentLoaded", async function () {
  const form = document.getElementById("formulario");
  const filmesContainer = document.querySelector(".filmes_container");
  const btnLimpar = document.getElementById("limpar-id");

  // ======================
  // 🪟 Modal de Avaliação
  // ======================
  const modal = document.createElement("div");
  modal.classList.add("modal-avaliacao");
  modal.innerHTML = `
    <div class="modal-conteudo">
      <label for="avaliador-nome">Seu nome:</label>
      <select id="avaliador-nome">
        <option value="" disabled selected></option>
        <option value="Renan">Renan</option>
        <option value="Bruna">Bruna</option>
        <option value="Cauane">Cauane</option>
        <option value="Fabio">Fabio</option>
      </select>

      <label for="nota-avaliacao">Nota (0 a 5):</label>
      <input type="number" id="nota-avaliacao" min="0" max="5" step="1">

      <div class="botoes-modal">
        <button id="enviar-avaliacao" class="botoes">Enviar</button>
        <button id="fechar-modal" class="botoes">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let filmeSelecionadoId = null;

  // -------------------------------
  // 🔹 Exibir um filme na tela
  // -------------------------------
  function adicionarFilmeNaTela(id, nome, filme, onde, genero, dataFirestore, avaliacoes = {}) {
    const filmeItem = document.createElement("div");
    filmeItem.classList.add("filmes_container-item");
    filmeItem.setAttribute("data-id", id);

    // 🔹 Formata a data do Firestore
    let dataFormatada = "Data desconhecida";
    if (dataFirestore && dataFirestore.toDate) {
      const dataJS = dataFirestore.toDate();
      dataFormatada = dataJS.toLocaleDateString("pt-BR") + " " + dataJS.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    const notas = Object.values(avaliacoes);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "–";

    const avaliadoresHTML = Object.entries(avaliacoes)
      .map(([avaliador, nota]) => `
        <div class="avaliador">
          <img src="imagens/perfil_${avaliador.toLowerCase()}.png" alt="${avaliador}" title="${avaliador}: ${nota}⭐" class="avaliador-foto">
        </div>
      `)
      .join("");

    filmeItem.innerHTML = `
      <div class="filme_card-nome">
        <img src="imagens/perfil_${nome.toLowerCase()}.png" alt="${nome}" width="50" class="imagem_perfil">
        <p class="titulo-usuario">${nome}</p>
      </div>

      <div class="filme_card-dados">
        <div class="dados_filme">
          <p class="titulo_filme">Filme: <span class="titulo_filme-escolhido">${filme}</span></p>
          <div class="grupo_filho-1">
            <p class="titulo_onde">Onde: <span class="titulo_onde-escolhido">${onde}</span></p>
            <p class="titulo_genero">Gênero: <span class="titulo_genero-escolhido">${genero}</span></p>
          </div>
          <p class="titulo-data">${dataFormatada}</p>
        </div>

        <p class="titulo-media">🎃 Média: <strong>${media}</strong></p>

        <div class="avaliadores-container">
          ${avaliadoresHTML || "<p class='sem-avaliacoes'>Nenhuma avaliação ainda</p>"}
        </div>
      </div>

      <div class="filme_card-acoes">
        <button class="btn-excluir" title="Excluir">X</button>
        <button class="botoes btn-assisti">Assisti</button>
      </div>
    `;

    // 🗑️ Excluir
    const btnExcluir = filmeItem.querySelector(".btn-excluir");
    btnExcluir.addEventListener("click", async () => {
      if (confirm(`Deseja realmente excluir "${filme}"?`)) {
        await deleteDoc(doc(db, "filmes", id));
      }
    });

    // 🎬 Assisti
    const btnAssisti = filmeItem.querySelector(".btn-assisti");
    btnAssisti.addEventListener("click", () => {
      filmeSelecionadoId = id;
      modal.style.display = "flex";
    });

    filmesContainer.prepend(filmeItem);
  }

  // ---------------------------------
  // 🔹 Listener em tempo real
  // ---------------------------------
  const filmesRef = collection(db, "filmes");
  const q = query(filmesRef, orderBy("data", "desc"));

  onSnapshot(q, (snapshot) => {
    filmesContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      adicionarFilmeNaTela(
        docSnap.id,
        dados.nome,
        dados.filme,
        dados.onde,
        dados.genero,
        dados.data,
        dados.avaliacoes || {}
      );
    });
  });

  // ---------------------------------
  // 🔹 Enviar novo filme
  // ---------------------------------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nome = document.getElementById("nome-id").value;
    const filme = capitalizarPalavras(document.getElementById("filme-id").value);
    const onde = document.getElementById("onde-id").value;
    const genero = document.getElementById("genero-id").value;

    if (!nome || !filme || !onde || !genero) {
      alert("Por favor, preencha todos os campos!");
      return;
    }

    await addDoc(collection(db, "filmes"), {
      nome,
      filme,
      onde,
      genero,
      data: serverTimestamp(), // ⏰ salva como timestamp
      avaliacoes: {}
    });

    form.reset();
  });

  // ---------------------------------
  // 🔹 Enviar Avaliação (Modal)
  // ---------------------------------
  modal.querySelector("#enviar-avaliacao").addEventListener("click", async () => {
    const nomeAvaliador = modal.querySelector("#avaliador-nome").value;
    const nota = parseInt(modal.querySelector("#nota-avaliacao").value);

    if (!nomeAvaliador || isNaN(nota) || nota < 0 || nota > 5) {
      alert("Preencha seu nome e uma nota entre 0 e 5!");
      return;
    }

    const docRef = doc(db, "filmes", filmeSelecionadoId);
    await updateDoc(docRef, {
      [`avaliacoes.${nomeAvaliador}`]: nota
    });

    modal.style.display = "none";
    modal.querySelector("#avaliador-nome").value = "";
    modal.querySelector("#nota-avaliacao").value = "";
  });

  // Fechar modal
  modal.querySelector("#fechar-modal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Limpar formulário
  btnLimpar.addEventListener("click", e => {
    e.preventDefault();
    form.reset();
  });
});
