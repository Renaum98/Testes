const listaMenu = document.querySelector('.header_list')
const menuButton = document.getElementById('header_menu-icon')
const jogoPlataforma = document.querySelectorAll('.jogo-plataforma');
const mudarTema = document.querySelector('.header_icon-off')
const body = document.body

jogoPlataforma.forEach((plataforma) => {
    switch (plataforma.textContent.trim()) {
        case "PC":
            plataforma.style.backgroundColor = "grey"
            plataforma.style.color = "white"
            break;

        case "PS5":
            plataforma.style.backgroundColor = "#005499"
            plataforma.style.color = "white"
            break;

        case "Xbox 360":
        plataforma.style.backgroundColor = "#107B10"
        plataforma.style.color = "white"
        break;
    
        default:
            break;
    }
})

mudarTema.onclick = () => {
    const currentBg = getComputedStyle(body).backgroundColor;

    if (currentBg === 'rgb(39, 39, 39)') {
        body.style.backgroundColor = "var(--cor-base)";
        body.style.transition = '0.5s'
        mudarTema.setAttribute('src', 'imagens/assets/seta-on.svg');
        mudarTema.style.transform = 'rotate(360deg)'
        
    } else {
        body.style.backgroundColor = 'var(--cor-primaria-fundo)'; 
        mudarTema.setAttribute('src', 'imagens/assets/seta-off.svg');
        mudarTema.style.transform = 'rotate(-360deg)'
        
    }
}


function filtrarJogos() {
    const inputPesquisa = document.getElementById('pesquisar'); // Captura o campo de pesquisa
    const filtro = inputPesquisa.value.toLowerCase(); // Converte o valor da pesquisa para minúsculas
    const jogos = document.querySelectorAll('.jogos_container-item'); // Captura todos os itens de jogo

    jogos.forEach(jogo => {
        const tituloJogo = jogo.querySelector('.jogo-titulo').textContent.toLowerCase(); // Título do jogo

        // Se o título do jogo contém o filtro, mostra o item, caso contrário, esconde
        if (tituloJogo.indexOf(filtro) > -1) {
            jogo.style.display = ''; // Exibe o item
        } else {
            jogo.style.display = 'none'; // Esconde o item
        }
    });
}

// Adiciona um evento para detectar mudanças no campo de pesquisa
document.getElementById('pesquisar').addEventListener('input', filtrarJogos);

menuButton.onclick = () => {
    if (listaMenu.style.display == "none" ||screen < "768px" ) {
        listaMenu.style.display = "flex"
    } else {
        listaMenu.style.display = "none"
    }
}


