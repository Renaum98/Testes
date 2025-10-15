import { db, collection, addDoc, serverTimestamp } from "./firebaseConfig.js";

function capitalizarPalavras(texto) {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(p => p.trim() !== "")
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formulario");
  const btnLimpar = document.getElementById("limpar-id");

  if (!form) return; // se não houver formulário, sai da função

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome-id").value;
    const filme = capitalizarPalavras(document.getElementById("filme-id").value);
    const onde = document.getElementById("onde-id").value;
    const genero = document.getElementById("genero-id").value;
    const categoria = document.getElementById("categoria-id").value;
    const nota = document.getElementById("nota-id").value;

    if (!nome || !filme || !onde || !genero || !nota || !categoria) {
      alert("Por favor, preencha todos os campos!");
      return;
    }
    if (nota > 5 || nota < 1) {
      alert("A nota precisa ser de 1 a 5");
      return;
    }

    await addDoc(collection(db, "filmes"), {
      nome,
      filme,
      onde,
      genero,
      categoria,
      data: serverTimestamp(),
      avaliacoes: { [nome]: parseFloat(nota) }
    });

    alert(`${categoria}: ${filme} adicionado por ${nome}!`);
    form.reset();
  });

  btnLimpar.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
  });
});
