import { state } from "./state.js";
import { mostrarNotificacao } from "./utils.js";
import { configurarSwipeActions } from "./swipe.js";
import { carregarDados } from "./storage.js";

// ============================================
// GERENCIAMENTO DE MODAIS
// ============================================
export function abrirModalIniciarRota() {
  if (state.rotaAtual) {
    mostrarNotificacao("Você já tem uma rota em andamento!", "info");
    return;
  }
  const modal = document.getElementById("modalIniciarRota");
  if (modal) modal.classList.add("active");
}

export function abrirModalEncerrarRota() {
  if (!state.rotaAtual) {
    mostrarNotificacao("Nenhuma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalEncerrarRota").classList.add("active");
}

export function fecharModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

// ============================================
// NAVEGAÇÃO
// ============================================
export function mudarPagina(event, pagina) {
  event.preventDefault();

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".menu-item_link")
    .forEach((l) => l.classList.remove("active"));

  document.getElementById("page-" + pagina).classList.add("active");
  event.currentTarget.classList.add("active");

  if (pagina === "rotas") {
    carregarDados();
  }

  document.getElementById("page-" + pagina).classList.add("active");
  event.currentTarget.classList.add("active");

  if (pagina === "rotas") carregarDados();

  // ADICIONAR ISSO:
  if (pagina === "config") {
    atualizarPerfilUsuario(); // Chama a função que criamos acima
  }
}

// ============================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================
export function atualizarRotaAberta() {
  const container = document.getElementById("rotaAbertaContainer");
  const detalhes = document.getElementById("detalhesRotaAberta");

  if (state.rotaAtual) {
    const inicio = new Date(state.rotaAtual.horarioInicio);
    const agora = new Date();
    const duracao = Math.floor((agora - inicio) / 60000);

    const horas = Math.floor(duracao / 60);
    const minutos = duracao % 60;

    detalhes.innerHTML = `
      <div><strong>Início:</strong> ${inicio.toLocaleTimeString("pt-BR")}</div>
      <div><strong>Tempo Decorrido:</strong> ${horas}h ${minutos}min</div>
      <div style="font-size: 0.8rem; color: #666;">Clique para finalizar</div>
    `;

    container.classList.add("active");
  } else {
    container.classList.remove("active");
  }
}

export function atualizarListaRotas() {
  const lista = document.getElementById("rotasList");
  const emptyState = document.getElementById("emptyState");

  if (!state.rotas || state.rotas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  lista.innerHTML = state.rotas
    .map((rota) => {
      const inicio = new Date(rota.horarioInicio);
      const fim = rota.horarioFim ? new Date(rota.horarioFim) : new Date();

      const custoGasolina = rota.custoGasolina || 0;
      const lucroLiquido = rota.lucroLiquido || rota.valor - custoGasolina;

      // CORREÇÃO AQUI: Garante que pegamos o valor correto, seja da lógica antiga ou nova
      // Se tiver 'kmPercorridos' direto (nova lógica), usa ele.
      // Se não, tenta calcular (lógica antiga). Se falhar, usa 0.
      let kmTotal = 0;
      if (rota.kmPercorridos !== undefined && rota.kmPercorridos !== null) {
        kmTotal = parseFloat(rota.kmPercorridos);
      } else if (rota.kmFinal && rota.kmInicial) {
        kmTotal = rota.kmFinal - rota.kmInicial;
      }

      // Formatação da Plataforma
      let plataformaHtml = "";
      if (rota.plataforma) {
        let corBadge = "#999";
        if (rota.plataforma === "shopee") corBadge = "#ee4d2d"; // Laranja Shopee
        if (rota.plataforma === "meli") corBadge = "#ffe600"; // Amarelo ML

        plataformaHtml = `
          
            ${rota.plataforma}
          
        `;
      }

      return `
        <div class="rota-item-container" data-rota-id="${rota.id}">
          <div class="rota-item-content">
            <div class="rota-card">
              <div class="rota-card-header">
                <div class="rota-data">
                    ${inicio.toLocaleDateString("pt-BR")}
                </div>
                <div class="rota-valor">R$ ${
                  rota.valor?.toFixed(2) || "0.00"
                }</div>
              </div>
              <div class="rota-info">
                <div class="info-item">
                  <span class="info-label">Horário</span>
                  <span class="info-value">
                    ${inicio.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - 
                    ${fim.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">KM Percorridos</span>
                  <span class="info-value">${
                    isNaN(kmTotal) ? "0.0" : kmTotal.toFixed(1)
                  } km</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Lucro Líquido</span>
                  <span class="info-value" style="color: #10b981; font-weight: 600;">
                    R$ ${lucroLiquido.toFixed(2)}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Plataforma</span>
                  <span class="info-value">
                    ${plataformaHtml}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="rota-swipe-action delete-action">
            <button class="btn-swipe-delete" data-id="${rota.id}">
              <span class="material-symbols-outlined">delete</span>
              <span>Excluir</span>
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  configurarSwipeActions();
}

// ============================================
// PERFIL DO USUÁRIO
// ============================================
export function atualizarPerfilUsuario() {
  const user = window.firebaseDb?.auth?.currentUser;

  const nomeElement = document.getElementById("profileName");
  const emailElement = document.getElementById("profileEmail");

  if (user && nomeElement && emailElement) {
    // Tenta pegar o nome do Google/Firebase ou usa o email
    const nome = user.nome || "Usuário";
    const email = user.email;

    nomeElement.textContent = nome;
    emailElement.textContent = email;
  }
}

// ============================================
// LÓGICA DO FINANCEIRO
// ============================================
export function atualizarPaginaFinanceiro() {
  const inputInicio = document.getElementById("filtroDataInicio");
  const inputFim = document.getElementById("filtroDataFim");

  // 1. Definir datas padrão (Mês atual) se estiver vazio
  if (!inputInicio.value || !inputFim.value) {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Formata para YYYY-MM-DD (formato do input date)
    inputInicio.value = firstDayFormat(primeiroDia);
    inputFim.value = firstDayFormat(ultimoDia);
  }

  // 2. Converter inputs para Date
  // Ajustamos o fuso horário adicionando "T00:00:00" e "T23:59:59"
  const dataInicio = new Date(inputInicio.value + "T00:00:00");
  const dataFim = new Date(inputFim.value + "T23:59:59");

  console.log("Filtrando de", dataInicio, "até", dataFim);

  // 3. Filtrar rotas
  const rotasFiltradas = state.rotas.filter((rota) => {
    // Usa data de fim se tiver, senão data de início
    const dataRota = new Date(rota.horarioFim || rota.horarioInicio);
    return dataRota >= dataInicio && dataRota <= dataFim;
  });

  // 4. Calcular Totais
  let totalFaturamento = 0;
  let totalCustos = 0;
  let totalLucro = 0;
  let totalKm = 0;

  rotasFiltradas.forEach((rota) => {
    // Garante que é número
    const val = parseFloat(rota.valor) || 0;
    const custo = parseFloat(rota.custoGasolina) || 0;
    const lucro = parseFloat(rota.lucroLiquido) || val - custo;

    // Tratamento de KM
    let km = 0;
    if (rota.kmPercorridos !== undefined && rota.kmPercorridos !== null) {
      km = Number(rota.kmPercorridos);
    } else if (rota.kmFinal && rota.kmInicial) {
      km = Number(rota.kmFinal) - Number(rota.kmInicial);
    }

    totalFaturamento += val;
    totalCustos += custo;
    totalLucro += lucro;
    totalKm += isNaN(km) ? 0 : km;
  });

  // 5. Atualizar DOM (Cards)
  document.getElementById(
    "finLucroLiquido"
  ).textContent = `R$ ${totalLucro.toFixed(2)}`;
  document.getElementById(
    "finFaturamento"
  ).textContent = `R$ ${totalFaturamento.toFixed(2)}`;
  document.getElementById("finCustos").textContent = `R$ ${totalCustos.toFixed(
    2
  )}`;
  document.getElementById("finKmTotal").textContent = `${totalKm.toFixed(
    1
  )} km`;

  // 6. Atualizar Lista Filtrada (Reaproveita o estilo da lista principal)
  renderizarListaFinanceiro(rotasFiltradas);
}

// Função auxiliar para formatar data pro input (YYYY-MM-DD)
function firstDayFormat(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Função simples para renderizar a lista abaixo dos cards
function renderizarListaFinanceiro(listaRotas) {
  const container = document.getElementById("listaFinanceiro");

  if (listaRotas.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#a0aec0;">Nenhuma rota neste período.</div>`;
    return;
  }

  container.innerHTML = listaRotas
    .map((rota) => {
      const data = new Date(rota.horarioFim || rota.horarioInicio);
      const lucro = rota.lucroLiquido || rota.valor - rota.custoGasolina;

      // Badge pequena
      let badge = "";
      if (rota.plataforma === "shopee")
        badge = `<span style="color:#ee4d2d; font-weight:bold; font-size:0.7em;">SHOPEE</span>`;
      if (rota.plataforma === "meli")
        badge = `<span style="color:#ffe600; font-weight:bold; font-size:0.7em; text-shadow:0 0 1px #999;">MELI</span>`;

      return `
      <div class="rota-item-container" style="border-bottom: 1px solid #edf2f7; padding: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.85rem; color:#2d3748; font-weight:600;">
              ${data.toLocaleDateString("pt-BR")} ${badge}
            </div>
            <div style="font-size:0.75rem; color:#718096;">
              ${
                rota.kmPercorridos || 0
              } km • Gasto: R$ ${rota.custoGasolina?.toFixed(2)}
            </div>
          </div>
          <div style="text-align:right;">
             <div style="font-size:0.9rem; color:#10b981; font-weight:700;">+ R$ ${lucro.toFixed(
               2
             )}</div>
             <div style="font-size:0.7rem; color:#cbd5e0;">Bruto: ${rota.valor?.toFixed(
               2
             )}</div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}