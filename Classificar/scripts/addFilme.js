// ==========================================
// 🔥 IMPORTAÇÕES DO FIREBASE
// ==========================================
import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

// ==========================================
// 🔠 FUNÇÃO: CAPITALIZAR PALAVRAS
// ==========================================
/**
 * Converte uma string para formato de título (cada palavra com primeira letra maiúscula)
 * @param {string} texto - Texto a ser capitalizado
 * @returns {string} Texto capitalizado
 * @example "o PODEROSO chefão" → "O Poderoso Chefão"
 */
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()                      // Converte tudo para minúsculo
    .split(" ")                         // Divide em array por espaços
    .filter(p => p.trim() !== "")       // Remove strings vazias
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)) // Primeira letra maiúscula
    .join(" ");                         // Junta tudo de volta em string
}

// ==========================================
// 🎬 FUNÇÃO: BUSCAR SUGESTÕES NA API TMDB
// ==========================================
/**
 * Busca filmes ou séries na API TMDb baseado no termo de pesquisa
 * @param {string} query - Termo de busca (nome do filme/série)
 * @param {string} tipo - Tipo de conteúdo: "movie" (filme) ou "tv" (série)
 * @returns {Promise<Array>} Array com até 5 resultados da busca
 */
async function buscarSugestoesTMDb(query, tipo = "movie") {
  const apiKey = "80343411a9bb47a166866336ace56f8b";

  // 🔍 Validação: precisa ter pelo menos 2 caracteres para buscar
  if (!query || query.length < 2) return [];

  try {
    // 🌐 Faz requisição para API TMDb
    const resp = await fetch(
      `https://api.themoviedb.org/3/search/${tipo}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`
    );
    const data = await resp.json();

    // ✅ Retorna até 5 resultados ou array vazio se não encontrar
    return data.results ? data.results.slice(0, 5) : [];
  } catch (err) {
    // 🚨 Tratamento de erro - log no console e retorna array vazio
    console.error("Erro ao buscar sugestões:", err);
    return [];
  }
}

// ==========================================
// 📚 FUNÇÃO: BUSCAR DETALHES COMPLETOS NA TMDB
// ==========================================
/**
 * Busca informações detalhadas de um filme/série por ID
 * @param {number} id - ID do filme/série na API TMDb
 * @param {string} tipo - "movie" (filme) ou "tv" (série)
 * @returns {Promise<Object>} Objeto com todos os detalhes do conteúdo
 */
async function buscarDetalhesTMDbPorId(id, tipo = "movie") {
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  const baseUrl = `https://api.themoviedb.org/3/${tipo}`;

  try {
    // 🎭 BUSCA INFORMAÇÕES BÁSICAS DO FILME/SÉRIE
    const resp = await fetch(`${baseUrl}/${id}?api_key=${apiKey}&language=pt-BR`);
    const detalhes = await resp.json();

    // 📝 EXTRAI DADOS PRINCIPAIS (tratando diferenças entre filmes e séries)
    const titulo = tipo === "tv" ? detalhes.name : detalhes.title; // Série usa 'name', filme usa 'title'
    const sinopse = detalhes.overview || "Sinopse não encontrada.";
    const poster = detalhes.poster_path
      ? `https://image.tmdb.org/t/p/w342${detalhes.poster_path}` // URL completa da imagem
      : null; // Se não tiver poster, retorna null
    const genero = detalhes.genres?.[0]?.name || "Desconhecido"; // Primeiro gênero ou "Desconhecido"

    // 📺 BUSCA ONDE ASSISTIR (SERVICOS DE STREAMING NO BRASIL)
    const respWatch = await fetch(`${baseUrl}/${id}/watch/providers?api_key=${apiKey}`);
    const providersData = await respWatch.json();

    // 🎯 PRIORIDADE: streaming → compra → aluguel → não disponível
    const ondeAssistir =
      providersData.results?.BR?.flatrate?.[0]?.provider_name ||    // Streaming (Netflix, Prime, etc)
      providersData.results?.BR?.buy?.[0]?.provider_name ||         // Compra digital
      providersData.results?.BR?.rent?.[0]?.provider_name ||        // Aluguel digital
      "Não disponível";                                             // Fallback

    return {
      titulo,
      sinopse,
      poster,
      genero,
      onde: ondeAssistir,
      categoria: tipo === "tv" ? "Série" : "Filme", // Define categoria automaticamente
    };
  } catch (erro) {
    // 🚨 EM CASO DE ERRO: retorna objeto com valores padrão
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
// 👤 SISTEMA DE TROCA DE PERFIL COM ANIMAÇÃO
// ==========================================

// 🎯 ELEMENTOS DO DOM
const nomeSelect = document.getElementById("nome-id");
const perfilImg = document.getElementById("perfil_video");

// ⚡ CONFIGURAÇÃO INICIAL DAS ANIMAÇÕES
perfilImg.style.transition = "filter 0.8s ease, transform 0.8s ease";

/**
 * 🎨 Aplica transformações CSS com transição controlada
 * @param {string} transform - Valor CSS transform (ex: "translateX(100%)")
 * @param {number} blur - Intensidade do blur em pixels
 * @param {boolean} transition - Se deve aplicar transição suave
 */
function aplicarTransicao(transform, blur, transition = true) {
  perfilImg.style.transition = transition
    ? "filter 0.8s ease, transform 0.8s ease" // Com transição
    : "none"; // Sem transição (instantâneo)
  perfilImg.style.transform = transform;
  perfilImg.style.filter = `blur(${blur}px)`;
}

// 🖱️ EVENT LISTENER: TROCA DE PERFIL AO MUDAR NOME
nomeSelect.addEventListener("change", async () => {
  // 1. 🚀 ANIMAÇÃO DE SAÍDA: move para direita com efeito blur
  aplicarTransicao("translateX(100%)", 10);

  // 2. ⏳ AGUARDA ANIMAÇÃO DE SAÍDA COMPLETAR (600ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  // 3. 📥 PREPARA NOVA IMAGEM DE PERFIL
  const nome = nomeSelect.value.toLowerCase();
  const novoSrc = `imagens/perfil-${nome}.gif`;
  const novaImg = new Image(); // Cria objeto Image para preload

  // ✅ CALLBACK: QUANDO IMAGEM CARREGAR COM SUCESSO
  novaImg.onload = () => {
    // 4. 🔄 TROCA A IMAGEM (sem animação para evitar flicker)
    perfilImg.src = novoSrc;
    aplicarTransicao("translateX(-100%)", 10, false);

    // 5. 🔄 FORCE REFLOW: reinicia a animação no navegador
    perfilImg.offsetWidth; // Truque para resetar CSS transitions

    // 6. 🎬 ANIMAÇÃO DE ENTRADA: volta ao centro sem blur
    aplicarTransicao("translateX(0)", 0);
  };

  // 🚨 CALLBACK: SE HOUVER ERRO NO CARREGAMENTO DA IMAGEM
  novaImg.onerror = () => {
    console.warn(`❌ Erro ao carregar imagem: ${novoSrc}`);
    // 🔄 RESETA EFEITOS EM CASO DE ERRO
    perfilImg.style.filter = "blur(0)";
    perfilImg.style.transform = "translateX(0)";
  };

  // 🚀 INICIA CARREGAMENTO DA NOVA IMAGEM
  novaImg.src = novoSrc;
});

// ==========================================
// 🧠 INICIALIZAÇÃO PRINCIPAL DA APLICAÇÃO
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 📝 ELEMENTOS DO FORMULÁRIO
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");
  const inputFilme = document.getElementById("filme-id");
  const listaSugestoes = document.getElementById("lista-sugestoes");
  const selectCategoria = document.getElementById("categoria-id");

  // ⏰ VARIÁVEIS DE CONTROLE
  let timeout = null;           // Para debounce das buscas
  let filmeSelecionado = null;  // Armazena filme escolhido das sugestões

  // ==========================================
  // 🔍 SISTEMA DE AUTO-COMPLETE COM DEBOUNCE
  // ==========================================
  inputFilme.addEventListener("input", () => {
    // 🚫 CANCELA BUSCA ANTERIOR SE USUÁRIO AINDA ESTIVER DIGITANDO
    clearTimeout(timeout);

    const query = inputFilme.value.trim();
    const categoria = selectCategoria.value;

    // 🚫 VALIDAÇÃO: CATEGORIA OBRIGATÓRIA
    if (!categoria) {
      listaSugestoes.innerHTML = "<li>Selecione a categoria primeiro.</li>";
      listaSugestoes.style.display = "block";
      return;
    }

    // 🚫 VALIDAÇÃO: MÍNIMO 2 CARACTERES PARA BUSCAR
    if (query.length < 2) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      return;
    }

    // ⏳ FEEDBACK VISUAL: MOSTRA "CARREGANDO..."
    listaSugestoes.innerHTML = "<li>Carregando sugestões...</li>";
    listaSugestoes.style.display = "block";

    // 🎯 DEBOUNCE: AGUARDA USUÁRIO PARAR DE DIGITAR (400ms)
    timeout = setTimeout(async () => {
      const tipo = categoria === "Série" ? "tv" : "movie"; // Converte categoria para tipo da API
      const sugestoes = await buscarSugestoesTMDb(query, tipo);

      // 🧹 LIMPA LISTA ANTES DE PREENCHER COM NOVOS RESULTADOS
      listaSugestoes.innerHTML = "";

      // 🚫 SE NÃO ENCONTROU NADA
      if (sugestoes.length === 0) {
        listaSugestoes.innerHTML = "<li>Nenhum resultado encontrado</li>";
        return;
      }

      // 🎬 CRIA ITENS DA LISTA DE SUGESTÕES
      sugestoes.forEach(item => {
        const nome = tipo === "tv" ? item.name : item.title; // Série vs Filme
        const ano = (item.first_air_date || item.release_date || "").slice(0, 4); // Extrai ano
        const li = document.createElement("li");
        li.textContent = `${nome} ${ano ? `(${ano})` : ""}`; // Formata: "Nome (2023)"

        // 🖱️ EVENTO DE CLIQUE NA SUGESTÃO
        li.addEventListener("click", () => {
          inputFilme.value = nome; // Preenche o campo com o nome selecionado
          filmeSelecionado = {
            id: item.id,           // Salva ID para buscar detalhes depois
            titulo: nome,
            tipo
          };
          listaSugestoes.innerHTML = ""; // Esconde lista
          listaSugestoes.style.display = "none";
        });

        listaSugestoes.appendChild(li);
      });
    }, 400); // ⏱️ TEMPO DE DEBOUNCE: 400ms
  });

  // ==========================================
  // 🎯 FECHAMENTO INTELIGENTE DA LISTA DE SUGESTÕES
  // ==========================================
  document.addEventListener("click", (e) => {
    // 🚫 SE CLICOU EM QUALQUER LUGAR EXCETO NO CAMPO DE FILME, FECHA A LISTA
    if (e.target !== inputFilme) {
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
    }
  });

  // ==========================================
  // 🚀 PROCESSAMENTO DO ENVIO DO FORMULÁRIO
  // ==========================================
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); // 🚫 IMPEDE COMPORTAMENTO PADRÃO (RECARREGAR PÁGINA)

      // 📥 COLETA DADOS DO FORMULÁRIO
      const nome = document.getElementById("nome-id").value;
      const nota = document.getElementById("nota-id").value;
      const categoria = selectCategoria.value;
      const filmeTitulo = capitalizarPalavras(inputFilme.value); // 🔠 CAPITALIZA TÍTULO

      // 🚫 VALIDAÇÃO: CAMPOS OBRIGATÓRIOS
      if (!nome || !filmeTitulo || !nota || !categoria) {
        alert("Por favor, preencha todos os campos!");
        return;
      }

      // ⭐ VALIDAÇÃO: NOTA ENTRE 1 E 5
      if (nota > 5 || nota < 1) {
        alert("A nota precisa ser de 1 a 5");
        return;
      }

      // 🔍 CONFIGURA TIPO PARA API (movie/tv)
      const tipo = categoria === "Série" ? "tv" : "movie";

      // 🎬 BUSCA DETALHES DO FILME/SÉRIE
      let detalhes;
      if (filmeSelecionado?.id) {
        // ✅ USA FILME SELECIONADO DA LISTA DE SUGESTÕES (MAIS PRECISO)
        detalhes = await buscarDetalhesTMDbPorId(filmeSelecionado.id, tipo);
      } else {
        // 🔄 BUSCA AUTOMÁTICA SE USUÁRIO DIGITOU MANUALMENTE
        const sugestoes = await buscarSugestoesTMDb(filmeTitulo, tipo);
        detalhes = sugestoes.length > 0
          ? await buscarDetalhesTMDbPorId(sugestoes[0].id, tipo) // Pega primeiro resultado
          : {
            // 🎭 FALLBACK: usa dados básicos se não encontrou na API
            titulo: filmeTitulo,
            genero: "Desconhecido",
            onde: "Não disponível",
            categoria
          };
      }

      // 💾 SALVA NO FIREBASE FIRESTORE
      await addDoc(collection(db, "filmes"), {
        nome,                           // Nome do usuário que cadastrou
        filme: detalhes.titulo || filmeTitulo, // Título do filme/série
        genero: detalhes.genero,        // Gênero principal
        categoria: detalhes.categoria,  // "Filme" ou "Série"
        onde: detalhes.onde,            // Onde assistir (Netflix, etc)
        sinopse: detalhes.sinopse,      // Sinopse completa
        poster: detalhes.poster,        // URL do pôster
        data: serverTimestamp(),        // ⏰ TIMESTAMP DO SERVIDOR (evita problemas de fuso)
        avaliacoes: {
          [nome]: parseFloat(nota)      // 🎯 PRIMEIRA AVALIAÇÃO (do usuário atual)
        },
      });

      // 🎉 FEEDBACK DE SUCESSO
      alert(`✅ ${detalhes.titulo} (${detalhes.categoria}) adicionado por ${nome}!`);

      // 🧹 LIMPEZA E RESET DO FORMULÁRIO
      form.reset();
      listaSugestoes.innerHTML = "";
      listaSugestoes.style.display = "none";
      filmeSelecionado = null; // 🔄 RESETA FILME SELECIONADO
    });
  }

  // ==========================================
  // 🧹 SISTEMA DE LIMPEZA DO FORMULÁRIO
  // ==========================================
  btnLimpar?.addEventListener("click", (e) => {
    e.preventDefault(); // 🚫 IMPEDE COMPORTAMENTO PADRÃO

    // 🔄 RESETA TUDO
    form.reset();
    listaSugestoes.innerHTML = "";
    listaSugestoes.style.display = "none";
    filmeSelecionado = null;
  });
});