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

  // Lista fixa dos avaliadores obrigatórios — esses nomes devem aparecer em cada documento
  const avaliadoresEsperados = ["Renan", "Bruna", "Fabio", "Cauane"];

  // --------------------------------------------------------------------------
  // 🔁 onSnapshot() cria um "listener" em tempo real
  // Ele fica "escutando" as mudanças na coleção "filmes".
  // Assim, sempre que um filme for adicionado, alterado ou removido no Firebase,
  // a lista de filmes na página é automaticamente atualizada.
  // --------------------------------------------------------------------------
  onSnapshot(filmesRef, (snapshot) => {

    // Array vazio que irá armazenar os filmes válidos (aqueles com todas as avaliações)
    const filmes = [];

    // Percorre todos os documentos da coleção "filmes"
    snapshot.forEach((doc) => {

      // Extrai os dados do documento (filme)
      const data = doc.data();

      // "avaliacoes" deve ser um objeto no formato:
      // { Renan: 4, Bruna: 5, Fabio: 3, Cauane: 4 }
      // Caso não exista, usamos um objeto vazio para evitar erro.
      const avaliacoes = data.avaliacoes || {};

      // --------------------------------------------------------------------------
      // 🧩 Verifica se todos os avaliadores esperados já avaliaram o filme
      // A função every() retorna TRUE somente se TODAS as condições forem verdadeiras
      // Para cada nome da lista avaliadoresEsperados:
      //   - Verifica se o nome existe no objeto "avaliacoes"
      //   - E se o valor associado é um número (uma nota)
      // --------------------------------------------------------------------------
      const todosAvaliaram = avaliadoresEsperados.every(
        (nome) => avaliacoes.hasOwnProperty(nome) && typeof avaliacoes[nome] === "number"
      );

      // Se nem todos os avaliadores deram nota, o filme é ignorado (não entra no ranking)
      if (!todosAvaliaram) return;

      // --------------------------------------------------------------------------
      // 📊 Calcula a média das notas
      // Object.values(avaliacoes) retorna um array com todas as notas, ex: [4,5,3,4]
      // reduce() soma todas as notas
      // Divide o total pelo número de avaliações para obter a média
      // --------------------------------------------------------------------------
      const notas = Object.values(avaliacoes);
      const media = notas.reduce((a, b) => a + b, 0) / notas.length;

      // Cria um objeto com os dados relevantes do filme e adiciona no array final
      filmes.push({
        titulo: data.filme,
        media: media,
        genero: data.genero,
        categoria: data.categoria,
        onde: data.onde,
      });
    });

    // --------------------------------------------------------------------------
    // 🏆 Ordena os filmes em ordem decrescente (da maior média para a menor)
    // sort() recebe uma função de comparação que retorna:
    //   > 0 → troca a posição dos itens
    //   < 0 → mantém a ordem
    // --------------------------------------------------------------------------
    filmes.sort((a, b) => b.media - a.media);

    // Pega apenas os 10 primeiros filmes do array (Top 10)
    const top10 = filmes.slice(0, 10);

    // --------------------------------------------------------------------------
    // 🧱 Monta visualmente a lista de filmes no HTML
    // Cria um elemento <ol> (lista ordenada)
    // --------------------------------------------------------------------------
    const lista = document.createElement("ol");
    lista.classList.add("top_list");

    // Percorre o array top10 e cria um <li> para cada filme
    top10.forEach((filme, index) => {

      // Cria um elemento <li> e adiciona a classe CSS correspondente
      const item = document.createElement("li");
      item.classList.add("top_list-item");

      // Define o conteúdo HTML interno do item:
      // - posição (index + 1)
      // - nome do filme
      // - média formatada com uma casa decimal
      item.innerHTML = `
        <p class="pos-id">${index + 1}</p>
        <p class="filme-id">${filme.titulo}</p>
        <p class="media-id">${filme.media.toFixed(1)}</p>
      `;

      // Adiciona o item à lista
      lista.appendChild(item);
    });

    // --------------------------------------------------------------------------
    // 🧹 Limpa o conteúdo anterior e insere a nova lista no container
    // --------------------------------------------------------------------------
    topContainer.innerHTML = ""; // limpa o conteúdo anterior

    // Se não houver filmes válidos (ninguém foi avaliado por todos ainda)
    // mostramos uma mensagem de aviso
    if (top10.length === 0) {
      topContainer.innerHTML = `
        <p style="text-align:center; color:#666;">
          Nenhum filme foi avaliado por todos ainda.
        </p>`;
    } else {
      // Caso existam filmes válidos, adicionamos a lista ao container
      topContainer.appendChild(lista);
    }
  });
});
