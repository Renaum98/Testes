const listaContainer = document.querySelectorAll(".categorias-list")

listaContainer.forEach(item => {
    item.onclick = () =>{
        if (item.style.display === "none") {
            item.style.display = "block"
        } else {
            item.style.display = "none"
        }
    }
})