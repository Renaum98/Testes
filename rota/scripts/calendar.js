import { state } from "./state.js";

let dataAtualCalendario = new Date();

export function inicializarCalendario() {
  renderizarCalendario();

  // Listeners dos botões de navegar (Prev/Next)
  const btnPrev = document.getElementById("btnPrevMonth");
  const btnNext = document.getElementById("btnNextMonth");

  if (btnPrev && btnNext) {
    // Clone para remover listeners antigos (igual fizemos antes)
    const newPrev = btnPrev.cloneNode(true);
    const newNext = btnNext.cloneNode(true);
    btnPrev.parentNode.replaceChild(newPrev, btnPrev);
    btnNext.parentNode.replaceChild(newNext, btnNext);

    newPrev.addEventListener("click", () => {
      dataAtualCalendario.setMonth(dataAtualCalendario.getMonth() - 1);
      renderizarCalendario();
    });

    newNext.addEventListener("click", () => {
      dataAtualCalendario.setMonth(dataAtualCalendario.getMonth() + 1);
      renderizarCalendario();
    });
  }
}

export function renderizarCalendario() {
  const grid = document.getElementById("calendarGrid");
  const titulo = document.getElementById("calendarTitle");
  
  if (!grid || !titulo) return;

  grid.innerHTML = ""; // Limpa anterior

  const ano = dataAtualCalendario.getFullYear();
  const mes = dataAtualCalendario.getMonth(); // 0 a 11

  // Atualiza Título (Ex: Janeiro 2026)
  const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dataAtualCalendario);
  titulo.textContent = `${nomeMes} ${ano}`;

  // Lógica de Dias
  const primeiroDiaDoMes = new Date(ano, mes, 1).getDay(); // 0 (Dom) a 6 (Sab)
  const diasNoMes = new Date(ano, mes + 1, 0).getDate(); // Ex: 31
  
  // Data de hoje para marcar
  const hoje = new Date();
  
  // MAPA DE ROTAS: Conta quantas rotas tem em cada dia
  // Cria um objeto tipo: { "2026-01-20": 3, "2026-01-21": 1 }
  const rotasPorDia = {};
  
  if (state.rotas && Array.isArray(state.rotas)) {
      state.rotas.forEach(rota => {
          if (!rota.horarioInicio) return;
          const d = new Date(rota.horarioInicio);
          // Chave única para o dia: YYYY-M-D (sem zero à esquerda pra facilitar)
          const chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          
          if (rotasPorDia[chave]) {
              rotasPorDia[chave]++;
          } else {
              rotasPorDia[chave] = 1;
          }
      });
  }

  // 1. Espaços vazios antes do dia 1
  for (let i = 0; i < primeiroDiaDoMes; i++) {
    const vazio = document.createElement("div");
    vazio.classList.add("calendar-day", "faded");
    grid.appendChild(vazio);
  }

  // 2. Dias do Mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const elDia = document.createElement("div");
    elDia.classList.add("calendar-day");
    
    // Verifica se é hoje
    if (dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()) {
        elDia.classList.add("today");
    }

    // Número do dia
    const spanNumero = document.createElement("span");
    spanNumero.textContent = dia;
    elDia.appendChild(spanNumero);

    // Verifica se tem rotas neste dia
    const chaveDia = `${ano}-${mes}-${dia}`;
    if (rotasPorDia[chaveDia]) {
        const badge = document.createElement("div");
        badge.classList.add("day-badge");
        badge.textContent = rotasPorDia[chaveDia];
        elDia.appendChild(badge);
    }

    grid.appendChild(elDia);
  }
}