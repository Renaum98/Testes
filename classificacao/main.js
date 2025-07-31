/*const listaContainer = document.querySelectorAll(".categorias-list")
const caixaClasse = document.querySelectorAll(".caixa-classe")

listaContainer.forEach(item => {
    caixaClasse.onclick = () =>{
        if (item.style.display === "none" || item.style.display == "") {
            item.style.display = "block"
        } 
        else {
            item.style.display = "none"
        }
    }
})*/

const caixas = document.querySelectorAll(".caixa-classe");
const listaContainer = document.querySelectorAll(".categorias-list");

caixas.forEach((caixa, index) => {
  const lista = listaContainer[index];
  caixa.addEventListener("click", () => {
    const current = getComputedStyle(lista).display;

    if (current === "none") {
      lista.style.display = "flex";
    } else {
      lista.style.display = "none";
    }
  });
});

