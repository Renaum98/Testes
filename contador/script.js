const contador = document.getElementById("contador");

function atualizarDias() {
    const dataHoje = new Date();
    const dataViagem = new Date('2026-04-07');

    // Zera a hora das duas datas pra comparar apenas o "dia"
    dataHoje.setHours(0, 0, 0, 0);
    dataViagem.setHours(0, 0, 0, 0);

    const diferencaMs = dataViagem - dataHoje;
    const umDiaMs = 1000 * 60 * 60 * 24;

    const diasFaltando = Math.ceil(diferencaMs / umDiaMs);

    if (diasFaltando <= 10) {
        contador.style.color = 'green'
    }

    contador.textContent = diasFaltando;
}

// Atualiza imediatamente ao carregar
atualizarDias();

// Atualiza a cada 1 hora (não precisa recalcular todo segundo)
setInterval(atualizarDias, 1000 * 60 * 60);

