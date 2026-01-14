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

  // Verificar se já está autenticado
  const user = window.firebaseDb.auth.currentUser;
  if (user) {
    console.log("Já autenticado, redirecionando...");
    window.location.href = "inicio.html";
    return;
  }

  // Submissão do formulário
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const senha = senhaInput.value;

    // Validação básica
    if (!email || !senha) {
      mostrarErro("Preencha todos os campos.");
      return;
    }

    // Desabilitar botão durante o login
    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    // Fazer login com email e senha
    window.firebaseDb.auth
      .signInWithEmailAndPassword(email, senha)
      .then((userCredential) => {
        // Login bem-sucedido
        console.log("Login bem-sucedido:", userCredential.user.email);
        window.location.href = "inicio.html";
      })
      .catch((error) => {
        // Tratar erros
        let mensagem = "Erro ao fazer login. Verifique suas credenciais.";
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
          case "auth/too-many-requests":
            mensagem = "Muitas tentativas. Tente novamente mais tarde.";
            break;
          default:
            mensagem = `Erro: ${error.message}`;
        }
        mostrarErro(mensagem);
      })
      .finally(() => {
        btnLogin.disabled = false;
        btnLogin.textContent = "Entrar";
      });
  });

  function mostrarErro(mensagem) {
    loginErro.textContent = mensagem;
    loginErro.style.display = "block";

    // Esconder mensagem após 5 segundos
    setTimeout(() => {
      loginErro.style.display = "none";
    }, 5000);
  }

  // Adicionar botão de criar conta
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
        mostrarErro("Conta criada com sucesso! Faça login.");
        emailInput.value = "";
        senhaInput.value = "";
      })
      .catch((error) => {
        let mensagem = "Erro ao criar conta.";
        switch (error.code) {
          case "auth/email-already-in-use":
            mensagem = "Este email já está em uso.";
            break;
          case "auth/weak-password":
            mensagem = "A senha é muito fraca.";
            break;
          case "auth/invalid-email":
            mensagem = "Email inválido.";
            break;
          default:
            mensagem = `Erro: ${error.message}`;
        }
        mostrarErro(mensagem);
      })
      .finally(() => {
        btnCriarConta.disabled = false;
        btnCriarConta.textContent = "Criar conta";
      });
  });

  // Adicionar botão ao formulário
  loginForm.appendChild(btnCriarConta);
});
