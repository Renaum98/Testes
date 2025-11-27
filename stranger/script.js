// --- ELEMENTOS DO CAROUSEL --- //
const carousel = document.querySelector(".relatos-lista");
const slides = Array.from(document.querySelectorAll(".relatos-item"));
const indicadoresContainer = document.createElement("div");
indicadoresContainer.classList.add("relatos-indicadores");

// adiciona após a lista
carousel.insertAdjacentElement("afterend", indicadoresContainer);

// --- CRIA AS BOLINHAS --- //
slides.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.classList.add("relatos-indicador");
    if (i === 0) dot.classList.add("ativo");
    dot.dataset.index = i;
    indicadoresContainer.appendChild(dot);
});

const indicadores = document.querySelectorAll(".relatos-indicador");

// estado
let index = 0;
let autoplay;
let retomada;

// --- FUNÇÃO PARA ATUALIZAR BOLINHAS --- //
function atualizarIndicadores() {
    indicadores.forEach(ind => ind.classList.remove("ativo"));
    indicadores[index].classList.add("ativo");
}

// --- VAI PARA SLIDE PELO ÍNDICE --- //
function irParaSlide(i) {
    index = i;
    slides[index].scrollIntoView({
        behavior: "smooth",
        inline: "start"
    });
    atualizarIndicadores();
}

// --- AUTOPLAY --- //
function startAutoplay() {
    autoplay = setInterval(() => {
        index = (index + 1) % slides.length;
        irParaSlide(index);
    }, 3000);
}

function stopAutoplay() {
    clearInterval(autoplay);
    clearTimeout(retomada);

    // retomada inteligente após 5 segundos sem interação
    retomada = setTimeout(() => {
        startAutoplay();
    }, 5000);
}

// inicia autoplay
startAutoplay();

// --- EVENTOS PARA PAUSAR O AUTOPLAY --- //
["wheel", "touchstart", "mousedown"].forEach(evt => {
    carousel.addEventListener(evt, stopAutoplay);
});

// --- CLIQUE NAS BOLINHAS --- //
indicadores.forEach(ind => {
    ind.addEventListener("click", () => {
        stopAutoplay();
        irParaSlide(Number(ind.dataset.index));
    });
});

// --- AJUSTA BOLINHAS QUANDO O USUÁRIO PASSA MANUALMENTE --- //
carousel.addEventListener("scroll", () => {
    const slideWidth = slides[0].offsetWidth + 16; // 16px de gap
    const snapIndex = Math.round(carousel.scrollLeft / slideWidth);

    if (snapIndex !== index && snapIndex >= 0 && snapIndex < slides.length) {
        index = snapIndex;
        atualizarIndicadores();
    }
});
