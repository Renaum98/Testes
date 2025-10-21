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

// 🧠 Função assíncrona que busca a sinopse de um filme na API do TMDb
async function buscarSinopseTMDb(filme) {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  const baseUrl = "https://api.themoviedb.org/3/search/movie";
  const detalhesUrl = "https://api.themoviedb.org/3/movie";

  try {
    const r1 = await fetch(`${baseUrl}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(filme)}`);
    const data = await r1.json();

    if (data.results && data.results.length > 0) {
      const filmeEncontrado = data.results[0];
      const idFilme = filmeEncontrado.id;

      const r2 = await fetch(`${detalhesUrl}/${idFilme}?api_key=${apiKey}&language=pt-BR`);
      const detalhes = await r2.json();

      return {
        sinopse: detalhes.overview || "Sinopse não encontrada.",
        poster: filmeEncontrado.poster_path
          ? `https://image.tmdb.org/t/p/w500${filmeEncontrado.poster_path}`
          : null,
      };
    } else {
      return { sinopse: "Sinopse não encontrada.", poster: null };
    }
  } catch (erro) {
    console.error("Erro ao buscar sinopse:", erro);
    return { sinopse: "Sinopse não encontrada.", poster: null };
  }
}

// 🧩 Função para buscar sugestões conforme o usuário digita
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

// 🧠 Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");
  const inputFilme = document.getElementById("filme-id");
  const listaSugestoes = document.getElementById("lista-sugestoes"); // usa o UL existente

  let timeout = null;

  // 🔍 Evento de digitação no campo de filme
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

      // Mostra as sugestões no UL já existente
      sugestoes.forEach(filme => {
        const li = document.createElement("li");
        li.textContent = `${filme.title} ${filme.release_date ? `(${filme.release_date.slice(0, 4)})` : ""}`;
        li.addEventListener("click", () => {
          inputFilme.value = filme.title;
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
      const filme = capitalizarPalavras(document.getElementById("filme-id").value);
      const onde = document.getElementById("onde-id").value;
      const genero = document.getElementById("genero-id").value;
      const categoria = document.getElementById("categoria-id").value;
      const nota = document.getElementById("nota-id").value;

      if (!nome || !filme || !onde || !genero || !nota || !categoria) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      if (nota > 5 || nota < 1) {
        alert("A nota precisa ser de 1 a 5");
        return;
      }

      const { sinopse, poster } = await buscarSinopseTMDb(filme);

      await addDoc(collection(db, "filmes"), {
        nome,
        filme,
        onde,
        genero,
        categoria,
        sinopse,
        poster,
        data: serverTimestamp(),
        avaliacoes: { [nome]: parseFloat(nota) },
      });

      alert(`${categoria}: ${filme} adicionado por ${nome}!`);
      form.reset();
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
    });
  }

  // 🧹 Botão limpar
  btnLimpar.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
    listaSugestoes.innerHTML = "";
    listaSugestoes.style.display = "none";
  });
});
