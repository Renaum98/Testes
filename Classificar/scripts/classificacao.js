// Importa a configuração do Firebase (de outro arquivo)
import { db } from "./firebaseConfig.js";

// Importa as funções necessárias do Firestore (banco de dados do Firebase)
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Espera até que o HTML esteja completamente carregado antes de rodar o script
document.addEventListener("DOMContentLoaded", () => {

  // Seleciona o elemento principal onde a lista de filmes será exibida
  const topContainer = document.querySelector(".top_container");

  // Se o container não existir (erro de seletor, por exemplo), encerra o script
  if (!topContainer) return;

  // Cria uma referência à coleção "filmes" no banco de dados Firebase Firestore
  const filmesRef = collection(db, "filmes");

  // --------------------------------------------------------------------------
  // 🔁 onSnapshot() cria um "listener" em tempo real
  // Ele fica "escutando" as mudanças na coleção "filmes".
  // Assim, sempre que um filme for adicionado, alterado ou removido no Firebase,
  // a lista de filmes na página é automaticamente atualizada.
  // --------------------------------------------------------------------------
  onSnapshot(filmesRef, (snapshot) => {

    // Array vazio que irá armazenar os filmes válidos (aqueles com avaliações)
    const filmes = [];

    // Define o mínimo de avaliações para entrar no ranking
    const MINIMO_AVALIACOES = 2;

    // Percorre todos os documentos da coleção "filmes"
    snapshot.forEach((doc) => {

      // Extrai os dados do documento (filme)
      const data = doc.data();

      // Pega o objeto de avaliações (ex: { Renan: 4, Bruna: 5 })
      const avaliacoes = data.avaliacoes || {};

      // Filtra apenas os valores numéricos válidos (as notas)
      const notas = Object.values(avaliacoes).filter(n => typeof n === "number");

      // Se o filme não tiver o mínimo de avaliações, ignora
      if (notas.length < MINIMO_AVALIACOES) return;

      // Calcula a média das notas
      const media = notas.reduce((a, b) => a + b, 0) / notas.length;

      // Pega a lista de nomes dos avaliadores (para mostrar as fotos)
      const avaliadores = Object.keys(avaliacoes);

      // Adiciona o filme ao array com informações extras para ordenação
      filmes.push({
        titulo: data.filme,
        media: media,
        totalAvaliacoes: notas.length, // quantidade de votos
        avaliadores: avaliadores, // lista de quem votou
        genero: data.genero,
        categoria: data.categoria,
        onde: data.onde,
        // 🔑 Peso combinado: média + bônus por quantidade de avaliações
        // Fórmula: média + (log(número_de_avaliações) * fator_importância)
        pesoRanking: media + (Math.log(notas.length) * 0.2)
      });
    });

    // --------------------------------------------------------------------------
    // 🏆 NOVO SISTEMA DE ORDENAÇÃO INTELIGENTE
    // Prioriza filmes com MAIS AVALIAÇÕES e MAIOR NOTA
    // --------------------------------------------------------------------------
    filmes.sort((a, b) => {
      // 1º Critério: Peso combinado (nota + quantidade de avaliações)
      if (b.pesoRanking !== a.pesoRanking) {
        return b.pesoRanking - a.pesoRanking;
      }
      
      // 2º Critério: Em caso de empate no peso, prioriza quem tem MAIS avaliações
      if (b.totalAvaliacoes !== a.totalAvaliacoes) {
        return b.totalAvaliacoes - a.totalAvaliacoes;
      }
      
      // 3º Critério: Se ainda empatar, prioriza a MAIOR média
      return b.media - a.media;
    });

    // Pega apenas os 10 primeiros filme do array (Top 10)
    const top10 = filmes.slice(0, 10);

    // --------------------------------------------------------------------------
    // 🧱 Monta visualmente a lista de filmes no HTML
    // --------------------------------------------------------------------------
    const lista = document.createElement("ol");
    lista.classList.add("top_list");

    top10.forEach((filme, index) => {
      const item = document.createElement("li");
      item.classList.add("top_list-item");

      // 🏅 Destaque para os 3 primeiros colocados
      if (index === 0) item.classList.add("primeiro-lugar");
      else if (index === 1) item.classList.add("segundo-lugar");
      else if (index === 2) item.classList.add("terceiro-lugar");

      // 🎭 Gera as fotos dos avaliadores - MESMO FORMATO DO OUTRO CÓDIGO
      const fotosAvaliadores = filme.avaliadores.map(avaliador => {
        const nota = filme.avaliacoes ? filme.avaliacoes[avaliador] : '';
        return `
          <div class="avaliador">
            <img 
              src="imagens/perfil_${avaliador.toLowerCase()}.png" 
              title="${avaliador}: ${nota}⭐" 
              class="avaliador-foto"
            >
          </div>
        `;
      }).join('');

      item.innerHTML = `
        <p class="pos-id">${index + 1}</p>
        <p class="filme-id">${filme.titulo}</p>
        <p class="categoria-id">${filme.categoria}</p>
        <span class="media-id">⭐${filme.media.toFixed(1)}</span>
        <div class="avaliadores-container">${fotosAvaliadores || "<p class='sem-avaliacoes'>Nenhuma avaliação ainda</p>"}</div>
      `;

      lista.appendChild(item);
    });

    // --------------------------------------------------------------------------
    // 🧹 Limpa o conteúdo anterior e insere a nova lista no container
    // --------------------------------------------------------------------------
    topContainer.innerHTML = "";

    if (top10.length === 0) {
      topContainer.innerHTML = `
        <p style="text-align:center; color:#666;">
          Nenhum filme atingiu o mínimo de ${MINIMO_AVALIACOES} avaliações ainda.
        </p>`;
    } else {
      topContainer.appendChild(lista);
    }
  });
});