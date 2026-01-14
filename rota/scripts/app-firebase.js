// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
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

// ============================================
// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// ============================================
function inicializarApp() {
  console.log("Inicializando aplicação...");

  // Verificar se estamos na página de login
  if (window.location.pathname.includes("index.html")) {
    return;
  }

  // Verificar se Firebase está configurado
  if (!window.firebaseDb || !window.firebaseDb.db) {
    console.error("Firebase não configurado corretamente");
    mostrarNotificacao(
      "Firebase não configurado. Usando modo offline.",
      "warning"
    );

    // Inicializar modo offline
    inicializarModoOffline();
    return;
  }

  // Configurar db global
  db = window.firebaseDb;

  console.log("Firebase configurado, inicializando...");

  // Inicializar configurações
  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();
  configurarEventListeners();

  // Carregar dados
  carregarDados();

  // Configurar atualização periódica
  setInterval(() => {
    if (rotaAtual) {
      atualizarRotaAberta();
    }
  }, 60000);

  console.log("Aplicação inicializada com sucesso");
}

// ============================================
// FUNÇÃO DE INICIALIZAÇÃO OFFLINE
// ============================================
function inicializarModoOffline() {
  console.log("Iniciando modo offline...");
  inicializarConfiguracaoVeiculo();
  atualizarExibicaoVeiculo();
  configurarEventListeners();
  carregarDadosLocal();
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
// Na função carregarDados():
async function carregarDados() {
  try {
    console.log(
      "Carregando dados do Firebase para usuário:",
      db.getCurrentUser()?.uid
    );

    // Atualizar último acesso
    await db.atualizarAcesso();

    // Carregar rota atual
    const rotaAtualSnapshot = await db.sistema.rotaAtual.get();

    if (rotaAtualSnapshot.exists) {
      rotaAtual = rotaAtualSnapshot.data();
      console.log("Rota atual encontrada");
      atualizarRotaAberta();
    } else {
      console.log("Nenhuma rota atual encontrada");
    }

    // Carregar histórico de rotas
    const rotasSnapshot = await db.rotas.get();
    rotas = [];

    rotasSnapshot.forEach((doc) => {
      const data = doc.data();
      rotas.push({
        id: doc.id,
        ...data,
        // Converter timestamps do Firestore
        horarioFim: data.horarioFim
          ? data.horarioFim.toDate
            ? data.horarioFim.toDate().toISOString()
            : data.horarioFim
          : new Date().toISOString(),
        horarioInicio: data.horarioInicio
          ? data.horarioInicio.toDate
            ? data.horarioInicio.toDate().toISOString()
            : data.horarioInicio
          : new Date().toISOString(),
      });
    });

    console.log(`${rotas.length} rotas carregadas`);
    rotas.sort(
      (a, b) =>
        new Date(b.horarioFim || b.horarioInicio) -
        new Date(a.horarioFim || a.horarioInicio)
    );
    atualizarListaRotas();
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    mostrarNotificacao("Usando dados locais", "info");
    carregarDadosLocal();
  }
}

// ============================================
// FUNÇÕES DE PERSISTÊNCIA
// ============================================
async function salvarRotaAtual() {
  try {
    if (rotaAtual && db) {
      await db.sistema.rotaAtual.set(rotaAtual, { merge: true });
      console.log("Rota atual salva no Firebase");
    } else if (rotaAtual) {
      localStorage.setItem("rotaAtual", JSON.stringify(rotaAtual));
      console.log("Rota atual salva localmente");
    } else {
      if (db) {
        await db.sistema.rotaAtual.delete();
      }
      localStorage.removeItem("rotaAtual");
    }
  } catch (error) {
    console.error("Erro ao salvar rota atual:", error);
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
      horarioInicio: firebase.firestore.Timestamp.fromDate(
        new Date(rota.horarioInicio)
      ),
      horarioFim: firebase.firestore.Timestamp.fromDate(new Date()),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userId: window.firebaseDb.auth.currentUser?.uid || "offline",
    };

    delete rotaParaSalvar.id;

    // Salvar usando a nova estrutura
    await db.rotas.doc(docId).set(rotaParaSalvar);
    console.log("Rota salva no Firebase");
    mostrarNotificacao("Rota salva com sucesso!", "success");

    // Remover rota atual
    await db.sistema.rotaAtual.delete();
  } catch (error) {
    console.error("Erro ao salvar rota:", error);
    mostrarNotificacao("Salvando localmente...", "info");

    // Salvar localmente
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    rotasLocais.unshift(rota);
    localStorage.setItem("rotas", JSON.stringify(rotasLocais));

    localStorage.removeItem("rotaAtual");

    mostrarNotificacao("Rota salva localmente!", "success");
  }
}

// ============================================
// FUNÇÕES DE INTERFACE - MODAIS
// ============================================
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

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
// ============================================
function mudarPagina(event, pagina) {
  event.preventDefault();

  // Atualizar páginas
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".menu-item_link")
    .forEach((l) => l.classList.remove("active"));

  document.getElementById("page-" + pagina).classList.add("active");
  event.currentTarget.classList.add("active");

  // Se for para a página de rotas, recarregar dados
  if (pagina === "rotas") {
    carregarDados();
  }
}

// ============================================
// FUNÇÕES DE ROTA
// ============================================
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
    userId: window.firebaseDb.auth.currentUser?.uid || "offline",
  };

  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalIniciarRota");
  document.getElementById("formIniciarRota").reset();

  mostrarNotificacao("Rota iniciada com sucesso!", "success");
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

  // Calcular custos
  const kmPercorridos = kmFinal - rotaAtual.kmInicial;
  const custoGasolina = calcularCustoGasolina(kmPercorridos);
  const lucroLiquido = valorRota - custoGasolina;

  const rotaFinalizada = {
    ...rotaAtual,
    kmFinal: kmFinal,
    valor: valorRota,
    horarioFim: new Date().toISOString(),
    kmPercorridos: kmPercorridos,
    custoGasolina: custoGasolina,
    lucroLiquido: lucroLiquido,
    veiculoUtilizado: veiculoSelecionado.tipo,
    consumoUtilizado: veiculoSelecionado.consumo,
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

  // Mostrar resumo
  mostrarNotificacao(
    `Rota finalizada! Lucro: R$ ${lucroLiquido.toFixed(
      2
    )} (Bruto: R$ ${valorRota.toFixed(
      2
    )} - Combustível: R$ ${custoGasolina.toFixed(2)})`,
    "success"
  );
}

async function cancelarRota() {
  if (!confirm("Tem certeza que deseja cancelar esta rota?")) return;

  rotaAtual = null;
  await salvarRotaAtual();
  atualizarRotaAberta();
  fecharModal("modalEncerrarRota");
  mostrarNotificacao("Rota cancelada", "info");
}

// ============================================
// FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE
// ============================================
function atualizarRotaAberta() {
  const container = document.getElementById("rotaAbertaContainer");
  const detalhes = document.getElementById("detalhesRotaAberta");

  if (rotaAtual) {
    const inicio = new Date(rotaAtual.horarioInicio);
    const agora = new Date();
    const duracao = Math.floor((agora - inicio) / 60000);

    detalhes.innerHTML = `
      <div><strong>Início:</strong> ${inicio.toLocaleTimeString("pt-BR")}</div>
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
      const lucroLiquido = rota.lucroLiquido || rota.valor - custoGasolina;

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
                    rota.kmPercorridos?.toFixed(1) || "0.0"
                  } km</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Lucro Líquido</span>
                  <span class="info-value" style="color: #10b981; font-weight: 600;">
                    R$ ${lucroLiquido.toFixed(2)}
                  </span>
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

// ============================================
// FUNÇÕES DE VEÍCULO
// ============================================
function inicializarConfiguracaoVeiculo() {
  // Carregar veículo salvo
  const veiculoSalvo = localStorage.getItem("veiculoConfig");
  if (veiculoSalvo) {
    veiculoSelecionado = JSON.parse(veiculoSalvo);
    console.log("Veículo carregado:", veiculoSelecionado);
  } else {
    // Se não tem veículo salvo, mostrar modal após um tempo
    setTimeout(() => {
      if (!veiculoSelecionado) {
        console.log("Nenhum veículo configurado, abrindo modal...");
        abrirModalSelecionarVeiculo();
      }
    }, 1500);
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

  // Atualizar exibição
  atualizarExibicaoVeiculo();

  // Mostrar confirmação
  mostrarNotificacao(
    `Veículo configurado: ${veiculoSelecionado.descricao} (${consumo} km/L)`,
    "success"
  );

  // Resetar campos
  document.getElementById("tipoVeiculo").value = "";
  document.getElementById("campoConsumoPersonalizado").style.display = "none";
  document.getElementById("consumoPersonalizado").value = "";
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

function atualizarExibicaoVeiculo() {
  const btnAlterarVeiculo = document.getElementById("btnAlterarVeiculo");
  if (btnAlterarVeiculo) {
    if (veiculoSelecionado) {
      btnAlterarVeiculo.textContent = `🚗 ${veiculoSelecionado.descricao} (${veiculoSelecionado.consumo} km/L)`;
    } else {
      btnAlterarVeiculo.textContent = "🚗 Configurar Veículo";
    }
  }
}

// ============================================
// FUNÇÕES AUXILIARES E EVENT LISTENERS
// ============================================
function configurarEventListeners() {
  console.log("Configurando event listeners...");

  // Botões principais
  const btnRegistrar = document.getElementById("btnRegistrarRota");
  if (btnRegistrar) {
    btnRegistrar.addEventListener("click", abrirModalIniciarRota);
  }

  const btnRotaAberta = document.getElementById("btnRotaAberta");
  if (btnRotaAberta) {
    btnRotaAberta.addEventListener("click", abrirModalEncerrarRota);
  }

  // Navegação
  document.querySelectorAll(".menu-item_link").forEach((link) => {
    const pagina = link.getAttribute("data-pagina");
    if (pagina) {
      link.addEventListener("click", (e) => mudarPagina(e, pagina));
    }
  });

  // Formulários
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

  // Fechar modais ao clicar fora
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  // Configuração de veículo
  const tipoVeiculoSelect = document.getElementById("tipoVeiculo");
  if (tipoVeiculoSelect) {
    tipoVeiculoSelect.addEventListener("change", function (e) {
      const campoPersonalizado = document.getElementById(
        "campoConsumoPersonalizado"
      );
      campoPersonalizado.style.display =
        e.target.value === "personalizado" ? "block" : "none";
    });
  }

  // Botão salvar veículo
  const btnSalvarVeiculo = document.getElementById("btnSalvarVeiculo");
  if (btnSalvarVeiculo) {
    btnSalvarVeiculo.addEventListener("click", salvarConfiguracaoVeiculo);
  }

  // Botão alterar veículo
  const btnAlterarVeiculo = document.getElementById("btnAlterarVeiculo");
  if (btnAlterarVeiculo) {
    btnAlterarVeiculo.addEventListener("click", abrirModalSelecionarVeiculo);
  }

  // Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      if (confirm("Tem certeza que deseja sair?")) {
        if (window.firebaseDb && window.firebaseDb.auth) {
          window.firebaseDb.auth
            .signOut()
            .then(() => {
              window.location.href = "index.html";
            })
            .catch((error) => {
              console.error("Erro ao fazer logout:", error);
              mostrarNotificacao("Erro ao sair. Tente novamente.", "error");
            });
        } else {
          window.location.href = "index.html";
        }
      }
    });
  }

  // Fechar modal com ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal.active").forEach((modal) => {
        modal.classList.remove("active");
      });
    }
  });

  console.log("Event listeners configurados");
}

// ============================================
// FUNÇÕES DE DADOS LOCAIS
// ============================================
function carregarDadosLocal() {
  console.log("Carregando dados locais...");

  const rotaAtualSalva = localStorage.getItem("rotaAtual");
  const rotasSalvas = localStorage.getItem("rotas");

  if (rotaAtualSalva) {
    try {
      rotaAtual = JSON.parse(rotaAtualSalva);
      console.log("Rota atual carregada localmente:", rotaAtual);
      atualizarRotaAberta();
    } catch (e) {
      console.error("Erro ao parsear rota atual:", e);
    }
  }

  if (rotasSalvas) {
    try {
      rotas = JSON.parse(rotasSalvas);
      console.log(`${rotas.length} rotas carregadas localmente`);
      atualizarListaRotas();
    } catch (e) {
      console.error("Erro ao parsear rotas:", e);
      rotas = [];
    }
  }
}

// ============================================
// FUNÇÕES DE SWIPE (para excluir rotas)
// ============================================
function configurarSwipeActions() {
  const rotaItems = document.querySelectorAll(".rota-item-container");

  if (rotaItems.length === 0) return;

  console.log(`Configurando swipe para ${rotaItems.length} itens`);

  rotaItems.forEach((item) => {
    // Limpar event listeners antigos
    const newItem = item.cloneNode(true);
    item.parentNode.replaceChild(newItem, item);

    // Adicionar novos listeners
    newItem.addEventListener("touchstart", iniciarSwipeTouch, {
      passive: false,
    });
    newItem.addEventListener("touchmove", duranteSwipeTouch, {
      passive: false,
    });
    newItem.addEventListener("touchend", finalizarSwipeTouch);
    newItem.addEventListener("touchcancel", cancelarSwipe);
  });

  // Configurar clique no botão de excluir
  document.querySelectorAll(".btn-swipe-delete").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const rotaId = this.getAttribute("data-id");
      if (rotaId) {
        excluirRota(rotaId);
      }
      resetarSwipe();
    });
  });
}

function cancelarSwipe() {
  if (currentSwipeItem && !isSwiping) {
    resetarSwipeItem(currentSwipeItem);
  }
  resetarSwipe();
}

function resetarSwipe() {
  swipeStartX = 0;
  swipeStartY = 0;
  swipeCurrentX = 0;
  isSwiping = false;
  currentSwipeItem = null;
}

function resetarSwipeItem(item) {
  if (!item) return;

  const content = item.querySelector(".rota-item-content");
  const action = item.querySelector(".rota-swipe-action");

  if (content) {
    content.style.transform = "translateX(0)";
    content.style.transition = "transform 0.3s ease";
  }

  if (action) {
    action.style.transform = "translateX(100%)";
    action.style.transition = "transform 0.3s ease";
  }

  item.classList.remove("swipe-active");

  // Remover transição após animação
  setTimeout(() => {
    if (content) content.style.transition = "";
    if (action) action.style.transition = "";
  }, 300);
}

// Funções de swipe (mantenha as que você já tinha, ajustando apenas o nome)
function iniciarSwipeTouch(e) {
  if (e.touches.length !== 1) return;

  const touch = e.touches[0];
  swipeStartX = touch.clientX;
  swipeStartY = touch.clientY;
  currentSwipeItem = e.currentTarget;
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
      const translateX = Math.max(swipeCurrentX, -80);
      currentSwipeItem.querySelector(
        ".rota-item-content"
      ).style.transform = `translateX(${translateX}px)`;
    }
  }
}

function finalizarSwipeTouch(e) {
  if (!isSwiping || !currentSwipeItem) {
    resetarSwipe();
    return;
  }

  const mobileThreshold = 30;
  if (swipeCurrentX < -mobileThreshold) {
    currentSwipeItem.classList.add("swipe-active");
  } else {
    resetarSwipeItem(currentSwipeItem);
  }

  resetarSwipe();
}

function resetarSwipeItem(item) {
  if (!item) return;

  item.querySelector(".rota-item-content").style.transform = "translateX(0)";
  item.classList.remove("swipe-active");
}

function resetarSwipe() {
  swipeStartX = 0;
  swipeStartY = 0;
  swipeCurrentX = 0;
  isSwiping = false;
  currentSwipeItem = null;
}

// ============================================
// FUNÇÃO PARA EXCLUIR ROTA
// ============================================
async function excluirRota(rotaId) {
  if (
    !confirm(
      "Tem certeza que deseja excluir esta rota?\nEsta ação não pode ser desfeita."
    )
  ) {
    resetarSwipe();
    return;
  }

  try {
    // 1. Remover do array local
    rotas = rotas.filter((rota) => rota.id.toString() !== rotaId.toString());

    // 2. Excluir do Firebase se disponível
    if (db) {
      await db.rotas.doc(rotaId.toString()).delete();
    }

    // 3. Excluir do localStorage
    const rotasLocais = JSON.parse(localStorage.getItem("rotas") || "[]");
    const novasRotasLocais = rotasLocais.filter(
      (rota) => rota.id.toString() !== rotaId.toString()
    );
    localStorage.setItem("rotas", JSON.stringify(novasRotasLocais));

    // 4. Atualizar interface
    atualizarListaRotas();

    mostrarNotificacao("Rota excluída com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao excluir rota:", error);
    mostrarNotificacao("Erro ao excluir rota", "error");
  }
}

// ============================================
// FUNÇÃO DE NOTIFICAÇÃO
// ============================================
function mostrarNotificacao(mensagem, tipo = "info") {
  // Remover notificações antigas
  document.querySelectorAll(".notificacao").forEach((n) => n.remove());

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
        : tipo === "warning"
        ? "#f59e0b"
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
    max-width: 300px;
  `;

  document.body.appendChild(notificacao);

  setTimeout(() => {
    notificacao.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notificacao.remove(), 300);
  }, 3000);
}

// ============================================
// INICIALIZAÇÃO QUANDO O DOM ESTÁ PRONTO
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM completamente carregado");

  // Verificar se o usuário está autenticado
  if (window.firebaseDb && window.firebaseDb.auth) {
    const user = window.firebaseDb.auth.currentUser;

    if (user) {
      console.log("Usuário já autenticado, inicializando app...");
      inicializarApp();
    } else {
      // Aguardar autenticação
      console.log("Aguardando autenticação...");
      const unsubscribe = window.firebaseDb.auth.onAuthStateChanged((user) => {
        if (user) {
          console.log("Usuário autenticado via listener");
          unsubscribe(); // Parar de ouvir
          inicializarApp();
        }
      });

      // Timeout para caso o Firebase não responda
      setTimeout(() => {
        const currentUser = window.firebaseDb.auth.currentUser;
        if (!currentUser) {
          console.log("Timeout de autenticação, redirecionando...");
          window.location.href = "index.html";
        }
      }, 5000);
    }
  } else {
    console.error("Firebase não carregado. Usando modo offline.");
    inicializarModoOffline();
  }
});

// ============================================
// ESTILOS DE ANIMAÇÃO PARA NOTIFICAÇÃO
// ============================================
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
