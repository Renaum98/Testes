// Importa funções do Firebase necessárias
import { db, collection, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", () => {
  const filmesContainer = document.querySelector(".filmes_container");
  const filtroGenero = document.getElementById("filtro-genero");
  const filtroCategoria = document.getElementById("filtro-categoria");

  if (!filmesContainer) return;

  // Cria o modal de avaliação
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
      <input type="number" id="nota-avaliacao" min="0" max="5" step="1" inputmode="numeric">

      <div class="botoes-modal">
        <button id="enviar-avaliacao" class="botoes">Enviar</button>
        <button id="fechar-modal" class="botoes">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let filmeSelecionadoId = null;
  let todosFilmes = []; // guarda todos os filmes carregados do Firestore

  // 🧩 Função que cria o card de cada filme
  function adicionarFilmeNaTela(id, nome, filme, onde, genero, categoria, dataFirestore, sinopse, poster, avaliacoes = {}) {
    const item = document.createElement("div");
    item.classList.add("filmes_container-item");
    item.dataset.id = id;

    // Data formatada
    let data = "Data desconhecida";
    if (dataFirestore?.toDate) {
      const d = dataFirestore.toDate();
      data = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    // Média de avaliações
    const notas = Object.values(avaliacoes);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "–";

    // Fotos de avaliadores
    const avaliadores = Object.entries(avaliacoes)
      .map(([a, n]) => `
        <div class="avaliador">
          <img src="imagens/perfil_${a.toLowerCase()}.png" title="${a}: ${n}⭐" class="avaliador-foto">
        </div>`)
      .join("");

    // HTML do card
    item.innerHTML = `
      <div class="filme_card-nome">
        <img src="imagens/perfil_${nome.toLowerCase()}.png" width="30" class="imagem_perfil" alt="${nome}">
        <p class="titulo-usuario">${nome}</p>
      </div>

      <div class="filme_card-dados">
        <div class="dados_filme">
          ${poster ? `<img src="${poster}" alt="Pôster de ${filme}" class="filme-poster">` : ""}
          <p class="titulo_filme">Filme: <span class="titulo_filme-escolhido">${filme}</span></p>
          <p class="titulo_onde">Onde: <span class="titulo_onde-escolhido">${onde}</span></p>
          <p class="titulo_genero">Gênero: <span class="titulo_genero-escolhido">${genero}</span></p>
          <p class="titulo_categoria">Categoria: <span class="titulo_categoria-escolhido">${categoria || "-"}</span></p>

          <div class="titulo_sinopse">
            <button class="toggle-sinopse">Sinopse ▼</button>
            <div class="titulo_sinopse-texto" style="display: none;">
              ${sinopse || "Sinopse não encontrada."}
            </div>
          </div>

          <p class="titulo-data">${data}</p>
        </div>

        <p class="titulo-media">
          <img src="imagens/icones/abobora_1.svg" alt="" width="20">
          Média: <strong>${media}</strong>
        </p>

        <div class="avaliadores-container">
          ${avaliadores || "<p class='sem-avaliacoes'>Nenhuma avaliação ainda</p>"}
        </div>
      </div>

      <div class="filme_card-acoes">
        <button class="btn-excluir" title="Excluir">X</button>
        <button class="botoes btn-assisti">Assisti</button>
      </div>
    `;

    const caixaOnde = document.querySelectorAll(".titulo_onde-escolhido");
    caixaOnde.forEach((caixa) => {
        switch (caixa.textContent.trim()) {
          case "Mubi":
            caixa.style.backgroundColor = "#081ca9"
            caixa.style.color = "white"
            break;

          case "Disney+":
            caixa.style.backgroundColor = "#062f41"
            caixa.style.color = "white"
            break;

          case "Prime" || "Amazon Prime Video":
            caixa.style.backgroundColor = "#0d7cff"
            caixa.style.color = "white"
            break;

          case "Netflix":
            caixa.style.backgroundColor = "#e6111b"
            caixa.style.color = "white"
            break;

          case "Aluguel":
            caixa.style.backgroundColor = "Yellow"
            caixa.style.color = "black"
            break;

          case "Mercado Play":
            caixa.style.backgroundColor = "#fee708"
            caixa.style.color = "black"
            break;

          case "HBO Max":
            caixa.style.backgroundColor = "#821c9c"
            caixa.style.color = "white"
            break;
          
          case "Apple TV+":
            caixa.style.backgroundColor = "#272727"
            caixa.style.color = "white"
            break;
        
          default:
              break;
        }
    })


    // Mostrar/ocultar sinopse
    const toggleButton = item.querySelector(".toggle-sinopse");
    const sinopseTexto = item.querySelector(".titulo_sinopse-texto");
    toggleButton.addEventListener("click", () => {
      const hidden = sinopseTexto.style.display === "none";
      sinopseTexto.style.display = hidden ? "block" : "none";
      toggleButton.textContent = hidden ? "Sinopse ▲" : "Sinopse ▼";
    });

    // Excluir
    item.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (confirm(`Excluir "${filme}"?`)) await deleteDoc(doc(db, "filmes", id));
    });

    // Avaliar
    item.querySelector(".btn-assisti").addEventListener("click", () => {
      filmeSelecionadoId = id;
      modal.style.display = "flex";
    });

    filmesContainer.appendChild(item);
  }

  // 🔥 Firebase: escuta mudanças em tempo real
  const filmesRef = collection(db, "filmes");
  const q = query(filmesRef, orderBy("data", "desc"));

  onSnapshot(q, (snap) => {
    todosFilmes = [];
    const generosSet = new Set();
    const categoriasSet = new Set();

    snap.forEach(docSnap => {
      const d = docSnap.data();
      todosFilmes.push({
        id: docSnap.id,
        ...d
      });

      if (d.genero) generosSet.add(d.genero);
      if (d.categoria) categoriasSet.add(d.categoria);
    });

    preencherFiltros([...generosSet], [...categoriasSet]);
    atualizarLista();
  });

  // 🧠 Função que preenche dinamicamente os selects de filtro
  function preencherFiltros(generos, categorias) {
    filtroGenero.innerHTML = `<option value="">Todos os Gêneros</option>`;
    filtroCategoria.innerHTML = `<option value="">Todas as Categorias</option>`;

    generos.sort().forEach(g => {
      const option = document.createElement("option");
      option.value = g;
      option.textContent = g;
      filtroGenero.appendChild(option);
    });

    categorias.sort().forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      filtroCategoria.appendChild(option);
    });
  }

  // 📋 Atualiza lista com base nos filtros
  function atualizarLista() {
    filmesContainer.innerHTML = "";

    const generoSelecionado = filtroGenero.value;
    const categoriaSelecionada = filtroCategoria.value;

    const filtrados = todosFilmes.filter(f => {
      const generoOK = !generoSelecionado || f.genero === generoSelecionado;
      const categoriaOK = !categoriaSelecionada || f.categoria === categoriaSelecionada;
      return generoOK && categoriaOK;
    });

    if (filtrados.length === 0) {
      filmesContainer.innerHTML = "<p style='text-align:center;color:#777;'>Nenhum filme encontrado.</p>";
      return;
    }

    filtrados.forEach(f => {
      adicionarFilmeNaTela(
        f.id,
        f.nome,
        f.filme,
        f.onde,
        f.genero,
        f.categoria,
        f.data,
        f.sinopse,
        f.poster,
        f.avaliacoes || {}
      );
    });
  }

  // Eventos dos selects
  filtroGenero.addEventListener("change", atualizarLista);
  filtroCategoria.addEventListener("change", atualizarLista);

  // Enviar avaliação
  modal.querySelector("#enviar-avaliacao").addEventListener("click", async () => {
    const nomeAvaliador = modal.querySelector("#avaliador-nome").value;
    const nota = parseFloat(modal.querySelector("#nota-avaliacao").value);

    if (!nomeAvaliador || isNaN(nota) || nota < 1 || nota > 5) {
      alert("Preencha nome e nota entre 1 e 5!");
      return;
    }

    await updateDoc(doc(db, "filmes", filmeSelecionadoId), {
      [`avaliacoes.${nomeAvaliador}`]: nota
    });

    modal.style.display = "none";
  });

  // Fechar modal
  modal.querySelector("#fechar-modal").addEventListener("click", () => {
    modal.style.display = "none";
  });
});

