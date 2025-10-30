// Importa funções do Firebase necessárias
import { db, collection, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", () => {
  const filmesContainer = document.querySelector(".filmes_container");
  const filtroGenero = document.getElementById("filtro-genero");
  const filtroCategoria = document.getElementById("filtro-categoria");
  const filtroOnde = document.getElementById("filtro-onde");
  const campoBusca = document.getElementById("filtro-buscar");
  const botaoSortear = document.getElementById("filtro-sortear");

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

      <label for="nota-avaliacao">Nota (1 a 5):</label>
      <input type="number" id="nota-avaliacao" min="1" max="5" step="1" inputmode="numeric">

      <div class="botoes-modal">
        <button id="enviar-avaliacao" class="botoes">Enviar</button>
        <button id="fechar-modal" class="botoes">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Cria o modal de sorteio
  const modalSorteio = document.createElement("div");
  modalSorteio.classList.add("modal-sorteio");
  modalSorteio.innerHTML = `
    <div class="modal-conteudo-sorteio">
      <div id="resultado-sorteio"></div>
      <button id="fechar-modal-sorteio" class="botoes">Fechar</button>
    </div>
  `;
  document.body.appendChild(modalSorteio);

  let filmeSelecionadoId = null;
  let todosFilmes = []; // guarda todos os filmes carregados do Firestore

  // 🆕 Função para atualizar avaliações sem recriar o card
  function atualizarAvaliacoesNoCard(card, novasAvaliacoes) {
    // Calcula nova média
    const notas = Object.values(novasAvaliacoes);
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "–";
    
    // Atualiza elemento da média
    const mediaElement = card.querySelector('.titulo-media strong');
    if (mediaElement) {
      mediaElement.textContent = media;
    }
    
    // Atualiza fotos dos avaliadores
    const avaliadoresHTML = Object.entries(novasAvaliacoes)
      .map(([a, n]) => `
        <div class="avaliador">
          <img src="imagens/perfil_${a.toLowerCase()}.png" title="${a}: ${n}⭐" class="avaliador-foto">
        </div>`)
      .join("");
    
    const avaliadoresContainer = card.querySelector('.avaliadores-container');
    if (avaliadoresContainer) {
      avaliadoresContainer.innerHTML = avaliadoresHTML || "<p class='sem-avaliacoes'>Nenhuma avaliação ainda</p>";
    }
  }

  // 🧩 Função que cria o card de cada filme
  function adicionarFilmeNaTela(id, nome, filme, onde, genero, categoria, dataFirestore, sinopse, poster, avaliacoes = {}) {
    // Evita duplicar o card se ele já existir
    if (document.querySelector(`.filmes_container-item[data-id="${id}"]`)) return;

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
          <img src="imagens/icones/estrela.svg" alt="" width="20" class="icone-media">
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

    const caixa = item.querySelector(".titulo_onde-escolhido");
    if (caixa) {
      switch (caixa.textContent.trim()) {
        case "MUBI": caixa.style.backgroundColor = "#081ca9"; caixa.style.color = "white"; break; 
        case "Disney Plus":
          caixa.textContent = "Disney+"
          caixa.style.backgroundColor = "#062f41"; 
          caixa.style.color = "white";     
          break;
        case "Amazon Prime Video":
          caixa.textContent = "Prime Video";
          caixa.style.backgroundColor = "#0d7cff";
          caixa.style.color = "white";
          break;
        case "Netflix": caixa.style.backgroundColor = "#e6111b"; caixa.style.color = "white"; break;
        case "Aluguel": caixa.style.backgroundColor = "yellow"; caixa.style.color = "black"; break;
        case "Mercado Play": caixa.style.backgroundColor = "#fee708"; caixa.style.color = "black"; break;
        case "HBO Max": caixa.style.backgroundColor = "#821c9c"; caixa.style.color = "white"; break;
        case "Apple TV+": caixa.style.backgroundColor = "#272727"; caixa.style.color = "white"; break;
        case "Telecine Amazon Channel":
          caixa.textContent = "Telecine";
          caixa.style.backgroundColor = "#040435";
      }
    }

    // Mostrar/ocultar sinopse
    const toggleButton = item.querySelector(".toggle-sinopse");
    const sinopseTexto = item.querySelector(".titulo_sinopse-texto");
    toggleButton.addEventListener("click", () => {
      const hidden = sinopseTexto.style.display === "none";
      sinopseTexto.style.display = hidden ? "block" : "none";
      sinopseTexto.style.transition = "0.3s";
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

  // 🔥 Firebase: escuta mudanças em tempo real (melhorado com docChanges)
  const filmesRef = collection(db, "filmes");
  const q = query(filmesRef, orderBy("data", "desc"));

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      const docSnap = change.doc;
      const d = docSnap.data();

      if (change.type === "added") {
        todosFilmes.push({ id: docSnap.id, ...d });
        adicionarFilmeNaTela(
          docSnap.id,
          d.nome,
          d.filme,
          d.onde,
          d.genero,
          d.categoria,
          d.data,
          d.sinopse,
          d.poster,
          d.avaliacoes || {}
        );
      }

      // ✅ CORREÇÃO APLICADA: Atualiza apenas as avaliações sem remover o card
      if (change.type === "modified") {
        const index = todosFilmes.findIndex(f => f.id === docSnap.id);
        if (index !== -1) todosFilmes[index] = { id: docSnap.id, ...d };
        
        const card = filmesContainer.querySelector(`.filmes_container-item[data-id="${docSnap.id}"]`);
        if (card) {
          // ✅ ATUALIZA APENAS O NECESSÁRIO - SEM REMOVER O CARD
          atualizarAvaliacoesNoCard(card, d.avaliacoes || {});
        } else {
          // Caso raro: se o card não existir, cria um novo
          adicionarFilmeNaTela(
            docSnap.id,
            d.nome,
            d.filme,
            d.onde,
            d.genero,
            d.categoria,
            d.data,
            d.sinopse,
            d.poster,
            d.avaliacoes || {}
          );
        }
      }

      if (change.type === "removed") {
        todosFilmes = todosFilmes.filter(f => f.id !== docSnap.id);
        const card = filmesContainer.querySelector(`.filmes_container-item[data-id="${docSnap.id}"]`);
        if (card) card.remove();
      }
    });

    // Atualiza filtros dinamicamente com base nos filmes atuais
    const generosSet = new Set();
    const categoriasSet = new Set();
    const ondeSet = new Set();

    todosFilmes.forEach(f => {
      if (f.genero) generosSet.add(f.genero);
      if (f.categoria) categoriasSet.add(f.categoria);
      if (f.onde) ondeSet.add(f.onde);
    });

    preencherFiltros([...generosSet], [...categoriasSet], [...ondeSet]);
  });

  // 🧠 Preenche dinamicamente os selects de filtro
  function preencherFiltros(generos, categorias, ondes) {
    filtroCategoria.innerHTML = `<option value="">Todas as Categorias</option>`;
    filtroGenero.innerHTML = `<option value="">Todos os Gêneros</option>`;
    filtroOnde.innerHTML = `<option value="">Todas as Plataformas</option>`;

    categorias.sort().forEach(c => {
      const option = document.createElement("option");
      option.value = c;
      option.textContent = c;
      filtroCategoria.appendChild(option);
    });

    generos.sort().forEach(g => {
      const option = document.createElement("option");
      option.value = g;
      option.textContent = g;
      filtroGenero.appendChild(option);
    });


    ondes.sort().forEach(o => {
      const option = document.createElement("option");
      option.value = o;
      option.textContent = o;
      filtroOnde.appendChild(option);
    });
  }

  // 📋 Atualiza lista com base nos filtros
  function atualizarLista() {
    filmesContainer.innerHTML = "";

    const categoriaSelecionada = filtroCategoria.value;
    const generoSelecionado = filtroGenero.value;
    const ondeSelecionado = filtroOnde.value;
    const termoBusca = campoBusca.value.trim().toLowerCase();

    const filtrados = todosFilmes.filter(f => {
      const generoOK = !generoSelecionado || f.genero === generoSelecionado;
      const categoriaOK = !categoriaSelecionada || f.categoria === categoriaSelecionada;
      const ondeOK = !ondeSelecionado || f.onde === ondeSelecionado;
      
      const buscaOK = !termoBusca || 
      f.filme?.toLowerCase().includes(termoBusca) || 
      f.nome?.toLowerCase().includes(termoBusca);

      return categoriaOK && generoOK && ondeOK && buscaOK;
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

  // 🎲 Função para sortear um filme
  function sortearFilme() {
    if (todosFilmes.length === 0) {
      alert("Nenhum filme disponível para sortear!");
      return;
    }

    // Filtra os filmes visíveis (aplicando os filtros atuais)
    const filmesFiltrados = todosFilmes.filter(filme => {
      const generoSelecionado = filtroGenero.value;
      const categoriaSelecionada = filtroCategoria.value;
      const ondeSelecionado = filtroOnde.value;
      const termoBusca = campoBusca.value.trim().toLowerCase();

      const generoOK = !generoSelecionado || filme.genero === generoSelecionado;
      const categoriaOK = !categoriaSelecionada || filme.categoria === categoriaSelecionada;
      const ondeOK = !ondeSelecionado || filme.onde === ondeSelecionado;
      
      const buscaOK = !termoBusca || 
          filme.filme?.toLowerCase().includes(termoBusca) || 
          filme.nome?.toLowerCase().includes(termoBusca);

      return generoOK && categoriaOK && ondeOK && buscaOK;
    });

    if (filmesFiltrados.length === 0) {
      alert("Nenhum filme encontrado com os filtros atuais!");
      return;
    }

    // Sorteia um filme aleatório
    const indiceSorteado = Math.floor(Math.random() * filmesFiltrados.length);
    const filmeSorteado = filmesFiltrados[indiceSorteado];

    // Mostra o resultado no modal e destaca o filme
    mostrarResultadoSorteio(filmeSorteado);
  }

  // 🎯 Função para mostrar o resultado do sorteio no modal
  function mostrarResultadoSorteio(filme) {
    const resultadoDiv = document.getElementById("resultado-sorteio");
    
    // Calcula a média das avaliações
    const notas = Object.values(filme.avaliacoes || {});
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "Sem avaliações";
    
    resultadoDiv.innerHTML = `
      <div class="filme-sorteado-info">
        <h3>${filme.filme}</h3>
        ${filme.poster ? `<img src="${filme.poster}" alt="Pôster de ${filme.filme}" class="poster-sorteio">` : ''}
        <div class="info-sorteio">
          <p><strong> Indicado por:</strong> ${filme.nome}</p>
          <p><strong>📺 Plataforma:</strong> ${filme.onde}</p>
          <p><strong>🎭 Gênero:</strong> ${filme.genero}</p>
          <p><strong>📊 Categoria:</strong> ${filme.categoria || "-"}</p>
        </div>
      </div>
    `;
    
    modalSorteio.style.display = "flex";
  }

  // Eventos dos selects
  filtroGenero.addEventListener("change", atualizarLista);
  filtroCategoria.addEventListener("change", atualizarLista);
  filtroOnde.addEventListener("change", atualizarLista);
  campoBusca.addEventListener("input", atualizarLista);

  // Event listener para o botão de sortear
  botaoSortear.addEventListener("click", sortearFilme);

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

  // Fechar modal de avaliação
  modal.querySelector("#fechar-modal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Fechar modal de sorteio
  document.getElementById("fechar-modal-sorteio").addEventListener("click", () => {
    modalSorteio.style.display = "none";
  });

  // Fechar modais ao clicar fora
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
    if (e.target === modalSorteio) {
      modalSorteio.style.display = "none";
    }
  });
});