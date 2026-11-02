// Desenha a assinatura sobre a imagem base (modelo da planilha PlanilhaGGOV.xlsx).
// Coordenadas no espaço da imagem base (840 × 350 px).

const baseUrl = "/assinatura-base.png";

export const LARGURA = 840;
export const ALTURA = 350;

const ROXO = "#69247E";
const CINZA = "#595959";
const FONTE = "'Nunito', 'Arial Rounded MT Bold', 'Arial Rounded MT', Arial, sans-serif";

// Textos de exemplo (os mesmos da planilha) exibidos enquanto o campo está vazio
export const EXEMPLOS = {
  nome: "Seu nome",
  cargo: "Seu cargo",
  secretaria: "Secretaria de .........",
  orgao: "Diretoria de .........",
  telefone: "31 3915-0000",
  celular: "",
  email: "nome@educacao.mg.gov.br",
  endereco: "Cidade Administrativa, Prédio Tiradentes, 3º andar",
};

// Área útil do texto: até antes do logotipo/selo roxo
const LIMITE_X = 600;

let baseImg = null;
function carregarBase() {
  if (!baseImg) {
    baseImg = new Promise((ok, erro) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = erro;
      img.src = baseUrl;
    });
  }
  return baseImg;
}

export async function prepararRecursos() {
  await Promise.all([
    carregarBase(),
    document.fonts?.load(`800 34px Nunito`).catch(() => {}),
    document.fonts?.load(`400 16px Nunito`).catch(() => {}),
    document.fonts?.load(`700 16px Nunito`).catch(() => {}),
  ]);
}

// Escreve o texto reduzindo a fonte, se preciso, para caber na largura (como "reduzir para caber" no Excel)
function texto(ctx, str, x, y, { tamanho, peso = 400, cor, maxX = LIMITE_X }) {
  if (!str) return;
  const max = maxX - x;
  let t = tamanho;
  ctx.font = `${peso} ${t}px ${FONTE}`;
  while (ctx.measureText(str).width > max && t > 8) {
    t -= 0.5;
    ctx.font = `${peso} ${t}px ${FONTE}`;
  }
  ctx.fillStyle = cor;
  ctx.fillText(str, x, y);
}

/** Aplica as mesmas regras das fórmulas da aba "Imagem base" da planilha. */
export function linhas(d) {
  const sec = (d.secretaria || "").trim();
  const org = (d.orgao || "").trim();
  return {
    nome: (d.nome || "").trim(),
    cargo: (d.cargo || "").trim(),
    linha3: (org || sec).toUpperCase(),
    linha4: org ? sec.toUpperCase() : "",
    telefones: [d.telefone, d.celular].map((s) => (s || "").trim()).filter(Boolean).join(" / "),
    email: (d.email || "").trim(),
    endereco: (d.endereco || "").trim(),
  };
}

/**
 * Desenha a assinatura no canvas.
 * @param exemplo  preenche campos vazios com os textos de exemplo, mais claros (pré-visualização)
 * @param escala   fator de resolução (2 = 1680 × 700 px)
 */
export async function desenhar(canvas, dados, { exemplo = false, escala = 2 } = {}) {
  const img = await carregarBase();
  canvas.width = LARGURA * escala;
  canvas.height = ALTURA * escala;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.drawImage(img, 0, 0, LARGURA, ALTURA);
  ctx.textBaseline = "alphabetic";

  const real = linhas(dados);
  const ex = linhas(Object.fromEntries(
    Object.keys(EXEMPLOS).map((k) => [k, dados[k] || (exemplo ? EXEMPLOS[k] : "")]),
  ));
  // Cor de exemplo: mesma cor, mas transparente
  const cor = (campo, base) => (real[campo] ? base : base + "66");
  const v = (campo) => (real[campo] || ex[campo]);

  texto(ctx, v("nome"), 46, 92, { tamanho: 36, peso: 800, cor: cor("nome", ROXO) });
  texto(ctx, v("cargo"), 52, 124, { tamanho: 20, cor: cor("cargo", ROXO) });
  texto(ctx, v("linha3"), 56, 156, { tamanho: 13, peso: 700, cor: cor("linha3", ROXO) });
  texto(ctx, v("linha4"), 56, 175, { tamanho: 13, peso: 700, cor: cor("linha4", ROXO) });
  texto(ctx, v("telefones"), 88, 236, { tamanho: 16, cor: cor("telefones", CINZA) });
  texto(ctx, v("email"), 88, 276, { tamanho: 16, cor: cor("email", CINZA) });
  texto(ctx, v("endereco"), 88, 314, { tamanho: 16, cor: cor("endereco", CINZA) });
}
