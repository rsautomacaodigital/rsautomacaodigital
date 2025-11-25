const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  // 🔓 CORS — importante para evitar erros no navegador
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "OK",
    };
  }

  // Aceita apenas POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: false, message: "Método não permitido" }),
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // Honeypot (bot-field)
    if (data["bot-field"]) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: false, message: "Bot detectado" }),
      };
    }

    // Desestruturação com fallback
    const {
      nome = "",
      telefone = "",
      email = "",
      empresa = "",
      servico = "",
      faturamento = "",
      mensagem = "",
    } = data;

    // Transportador para Gmail (necessário GMAIL_APP_PASSWORD no Netlify)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "rsautomacaodigital@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const html = `
      <h2>Novo Contato do Site</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Telefone:</strong> ${telefone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Empresa:</strong> ${empresa}</p>
      <p><strong>Serviço:</strong> ${servico}</p>
      <p><strong>Faturamento:</strong> ${faturamento}</p>
      <p><strong>Mensagem:</strong></p>
      <p>${mensagem}</p>
      <hr>
      <p><small>Enviado em: ${new Date().toLocaleString("pt-BR")}</small></p>
    `;

    await transporter.sendMail({
      from: "Site RS Automação <rsautomacaodigital@gmail.com>",
      to: "rsautomacaodigital@gmail.com",
      subject: `Novo Lead — ${nome}`,
      html,
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        message: "Formulário enviado com sucesso!",
      }),
    };
  } catch (err) {
    console.error("Erro ao enviar email:", err);

    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: false,
        message: "Erro ao enviar email. Tente novamente.",
        error: String(err),
      }),
    };
  }
};
