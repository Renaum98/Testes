// Espera até que todo o conteúdo da página (HTML) seja carregado
// Isso garante que os elementos já existam no DOM antes do JS tentar acessá-los
document.addEventListener("DOMContentLoaded", function () {

  // ==========================
  // 🎯 SELEÇÃO DOS ELEMENTOS
  // ==========================

  const form = document.getElementById("formulario");           // o formulário principal
  const filmesContainer = document.querySelector(".filmes_container"); // onde os cards de filmes aparecerão
  const btnLimpar = document.getElementById("limpar-id");       // botão "Limpar" do formulário


  // ==========================================
  // ✍️ FUNÇÃO PARA CAPITALIZAR NOMES DE FILMES
  // ==========================================

  // Essa função recebe uma string (texto digitado pelo usuário)
  // e retorna a mesma frase com a primeira letra de cada palavra em maiúscula.
  // Exemplo: "o senhor dos aneis" → "O Senhor Dos Aneis"
  function capitalizarPalavras(texto) {
    return texto
      .toLowerCase()                           // transforma tudo em letras minúsculas
      .split(" ")                              // divide o texto em um array, separando pelas palavras (usando espaços)
      .filter(palavra => palavra.trim() !== "") // remove espaços vazios no começo, meio ou fim
      .map(palavra =>                          // percorre cada palavra do array
        palavra.charAt(0).toUpperCase() +      // transforma a primeira letra em maiúscula
        palavra.slice(1)                       // junta o restante da palavra
      )
      .join(" ");                              // junta todas as palavras de volta em uma string separada por espaços
  }


  // ==========================================
  // 📤 EVENTO DE ENVIO DO FORMULÁRIO
  // ==========================================

  // Quando o usuário clicar no botão "Enviar", essa função é executada
  form.addEventListener("submit", function (e) {
    e.preventDefault(); // Impede que o formulário recarregue a página automaticamente

    // Pegamos os valores dos campos do formulário:
    const nome = document.getElementById("nome-id").value; // nome selecionado
    const filme = capitalizarPalavras(document.getElementById("filme-id").value); // nome do filme, formatado
    const onde = document.getElementById("onde-id").value; // plataforma onde assistir
    const genero = document.getElementById("genero-id").value; // gênero selecionado

    // ==========================================
    // ⚠️ VERIFICAÇÃO DE CAMPOS OBRIGATÓRIOS
    // ==========================================

    // Se qualquer campo estiver vazio, mostramos um alerta e paramos a execução
    if (!nome || !filme || !onde || !genero) {
      alert("Por favor, preencha todos os campos!");
      return; // interrompe o código aqui
    }

    // ==========================================
    // 🧱 CRIAÇÃO DO CARD DE FILME
    // ==========================================

    const filmeItem = document.createElement("div"); // cria uma <div> nova
    filmeItem.classList.add("filmes_container-item"); // adiciona a classe CSS para estilizar o card

    // Captura a data atual e formata para o padrão brasileiro (DD/MM/AAAA)
    const data = new Date();
    const dataFormatada = data.toLocaleDateString("pt-BR");

    // Define o conteúdo HTML do novo card usando template literals (crases)
    // Usamos ${variavel} para inserir os valores dinâmicos
    filmeItem.innerHTML = `
      <div class="filme_card-nome">
        <!-- Imagem do perfil do usuário (ex: perfil_renan.png) -->
        <img src="imagens/perfil_${nome.toLowerCase()}.png" alt="${nome}" width="50" class="imagem_perfil">
        <p class="titulo-usuario">${nome}</p>
      </div>

      <div class="filme_card-dados">
        <p class="titulo_filme">Filme: <span class="titulo_filme-escolhido">${filme}</span></p>
        <p class="titulo_onde">Onde: <span class="titulo_onde-escolhido">${onde}</span></p>
        <p class="titulo_genero">Gênero: <span class="titulo_genero-escolhido">${genero}</span></p>
        <p class="titulo-data">${dataFormatada}</p>
      </div>

      <div class="grupo_filho-1">
        <div class="avaliacao_status"></div>
        <button class="botoes">Avaliar</button>
      </div>
    `;

    // ==========================================
    // ➕ ADICIONA O CARD NA TELA
    // ==========================================

    filmesContainer.appendChild(filmeItem); // insere o novo card dentro do container principal

    // ==========================================
    // 🧹 LIMPA O FORMULÁRIO
    // ==========================================

    form.reset(); // limpa todos os campos do formulário para o próximo uso
  });


  // ==========================================
  // 🧽 BOTÃO "LIMPAR"
  // ==========================================

  // Quando o usuário clicar em "Limpar", o formulário é limpo
  btnLimpar.addEventListener("click", function (e) {
    e.preventDefault(); // evita recarregar a página
    form.reset(); // limpa os campos manualmente
  });
});
