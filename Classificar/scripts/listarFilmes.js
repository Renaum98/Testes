// Importa funções do Firebase necessárias para manipular dados no Firestore
import { db, collection, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "./firebaseConfig.js";

// Espera o carregamento completo do documento HTML antes de executar o script
document.addEventListener("DOMContentLoaded", () => {

  // Seleciona o container onde os filmes serão exibidos
  const filmesContainer = document.querySelector(".filmes_container");
  if (!filmesContainer) return; // se o container não existir, encerra o script

  // Cria um elemento <div> que será usado como modal (janela pop-up de avaliação)
  const modal = document.createElement("div");
  modal.classList.add("modal-avaliacao"); // adiciona uma classe para estilização

  // Define o conteúdo HTML interno do modal (formulário de avaliação)
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
  // Adiciona o modal ao corpo da página (fica oculto até ser usado)
  document.body.appendChild(modal);

  // Variável que guardará o ID do filme selecionado para avaliação
  let filmeSelecionadoId = null;

  // 🧩 Função que adiciona um filme na tela (cria o card visual)
  // Recebe todos os dados vindos do Firestore
  function adicionarFilmeNaTela(id, nome, filme, onde, genero, categoria, dataFirestore, sinopse, poster, avaliacoes = {}) {
    const item = document.createElement("div"); // cria o card
    item.classList.add("filmes_container-item"); // adiciona a classe CSS
    item.dataset.id = id; // armazena o ID do filme no atributo data-id (útil para exclusão/edição)

    // Converte o timestamp do Firestore em uma data legível
    let data = "Data desconhecida";
    if (dataFirestore?.toDate) {
      const d = dataFirestore.toDate();
      data = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }

    // Calcula a média das notas das avaliações
    const notas = Object.values(avaliacoes); // pega apenas os valores (notas)
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "–"; // média ou traço

    // Cria ícones de avaliadores (com imagem e nota)
    const avaliadores = Object.entries(avaliacoes).map(([a, n]) => `
      <div class="avaliador">
        <img src="imagens/perfil_${a.toLowerCase()}.png" title="${a}: ${n}⭐" class="avaliador-foto">
      </div>`).join("");

    // Monta o HTML do card de filme
    item.innerHTML = `
      <div class="filme_card-nome">
        <img src="imagens/perfil_${nome.toLowerCase()}.png" width="50" class="imagem_perfil" alt="${nome}">
        <p class="titulo-usuario">${nome}</p>
      </div>

      <div class="filme_card-dados">
        <div class="dados_filme">
          ${poster ? `<img src="${poster}" alt="Pôster de ${filme}" class="filme-poster">` : ''}
          <p class="titulo_filme">Filme: <span class="titulo_filme-escolhido">${filme}</span></p>
          <p class="titulo_onde">Onde: <span class="titulo_onde-escolhido">${onde}</span></p>
          <p class="titulo_genero">Gênero: <span class="titulo_genero-escolhido">${genero}</span></p>
          <p class="titulo_categoria">Categoria: <span class="titulo_categoria-escolhido">${categoria || "-"}</span></p>
          
          <!-- Botão para exibir ou ocultar sinopse -->
          <div class="titulo_sinopse">
            <button class="toggle-sinopse">Sinopse ▼</button>
            <div class="titulo_sinopse-texto" style="display: none;">
              ${sinopse || "Sinopse não encontrada."}
            </div>
          </div>

          <p class="titulo-data">${data}</p>
        </div>

        <!-- Exibe média geral -->
        <p class="titulo-media">
          <img src="imagens/icones/abobora_1.svg" alt="" width="20"> 
          Média: <strong>${media}</strong>
        </p>

        <!-- Exibe fotos dos avaliadores -->
        <div class="avaliadores-container">
          ${avaliadores || "<p class='sem-avaliacoes'>Nenhuma avaliação ainda</p>"}
        </div>
      </div>

      <!-- Botões de ação: excluir e assistir -->
      <div class="filme_card-acoes">
        <button class="btn-excluir" title="Excluir">X</button>
        <button class="botoes btn-assisti">Assisti</button>
      </div>
    `;

    // --- Funcionalidade do botão de mostrar/ocultar sinopse ---
    const toggleButton = item.querySelector(".toggle-sinopse");
    const sinopseTexto = item.querySelector(".titulo_sinopse-texto");

    toggleButton.addEventListener("click", () => {
      const isHidden = sinopseTexto.style.display === "none";
      sinopseTexto.style.display = isHidden ? "block" : "none"; // alterna visibilidade
      toggleButton.textContent = isHidden ? "Sinopse ▲" : "Sinopse ▼"; // muda texto do botão
    });

    // 🗑️ Evento para excluir o filme
    item.querySelector(".btn-excluir").addEventListener("click", async () => {
      if (confirm(`Excluir "${filme}"?`)) await deleteDoc(doc(db, "filmes", id)); // remove do Firestore
    });

    // 🎬 Evento para abrir o modal de avaliação
    item.querySelector(".btn-assisti").addEventListener("click", () => {
      filmeSelecionadoId = id; // guarda o ID do filme atual
      modal.style.display = "flex"; // exibe o modal
    });

    // Adiciona o card do filme no topo da lista (prepend = adiciona antes dos outros)
    filmesContainer.prepend(item);
  }

  // 🔥 Cria referência à coleção "filmes" e define a ordem por data (mais recentes primeiro)
  const filmesRef = collection(db, "filmes");
  const q = query(filmesRef, orderBy("data", "desc"));

  // onSnapshot cria um "listener" em tempo real (escuta alterações no banco)
  onSnapshot(q, (snap) => {
    filmesContainer.innerHTML = ""; // limpa o container antes de atualizar
    snap.forEach(docSnap => {
      const d = docSnap.data(); // pega os dados do documento
      // adiciona o filme na tela com todos os dados vindos do Firestore
      adicionarFilmeNaTela(
        docSnap.id,
        d.nome,
        d.filme,
        d.onde,
        d.genero,
        d.categoria,
        d.data,
        d.sinopse, // ✅ agora também exibe a sinopse
        d.poster,  
        d.avaliacoes || {} // avaliações (ou objeto vazio se não houver)
      );
    });
  });

  // 📊 Evento para enviar avaliação (dentro do modal)
  modal.querySelector("#enviar-avaliacao").addEventListener("click", async () => {
    const nomeAvaliador = modal.querySelector("#avaliador-nome").value;
    const nota = parseFloat(modal.querySelector("#nota-avaliacao").value);

    // Valida os campos (nome e nota válidos)
    if (!nomeAvaliador || isNaN(nota) || nota < 1 || nota > 5) {
      alert("Preencha nome e nota entre 1 e 5!");
      return;
    }

    // Atualiza o documento do filme com a nova avaliação
    await updateDoc(doc(db, "filmes", filmeSelecionadoId), {
      [`avaliacoes.${nomeAvaliador}`]: nota // sintaxe dinâmica para adicionar campo dentro de "avaliacoes"
    });

    // Fecha o modal após enviar a avaliação
    modal.style.display = "none";
  });

  // Evento para fechar o modal sem enviar
  modal.querySelector("#fechar-modal").addEventListener("click", () => {
    modal.style.display = "none";
  });
});
