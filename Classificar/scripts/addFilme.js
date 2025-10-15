import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(p => p.trim() !== "")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// 🧠 Função para buscar sinopse e imagem do TMDb
async function buscarSinopseTMDb(filme) {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  const baseUrl = "https://api.themoviedb.org/3/search/movie";
  const detalhesUrl = "https://api.themoviedb.org/3/movie";

  try {
    // Busca o filme pelo nome
    const r1 = await fetch(`${baseUrl}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(filme)}`);
    const data = await r1.json();

    if (data.results && data.results.length > 0) {
      const filmeEncontrado = data.results[0];
      const idFilme = filmeEncontrado.id;

      // Busca detalhes do filme encontrado
      const r2 = await fetch(`${detalhesUrl}/${idFilme}?api_key=${apiKey}&language=pt-BR`);
      const detalhes = await r2.json();

      return {
        sinopse: detalhes.overview || "Sinopse não encontrada.",
      };
    } else {
      return { sinopse: "Sinopse não encontrada.", poster: null };
    }
  } catch (erro) {
    console.error("Erro ao buscar sinopse:", erro);
    return { sinopse: "Sinopse não encontrada.", poster: null };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");

  if (!form) return;

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

    // 🔍 Busca sinopse e poster no TMDb
    const { sinopse, poster } = await buscarSinopseTMDb(filme);

    await addDoc(collection(db, "filmes"), {
      nome,
      filme,
      onde,
      genero,
      categoria,
      sinopse,
      data: serverTimestamp(),
      avaliacoes: { [nome]: parseFloat(nota) }
    });

    alert(`${categoria}: ${filme} adicionado por ${nome}!`);
    form.reset();
  });

  btnLimpar.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
  });
});
