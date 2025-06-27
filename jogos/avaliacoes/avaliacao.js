const trilhaNota = parseFloat(document.querySelector('.trilha_nota').textContent)
const graficoNota = parseFloat(document.querySelector('.grafico_nota').textContent)
const historiaNota = parseFloat(document.querySelector('.historia_nota').textContent)

const mediaNotaFinal = document.querySelector('.nota-valor')
const mudarTema = document.querySelector('.header_icon-off')
const body = document.body

const mediaNotas = (trilhaNota + graficoNota + historiaNota) / 3

mediaNotaFinal.textContent = mediaNotas.toFixed(1)

mudarTema.onclick = () => {
    const currentBg = getComputedStyle(body).backgroundColor;

    if (currentBg === 'rgb(39, 39, 39)') {
        body.style.backgroundColor = "var(--cor-base)";
        mudarTema.setAttribute('src', '../imagens/assets/seta-on.svg');
        mudarTema.style.transform = 'rotate(360deg)'
    } else {
        body.style.backgroundColor = 'var(--cor-primaria-fundo)'; 
        mudarTema.setAttribute('src', '../imagens/assets/seta-off.svg');
        mudarTema.style.transform = 'rotate(-360deg)'

    }
}

