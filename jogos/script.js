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
        mudarTema.setAttribute('src', 'imagens/assets/seta-on.svg');
        mudarTema.style.transform = 'rotate(360deg)'
        
    } else {
        body.style.backgroundColor = 'var(--cor-primaria-fundo)'; 
        mudarTema.setAttribute('src', 'imagens/assets/seta-off.svg');
        mudarTema.style.transform = 'rotate(-360deg)'
        
    }
}
