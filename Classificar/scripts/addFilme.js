// ==========================================
// 🔥 Importações do Firebase
// ==========================================
import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

// ==========================================
// 🔠 Capitalizar
// ==========================================
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(p => p.trim() !== "")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

// ==========================================
// 🎬 Buscar sugestões de filmes ou séries
// ==========================================
async function buscarSugestoesTMDb(query, tipo = "movie") {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  if (!query || query.length < 2) return [];

  try {
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

// ==========================================
// 📚 Buscar detalhes (Filme ou Série)
// ==========================================
async function buscarDetalhesTMDbPorId(id, tipo = "movie") {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  const baseUrl = `https://api.themoviedb.org/3/${tipo}`;

  try {
    const resp = await fetch(`${baseUrl}/${id}?api_key=${apiKey}&language=pt-BR`);
    const detalhes = await resp.json();

    // Para séries, o campo do título é diferente
    const titulo = tipo === "tv" ? detalhes.name : detalhes.title;
    const sinopse = detalhes.overview || "Sinopse não encontrada.";
    const poster = detalhes.poster_path
      ? `https://image.tmdb.org/t/p/w342${detalhes.poster_path}`
      : null;
    const genero = detalhes.genres?.[0]?.name || "Desconhecido";

    // Filmes têm provedores; séries também, mesmo endpoint
    const respWatch = await fetch(`${baseUrl}/${id}/watch/providers?api_key=${apiKey}`);
    const providersData = await respWatch.json();
    const ondeAssistir = 
      providersData.results?.BR?.flatrate?.[0]?.provider_name || 
      providersData.results?.BR?.buy?.[0]?.provider_name || 
      providersData.results?.BR?.rent?.[0]?.provider_name || 
      "Não disponível";

    return {
      titulo,
      sinopse,
      poster,
      genero,
      onde: ondeAssistir,
      categoria: tipo === "tv" ? "Série" : "Filme",
    };
  } catch (erro) {
    console.error("Erro ao buscar detalhes:", erro);
    return {
      titulo: "",
      sinopse: "Sinopse não encontrada.",
      poster: null,
      genero: "Desconhecido",
      onde: "Não disponível",
      categoria: tipo === "tv" ? "Série" : "Filme",
    };
  }
}

// ==========================================
// 🔍 Mudança de perfil sempre que mudar de nome
// ==========================================
const nomeSelect = document.getElementById("nome-id");
const perfilVideo = document.getElementById('perfil_video');

// define a transição inicial
perfilVideo.style.transition = 'filter 0.8s ease, transform 0.8s ease';

nomeSelect.addEventListener('change', function(){
  // sai pela direita com blur
  
  perfilVideo.style.transform = 'translateX(100%)';
  //perfilVideo.style.filter = 'blur(10px)';

  setTimeout(() => {
    // troca o vídeo
    try {
      perfilVideo.src = `imagens/perfil_${nomeSelect.value.toLowerCase()}.png`
    } catch (error) {
      alert("Não foi possivel carregar perfil",error)
    }
    ;
    //perfilVideo.load();
    //perfilVideo.playbackRate = 1.2;
    //perfilVideo.play();

    // posiciona fora da tela à esquerda (sem animação)
    perfilVideo.style.transition = 'none';
    perfilVideo.style.transform = 'translateX(-100%)';

    // força reflow (reinicia o CSS)
    void perfilVideo.offsetWidth;

    // agora entra suavemente e tira o blur
    perfilVideo.style.transition = 'filter 0.8s ease, transform 0.8s ease';
    //perfilVideo.style.filter = 'blur(0px)';
    perfilVideo.style.transform = 'translateX(0)';
  }, 600);
});




// ==========================================
// 🧠 Inicialização
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");
  const inputFilme = document.getElementById("filme-id");
  const listaSugestoes = document.getElementById("lista-sugestoes");
  const selectCategoria = document.getElementById("categoria-id");

  let timeout = null;
  let filmeSelecionado = null;


  // ==========================================
  // 🔍 Mudança de perfil sempre que mudar de nome
  // ==========================================


  // ==========================================
  // 🔍 Sugestões automáticas com base na categoria
  // ==========================================
  inputFilme.addEventListener("input", () => {
    clearTimeout(timeout);
    const query = inputFilme.value.trim();
    const categoria = selectCategoria.value;

    if (!categoria) {
      listaSugestoes.innerHTML = "<li>Selecione a categoria primeiro.</li>";
      listaSugestoes.style.display = "block";
      return;
    }

    if (query.length < 2) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      return;
    }

    listaSugestoes.innerHTML = "<li>Carregando sugestões...</li>";
    listaSugestoes.style.display = "block";

    timeout = setTimeout(async () => {
      const tipo = categoria === "Série" ? "tv" : "movie";
      const sugestoes = await buscarSugestoesTMDb(query, tipo);

      listaSugestoes.innerHTML = "";

      if (sugestoes.length === 0) {
        listaSugestoes.innerHTML = "<li>Nenhum resultado encontrado</li>";
        return;
      }

      sugestoes.forEach(item => {
        const nome = tipo === "tv" ? item.name : item.title;
        const ano = (item.first_air_date || item.release_date || "").slice(0, 4);
        const li = document.createElement("li");
        li.textContent = `${nome} ${ano ? `(${ano})` : ""}`;

        li.addEventListener("click", () => {
          inputFilme.value = nome;
          filmeSelecionado = { id: item.id, titulo: nome, tipo };
          listaSugestoes.innerHTML = "";
          listaSugestoes.style.display = "none";
        });

        listaSugestoes.appendChild(li);
      });
    }, 400);
  });

  // Fecha a lista se clicar fora
  document.addEventListener("click", (e) => {
    if (e.target !== inputFilme) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
    }
  });

  // ==========================================
  // 🚀 Envio do formulário
  // ==========================================
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nome-id").value;
      const nota = document.getElementById("nota-id").value;
      const categoria = selectCategoria.value;
      const filmeTitulo = capitalizarPalavras(inputFilme.value);

      if (!nome || !filmeTitulo || !nota || !categoria) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      if (nota > 5 || nota < 1) {
        alert("A nota precisa ser de 1 a 5");
        return;
      }

      const tipo = categoria === "Série" ? "tv" : "movie";

      // Busca detalhes
      let detalhes;
      if (filmeSelecionado?.id) {
        detalhes = await buscarDetalhesTMDbPorId(filmeSelecionado.id, tipo);
      } else {
        const sugestoes = await buscarSugestoesTMDb(filmeTitulo, tipo);
        detalhes = sugestoes.length > 0
          ? await buscarDetalhesTMDbPorId(sugestoes[0].id, tipo)
          : { titulo: filmeTitulo, genero: "Desconhecido", onde: "Não disponível", categoria };
      }

      await addDoc(collection(db, "filmes"), {
        nome,
        filme: detalhes.titulo || filmeTitulo,
        genero: detalhes.genero,
        categoria: detalhes.categoria,
        onde: detalhes.onde,
        sinopse: detalhes.sinopse,
        poster: detalhes.poster,
        data: serverTimestamp(),
        avaliacoes: { [nome]: parseFloat(nota) },
      });

      alert(`✅ ${detalhes.titulo} (${detalhes.categoria}) adicionado por ${nome}!`);
      form.reset();
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      filmeSelecionado = null;
    });
  }

  // ==========================================
  // 🧹 Limpar
  // ==========================================
  btnLimpar?.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
    listaSugestoes.innerHTML = "";
    listaSugestoes.style.display = "none";
    filmeSelecionado = null;
  });
});
