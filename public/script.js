const CLIENT_ID = "COLE_SEU_CLIENT_ID_AQUI";

const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const botaoBaixar = document.getElementById("baixar");

let idToken = "";
let svgAtual = "";
let urlSvgAtual = "";

// Recebe o resultado do login do Google
window.handleCredentialResponse = function (resposta) {
  idToken = resposta.credential;
  mensagem.textContent = "Login realizado com sucesso!";
};

// Inicializa o botão quando a biblioteca do Google estiver carregada
function iniciarLoginGoogle() {
  if (!window.google?.accounts?.id) {
    setTimeout(iniciarLoginGoogle, 200);
    return;
  }

  if (CLIENT_ID === "COLE_SEU_CLIENT_ID_AQUI") {
    mensagem.textContent =
      "Configure o Client ID do Google para habilitar o login.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: window.handleCredentialResponse,
  });

  window.google.accounts.id.renderButton(
    document.getElementById("login-google"),
    {
      theme: "outline",
      size: "large",
      text: "signin_with",
    }
  );
}

iniciarLoginGoogle();

// Envia o número e o token para o servidor
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";

  const numero = Number(campoNumero.value);

  if (
    campoNumero.value.trim() === "" ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 100
  ) {
    mensagem.textContent = "Digite um inteiro entre 1 e 100.";
    return;
  }

  if (!idToken) {
    mensagem.textContent = "Faça login com o Google antes de desenhar.";
    return;
  }

  try {
    const resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ numero }),
    });

    if (!resposta.ok) {
      const erro = await resposta.text();

      if (resposta.status === 400) {
        mensagem.textContent = erro || "Número ou corpo inválido.";
      } else if (resposta.status === 401) {
        mensagem.textContent =
          "Login inválido ou expirado. Entre novamente com o Google.";
      } else {
        mensagem.textContent =
          `Erro do servidor: ${resposta.status}.`;
      }

      return;
    }

    svgAtual = await resposta.text();

    if (urlSvgAtual) {
      URL.revokeObjectURL(urlSvgAtual);
    }

    const arquivoSvg = new Blob([svgAtual], {
      type: "image/svg+xml",
    });

    urlSvgAtual = URL.createObjectURL(arquivoSvg);

    const imagem = document.createElement("img");
    imagem.src = urlSvgAtual;
    imagem.alt = "Desenho assinado gerado pelo servidor";
    area.replaceChildren(imagem);

    botaoBaixar.hidden = false;
    mensagem.textContent = "Desenho gerado com sucesso!";
  } catch {
    mensagem.textContent =
      "Não foi possível conectar ao servidor. Tente novamente.";
  }
});

// Permite baixar o SVG recebido do servidor
botaoBaixar.addEventListener("click", () => {
  if (!svgAtual) return;

  const arquivo = new Blob([svgAtual], {
    type: "image/svg+xml",
  });

  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  link.href = url;
  link.download = "exemplo.svg";
  link.click();

  URL.revokeObjectURL(url);
});
