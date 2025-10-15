import { db, collection, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", () => {

  const filmesContainer = document.querySelector(".filmes_container");
  if (!filmesContainer) return;

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

  // 🧩 Agora recebendo sinopse
  function adicionarFilmeNaTela(id, nome, filme, onde, genero, categoria, dataFirestore, sinopse, avaliacoes = {}) {
    const item = document.createElement("div");
    item.classList.add("filmes_container-item");
    item.dataset.id = id;

    let data = "Data desconhecida";
    if (dataFirestore?.toDate) {
      const d = dataFirestore.toDate();
      data = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    const notas = Object.values(avaliacoes);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "–";

    const avaliadores = Object.entries(avaliacoes).map(([a, n]) => `
      <div class="avaliador">
        <img src="imagens/perfil_${a.toLowerCase()}.png" title="${a}: ${n}⭐" class="avaliador-foto">
      </div>`).join("");

    item.innerHTML = `
      <div class="filme_card-nome">
        <img src="imagens/perfil_${nome.toLowerCase()}.png" width="50" class="imagem_perfil" alt="${nome}">
        <p class="titulo-usuario">${nome}</p>
      </div>

      <div class="filme_card-dados">

      
        <div class="dados_filme">
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

    const toggleButton = item.querySelector(".toggle-sinopse");
    const sinopseTexto = item.querySelector(".titulo_sinopse-texto");

    toggleButton.addEventListener("click", () => {
      const isHidden = sinopseTexto.style.display === "none";
      sinopseTexto.style.display = isHidden ? "block" : "none";
      toggleButton.textContent = isHidden ? "Sinopse ▲" : "Sinopse ▼";
    });

    // 🗑️ Excluir filme
    item.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (confirm(`Excluir "${filme}"?`)) await deleteDoc(doc(db, "filmes", id));
    });

    // 🎬 Modal de avaliação
    item.querySelector(".btn-assisti").addEventListener("click", () => {
      filmeSelecionadoId = id;
      modal.style.display = "flex";
    });

    filmesContainer.prepend(item);
  }

  // 🔥 Listener do Firestore
  const filmesRef = collection(db, "filmes");
  const q = query(filmesRef, orderBy("data", "desc"));

  onSnapshot(q, (snap) => {
    filmesContainer.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      adicionarFilmeNaTela(
        docSnap.id,
        d.nome,
        d.filme,
        d.onde,
        d.genero,
        d.categoria,
        d.data,
        d.sinopse,  // ✅ agora enviando sinopse
        d.avaliacoes || {}
      );
    });
  });

  // 📊 Enviar avaliação
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

  modal.querySelector("#fechar-modal").addEventListener("click", () => {
    modal.style.display = "none";
  });
});
