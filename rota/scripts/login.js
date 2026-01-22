document.addEventListener("DOMContentLoaded", function () {
  console.log("Login.js carregado");

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const btnLogin = document.getElementById("btnLogin");
  const loginErro = document.getElementById("loginErro");

  // Verificar se Firebase está disponível
  if (!window.firebaseDb || !window.firebaseDb.auth) {
    mostrarErro("Sistema não carregado corretamente. Recarregue a página.");
    btnLogin.disabled = true;
    return;
  }

  // ---------------------------------------------------------
  // 1. VERIFICAR AUTENTICAÇÃO (COM PROTEÇÃO DE EMAIL)
  // ---------------------------------------------------------
  const user = window.firebaseDb.auth.currentUser;

  // Só redireciona se estiver logado E com email verificado
  if (user && user.emailVerified) {
    console.log("Usuário autenticado e verificado, redirecionando...");
    window.location.href = "inicio.html";
    return;
  } else if (user && !user.emailVerified) {
    // Se estiver logado mas não verificou, força o logout para limpar estado
    console.log("Usuário logado mas não verificado. Realizando logout.");
    window.firebaseDb.auth.signOut();
  }

  // ---------------------------------------------------------
  // 2. LOGIN (AGORA COM VERIFICAÇÃO)
  // ---------------------------------------------------------
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
      mostrarErro("Preencha todos os campos.");
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    window.firebaseDb.auth
      .signInWithEmailAndPassword(email, senha)
      .then((userCredential) => {
        const user = userCredential.user;

        // --- TRAVA DE SEGURANÇA ---
        if (!user.emailVerified) {
          // Se o email não foi verificado, desloga e avisa
          window.firebaseDb.auth.signOut();
          mostrarErro(
            "Conta não ativada! Verifique seu email e clique no link enviado.",
          );

          // Opcional: Oferecer para reenviar o email
          // user.sendEmailVerification();

          return; // Para a execução aqui
        }

        // Login bem-sucedido e verificado
        console.log("Login bem-sucedido:", user.email);
        window.location.href = "inicio.html";
      })
      .catch((error) => {
        tratarErrosFirebase(error);
      })
      .finally(() => {
        btnLogin.disabled = false;
        btnLogin.textContent = "Entrar";
      });
  });

  function mostrarErro(mensagem) {
    loginErro.textContent = mensagem;
    loginErro.style.display = "block";
    setTimeout(() => {
      loginErro.style.display = "none";
    }, 8000); // Aumentei o tempo para dar tempo de ler sobre a verificação
  }

  function tratarErrosFirebase(error) {
    let mensagem = "Erro ao processar. Tente novamente.";
    switch (error.code) {
      case "auth/invalid-email":
        mensagem = "Email inválido.";
        break;
      case "auth/user-disabled":
        mensagem = "Este usuário foi desativado.";
        break;
      case "auth/user-not-found":
        mensagem = "Email não cadastrado.";
        break;
      case "auth/wrong-password":
        mensagem = "Senha incorreta.";
        break;
      case "auth/email-already-in-use":
        mensagem = "Este email já está em uso.";
        break;
      case "auth/weak-password":
        mensagem = "A senha é muito fraca (mínimo 6 caracteres).";
        break;
      case "auth/too-many-requests":
        mensagem = "Muitas tentativas. Tente novamente mais tarde.";
        break;
      default:
        mensagem = `Erro: ${error.message}`;
    }
    mostrarErro(mensagem);
  }

  // ---------------------------------------------------------
  // 3. CRIAR CONTA (COM ENVIO DE EMAIL)
  // ---------------------------------------------------------
  const btnCriarConta = document.createElement("button");
  btnCriarConta.type = "button";
  btnCriarConta.id = "btnCriarConta";
  btnCriarConta.textContent = "Criar conta";
  btnCriarConta.className = "btn-secundario";
  btnCriarConta.style.marginTop = "10px";

  btnCriarConta.addEventListener("click", function () {
    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    if (!email || !senha) {
      mostrarErro("Preencha email e senha para criar conta.");
      return;
    }

    if (senha.length < 6) {
      mostrarErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    btnCriarConta.disabled = true;
    btnCriarConta.textContent = "Criando...";

    window.firebaseDb.auth
      .createUserWithEmailAndPassword(email, senha)
      .then((userCredential) => {
        const user = userCredential.user;

        // --- ENVIA EMAIL DE ATIVAÇÃO ---
        user
          .sendEmailVerification()
          .then(() => {
            // Sucesso no envio
            alert(
              `Conta criada! Um email de ativação foi enviado para ${email}. Verifique sua caixa de entrada (e spam) antes de fazer login.`,
            );

            // Força o logout para garantir que ele não entre direto
            window.firebaseDb.auth.signOut();

            // Limpa o form
            emailInput.value = "";
            senhaInput.value = "";
          })
          .catch((error) => {
            // Conta criada, mas falhou ao enviar email
            console.error("Erro ao enviar email", error);
            mostrarErro(
              "Conta criada, mas erro ao enviar email de verificação.",
            );
          });
      })
      .catch((error) => {
        tratarErrosFirebase(error);
      })
      .finally(() => {
        btnCriarConta.disabled = false;
        btnCriarConta.textContent = "Criar conta";
      });
  });

  loginForm.appendChild(btnCriarConta);
});