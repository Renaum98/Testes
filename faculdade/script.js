const boxMenu = document.querySelector("header");
const boxMenuBt = document.querySelector("#menu-icon");
const mainContent = document.querySelector("main");

boxMenuBt.addEventListener("click", (evento) => {
    evento.preventDefault();

    // Verifica se o menu está recolhido
    if (boxMenu.style.transform === "translateX(-100%)" || !boxMenu.style.transform) {
        // Mostra o menu
        boxMenu.style.transform = "translateX(0)";
        mainContent.style.marginLeft = "200px"; // Ajusta a margem do conteúdo principal
    } else {
        // Recolhe o menu
        boxMenu.style.transform = "translateX(-100%)";
        mainContent.style.marginLeft = "0"; // Remove a margem do conteúdo principal
    }

    // Adiciona transição suave
    boxMenu.style.transition = "transform 0.5s ease-in-out";
    mainContent.style.transition = "margin-left 0.5s ease-in-out";
});