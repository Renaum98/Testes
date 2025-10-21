// Importa do arquivo firebaseConfig.js os módulos necessários para manipular o banco Firestore
import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

// Função que transforma a primeira letra de cada palavra em maiúscula
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(p => p.trim() !== "")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// 🔍 Busca sugestões de filmes no TMDb
async function buscarSugestoesTMDb(query) {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  if (!query || query.length < 2) return [];

  try {
    const resp = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`
    );
    const data = await resp.json();
    return data.results ? data.results.slice(0, 5) : [];
  } catch (err) {
    console.error("Erro ao buscar sugestões:", err);
    return [];
  }
}

// 🎬 Busca detalhes completos de um filme (sinopse e poster) pelo ID
async function buscarDetalhesTMDbPorId(idFilme) {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  try {
    const resp = await fetch(
      `https://api.themoviedb.org/3/movie/${idFilme}?api_key=${apiKey}&language=pt-BR`
    );
    const detalhes = await resp.json();
    return {
      sinopse: detalhes.overview || "Sinopse não encontrada.",
      poster: detalhes.poster_path
        ? `https://image.tmdb.org/t/p/w342${detalhes.poster_path}`
        : null,
      titulo: detalhes.title || "",
    };
  } catch (erro) {
    console.error("Erro ao buscar detalhes:", erro);
    return { sinopse: "Sinopse não encontrada.", poster: null, titulo: "" };
  }
}

// 🧠 Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");
  const inputFilme = document.getElementById("filme-id");
  const listaSugestoes = document.getElementById("lista-sugestoes");

  if (!inputFilme || !listaSugestoes) {
    console.error("Elemento de input ou lista de sugestões não encontrado!");
    return;
  }

  let timeout = null;
  let filmeSelecionado = null; // 🆕 guarda o filme escolhido (com ID)

  // 🔠 Sugestões automáticas enquanto digita
  inputFilme.addEventListener("input", () => {
    clearTimeout(timeout);
    const query = inputFilme.value.trim();

    if (query.length < 2) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      return;
    }

    timeout = setTimeout(async () => {
      const sugestoes = await buscarSugestoesTMDb(query);
      listaSugestoes.innerHTML = "";

      if (sugestoes.length === 0) {
        listaSugestoes.style.display = "none";
        return;
      }

      sugestoes.forEach(filme => {
        const li = document.createElement("li");
        li.textContent = `${filme.title} ${
          filme.release_date ? `(${filme.release_date.slice(0, 4)})` : ""
        }`;

        // 🆕 Quando clica em uma sugestão, salva ID e nome
        li.addEventListener("click", () => {
          inputFilme.value = filme.title;
          filmeSelecionado = {
            id: filme.id,
            titulo: filme.title,
          };
          listaSugestoes.innerHTML = "";
          listaSugestoes.style.display = "none";
        });

        listaSugestoes.appendChild(li);
      });

      listaSugestoes.style.display = "block";
    }, 400);
  });

  // Fecha a lista se clicar fora
  document.addEventListener("click", (e) => {
    if (e.target !== inputFilme) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
    }
  });

  // 🚀 Envio do formulário
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome-id").value;
      const onde = document.getElementById("onde-id").value;
      const genero = document.getElementById("genero-id").value;
      const categoria = document.getElementById("categoria-id").value;
      const nota = document.getElementById("nota-id").value;
      const filmeTitulo = capitalizarPalavras(inputFilme.value);

      if (!nome || !filmeTitulo || !onde || !genero || !nota || !categoria) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      if (nota > 5 || nota < 0) {
        alert("A nota precisa ser de 1 a 5");
        return;
      }

      // 🧠 Se o usuário clicou em uma sugestão, busca os detalhes exatos pelo ID
      let detalhes;
      if (filmeSelecionado?.id) {
        detalhes = await buscarDetalhesTMDbPorId(filmeSelecionado.id);
      } else {
        // fallback (usuário digitou manualmente)
        const sugestoes = await buscarSugestoesTMDb(filmeTitulo);
        if (sugestoes.length > 0)
          detalhes = await buscarDetalhesTMDbPorId(sugestoes[0].id);
        else detalhes = { sinopse: "Sinopse não encontrada.", poster: null };
      }

      await addDoc(collection(db, "filmes"), {
        nome,
        filme: detalhes.titulo || filmeTitulo,
        onde,
        genero,
        categoria,
        sinopse: detalhes.sinopse,
        poster: detalhes.poster,
        data: serverTimestamp(),
        avaliacoes: { [nome]: parseFloat(nota) },
      });

      alert(`${categoria}: ${filmeTitulo} adicionado por ${nome}!`);
      form.reset();
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      filmeSelecionado = null;
    });
  }

  // 🧹 Botão limpar
  btnLimpar?.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
    listaSugestoes.innerHTML = "";
    listaSugestoes.style.display = "none";
    filmeSelecionado = null;
  });
});
