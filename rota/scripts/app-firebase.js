let rotaAtual = null;
let rotas = [];
let db = null;
let veiculoSelecionado = null;

let swipeStartX = 0;
let swipeStartY = 0;
let swipeCurrentX = 0;
let isSwiping = false;
let currentSwipeItem = null;
let swipeThreshold = 50;

const PRECO_GASOLINA_POR_LITRO = 6.35;
const CONSUMO_VEICULOS = {
  // Motos
  moto_125: 40, // 40 km/L
  moto_250: 30, // 30 km/L

  // Carros
  carro_popular: 14, // 1.0 flex
  "carro_1.4": 12, // 1.4 flex
  "carro_1.8": 10, // 1.6-1.8
  "carro_2.0": 8, // 2.0+

  // Outros
  caminhonete: 7, // S10, Ranger, etc.
  personalizado: null, // Será definido pelo usuário
};

function inicializarApp() {
  if (!window.firebaseDb || !window.firebaseDb.db) {
    mostrarNotificacao("Erro: Firebase não configurado!", "error");
    return;
  }

  db = window.firebaseDb;

  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();

  // Depois configurar o resto
  configurarEventListeners();
  carregarDados();

  setInterval(() => {
    if (rotaAtual) {
      atualizarRotaAberta();
    }
  }, 60000);
}

async function carregarDados() {
  try {
    const rotaAtualSnapshot = await db.rotaAtual.get();

    if (rotaAtualSnapshot.exists) {
      rotaAtual = rotaAtualSnapshot.data();
      atualizarRotaAberta();
    }

    const rotasSnapshot = await db.rotas.get();
    rotas = [];

    rotasSnapshot.forEach((doc) => {
      rotas.push({
        id: doc.id,
        ...doc.data(),
        horarioFim: doc.data().horarioFim || new Date().toISOString(),
      });
    });

    rotas.sort((a, b) => new Date(b.horarioFim) - new Date(a.horarioFim));
    atualizarListaRotas();
  } catch (error) {
    mostrarNotificacao("Erro ao carregar dados", "error");
    carregarDadosLocal();
  }
}

async function salvarRotaAtual() {
  try {
    if (rotaAtual) {
      await db.rotaAtual.set(rotaAtual, { merge: true });
    } else {
      await db.rotaAtual.delete();
    }
    localStorage.setItem("rotaAtual", JSON.stringify(rotaAtual));
  } catch (error) {
    localStorage.setItem("rotaAtual", JSON.stringify(rotaAtual));
  }
}

async function salvarRotaFinalizada(rota) {
  try {
    const docId = rota.id.toString();

    const rotaParaSalvar = {
      ...rota,
      kmPercorridos: rota.kmFinal - rota.kmInicial,
      status: "finalizada",
      horarioFim: rota.horarioFim || new Date().toISOString(),
    };

    await db.rotas.doc(docId).set(rotaParaSalvar);
    mostrarNotificacao("Rota salva com sucesso!", "success");
  } catch (error) {
    mostrarNotificacao("Erro ao salvar rota", "error");
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    rotasLocais.unshift(rota);
    localStorage.setItem("rotas", JSON.stringify(rotasLocais));
  }
}

function abrirModalIniciarRota() {
  if (rotaAtual) {
    mostrarNotificacao("Você já tem uma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalIniciarRota").classList.add("active");
}

function abrirModalEncerrarRota() {
  if (!rotaAtual) {
    mostrarNotificacao("Nenhuma rota em andamento!", "info");
    return;
  }
  document.getElementById("modalEncerrarRota").classList.add("active");
}

function fecharModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function mudarPagina(event, pagina) {
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
}

async function iniciarRota(event) {
  event.preventDefault();

  const kmInicial = parseFloat(document.getElementById("kmInicial").value);

  if (!kmInicial || kmInicial <= 0) {
    mostrarNotificacao("Digite uma quilometragem válida!", "error");
    return;
  }

  rotaAtual = {
    id: Date.now(),
    kmInicial: kmInicial,
    horarioInicio: new Date().toISOString(),
    status: "aberta",
  };

  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalIniciarRota");
  document.getElementById("formIniciarRota").reset();

  mostrarNotificacao("Rota iniciada com sucesso!", "success");
}

function atualizarRotaAberta() {
  const container = document.getElementById("rotaAbertaContainer");
  const detalhes = document.getElementById("detalhesRotaAberta");

  if (rotaAtual) {
    const inicio = new Date(rotaAtual.horarioInicio);
    const agora = new Date();
    const duracao = Math.floor((agora - inicio) / 60000);

    detalhes.innerHTML = `
            <div><strong>Início:</strong> ${inicio.toLocaleTimeString(
              "pt-BR"
            )}</div>
            <div><strong>KM Inicial:</strong> ${rotaAtual.kmInicial.toFixed(
              1
            )} km</div>
            <div><strong>Duração:</strong> ${Math.floor(duracao / 60)}h ${
      duracao % 60
    }min</div>
        `;

    container.classList.add("active");
  } else {
    container.classList.remove("active");
  }
}

async function encerrarRota(event) {
  event.preventDefault();

  // Verificar se veículo está configurado
  if (!veiculoSelecionado) {
    mostrarNotificacao("Configure seu veículo primeiro!", "error");
    abrirModalSelecionarVeiculo();
    return;
  }

  const kmFinal = parseFloat(document.getElementById("kmFinal").value);
  const valorRota = parseFloat(document.getElementById("valorRota").value);

  if (!kmFinal || kmFinal <= rotaAtual.kmInicial) {
    mostrarNotificacao(
      "A quilometragem final deve ser maior que a inicial!",
      "error"
    );
    return;
  }

  if (!valorRota || valorRota <= 0) {
    mostrarNotificacao("Digite um valor válido!", "error");
    return;
  }

  // CALCULAR CUSTOS COM GASOLINA (usando o veículo selecionado)
  const kmPercorridos = kmFinal - rotaAtual.kmInicial;
  const custoGasolina = calcularCustoGasolina(kmPercorridos);

  const rotaFinalizada = {
    ...rotaAtual,
    kmFinal: kmFinal,
    valor: valorRota,
    horarioFim: new Date().toISOString(),
    kmPercorridos: kmPercorridos,
    custoGasolina: custoGasolina,
    veiculoUtilizado: veiculoSelecionado.tipo, // Salvar qual veículo foi usado
    consumoUtilizado: veiculoSelecionado.consumo, // Salvar o consumo usado
    status: "finalizada",
  };

  await salvarRotaFinalizada(rotaFinalizada);
  rotas.unshift(rotaFinalizada);
  rotaAtual = null;
  await salvarRotaAtual();

  atualizarRotaAberta();
  atualizarListaRotas();
  fecharModal("modalEncerrarRota");
  document.getElementById("formEncerrarRota").reset();

  // Mostrar resumo detalhado
  const lucroLiquido = valorRota - custoGasolina;
}

async function cancelarRota() {
  if (!confirm("Tem certeza que deseja cancelar esta rota?")) return;

  rotaAtual = null;
  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalEncerrarRota");
  mostrarNotificacao("Rota cancelada", "info");
}

function atualizarListaRotas() {
  const lista = document.getElementById("rotasList");
  const emptyState = document.getElementById("emptyState");

  if (!rotas || rotas.length === 0) {
    lista.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  lista.innerHTML = rotas
    .map((rota) => {
      const inicio = new Date(rota.horarioInicio);
      const fim = new Date(rota.horarioFim);
      const duracao = Math.floor((fim - inicio) / 60000);
      const custoGasolina = rota.custoGasolina || 0;
      const lucroLiquido = rota.valor - custoGasolina;

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
                                <span class="info-value">${inicio.toLocaleTimeString(
                                  "pt-BR",
                                  { hour: "2-digit", minute: "2-digit" }
                                )} - ${fim.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">KM Percorridos</span>
                                <span class="info-value">${
                                  rota.kmPercorridos?.toFixed(1) || "0.0"
                                } km</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Lucro Líquido</span>
                                <span class="info-value" style="color: #10b981; font-weight: 600;">R$ ${lucroLiquido.toFixed(
                                  2
                                )}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ÁREA DE SWIPE (EXCLUIR) -->
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

  // Configurar os listeners de swipe
  configurarSwipeActions();
}

async function excluirRota(rotaId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir esta rota?\nEsta ação não pode ser desfeita."
    )
  ) {
    resetarSwipe(); // Fecha o swipe se cancelar
    return;
  }

  try {
    const itemContainer = document.querySelector(
      `.rota-item-container[data-rota-id="${rotaId}"]`
    );

    // Animação de exclusão
    if (itemContainer) {
      itemContainer.style.transition = "all 0.3s ease";
      itemContainer.style.transform = "translateX(-100%)";
      itemContainer.style.opacity = "0";
      itemContainer.style.height = "0";
      itemContainer.style.margin = "0";
      itemContainer.style.padding = "0";

      // Aguardar animação antes de remover
      setTimeout(async () => {
        // 1. Excluir do Firebase
        await db.rotas.doc(rotaId.toString()).delete();

        // 2. Excluir do array local
        rotas = rotas.filter(
          (rota) => rota.id.toString() !== rotaId.toString()
        );

        // 3. Excluir do localStorage
        const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
        const novasRotasLocais = rotasLocais.filter(
          (rota) => rota.id.toString() !== rotaId.toString()
        );
        localStorage.setItem("rotas", JSON.stringify(novasRotasLocais));

        // 4. Remover do DOM
        itemContainer.remove();

        // 5. Verificar se lista ficou vazia
        if (rotas.length === 0) {
          document.getElementById("emptyState").style.display = "block";
        }

        mostrarNotificacao("✓ Rota excluída com sucesso!", "success");
      }, 300);
    } else {
      // Fallback se não encontrar o elemento
      await db.rotas.doc(rotaId.toString()).delete();
      rotas = rotas.filter((rota) => rota.id.toString() !== rotaId.toString());
      atualizarListaRotas();
      mostrarNotificacao("Rota excluída com sucesso!", "success");
    }
  } catch (error) {
    console.error("Erro ao excluir rota:", error);
    mostrarNotificacao("Erro ao excluir rota", "error");
  }
}

function carregarDadosLocal() {
  const rotaAtualSalva = localStorage.getItem("rotaAtual");
  const rotasSalvas = localStorage.getItem("rotas");

  if (rotaAtualSalva) {
    rotaAtual = JSON.parse(rotaAtualSalva);
    atualizarRotaAberta();
  }

  if (rotasSalvas) {
    rotas = JSON.parse(rotasSalvas);
    atualizarListaRotas();
  }
}

function configurarEventListeners() {
  const btnRegistrar = document.getElementById("btnRegistrarRota");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", abrirModalIniciarRota);
  }

  const btnRotaAberta = document.getElementById("btnRotaAberta");
  if (btnRotaAberta) {
    btnRotaAberta.addEventListener("click", abrirModalEncerrarRota);
  }

  document.querySelectorAll(".menu-item_link").forEach((link) => {
    const pagina = link.getAttribute("data-pagina");
    if (pagina) {
      link.addEventListener("click", (e) => mudarPagina(e, pagina));
    }
  });

  const formIniciar = document.getElementById("formIniciarRota");
  if (formIniciar) {
    formIniciar.addEventListener("submit", iniciarRota);
  }

  const btnCancelarIniciar = document.getElementById("btnCancelarIniciar");
  if (btnCancelarIniciar) {
    btnCancelarIniciar.addEventListener("click", () =>
      fecharModal("modalIniciarRota")
    );
  }

  const formEncerrar = document.getElementById("formEncerrarRota");
  if (formEncerrar) {
    formEncerrar.addEventListener("submit", encerrarRota);
  }

  const btnCancelarRota = document.getElementById("btnCancelarRota");
  if (btnCancelarRota) {
    btnCancelarRota.addEventListener("click", cancelarRota);
  }

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });
  const tipoVeiculoSelect = document.getElementById("tipoVeiculo");
  if (tipoVeiculoSelect) {
    tipoVeiculoSelect.addEventListener("change", function (e) {
      const campoPersonalizado = document.getElementById(
        "campoConsumoPersonalizado"
      );
      if (e.target.value === "personalizado") {
        campoPersonalizado.style.display = "block";
      } else {
        campoPersonalizado.style.display = "none";
      }
    });
  }

  // Botão salvar veículo
  document
    .getElementById("btnSalvarVeiculo")
    .addEventListener("click", salvarConfiguracaoVeiculo);

  // Botão alterar veículo
  document
    .getElementById("btnAlterarVeiculo")
    .addEventListener("click", abrirModalSelecionarVeiculo);

  // Fechar modal com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document
        .getElementById("modalSelecionarVeiculo")
        .classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const verificarFirebase = setInterval(() => {
    if (window.firebaseDb && window.firebaseDb.db) {
      clearInterval(verificarFirebase);
      inicializarApp();
    }
  }, 100);

  setTimeout(() => {
    if (!db && window.firebaseDb) {
      inicializarApp();
    }
  }, 5000);
});

if (!document.querySelector("#notificacao-styles")) {
  const style = document.createElement("style");
  style.id = "notificacao-styles";
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
  document.head.appendChild(style);
}

function inicializarConfiguracaoVeiculo() {
  // Carregar veículo salvo
  const veiculoSalvo = localStorage.getItem("veiculoConfig");
  if (veiculoSalvo) {
    veiculoSelecionado = JSON.parse(veiculoSalvo);
  } else {
    // Se não tem veículo salvo, mostrar modal
    setTimeout(() => {
      document.getElementById("modalSelecionarVeiculo").classList.add("active");
    }, 1000);
  }
}

function abrirModalSelecionarVeiculo() {
  document.getElementById("modalSelecionarVeiculo").classList.add("active");

  // Se já tem veículo selecionado, mostrar ele
  if (veiculoSelecionado) {
    document.getElementById("tipoVeiculo").value = veiculoSelecionado.tipo;

    if (veiculoSelecionado.tipo === "personalizado") {
      document.getElementById("campoConsumoPersonalizado").style.display =
        "block";
      document.getElementById("consumoPersonalizado").value =
        veiculoSelecionado.consumo;
    }
  }
}

function salvarConfiguracaoVeiculo() {
  const tipoSelecionado = document.getElementById("tipoVeiculo").value;

  if (!tipoSelecionado) {
    mostrarNotificacao("Selecione um tipo de veículo!", "error");
    return;
  }

  let consumo;

  if (tipoSelecionado === "personalizado") {
    const consumoPersonalizado = parseFloat(
      document.getElementById("consumoPersonalizado").value
    );
    if (
      !consumoPersonalizado ||
      consumoPersonalizado < 5 ||
      consumoPersonalizado > 50
    ) {
      mostrarNotificacao(
        "Digite um consumo válido (entre 5 e 50 km/L)!",
        "error"
      );
      return;
    }
    consumo = consumoPersonalizado;
  } else {
    consumo = CONSUMO_VEICULOS[tipoSelecionado];
  }

  // Salvar configuração
  veiculoSelecionado = {
    tipo: tipoSelecionado,
    consumo: consumo,
    descricao: obterDescricaoVeiculo(tipoSelecionado),
  };

  // Salvar no localStorage
  localStorage.setItem("veiculoConfig", JSON.stringify(veiculoSelecionado));

  // Fechar modal
  document.getElementById("modalSelecionarVeiculo").classList.remove("active");

  // Mostrar confirmação
  mostrarNotificacao(
    `Veículo configurado: ${veiculoSelecionado.descricao} (${consumo} km/L)`,
    "success"
  );

  // Resetar campos
  document.getElementById("tipoVeiculo").value = "";
  document.getElementById("campoConsumoPersonalizado").style.display = "none";
}

function obterDescricaoVeiculo(tipo) {
  const descricoes = {
    moto_125: "Moto 125cc",
    moto_250: "Moto 250cc",
    carro_popular: "Carro Popular 1.0",
    "carro_1.4": "Carro 1.4",
    "carro_1.8": "Carro 1.6-1.8",
    "carro_2.0": "Carro 2.0+",
    caminhonete: "Caminhonete",
    personalizado: "Personalizado",
  };
  return descricoes[tipo] || "Veículo não identificado";
}

function calcularCustoGasolina(kmPercorridos) {
  if (!veiculoSelecionado) {
    mostrarNotificacao("Configure seu veículo primeiro!", "error");
    abrirModalSelecionarVeiculo();
    return 0;
  }

  const litrosGastos = kmPercorridos / veiculoSelecionado.consumo;
  const custo = litrosGastos * PRECO_GASOLINA_POR_LITRO;
  return parseFloat(custo.toFixed(2));
}

// Mostrar consumo atual em algum lugar da interface
function atualizarExibicaoVeiculo() {
  const btnAlterarVeiculo = document.getElementById("btnAlterarVeiculo");
  if (btnAlterarVeiculo && veiculoSelecionado) {
    btnAlterarVeiculo.textContent = `🚗 ${veiculoSelecionado.descricao} (${veiculoSelecionado.consumo} km/L)`;
  }
}

function configurarSwipeActions() {
  const rotaItems = document.querySelectorAll(".rota-item-container");

  rotaItems.forEach((item) => {
    // Eventos para mouse (desktop)
    item.addEventListener("mousedown", iniciarSwipe);
    item.addEventListener("mousemove", duranteSwipe);
    item.addEventListener("mouseup", finalizarSwipe);
    item.addEventListener("mouseleave", cancelarSwipe);

    // Eventos para touch (mobile)
    item.addEventListener("touchstart", iniciarSwipeTouch);
    item.addEventListener("touchmove", duranteSwipeTouch);
    item.addEventListener("touchend", finalizarSwipeTouch);
    item.addEventListener("touchcancel", cancelarSwipe);

    // Prevenir arrastar imagem/seleção de texto
    item.addEventListener("dragstart", (e) => e.preventDefault());
  });

  // Configurar clique no botão de excluir do swipe
  document.querySelectorAll(".btn-swipe-delete").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const rotaId = this.getAttribute("data-id");
      solicitarExclusaoRota(rotaId);
      resetarSwipe(); // Fecha o swipe após clicar
    });
  });
}

// FUNÇÕES PARA MOUSE (DESKTOP)
function iniciarSwipe(e) {
  if (e.button !== 0) return; // Só botão esquerdo
  swipeStartX = e.clientX;
  swipeStartY = e.clientY;
  currentSwipeItem = e.currentTarget;
  isSwiping = false;
}

function duranteSwipe(e) {
  if (!currentSwipeItem || !swipeStartX) return;

  swipeCurrentX = e.clientX - swipeStartX;
  const deltaY = Math.abs(e.clientY - swipeStartY);
  const deltaX = Math.abs(swipeCurrentX);

  // Só considera swipe se movimento horizontal for maior que vertical
  if (deltaX > 5 && deltaX > deltaY * 2) {
    isSwiping = true;
    e.preventDefault();

    // Limitar swipe para a esquerda apenas
    if (swipeCurrentX < 0) {
      const translateX = Math.max(swipeCurrentX, -100); // Limite de 100px
      currentSwipeItem.querySelector(
        ".rota-item-content"
      ).style.transform = `translateX(${translateX}px)`;

      // Mostrar ação de excluir proporcionalmente
      const progress = Math.min(Math.abs(translateX) / 100, 1);
      currentSwipeItem.querySelector(
        ".rota-swipe-action"
      ).style.transform = `translateX(${100 * (1 - progress)}px)`;
    }
  }
}

function finalizarSwipe(e) {
  if (!isSwiping || !currentSwipeItem) {
    resetarSwipe();
    return;
  }

  // Verificar se passou do threshold
  if (swipeCurrentX < -swipeThreshold) {
    // Swipe completo - manter aberto
    currentSwipeItem.classList.add("swipe-active");
  } else {
    // Swipe insuficiente - fechar
    resetarSwipeItem(currentSwipeItem);
  }

  resetarSwipe();
}

// FUNÇÕES PARA TOUCH (MOBILE)
function iniciarSwipeTouch(e) {
  if (e.touches.length !== 1) return;

  const touch = e.touches[0];
  swipeStartX = touch.clientX;
  swipeStartY = touch.clientY;
  currentSwipeItem = e.currentTarget.closest(".rota-item-container");
  isSwiping = false;
}

function duranteSwipeTouch(e) {
  if (!currentSwipeItem || !swipeStartX || e.touches.length !== 1) return;

  const touch = e.touches[0];
  swipeCurrentX = touch.clientX - swipeStartX;
  const deltaY = Math.abs(touch.clientY - swipeStartY);
  const deltaX = Math.abs(swipeCurrentX);

  if (deltaX > 5 && deltaX > deltaY * 2) {
    isSwiping = true;
    e.preventDefault();

    if (swipeCurrentX < 0) {
      const translateX = Math.max(swipeCurrentX, -80); // Limite menor no mobile
      currentSwipeItem.querySelector(
        ".rota-item-content"
      ).style.transform = `translateX(${translateX}px)`;

      const progress = Math.min(Math.abs(translateX) / 80, 1);
      currentSwipeItem.querySelector(
        ".rota-swipe-action"
      ).style.transform = `translateX(${80 * (1 - progress)}px)`;
    }
  }
}

function finalizarSwipeTouch(e) {
  if (!isSwiping || !currentSwipeItem) {
    resetarSwipe();
    return;
  }

  // Threshold ajustado para mobile
  const mobileThreshold = 30;

  if (swipeCurrentX < -mobileThreshold) {
    currentSwipeItem.classList.add("swipe-active");
  } else {
    resetarSwipeItem(currentSwipeItem);
  }

  resetarSwipe();
}

// FUNÇÕES AUXILIARES
function cancelarSwipe() {
  if (currentSwipeItem && !isSwiping) {
    resetarSwipeItem(currentSwipeItem);
  }
  resetarSwipe();
}

function resetarSwipeItem(item) {
  if (!item) return;

  item.querySelector(".rota-item-content").style.transform = "translateX(0)";
  item.querySelector(".rota-swipe-action").style.transform = "translateX(100%)";
  item.classList.remove("swipe-active");

  // Adicionar transição suave
  item.querySelector(".rota-item-content").style.transition =
    "transform 0.3s ease";
  item.querySelector(".rota-swipe-action").style.transition =
    "transform 0.3s ease";

  // Remover transição após animação
  setTimeout(() => {
    if (item.querySelector(".rota-item-content")) {
      item.querySelector(".rota-item-content").style.transition = "";
      item.querySelector(".rota-swipe-action").style.transition = "";
    }
  }, 300);
}

function resetarSwipe() {
  swipeStartX = 0;
  swipeStartY = 0;
  swipeCurrentX = 0;
  isSwiping = false;
  currentSwipeItem = null;
}

// FECHAR SWIPE AO CLICAR FORA
document.addEventListener("click", function (e) {
  const swipeItems = document.querySelectorAll(".swipe-active");
  const clickedOnSwipe = e.target.closest(".rota-item-container");

  swipeItems.forEach((item) => {
    if (item !== clickedOnSwipe) {
      resetarSwipeItem(item);
    }
  });
});

// FECHAR SWIPE AO ROLAR A PÁGINA
let scrollTimeout;
window.addEventListener("scroll", function () {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    document.querySelectorAll(".swipe-active").forEach(resetarSwipeItem);
  }, 100);
});

function mostrarNotificacao(mensagem, tipo = "info") {
  const notificacao = document.createElement("div");
  notificacao.className = `notificacao notificacao-${tipo}`;
  notificacao.textContent = mensagem;
  notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${
          tipo === "success"
            ? "#10b981"
            : tipo === "error"
            ? "#ef4444"
            : "#667eea"
        };
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        font-family: 'Montserrat', sans-serif;
        font-weight: 500;
    `;

  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notificacao.remove(), 300);
  }, 3000);
}

function solicitarExclusaoRota(rotaId) {
  excluirRota(rotaId);
}