import { state } from "./state.js";
import { configurarSwipeActions } from "./swipe.js";
import { carregarDados } from "./storage.js";
import { renderizarCalendario } from "./calendar.js";

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
  // 2. CORREÇÃO: Renderiza o calendário LOGO NO INÍCIO
  // Isso garante que ele apareça mesmo se não houver rotas na lista
  renderizarCalendario();

  const lista = document.getElementById("rotasList");
  const emptyState = document.getElementById("emptyState");
  const filtroInput = document.getElementById("filtroRotasMes");

  // Se não tem rotas carregadas, limpa tudo
  if (!state.rotas || state.rotas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent = "Nenhuma rota registrada ainda.";
    }
    // O calendário já foi renderizado lá em cima, então podemos sair
    return;
  }

  // --- LÓGICA DE FILTRO (MÊS/ANO) ---
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

  // --- RENDERIZAÇÃO ---
  lista.innerHTML = rotasExibidas
    .map((rota) => {
      const inicio = new Date(rota.horarioInicio);
      const lucroLiquido = rota.lucroLiquido || 0;

      // Tratamento do KM
      let kmNumerico = 0;
      if (rota.kmPercorridos !== undefined && rota.kmPercorridos !== null) {
        kmNumerico = Number(rota.kmPercorridos);
      } else if (rota.kmFinal && rota.kmInicial) {
        kmNumerico = Number(rota.kmFinal) - Number(rota.kmInicial);
      }
      if (isNaN(kmNumerico)) kmNumerico = 0;

      return `
        <div class="rota-item-container" data-rota-id="${rota.id}">
          
           <div class="rota-item-content">
            <div class="rota-card">
              <div class="rota-card-header">
                <div class="rota-data">${inicio.toLocaleDateString("pt-BR")}</div>
                <div class="rota-valor">R$ ${rota.valor?.toFixed(2) || "0.00"}</div>
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

  // Funções auxiliares
  if (typeof configuringSwipeActions === 'function') configuringSwipeActions(); // Se tiver swipe novo
  if (typeof atualizarGraficoMeta === 'function') atualizarGraficoMeta();

  // Atualiza o carrossel de resumo
  if (typeof atualizarCarouselResumo === "function") {
    atualizarCarouselResumo();
  }
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
  document.getElementById("finLucroLiquido").textContent =
    `R$ ${totalLucro.toFixed(2)}`;
  document.getElementById("finFaturamento").textContent =
    `R$ ${totalFaturamento.toFixed(2)}`;
  document.getElementById("finCustos").textContent =
    `R$ ${totalCustos.toFixed(2)}`;
  document.getElementById("finKmTotal").textContent =
    `${totalKm.toFixed(1)} km`;

  // --- NOVO CÁLCULO: RENDIMENTO (R$/KM) ---
  let rendimento = 0;
  if (totalKm > 0) {
    rendimento = totalFaturamento / totalKm;
  }

  const elRendimento = document.getElementById("finRendimento");
  if (elRendimento) {
    elRendimento.textContent = `R$ ${rendimento.toFixed(2)}/km`;
  }

  const elTotalRotas = document.getElementById("finTotalRotasTexto");
  if (elTotalRotas) {
    // rotasFiltradas já contém apenas as rotas das datas selecionadas
    const qtd = rotasFiltradas.length;
    elTotalRotas.innerHTML = `Rotas realizadas neste período: <strong>${qtd}</strong>`;
  }
}

function firstDayFormat(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ============================================
// CARROSSEL DE RESUMO (HOME)
// ============================================
export function atualizarCarouselResumo() {
  const container = document.getElementById("carouselResumo");
  if (!container || !state.rotas) return;

  // 1. Agrupar dados
  const resumo = {};
  state.rotas.forEach((rota) => {
    const data = new Date(rota.horarioInicio);
    const chave = `${data.getFullYear()}-${(data.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    if (!resumo[chave]) {
      resumo[chave] = { qtd: 0, total: 0, dataRef: data };
    }
    resumo[chave].qtd += 1;
    resumo[chave].total += parseFloat(rota.valor) || 0;
  });

  // 2. Ordenar e Criar Lista
  const listaMeses = Object.values(resumo).sort(
    (a, b) => b.dataRef - a.dataRef
  );

  if (listaMeses.length === 0) {
    container.innerHTML = `<div style="width:100%; text-align:center; padding:10px; font-size:0.7rem; color:#a0aec0;">Sem dados.</div>`;
    return;
  }

  // 3. Renderizar HTML
  container.innerHTML = listaMeses
    .map((item) => {
      const nomeMes = item.dataRef.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }); // Ex: "jan 26" (Mais curto)

      const agora = new Date();
      const ehAtual =
        item.dataRef.getMonth() === agora.getMonth() &&
        item.dataRef.getFullYear() === agora.getFullYear();
      const classeExtra = ehAtual ? "atual" : "";

      return `
      <div class="resumo-mes-card ${classeExtra}">
        <div class="card-mes-titulo">${nomeMes}</div>
        <div class="card-mes-dados">
           <div>
             <span class="dado-label">Rotas</span>
             <div class="dado-valor">${item.qtd}</div>
           </div>
           <div>
             <span class="dado-label">Total</span>
             <div class="dado-valor money">R$ ${Math.floor(item.total)}</div> 
             </div>
        </div>
      </div>
    `;
    })
    .join("");

  // 4. AUTO-CENTRALIZAR (Lógica da Roleta)
  setTimeout(() => {
    const cardAtual = container.querySelector(".atual");
    if (cardAtual) {
      // Calcula a posição para deixar o card exatamento no meio
      const scrollPos =
        cardAtual.offsetLeft -
        container.clientWidth / 2 +
        cardAtual.clientWidth / 2;
      container.scrollTo({
        left: scrollPos,
        behavior: "smooth",
      });
    }
  }, 100); // Pequeno delay para garantir que o DOM renderizou
}

// ============================================
// LÓGICA DA META MENSAL (KPI)
// ============================================
export function atualizarGraficoMeta() {
  const container = document.getElementById("chartMeta");
  const elTexto = document.getElementById("metaTextoResumo");

  if (!container) return;

  // 1. Pegar valores da meta
  const metaDiaria = state.meta.diaria || 0;
  const diasTrabalho = state.meta.dias || 0;
  const metaTotal = metaDiaria * diasTrabalho;

  // 2. Calcular Lucro Real do Mês Atual
  const hoje = new Date();
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, "0");
  const anoAtual = hoje.getFullYear().toString();

  const lucroAtual = state.rotas
    .filter((rota) => {
      const d = new Date(rota.horarioInicio);
      return (
        (d.getMonth() + 1).toString().padStart(2, "0") === mesAtual &&
        d.getFullYear().toString() === anoAtual
      );
    })
    .reduce((acc, curr) => acc + (parseFloat(curr.lucroLiquido) || 0), 0);

  // 3. Cálculos de Porcentagem e Restante
  let porcentagem = 0;
  let falta = 0;

  if (metaTotal > 0) {
    porcentagem = (lucroAtual / metaTotal) * 100;
    falta = metaTotal - lucroAtual;
    if (falta < 0) falta = 0;
    if (porcentagem > 100) porcentagem = 100;
  }

  // --- CORREÇÃO AQUI: Garante que é um NÚMERO, não texto ---
  const valorGrafico = parseFloat(porcentagem.toFixed(1));
  // --------------------------------------------------------

  // Atualizar texto abaixo do gráfico
  if (metaTotal === 0) {
    elTexto.textContent = "Defina meta diária e dias para ver o progresso.";
  } else if (falta <= 0) {
    elTexto.innerHTML = `<span style="color:#10b981; font-weight:bold;">PARABÉNS!</span> Meta batida!`;
  } else {
    elTexto.innerHTML = `Falta <span style="color:#e53e3e; font-weight:bold;">R$ ${falta.toFixed(2)}</span> para atingir R$ ${metaTotal.toFixed(2)}`;
  }

  // 4. Configuração do ApexCharts (Estilo Visual)
  const options = {
    series: [valorGrafico],
    chart: {
      height: 300, // Altura um pouco maior para não cortar
      type: "radialBar",
      fontFamily: "Montserrat, sans-serif", // Fonte do seu site
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },
    plotOptions: {
      radialBar: {
        offsetY: -15,
        startAngle: -135, // -135 a 135 faz o formato de "ferradura"
        endAngle: 135,
        hollow: {
          margin: 15,
          size: "65%", // Aumente para deixar o anel MAIS FINO (ex: 70%)
          background: "transparent",
          image: undefined,
        },
        track: {
          background: "#f1f5f9", // Cor do fundo da barra (cinza bem claro)
          strokeWidth: "100%",
          margin: 0, // margem entre o track e a barra colorida
          dropShadow: {
            enabled: false, // Pode ativar sombra se quiser profundidade
            top: 0,
            left: 0,
            blur: 3,
            opacity: 0.1,
          },
        },
        dataLabels: {
          show: true,
          name: {
            offsetY: -10, // Posição vertical do texto "Progresso"
            show: true,
            color: "#718096", // Cor cinza médio
            fontSize: "13px",
            fontWeight: 600,
          },
          value: {
            offsetY: 10, // Posição vertical da Porcentagem
            color: "var(--cor-texto-opaco)", // Cor escura para leitura fácil
            fontSize: "30px", // Tamanho grande para destaque
            fontWeight: 700,
            show: true,
            formatter: function (val) {
              return val + "%";
            },
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.5,
        // Cores do Gradiente: Começa Roxo (App) -> Termina Verde (Meta)
        gradientToColors: ["#10b981"],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round", // Deixa as pontas arredondadas (essencial para ficar bonito)
    },
    colors: ["#667eea"], // Cor inicial do gradiente
    labels: ["Progresso"], // Texto que aparece em cima da porcentagem
  };

  // 5. Renderizar ou Atualizar
  if (state.chartInstance) {
    // CORREÇÃO TAMBÉM NO UPDATE:
    state.chartInstance.updateSeries([valorGrafico]);
  } else {
    if (typeof ApexCharts !== "undefined") {
      state.chartInstance = new ApexCharts(container, options);
      state.chartInstance.render();
    }
  }
}
