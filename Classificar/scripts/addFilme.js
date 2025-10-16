// Importa do arquivo firebaseConfig.js os módulos necessários para manipular o banco Firestore
import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

// Função que transforma a primeira letra de cada palavra em maiúscula
function capitalizarPalavras(texto) {
  return texto
    .toLowerCase() // transforma todo o texto em letras minúsculas
    .split(" ") // divide o texto em um array de palavras
    .filter(p => p.trim() !== "") // remove elementos vazios (ex: espaços duplos)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1)) // coloca a primeira letra em maiúscula
    .join(" "); // junta tudo de volta com espaços
}

// 🧠 Função assíncrona que busca a sinopse de um filme na API do TMDb
async function buscarSinopseTMDb(filme) {
  // Chave da API (necessária para acessar o serviço)
  const apiKey = "80343411a9bb47a166866336ace56f8b";
  // URL base para buscar filmes pelo nome
  const baseUrl = "https://api.themoviedb.org/3/search/movie";
  // URL base para buscar detalhes de um filme pelo ID
  const detalhesUrl = "https://api.themoviedb.org/3/movie";

  try {
    // Faz a primeira requisição para procurar o filme pelo nome digitado
    const r1 = await fetch(`${baseUrl}?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(filme)}`);
    // Converte a resposta em JSON
    const data = await r1.json();

    // Verifica se encontrou algum resultado
    if (data.results && data.results.length > 0) {
      // Pega o primeiro resultado retornado (filme mais relevante)
      const filmeEncontrado = data.results[0];
      const idFilme = filmeEncontrado.id; // armazena o ID do filme encontrado

      // Faz nova requisição para obter detalhes do filme pelo ID
      const r2 = await fetch(`${detalhesUrl}/${idFilme}?api_key=${apiKey}&language=pt-BR`);
      const detalhes = await r2.json(); // converte a resposta em JSON

      // Retorna um objeto com a sinopse do filme (ou texto padrão se não houver)
      return {
        sinopse: detalhes.overview || "Sinopse não encontrada.",
      };
    } else {
      // Caso o filme não seja encontrado
      return { sinopse: "Sinopse não encontrada.", poster: null };
    }
  } catch (erro) {
    // Caso ocorra algum erro de rede ou resposta inválida
    console.error("Erro ao buscar sinopse:", erro);
    return { sinopse: "Sinopse não encontrada.", poster: null };
  }
}

// Aguarda o carregamento completo do documento antes de executar o restante
document.addEventListener("DOMContentLoaded", () => {
  // Captura o formulário e o botão de limpar pelo ID
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");

  // Se o formulário não existir, encerra o script
  if (!form) return;

  // Adiciona evento de envio ao formulário
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // impede o comportamento padrão de recarregar a página

    // Captura os valores digitados nos campos do formulário
    const nome = document.getElementById("nome-id").value;
    const filme = capitalizarPalavras(document.getElementById("filme-id").value); // formata o nome do filme
    const onde = document.getElementById("onde-id").value;
    const genero = document.getElementById("genero-id").value;
    const categoria = document.getElementById("categoria-id").value;
    const nota = document.getElementById("nota-id").value;

    // Verifica se todos os campos estão preenchidos
    if (!nome || !filme || !onde || !genero || !nota || !categoria) {
      alert("Por favor, preencha todos os campos!");
      return;
    }

    // Verifica se a nota está entre 1 e 5
    if (nota > 5 || nota < 1) {
      alert("A nota precisa ser de 1 a 5");
      return;
    }

    // 🔍 Busca sinopse e poster do filme usando a API TMDb
    const { sinopse, poster } = await buscarSinopseTMDb(filme);

    // Envia os dados do formulário para o Firestore (banco de dados)
    await addDoc(collection(db, "filmes"), {
      nome,                // nome do usuário que adicionou
      filme,               // nome do filme formatado
      onde,                // onde foi assistido (ex: Netflix, cinema)
      genero,              // gênero do filme (ex: Ação, Drama)
      categoria,           // categoria (ex: filme, série, etc)
      sinopse,             // sinopse obtida da API
      data: serverTimestamp(), // data e hora do servidor Firebase
      avaliacoes: { [nome]: parseFloat(nota) } // objeto com a nota atribuída pelo usuário
    });

    // Exibe mensagem de sucesso para o usuário
    alert(`${categoria}: ${filme} adicionado por ${nome}!`);

    // Limpa todos os campos do formulário
    form.reset();
  });

  // Adiciona funcionalidade ao botão "Limpar"
  btnLimpar.addEventListener("click", (e) => {
    e.preventDefault(); // evita comportamento padrão do botão
    form.reset(); // limpa todos os campos do formulário
  });
});
