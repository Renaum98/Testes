document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     CONTADOR DE DIAS (mantive seu código)
  ============================= */
  const contador = document.getElementById("contador");
  function atualizarDias() {
    const hoje = new Date();
    const viagem = new Date(2026, 3, 7);
    hoje.setHours(0,0,0,0);
    viagem.setHours(0,0,0,0);
    const msPorDia = 1000*60*60*24;
    const diasFaltando = Math.ceil((viagem - hoje) / msPorDia);
    if (contador) {
      contador.textContent = diasFaltando;
      contador.style.color = diasFaltando <= 10 ? "green" : "";
    }
  }
  atualizarDias();
  setInterval(atualizarDias, 1000 * 60 * 60);



  /* ============================
     MODAL DE IMAGEM (mantive seu código)
  ============================= */
  const modal = document.getElementById("modal-imagem");
  const modalImg = document.getElementById("modal-img");
  const fechar = document.querySelector(".modal-fechar");
  document.querySelectorAll(".restaurantes_cardapio").forEach(img => {
    img.addEventListener("click", () => {
      modal.classList.add("ativo");
      modalImg.src = img.src;
    });
  });
  if (fechar) fechar.addEventListener("click", () => modal.classList.remove("ativo"));
  if (modal) modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("ativo"); });



  /* ============================
     CAROUSELS — funciona para TODOS
     seleciona tanto .carousel_imagens quanto .restaurantes_carousel
  ============================= */

  // Seleciona todos os containers que serão carousels
  const allContainers = Array.from(document.querySelectorAll(".carousel_imagens, .restaurantes_carousel"));

  allContainers.forEach(container => {
    const slides = Array.from(container.querySelectorAll("img, .slide")); // aceita imagens ou elementos com .slide
    if (slides.length === 0) return; // nada a fazer

    // encontra ou cria um container de indicadores logo depois do carousel
    let indicadores = container.parentElement.querySelector(".carousel-indicadores");
    if (!indicadores) {
      indicadores = document.createElement("div");
      indicadores.className = "carousel-indicadores";
      // insere depois do container (mantém DOM organizado)
      container.insertAdjacentElement("afterend", indicadores);
    } else {
      // limpa se já tiver algo
      indicadores.innerHTML = "";
    }

    // cria dots e listeners
    slides.forEach((slide, i) => {
      const dot = document.createElement("span");
      if (i === 0) dot.classList.add("ativo");
      indicadores.appendChild(dot);

      dot.addEventListener("click", () => {
        const left = slide.offsetLeft;
        if (typeof container.scrollTo === "function") {
          try {
            container.scrollTo({ left, behavior: "smooth" });
          } catch {
            container.scrollLeft = left;
          }
        } else {
          container.scrollLeft = left;
        }
      });
    });

    // Função robusta para atualizar indicador: encontra slide com centro mais próximo do centro do container
    let rafId = null;
    function atualizarIndicador() {
      rafId = null;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      let closestIdx = 0;
      let closestDist = Infinity;
      slides.forEach((s, idx) => {
        const slideCenter = s.offsetLeft + s.offsetWidth / 2;
        const dist = Math.abs(slideCenter - containerCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });

      const dots = indicadores.querySelectorAll("span");
      dots.forEach((d, i) => d.classList.toggle("ativo", i === closestIdx));
    }

    // Debounced scroll handler
    container.addEventListener("scroll", () => {
      if (rafId === null) rafId = requestAnimationFrame(atualizarIndicador);
    });

    // Recalcula offsets quando imagens carregam (importante se imagens ainda estão carregando)
    let imagesToWait = slides.filter(s => s.tagName === "IMG" && !s.complete);
    if (imagesToWait.length > 0) {
      let loaded = 0;
      imagesToWait.forEach(img => {
        img.addEventListener("load", () => {
          loaded++;
          if (loaded === imagesToWait.length) atualizarIndicador();
        });
        // também trata erro para não travar
        img.addEventListener("error", () => {
          loaded++;
          if (loaded === imagesToWait.length) atualizarIndicador();
        });
      });
    } else {
      // se não há imagens pendentes, inicializa o indicador
      atualizarIndicador();
    }

    // Recalcula ao redimensionar a janela
    window.addEventListener("resize", () => {
      // recalc indicador / offsets após resize (debounce simples)
      if (rafId === null) rafId = requestAnimationFrame(atualizarIndicador);
    });

    // (Opcional) suporte a clique em teclado nas bolinhas - acessibilidade
    indicadores.querySelectorAll("span").forEach((dot, idx) => {
      dot.setAttribute("role", "button");
      dot.setAttribute("tabindex", "0");
      dot.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const left = slides[idx].offsetLeft;
          if (typeof container.scrollTo === "function") {
            try { container.scrollTo({ left, behavior: "smooth" }); } catch { container.scrollLeft = left; }
          } else container.scrollLeft = left;
        }
      });
    });

  }); // end allContainers.forEach

}); // end DOMContentLoaded
