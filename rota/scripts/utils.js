// ============================================
// SISTEMA DE NOTIFICAÇÕES
// ============================================
export function mostrarNotificacao(mensagem, tipo = "info") {
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
// ESTILOS DINÂMICOS
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