window.addEventListener("scroll", () => {
  const cabecalho = document.querySelector(".cabecalho");

  if (window.scrollY > 50) {
    cabecalho.classList.add("shrink");
  } else {
    cabecalho.classList.remove("shrink");
  }
});