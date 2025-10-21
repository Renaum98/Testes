window.addEventListener("scroll", () => {
  const cabecalho = document.querySelector(".cabecalho");

  if (window.scrollY > 20) {
    cabecalho.classList.add("shrink");
  } else {
    cabecalho.classList.remove("shrink");
  }
});