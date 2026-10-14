
import { gerarDesenho } from "../../lib/desenho.js";

export async function onRequest({ request, env }) {
  // 1. Verificar o método HTTP
  if (request.method !== "POST") {
    return new Response("Método não permitido", {
      status: 405,
    });
  }

  // 2. Ler e validar o corpo da requisição
  let dados;

  try {
    dados = await request.json();
  } catch {
    return new Response("Corpo JSON inválido ou ausente", {
      status: 400,
    });
  }

  if (
    !dados ||
    !Number.isInteger(dados.numero) ||
    dados.numero < 1 ||
    dados.numero > 100
  ) {
    return new Response("Número inválido. Informe um inteiro de 1 a 100.", {
      status: 400,
    });
  }

  // 3. Obter o token enviado pelo navegador
  const autorizacao = request.headers.get("Authorization");
  const correspondencia = autorizacao?.match(/^Bearer\s+(.+)$/i);

  if (!correspondencia) {
    return new Response("Token ausente ou inválido", {
      status: 401,
    });
  }

  const token = correspondencia[1];

  // 4. Pedir ao Google para verificar o token
  let respostaGoogle;
  let usuario;

  try {
    respostaGoogle = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
    );

    if (!respostaGoogle.ok) {
      return new Response("Token inválido ou expirado", {
        status: 401,
      });
    }

    usuario = await respostaGoogle.json();
  } catch {
    return new Response("Não foi possível verificar o token", {
      status: 401,
    });
  }

  // 5. Conferir a identidade e o e-mail
  if (
    !env.GOOGLE_CLIENT_ID ||
    usuario.aud !== env.GOOGLE_CLIENT_ID ||
    usuario.email_verified !== "true" ||
    !usuario.email
  ) {
    return new Response("Token não autorizado ou e-mail não verificado", {
      status: 401,
    });
  }

  // 6. Gerar o desenho usando o e-mail confirmado pelo Google
  const svg = gerarDesenho(dados.numero, usuario.email);

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
