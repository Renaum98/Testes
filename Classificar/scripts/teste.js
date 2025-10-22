// Importa as funções do Firebase para salvar dados no Firestore
import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

/* 
 Função utilitária: transforma a primeira letra de cada palavra em maiúscula.
 Exemplo: "senhor dos anéis" → "Senhor Dos Anéis"
*/
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(p => p.trim() !== "")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/* 
 Busca sugestões de filmes/séries/documentários no TMDb conforme o usuário digita.
 Retorna até 5 resultados para exibir na lista de sugestões.
*/
async function buscarSugestoesTMDb(query, tipo = "movie") {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  if (!query || query.length < 2) return [];

  try {
    // URL de busca (pode buscar filmes ou séries dependendo do tipo)
    const resp = await fetch(
      `https://api.themoviedb.org/3/search/${tipo}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`
    );
    const data = await resp.json();
    return data.results ? data.results.slice(0, 5) : [];
  } catch (err) {
    console.error("Erro ao buscar sugestões:", err);
    return [];
  }
}

/*
 Busca detalhes completos de um filme/série/documentário pelo ID no TMDb:
 - título
 - sinopse
 - pôster
 - gênero
 - provedores de streaming (Netflix, Prime Video etc.)
*/
async function buscarDetalhesTMDbPorId(idFilme, tipo = "movie") {
  const apiKey = "80343411a9bb47a166866336ace56f8b";

  try {
    // Busca os detalhes do conteúdo
    const resp = await fetch(
      `https://api.themoviedb.org/3/${tipo}/${idFilme}?api_key=${apiKey}&language=pt-BR`
    );
    const detalhes = await resp.json();

    // Busca as plataformas onde está disponível
    const respProviders = await fetch(
      `https://api.themoviedb.org/3/${tipo}/${idFilme}/watch/providers?api_key=${apiKey}`
    );
    const providersData = await respProviders.json();

    // Extrai os principais campos
    const titulo = detalhes.title || detalhes.name || "";
    const sinopse = detalhes.overview || "Sinopse não encontrada.";
    const poster = detalhes.poster_path
      ? `https://image.tmdb.org/t/p/w342${detalhes.poster_path}`
      : null;

    // Pega apenas o primeiro gênero (ex: "Ação")
    const genero = detalhes.genres?.[0]?.name || "Desconhecido";

    // Pega o primeiro provedor de streaming (ou "Não disponível")
    const ondeAssistir =
      providersData.results?.BR?.flatrate?.[0]?.provider_name ||
      providersData.results?.BR?.buy?.[0]?.provider_name ||
      providersData.results?.BR?.rent?.[0]?.provider_name ||
      "Não disponível";

    // Retorna os dados formatados
    return {
      titulo,
      sinopse,
      poster,
      genero,
      onde: ondeAssistir,
      categoria:
        tipo === "tv"
          ? "Série"
          : tipo === "movie"
          ? "Filme"
          : "Documentário",
    };
  } catch (erro) {
    console.error("Erro ao buscar detalhes:", erro);
    return {
      titulo: "",
      sinopse: "Sinopse não encontrada.",
      poster: null,
      genero: "Desconhecido",
      onde: "Não disponível",
      categoria: "Filme",
    };
  }
}

/*
 Quando a página carrega, tudo começa aqui.
 Este bloco configura:
 - sugestões automáticas
 - clique para selecionar o filme
 - envio do formulário ao Firebase
 - botão de limpar
*/
document.addEventListener("DOMContentLoaded", () => {
  // Seleciona elementos do DOM
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");
  const inputFilme = document.getElementById("filme-id");
  const listaSugestoes = document.getElementById("lista-sugestoes");
  const selectCategoria = document.getElementById("categoria-id");

  // Se algum elemento estiver faltando, avisa no console
  if (!inputFilme || !listaSugestoes) {
    console.error("Elemento de input ou lista de sugestões não encontrado!");
    return;
  }

  // Variáveis auxiliares
  let timeout = null;
  let filmeSelecionado = null;

  /* 
   Detecta digitação e busca sugestões automáticas após 400ms de pausa.
   A categoria selecionada (Filme / Série / Documentário) define o tipo de busca no TMDb.
  */
  inputFilme.addEventListener("input", () => {
    clearTimeout(timeout);
    const query = inputFilme.value.trim();
    const tipoSelecionado =
      selectCategoria.value === "Série"
        ? "tv"
        : selectCategoria.value === "Documentário"
        ? "movie" // TMDb não tem categoria "documentary" separada
        : "movie";

    if (query.length < 2) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      return;
    }

    // Espera um pouco antes de buscar (para evitar muitas requisições)
    timeout = setTimeout(async () => {
      const sugestoes = await buscarSugestoesTMDb(query, tipoSelecionado);
      listaSugestoes.innerHTML = "";

      if (sugestoes.length === 0) {
        listaSugestoes.style.display = "none";
        return;
      }

      // Cria lista de <li> com sugestões
      sugestoes.forEach(filme => {
        const li = document.createElement("li");
        li.textContent = `${filme.title || filme.name} ${
          filme.release_date
            ? `(${filme.release_date.slice(0, 4)})`
            : filme.first_air_date
            ? `(${filme.first_air_date.slice(0, 4)})`
            : ""
        }`;

        // Quando clica, guarda o ID e o tipo do conteúdo
        li.addEventListener("click", () => {
          inputFilme.value = filme.title || filme.name;
          filmeSelecionado = {
            id: filme.id,
            tipo: tipoSelecionado,
          };
          listaSugestoes.innerHTML = "";
          listaSugestoes.style.display = "none";
        });

        listaSugestoes.appendChild(li);
      });

      listaSugestoes.style.display = "block";
    }, 400);
  });

  // Fecha as sugestões se o usuário clicar fora
  document.addEventListener("click", (e) => {
    if (e.target !== inputFilme) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
    }
  });

  /*
   Quando o usuário envia o formulário:
   - Valida campos
   - Busca detalhes do TMDb
   - Adiciona o registro ao Firestore
  */
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome-id").value;
      const nota = document.getElementById("nota-id").value;
      const filmeTitulo = capitalizarPalavras(inputFilme.value);

      if (!nome || !filmeTitulo || !nota) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      if (nota > 5 || nota < 0) {
        alert("A nota precisa ser de 0 a 5");
        return;
      }

      // Se o usuário selecionou um item da lista, usa o ID para buscar detalhes exatos
      let detalhes;
      if (filmeSelecionado?.id) {
        detalhes = await buscarDetalhesTMDbPorId(
          filmeSelecionado.id,
          filmeSelecionado.tipo
        );
      } else {
        // Se digitou manualmente, tenta buscar pelo nome
        const tipoBusca =
          selectCategoria.value === "Série"
            ? "tv"
            : selectCategoria.value === "Documentário"
            ? "movie"
            : "movie";
        const sugestoes = await buscarSugestoesTMDb(filmeTitulo, tipoBusca);
        if (sugestoes.length > 0)
          detalhes = await buscarDetalhesTMDbPorId(sugestoes[0].id, tipoBusca);
        else
          detalhes = {
            sinopse: "Sinopse não encontrada.",
            poster: null,
            genero: "Desconhecido",
            onde: "Não disponível",
            categoria: selectCategoria.value,
          };
      }

      // Salva os dados no Firestore
      await addDoc(collection(db, "filmes"), {
        nome,
        filme: detalhes.titulo || filmeTitulo,
        genero: detalhes.genero,
        onde: detalhes.onde,
        categoria: detalhes.categoria,
        sinopse: detalhes.sinopse,
        poster: detalhes.poster,
        data: serverTimestamp(),
        avaliacoes: { [nome]: parseFloat(nota) },
      });

      alert(`${detalhes.categoria}: ${filmeTitulo} adicionado por ${nome}!`);
      form.reset();
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      filmeSelecionado = null;
    });
  }

  // Botão "Limpar" — reseta o formulário e limpa sugestões
  btnLimpar?.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
    listaSugestoes.innerHTML = "";
    listaSugestoes.style.display = "none";
    filmeSelecionado = null;
  });
});
