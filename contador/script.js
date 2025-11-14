document.addEventListener("DOMContentLoaded", () => {

    /* ============================
       CONTADOR DE DIAS
    ============================= */
    const contador = document.getElementById("contador");

    function atualizarDias() {
        const hoje = new Date();
        const viagem = new Date(2026, 3, 7); // 7 de abril (mês começa em 0)

        hoje.setHours(0, 0, 0, 0);
        viagem.setHours(0, 0, 0, 0);

        const msPorDia = 1000 * 60 * 60 * 24;
        const diferenca = viagem - hoje;

        const diasFaltando = Math.ceil(diferenca / msPorDia);

        if (contador) {
            contador.textContent = diasFaltando;
            contador.style.color = diasFaltando <= 10 ? "green" : "";
        }
    }

    atualizarDias();
    setInterval(atualizarDias, 1000 * 60 * 60);



    /* ============================
       MODAL DE IMAGEM
    ============================= */
    const modal = document.getElementById("modal-imagem");
    const modalImg = document.getElementById("modal-img");
    const fechar = document.querySelector(".modal-fechar");

    const imagensCardapio = document.querySelectorAll(".restaurantes_cardapio");

    if (imagensCardapio.length > 0 && modal && modalImg && fechar) {

        // Abrir modal
        imagensCardapio.forEach(img => {
            img.addEventListener("click", () => {
                modal.classList.add("ativo");
                modalImg.src = img.src;
            });
        });

        // Fechar via X
        fechar.addEventListener("click", () => {
            modal.classList.remove("ativo");
        });

        // Fechar clicando fora da imagem
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("ativo");
            }
        });
    }
});
