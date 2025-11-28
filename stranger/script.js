// --- ELEMENTOS DO CAROUSEL --- //
const carousel = document.querySelector(".relatos-lista");
const slides = Array.from(document.querySelectorAll(".relatos-item"));
const indicadoresContainer = document.createElement("div");
indicadoresContainer.classList.add("relatos-indicadores");
const btConfidencial = document.querySelector("#botao-confidencial");
const secreto = document.querySelector(".secreto");

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

// --- CLIQUE NAS BOLINHAS --- //
indicadores.forEach(ind => {
    ind.addEventListener("click", () => {
        irParaSlide(Number(ind.dataset.index));
    });
});

// --- ATUALIZA INDICADORES QUANDO O USUÁRIO PASSA MANUALMENTE --- //
carousel.addEventListener("scroll", () => {
    const slideWidth = slides[0].offsetWidth + 16; // 16px = seu gap

    const snapIndex = Math.round(carousel.scrollLeft / slideWidth);

    if (snapIndex !== index && snapIndex >= 0 && snapIndex < slides.length) {
        index = snapIndex;
        atualizarIndicadores();
    }
});

btConfidencial.addEventListener("click", () => {
    if (secreto.style.display === 'none' || secreto.style.display === '') {
        secreto.style.display = 'block';
    } else {
        secreto.style.display = 'none';
    }
});

const elemento = document.getElementById("demoSurgir");

// cria o overlay (fundo com gradiente radial)
const overlay = document.createElement("div");
overlay.style.position = "fixed";
overlay.style.inset = "0";
overlay.style.background = "radial-gradient(circle, black, red)";
overlay.style.opacity = "0";
overlay.style.transition = "opacity 0.2s linear";
overlay.style.pointerEvents = "none";
overlay.style.zIndex = "998";

document.body.appendChild(overlay);

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const v = entry.intersectionRatio; // 0 → 1

        let opacidade;

        if (v < 0.5) {
            // antes de 50% → escurece até o máximo no meio
            opacidade = v / 0.5;
        } else {
            // depois de 50% → clareia de volta
            opacidade = (1 - v) / 0.5;
        }

        overlay.style.opacity = Math.max(0, Math.min(opacidade, 1));
    });
}, {
    threshold: Array.from({ length: 100 }, (_, i) => i / 100)
});

observer.observe(elemento);






