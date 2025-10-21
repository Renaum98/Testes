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

    // Percorre todos os documentos da coleção "filmes"
    snapshot.forEach((doc) => {

      // Extrai os dados do documento (filme)
      const data = doc.data();

      // Pega o objeto de avaliações (ex: { Renan: 4, Bruna: 5 })
      const avaliacoes = data.avaliacoes || {};

      // Filtra apenas os valores numéricos válidos (as notas)
      const notas = Object.values(avaliacoes).filter(n => typeof n === "number");

      // Se o filme ainda não tiver nenhuma nota, ignora
      if (notas.length === 0) return;

      // Calcula a média das notas
      const media = notas.reduce((a, b) => a + b, 0) / notas.length;

      // Adiciona o filme ao array
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
    // --------------------------------------------------------------------------
    filmes.sort((a, b) => b.media - a.media);

    // Pega apenas os 10 primeiros filmes do array (Top 10)
    const top10 = filmes.slice(0, 10);

    // --------------------------------------------------------------------------
    // 🧱 Monta visualmente a lista de filmes no HTML
    // --------------------------------------------------------------------------
    const lista = document.createElement("ol");
    lista.classList.add("top_list");

    top10.forEach((filme, index) => {
      const item = document.createElement("li");
      item.classList.add("top_list-item");

      item.innerHTML = `
        <p class="pos-id">${index + 1}</p>
        <p class="filme-id">${filme.titulo}</p>
        <p class="media-id">${filme.media.toFixed(1)}</p>
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
          Nenhum filme foi avaliado ainda.
        </p>`;
    } else {
      topContainer.appendChild(lista);
    }
  });
});
