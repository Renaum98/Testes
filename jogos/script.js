const jogoPlataforma = document.querySelectorAll('.jogo-plataforma');
var filtroJogos = document.querySelector('#jogo');
const jogoTitulo = document.querySelectorAll('.jogo-titulo');

jogoPlataforma.forEach((plataforma) => {
    switch (plataforma.textContent) {
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

console.log(filtroJogos)

jogoTitulo.forEach((titulo) => {
    filtroJogos.innerHTML += `<option value="">${titulo.textContent}</option>`
})
