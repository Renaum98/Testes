const trilhaNota = parseFloat(document.querySelector('.trilha_nota').textContent)
const graficoNota = parseFloat(document.querySelector('.grafico_nota').textContent)
const historiaNota = parseFloat(document.querySelector('.historia_nota').textContent)
const mediaNotaFinal = document.querySelector('.nota-valor')

const mediaNotas = (trilhaNota + graficoNota + historiaNota) / 3

mediaNotaFinal.textContent = mediaNotas.toFixed(1)

