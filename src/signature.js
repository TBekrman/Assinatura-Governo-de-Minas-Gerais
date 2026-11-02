// Gera o HTML da assinatura com estilos inline (compatível com Gmail/Outlook).

const COR = "#C8102E";    // vermelho institucional
const TEXTO = "#333333";
const CINZA = "#666666";

// URL pública do logotipo (hospedado no próprio Firebase Hosting).
// Coloque o arquivo em public/logo-mg.png antes do deploy.
const LOGO_URL = "https://studio-7395892416-751c9.web.app/logo-mg.png";

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function linha(texto, estilo = "") {
  if (!texto) return "";
  return `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:17px;color:${CINZA};${estilo}">${texto}</td></tr>`;
}

export function gerarAssinatura(d, { comLogo = true } = {}) {
  const cargoMasp = [esc(d.cargo), d.masp ? "MASP " + esc(d.masp) : ""].filter(Boolean).join(" · ");
  const contato = [
    d.telefone ? esc(d.telefone) : "",
    d.email ? `<a href="mailto:${esc(d.email)}" style="color:${COR};text-decoration:none;">${esc(d.email)}</a>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  const logo = comLogo
    ? `<td style="padding-right:14px;vertical-align:middle;border-right:3px solid ${COR};">
         <img src="${LOGO_URL}" alt="Governo de Minas Gerais" width="110" style="display:block;width:110px;height:auto;border:0;" />
       </td>`
    : "";

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    ${logo}
    <td style="padding-left:${comLogo ? 14 : 0}px;vertical-align:middle;${comLogo ? "" : `border-left:3px solid ${COR};padding-left:10px;`}">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:${TEXTO};">${esc(d.nome || "Seu nome")}</td></tr>
        ${linha(cargoMasp, `color:${TEXTO};`)}
        ${linha(esc(d.setor))}
        ${linha(esc(d.unidade))}
        ${linha(`<b style="color:${COR};">Secretaria de Estado de Educação de Minas Gerais</b>`)}
        ${linha(esc(d.endereco))}
        ${linha(contato)}
      </table>
    </td>
  </tr>
</table>`;
}
