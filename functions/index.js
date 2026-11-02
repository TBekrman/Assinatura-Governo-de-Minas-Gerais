// Envio da assinatura por e-mail (SMTP Hostinger).
// A senha fica no Secret Manager:  firebase functions:secrets:set SMTP_PASS

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import nodemailer from "nodemailer";

const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_USER = "nao-responder@educacaoensa.com";
const REMETENTE = `"Gerador de Assinaturas · SEE/MG" <${SMTP_USER}>`;

const DOMINIO = "@educacao.mg.gov.br";
const TAMANHO_MAX = 3 * 1024 * 1024; // 3 MB
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const limpar = (s, max) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

function corpoHtml(nome) {
  const n = esc(nome);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f1f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1f6;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#333333;">
    <tr><td style="background:#69247E;padding:26px 32px;border-bottom:6px solid #FFDE00;">
      <div style="font-size:13px;letter-spacing:1px;color:#FFDE00;font-weight:bold;text-transform:uppercase;">Governo de Minas Gerais</div>
      <div style="font-size:22px;line-height:28px;color:#ffffff;font-weight:bold;margin-top:4px;">Sua assinatura de e-mail está pronta! ✉️</div>
    </td></tr>
    <tr><td style="padding:28px 32px 8px;font-size:15px;line-height:23px;">
      <p style="margin:0 0 14px;">Olá, <b>${n}</b>!</p>
      <p style="margin:0 0 18px;">Segue a sua assinatura de e-mail institucional, gerada no padrão visual do Governo de Minas Gerais. A imagem também está <b>anexada</b> a esta mensagem.</p>
    </td></tr>
    <tr><td style="padding:0 32px;">
      <img src="cid:assinatura" alt="Assinatura de ${n}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e6e1ec;border-radius:8px;">
    </td></tr>
    <tr><td style="padding:24px 32px 8px;font-size:14px;line-height:22px;">
      <div style="background:#faf8fc;border-left:4px solid #69247E;border-radius:6px;padding:16px 18px;">
        <b style="color:#69247E;">Como usar no Gmail</b>
        <ol style="margin:8px 0 0;padding-left:20px;">
          <li>Baixe a imagem anexada.</li>
          <li>Abra ⚙️ <b>Configurações → Ver todas as configurações</b>.</li>
          <li>Na aba <b>Geral</b>, em <b>Assinatura</b>, clique em <b>Criar nova</b>.</li>
          <li>Clique em <b>Inserir imagem</b>, envie o arquivo e depois em <b>Salvar alterações</b>.</li>
        </ol>
      </div>
    </td></tr>
    <tr><td style="padding:24px 32px 28px;font-size:14px;line-height:21px;">
      <p style="margin:0 0 4px;">Atenciosamente,</p>
      <p style="margin:0;"><b style="color:#69247E;">Gerador de Assinaturas</b><br>
      Secretaria de Estado de Educação de Minas Gerais (SEE/MG)<br>
      Governo de Minas Gerais</p>
    </td></tr>
    <tr><td style="background:#f6f4f9;padding:14px 32px;font-size:12px;line-height:18px;color:#7a7385;">
      Esta é uma mensagem automática enviada pelo Gerador de Assinaturas. Por favor, não responda este e-mail.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function corpoTexto(nome) {
  return `Olá, ${nome}!

Segue a sua assinatura de e-mail institucional, gerada no padrão visual do Governo de Minas Gerais. A imagem está anexada a esta mensagem.

Como usar no Gmail:
1. Baixe a imagem anexada.
2. Abra Configurações > Ver todas as configurações.
3. Na aba Geral, em Assinatura, clique em Criar nova.
4. Clique em Inserir imagem, envie o arquivo e depois em Salvar alterações.

Atenciosamente,
Gerador de Assinaturas
Secretaria de Estado de Educação de Minas Gerais (SEE/MG)
Governo de Minas Gerais

Mensagem automática. Por favor, não responda este e-mail.`;
}

export const enviarAssinatura = onCall(
  { region: "southamerica-east1", secrets: [SMTP_PASS], maxInstances: 5, timeoutSeconds: 60 },
  async (req) => {
    // Apenas usuários logados com e-mail institucional verificado
    const token = req.auth?.token;
    if (!token || !token.email_verified || !String(token.email).toLowerCase().endsWith(DOMINIO)) {
      throw new HttpsError("permission-denied", "Acesso permitido apenas para contas @educacao.mg.gov.br.");
    }

    const para = limpar(req.data?.para, 120).toLowerCase();
    const nome = limpar(req.data?.nome, 60);
    const imagem = String(req.data?.imagem ?? "");

    if (!EMAIL_RE.test(para)) throw new HttpsError("invalid-argument", "E-mail de destino inválido.");
    if (!nome) throw new HttpsError("invalid-argument", "Informe o nome.");

    const m = imagem.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new HttpsError("invalid-argument", "Imagem inválida.");
    const buffer = Buffer.from(m[1], "base64");
    if (buffer.length > TAMANHO_MAX || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      throw new HttpsError("invalid-argument", "Imagem inválida.");
    }

    const transporte = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS.value() },
    });

    const arquivo = "assinatura-" + (nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "email") + ".jpg";

    try {
      await transporte.sendMail({
        from: REMETENTE,
        to: para,
        subject: `Assinatura de e-mail – ${nome}`,
        text: corpoTexto(nome),
        html: corpoHtml(nome),
        attachments: [
          { filename: arquivo, content: buffer, contentType: "image/jpeg" },                 // anexo
          { filename: arquivo, content: buffer, contentType: "image/jpeg", cid: "assinatura", contentDisposition: "inline" }, // exibida no corpo
        ],
      });
    } catch (e) {
      console.error("Falha no SMTP", e);
      throw new HttpsError("unavailable", "Não foi possível enviar o e-mail agora. Tente novamente.");
    }

    console.log(`Assinatura enviada por ${token.email} para ${para}`);
    return { ok: true };
  },
);
