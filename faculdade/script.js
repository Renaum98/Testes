const boxMenu = document.querySelector("header");
const boxMenuBt = document.querySelector("#menu-icon");
const mainContent = document.querySelector("main");

boxMenuBt.addEventListener("click", (evento) => {
    evento.preventDefault();

    // Verifica se o menu está recolhido
    if (boxMenu.style.transform === "translateX(-100%)" || !boxMenu.style.transform) {
        // Mostra o menu
        boxMenu.style.transform = "translateX(0)";
        mainContent.style.marginLeft = "200px"; // Ajusta a margem do conteúdo principal
    } else {
        // Recolhe o menu
        boxMenu.style.transform = "translateX(-100%)";
        mainContent.style.marginLeft = "0"; // Remove a margem do conteúdo principal
    }

    // Adiciona transição suave
    boxMenu.style.transition = "transform 0.5s ease-in-out";
    mainContent.style.transition = "margin-left 0.5s ease-in-out";
});

function botaoEnviar() {
    // Selecionando os campos
    const inputUsuario = document.querySelector('#id-us');
    const inputEquipamento = document.querySelector('#id-eq');
    const inputData = document.querySelector('#id-data');

    // Extraindo os valores
    const usuarioValor = inputUsuario.value;
    const equipamentoValor = inputEquipamento.value;
    const dataValor = inputData.value;

    // Validando os campos
    if (!usuarioValor || !equipamentoValor || !dataValor) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // Criando um objeto com os dados
    const dados = {
        usuario: usuarioValor,
        equipamento: equipamentoValor,
        data: dataValor
    };

    // Salvando no localStorage
    let historico = JSON.parse(localStorage.getItem('historico')) || [];
    historico.push(dados);
    localStorage.setItem('historico', JSON.stringify(historico));

    // Redirecionando para a página de histórico
    window.location.href = 'historico.html';
}


document.addEventListener('DOMContentLoaded', function() {
    // Recuperando os dados do localStorage
    const historico = JSON.parse(localStorage.getItem('historico')) || [];

    // Selecionando o corpo da tabela
    const tabelaCorpo = document.querySelector('#tabela-corpo');

    // Adicionando cada linha de dados
    historico.forEach(item => {
        const novaLinha = document.createElement('tr');

        // Criando as células
        const celulaUsuario = document.createElement('td');
        celulaUsuario.textContent = item.usuario;

        const celulaEquipamento = document.createElement('td');
        celulaEquipamento.textContent = item.equipamento;

        const celulaData = document.createElement('td');
        celulaData.textContent = item.data;

        // Adicionando as células à nova linha
        novaLinha.appendChild(celulaUsuario);
        novaLinha.appendChild(celulaEquipamento);
        novaLinha.appendChild(celulaData);

        // Adicionando a linha à tabela
        tabelaCorpo.appendChild(novaLinha);
    });
});





