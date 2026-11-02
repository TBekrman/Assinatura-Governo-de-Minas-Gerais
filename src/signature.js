// Gera o HTML da assinatura com estilos inline (compatível com Gmail/Outlook).

const COR = "#C8102E";    // vermelho institucional
const TEXTO = "#333333";
const CINZA = "#666666";
const EXEMPLO = "#B8BEC8"; // cor dos textos de exemplo (campos ainda não preenchidos)

// URL pública do logotipo (usada no HTML copiado para o Gmail).
// Coloque o arquivo em public/logo-mg.png antes do deploy.
export const LOGO_URL = "https://assinatura.educacaoensa.com/logo-mg.png";

// Textos de exemplo exibidos no modelo enquanto o campo está vazio
const EXEMPLOS = {
  nome: "Nome Completo do Servidor",
  cargo: "Cargo / Função",
  masp: "0000000-0",
  setor: "Setor / Diretoria",
  unidade: "Unidade (SRE / Escola)",
  endereco: "Endereço da unidade",
  telefone: "(31) 0000-0000",
};

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function linha(texto, estilo = "") {
  if (!texto) return "";
  return `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:17px;color:${CINZA};${estilo}">${texto}</td></tr>`;
}

/**
 * @param d        dados do formulário
 * @param comLogo  inclui o logotipo
 * @param logoSrc  URL do logotipo (padrão: URL pública)
 * @param exemplo  mostra textos de exemplo em cinza nos campos vazios (só na pré-visualização)
 */
export function gerarAssinatura(d, { comLogo = true, logoSrc = LOGO_URL, exemplo = false } = {}) {
  // Valor escapado do campo ou, no modo exemplo, o texto de exemplo em cinza
  const v = (campo) => {
    if (d[campo]) return esc(d[campo]);
    return exemplo ? `<span style="color:${EXEMPLO};">${esc(EXEMPLOS[campo])}</span>` : "";
  };

  const masp = v("masp");
  const cargoMasp = [v("cargo"), masp ? "MASP " + masp : ""].filter(Boolean).join(" · ");
  const contato = [
    v("telefone"),
    d.email ? `<a href="mailto:${esc(d.email)}" style="color:${COR};text-decoration:none;">${esc(d.email)}</a>` : "",
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");

  const logo = comLogo
    ? `<td style="padding-right:14px;vertical-align:middle;border-right:3px solid ${COR};">
         <img src="${logoSrc}" alt="Governo de Minas Gerais" width="110" style="display:block;width:110px;height:auto;border:0;" />
       </td>`
    : "";

  const nome = d.nome ? esc(d.nome) : exemplo ? `<span style="color:${EXEMPLO};">${EXEMPLOS.nome}</span>` : "";

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ffffff;">
  <tr>
    ${logo}
    <td style="vertical-align:middle;${comLogo ? "padding-left:14px;" : `border-left:3px solid ${COR};padding-left:10px;`}">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;font-weight:bold;color:${TEXTO};">${nome}</td></tr>
        ${linha(cargoMasp, `color:${TEXTO};`)}
        ${linha(v("setor"))}
        ${linha(v("unidade"))}
        ${linha(`<b style="color:${COR};">Secretaria de Estado de Educação de Minas Gerais</b>`)}
        ${linha(v("endereco"))}
        ${linha(contato)}
      </table>
    </td>
  </tr>
</table>`;
}
