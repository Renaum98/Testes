// ===========================================================
// 🚀 IMPORTAÇÕES DO FIREBASE
// ===========================================================
// Importa os módulos necessários diretamente da CDN oficial do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,     // Acesso ao banco de dados Firestore
  collection,       // Usado para acessar uma coleção dentro do Firestore
  addDoc,           // Adiciona um novo documento (registro)
  deleteDoc,        // Exclui um documento existente
  doc,              // Obtém a referência de um documento específico
  updateDoc,        // Atualiza campos dentro de um documento
  onSnapshot,       // Escuta mudanças em tempo real no Firestore
  query,            // Cria uma consulta (por exemplo, com filtros e ordenação)
  orderBy,          // Ordena resultados de uma consulta
  serverTimestamp   // Gera uma data/hora do servidor Firebase (sincronizada)
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


// ===========================================================
// 🔧 CONFIGURAÇÃO DO FIREBASE
// ===========================================================
// Esses dados vêm do painel do Firebase (Configurações do app web).
// Permitem que seu site se conecte ao projeto correto no Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyATcKzRQ5IzxRXAGhUvySWLQvsT-858r4g",
  authDomain: "filmes-cb4a9.firebaseapp.com",
  projectId: "filmes-cb4a9",
  storageBucket: "filmes-cb4a9.firebasestorage.app",
  messagingSenderId: "867531338215",
  appId: "1:867531338215:web:8cebf9649b83651c6ecd42"
};

// Inicializa o Firebase e o Firestore (banco de dados)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ===========================================================
// 🧠 FUNÇÃO AUXILIAR – CAPITALIZAR PALAVRAS
// ===========================================================
// Transforma o texto para deixar a primeira letra de cada palavra em maiúscula.
// Exemplo: "vingadores guerra infinita" → "Vingadores Guerra Infinita"
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(palavra => palavra.trim() !== "") // Remove espaços extras
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
}


// ===========================================================
// 📋 LÓGICA PRINCIPAL DO SITE
// ===========================================================
document.addEventListener("DOMContentLoaded", async function () {

  // 🔹 Pega os elementos principais do HTML
  const form = document.getElementById("formulario");
  const filmesContainer = document.querySelector(".filmes_container");
  const btnLimpar = document.getElementById("limpar-id");


  // =======================================================
  // 🪟 MODAL DE AVALIAÇÃO
  // =======================================================
  // Cria dinamicamente uma janela de avaliação quando o usuário clicar em “Assisti”.
  const modal = document.createElement("div");
  modal.classList.add("modal-avaliacao");

  // HTML interno do modal
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

  let filmeSelecionadoId = null; // Guarda o ID do filme que o usuário está avaliando


  // =======================================================
  // 🎬 FUNÇÃO: EXIBIR UM FILME NA TELA
  // =======================================================
  function adicionarFilmeNaTela(id, nome, filme, onde, genero, categoria, dataFirestore, avaliacoes = {}) {

    const filmeItem = document.createElement("div");
    filmeItem.classList.add("filmes_container-item");
    filmeItem.setAttribute("data-id", id);

    // 🔹 Converte o timestamp do Firestore para data legível
    let dataFormatada = "Data desconhecida";
    if (dataFirestore && dataFirestore.toDate) {
      const dataJS = dataFirestore.toDate();
      dataFormatada = dataJS.toLocaleDateString("pt-BR") + " " +
                      dataJS.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    // 🔹 Calcula média das avaliações
    const notas = Object.values(avaliacoes);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "–";

    // 🔹 Mostra as fotos de quem avaliou
    const avaliadoresHTML = Object.entries(avaliacoes)
      .map(([avaliador, nota]) => `
        <div class="avaliador">
          <img src="imagens/perfil_${avaliador.toLowerCase()}.png"
               alt="${avaliador}"
               title="${avaliador}: ${nota}⭐"
               class="avaliador-foto">
        </div>
      `)
      .join("");

    // 🔹 Monta o HTML completo de um card de filme
    filmeItem.innerHTML = `
      <div class="filme_card-nome">
        <img src="imagens/perfil_${nome.toLowerCase()}.png" alt="${nome}" width="50" class="imagem_perfil">
        <p class="titulo-usuario">${nome}</p>
      </div>

      <div class="filme_card-dados">
        <div class="dados_filme">
          <p class="titulo_filme">Filme: <span class="titulo_filme-escolhido">${filme}</span></p>
          <p class="titulo_onde">Onde: <span class="titulo_onde-escolhido">${onde}</span></p>
          <p class="titulo_genero">Gênero: <span class="titulo_genero-escolhido">${genero}</span></p>
          <p class="titulo_genero">Categoria: <span class="titulo_categoria-escolhido">${categoria}</span></p>
          <p class="titulo-data">${dataFormatada}</p>
        </div>

        <p class="titulo-media"><img src="imagens/icones/abobora_1.svg" alt="" width="20"> 
        Média: <strong>${media}</strong></p>

        <div class="avaliadores-container">
          ${avaliadoresHTML || "<p class='sem-avaliacoes'>Nenhuma avaliação ainda</p>"}
        </div>
      </div>

      <div class="filme_card-acoes">
        <button class="btn-excluir" title="Excluir">X</button>
        <button class="botoes btn-assisti">Assisti</button>
      </div>
    `;


    // =======================================================
    // 🗑️ EVENTO: EXCLUIR UM FILME
    // =======================================================
    const btnExcluir = filmeItem.querySelector(".btn-excluir");
    btnExcluir.addEventListener("click", async () => {
    if (confirm(`Deseja realmente excluir "${filme}"?`)) {
      // 💫 Aplica a animação de sumir
      filmeItem.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      filmeItem.style.opacity = "0";
      filmeItem.style.transform = "translateY(-10px)";

      // Espera a animação terminar antes de deletar do Firestore
      setTimeout(async () => {
        await deleteDoc(doc(db, "filmes", id));
      }, 500);
  }
});


    // =======================================================
    // 🎥 EVENTO: AVALIAR UM FILME
    // =======================================================
    const btnAssisti = filmeItem.querySelector(".btn-assisti");
    btnAssisti.addEventListener("click", () => {
      filmeSelecionadoId = id; // guarda o ID do filme
      modal.style.display = "flex"; // abre o modal
    });

    filmesContainer.prepend(filmeItem); // adiciona o card no topo
  }


  // =======================================================
  // 🔁 ESCUTA EM TEMPO REAL (onSnapshot)
  // =======================================================
  // Cria uma consulta que ordena os filmes pelo campo "data" em ordem decrescente
  const filmesRef = collection(db, "filmes");
  const q = query(filmesRef, orderBy("data", "desc"));

  // onSnapshot() fica "ouvindo" alterações na coleção:
  // sempre que alguém adicionar, editar ou excluir um filme,
  // essa função é executada automaticamente.
  onSnapshot(q, (snapshot) => {
    filmesContainer.innerHTML = ""; // limpa a lista
    snapshot.forEach((docSnap) => {
      const dados = docSnap.data();
      adicionarFilmeNaTela(
        docSnap.id,
        dados.nome,
        dados.filme,
        dados.onde,
        dados.genero,
        dados.categoria,
        dados.data,
        dados.avaliacoes || {}
      );
    });
  });


  // =======================================================
  // ➕ ENVIO DE NOVO FILME
  // =======================================================
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Coleta os valores do formulário
    const nome = document.getElementById("nome-id").value;
    const filme = capitalizarPalavras(document.getElementById("filme-id").value);
    const onde = document.getElementById("onde-id").value;
    const genero = document.getElementById("genero-id").value;
    const categoria = document.getElementById("categoria-id").value;
    const nota = document.getElementById("nota-id").value;

    // Validação simples
    if (!nome || !filme || !onde || !genero || !nota || !categoria) {
      alert("Por favor, preencha todos os campos!");
      return;
    }
    if (nota > 5 || nota < 1){
      alert("A nota precisa ser de 1 a 5");
      return;
    }

    // Adiciona o documento ao Firestore
    await addDoc(collection(db, "filmes"), {
      nome,
      filme,
      onde,
      genero,
      categoria,
      data: serverTimestamp(), // 🔹 Data automática do servidor
      avaliacoes: {
        [nome]: parseFloat(nota)
      }
    });
    alert(`${categoria} : ${filme} adicionado! por ${nome}`)
    form.reset(); // limpa o formulário
  });


  // =======================================================
  // ⭐ ENVIO DE AVALIAÇÃO (DO MODAL)
  // =======================================================
  modal.querySelector("#enviar-avaliacao").addEventListener("click", async () => {
    const nomeAvaliador = modal.querySelector("#avaliador-nome").value;
    const nota = parseFloat(modal.querySelector("#nota-avaliacao").value);

    if (!nomeAvaliador || isNaN(nota) || nota < 1 || nota > 5) {
      alert("Preencha seu nome e uma nota entre 0 e 5!");
      return;
    }

    // Atualiza apenas o campo da avaliação do avaliador
    const docRef = doc(db, "filmes", filmeSelecionadoId);
    console.log("ID do filme selecionado:", filmeSelecionadoId);
    await updateDoc(docRef, {
      [`avaliacoes.${nomeAvaliador}`]: nota
    });

    // Fecha o modal e limpa os campos
    modal.style.display = "none";
    modal.querySelector("#avaliador-nome").value = "";
    modal.querySelector("#nota-avaliacao").value = "";
  });


  // =======================================================
  // ❌ FECHAR MODAL
  // =======================================================
  modal.querySelector("#fechar-modal").addEventListener("click", () => {
    modal.style.display = "none";
  });


  // =======================================================
  // 🧹 LIMPAR FORMULÁRIO
  // =======================================================
  btnLimpar.addEventListener("click", e => {
    e.preventDefault();
    form.reset();
  });
});

// ============================
// 🎢 Efeito de cabeçalho fixo e dinâmico
// ============================
window.addEventListener("scroll", () => {
  const cabecalho = document.querySelector(".cabecalho");

  if (window.scrollY > 50) {
    cabecalho.classList.add("shrink");
  } else {
    cabecalho.classList.remove("shrink");
  }
});