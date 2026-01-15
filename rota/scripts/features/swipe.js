
// ============================================
// GESTOS DE SWIPE - swipe.js
// ============================================

import { swipeStartX, swipeStartY, swipeCurrentX, isSwiping, currentSwipeItem, swipeThreshold } from '../config/constants.js';
import { rotas, db } from '../config/constants.js';

// ============================================
// FUNÇÕES DE SWIPE (para excluir rotas)
// ============================================
export function configurarSwipeActions() {
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

export function cancelarSwipe() {
  if (currentSwipeItem && !isSwiping) {
    resetarSwipeItem(currentSwipeItem);
  }
  resetarSwipe();
}

export function resetarSwipe() {
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

// Funções de swipe
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

// ============================================
// FUNÇÃO PARA EXCLUIR ROTA
// ============================================
export async function excluirRota(rotaId) {
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