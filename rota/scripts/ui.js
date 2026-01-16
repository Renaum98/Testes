import { state } from "./state.js";
import { mostrarNotificacao } from "./utils.js";
import { configurarSwipeActions } from "./swipe.js";
import { carregarDados } from "./storage.js";

// ============================================
// GERENCIAMENTO DE MODAIS
// ============================================

// NOVA FUNÇÃO: Abre o modal de registro direto
export function abrirModalRegistrarRota() {
  const modal = document.getElementById("modalRegistrarRota");
  if (modal) modal.classList.add("active");
}

export function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

// ============================================
// NAVEGAÇÃO
// ============================================
export function mudarPagina(event, pagina) {
  event.preventDefault();

  // Remove classe active de todas as páginas e links
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".menu-item_link")
    .forEach((l) => l.classList.remove("active"));

  // Adiciona active na página e link atuais
  const pageElement = document.getElementById("page-" + pagina);
  if (pageElement) pageElement.classList.add("active");

  if (event.currentTarget) {
    event.currentTarget.classList.add("active");
  }

  // Lógica específica por página
  if (pagina === "rotas") {
    carregarDados();
  }

  if (pagina === "config") {
    atualizarPerfilUsuario();
  }

  if (pagina === "financeiro") {
    atualizarPaginaFinanceiro();
  }
}

// ============================================
// ATUALIZAÇÃO DA INTERFACE
// ============================================

export function atualizarListaRotas() {
  const lista = document.getElementById("rotasList");
  const emptyState = document.getElementById("emptyState");
  const filtroInput = document.getElementById("filtroRotasMes");

  // Se não tem rotas carregadas, limpa tudo
  if (!state.rotas || state.rotas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent =
        "Nenhuma rota registrada ainda.";
    }
    return;
  }

  // --- LÓGICA DE FILTRO ---
  let rotasExibidas = state.rotas;

  if (filtroInput && filtroInput.value) {
    const [anoFiltro, mesFiltro] = filtroInput.value.split("-");

    rotasExibidas = state.rotas.filter((rota) => {
      const dataRota = new Date(rota.horarioInicio);
      const anoRota = dataRota.getFullYear().toString();
      const mesRota = (dataRota.getMonth() + 1).toString().padStart(2, "0");

      return anoRota === anoFiltro && mesRota === mesFiltro;
    });
  }
  // ------------------------

  // Verifica se o filtro resultou em lista vazia
  if (rotasExibidas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent = "Nenhuma rota neste mês.";
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  lista.innerHTML = rotasExibidas
    .map((rota) => {
      const inicio = new Date(rota.horarioInicio);
      const fim = rota.horarioFim ? new Date(rota.horarioFim) : new Date();
      const lucroLiquido = rota.lucroLiquido || 0;

      let kmNumerico = 0;
      if (rota.kmPercorridos !== undefined && rota.kmPercorridos !== null) {
        kmNumerico = Number(rota.kmPercorridos);
      } else if (rota.kmFinal && rota.kmInicial) {
        kmNumerico = Number(rota.kmFinal) - Number(rota.kmInicial);
      }
      if (isNaN(kmNumerico)) kmNumerico = 0;

      // Badge da Plataforma
      let plataformaHtml = "";
      if (rota.plataforma) {
        let corBadge = "#999";
        if (rota.plataforma === "shopee") corBadge = "#ee4d2d";
        if (rota.plataforma === "meli") corBadge = "#ffe600";

        plataformaHtml = `
          <div style="margin-top: 4px;">
            <span style="
              background: ${corBadge}; 
              color: ${rota.plataforma === "meli" ? "#2d3277" : "#fff"}; 
              padding: 2px 8px; 
              border-radius: 12px; 
              font-size: 0.70rem; 
              font-weight: bold;
              text-transform: uppercase;
              display: inline-block;
            ">
              ${rota.plataforma}
            </span>
          </div>
        `;
      }

      return `
        <div class="rota-item-container" data-rota-id="${rota.id}">
          <div class="rota-item-content">
            <div class="rota-card">
              <div class="rota-card-header">
                <div class="rota-data">${inicio.toLocaleDateString(
                  "pt-BR"
                )}</div>
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
                    })}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">KM Percorridos</span>
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span class="info-value">${kmNumerico.toFixed(1)} km</span>
                  </div>
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
                    ${rota.plataforma}
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
    const nome = user.nome || user.displayName || "Usuário";
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

    inputInicio.value = firstDayFormat(primeiroDia);
    inputFim.value = firstDayFormat(ultimoDia);
  }

  // 2. Converter inputs para Date
  const dataInicio = new Date(inputInicio.value + "T00:00:00");
  const dataFim = new Date(inputFim.value + "T23:59:59");

  // 3. Filtrar rotas
  const rotasFiltradas = state.rotas.filter((rota) => {
    const dataRota = new Date(rota.horarioFim || rota.horarioInicio);
    return dataRota >= dataInicio && dataRota <= dataFim;
  });

  // 4. Calcular Totais
  let totalFaturamento = 0;
  let totalCustos = 0;
  let totalLucro = 0;
  let totalKm = 0;

  rotasFiltradas.forEach((rota) => {
    const val = parseFloat(rota.valor) || 0;
    const custo = parseFloat(rota.custoGasolina) || 0;
    const lucro = parseFloat(rota.lucroLiquido) || val - custo;

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

  // 6. Atualizar Lista Filtrada
  renderizarListaFinanceiro(rotasFiltradas);
}

function firstDayFormat(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
