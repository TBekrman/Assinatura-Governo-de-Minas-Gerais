import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, DOMINIO, emailInstitucional } from "./firebase.js";
import { desenhar, prepararRecursos } from "./assinatura.js";

const $ = (id) => document.getElementById(id);
const telas = { login: $("tela-login"), carregando: $("tela-carregando"), editor: $("tela-editor") };
const form = $("form");
const CAMPOS = ["nome", "cargo", "orgao", "telefone", "celular", "email", "endereco"];
const OBRIGATORIOS = ["nome", "cargo", "email", "endereco"];
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Secretaria fixa: não pode ser alterada pelo usuário
const SECRETARIA = "Secretaria de Estado de Educação (SEE/MG)";

let usuario = null;

function mostrar(nome) {
  for (const [k, el] of Object.entries(telas)) el.hidden = k !== nome;
}

function erroLogin(msg) {
  const el = $("login-erro");
  el.textContent = msg;
  el.hidden = !msg;
}

function setStatus(msg, tipo = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status " + tipo;
}

function dadosForm() {
  const d = {};
  for (const c of CAMPOS) d[c] = form.elements[c].value.trim();
  d.secretaria = SECRETARIA;
  return d;
}

// Pré-visualização: redesenha a imagem a cada alteração (agrupado por quadro de animação)
let pedido = 0;
function atualizarPreview() {
  if (!usuario) return;
  cancelAnimationFrame(pedido);
  pedido = requestAnimationFrame(() => desenhar($("preview"), dadosForm(), { exemplo: true }));
}

// Assim que as fontes carregarem, redesenha com a fonte correta
prepararRecursos().then(atualizarPreview);

// ---------- Autenticação ----------
const provider = new GoogleAuthProvider();
// "hd" faz o Google sugerir apenas contas do domínio institucional
provider.setCustomParameters({ hd: DOMINIO, prompt: "select_account" });

$("btn-google").addEventListener("click", async () => {
  erroLogin("");
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
      erroLogin("Não foi possível entrar: " + (e.message || e.code));
    }
  }
});

$("btn-sair").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    usuario = null;
    $("usuario").hidden = true;
    mostrar("login");
    return;
  }

  // Bloqueia qualquer conta fora do domínio (a regra do Firestore também bloqueia)
  if (!emailInstitucional(user.email) || !user.emailVerified) {
    const email = user.email;
    await signOut(auth);
    erroLogin(`Acesso permitido apenas para contas @${DOMINIO}. Você entrou como ${email}.`);
    return;
  }

  usuario = user;
  $("usuario-email").textContent = user.email;
  $("usuario").hidden = false;
  mostrar("carregando");

  form.reset();
  form.elements.secretaria.value = SECRETARIA;
  // Sugestão do e-mail do login no campo de e-mail
  const opcao = document.createElement("option");
  opcao.value = user.email;
  $("emails-sugeridos").replaceChildren(opcao);
  setStatus("");
  try {
    const snap = await getDoc(doc(db, "assinaturas", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      for (const c of CAMPOS) form.elements[c].value = d[c] ?? "";
    } else {
      form.elements.nome.value = user.displayName ?? "";
    }
  } catch (e) {
    console.error(e);
    setStatus("Não foi possível carregar os dados salvos.", "erro");
  }
  // Por padrão, o e-mail é o do login
  if (!form.elements.email.value.trim()) form.elements.email.value = user.email;
  atualizarBotaoEmail();
  mostrar("editor");
  atualizarPreview();
});

// ---------- Editor ----------
function atualizarBotaoEmail() {
  const atual = form.elements.email.value.trim().toLowerCase();
  $("btn-email-login").hidden = !usuario || atual === usuario.email.toLowerCase();
}

$("btn-email-login").addEventListener("click", () => {
  form.elements.email.value = usuario.email;
  form.elements.email.classList.remove("invalido");
  atualizarBotaoEmail();
  atualizarPreview();
});

form.addEventListener("input", (ev) => {
  ev.target.classList?.remove("invalido");
  if (ev.target.name === "email") atualizarBotaoEmail();
  atualizarPreview();
  setStatus("");
});

/** Marca os obrigatórios vazios; retorna true se tudo ok. */
function validar() {
  const faltando = OBRIGATORIOS.filter((c) => !form.elements[c].value.trim());
  for (const c of OBRIGATORIOS) form.elements[c].classList.toggle("invalido", faltando.includes(c));
  if (faltando.length) {
    form.elements[faltando[0]].focus();
    setStatus("Preencha os campos obrigatórios.", "erro");
    return false;
  }
  if (!EMAIL_VALIDO.test(form.elements.email.value.trim())) {
    form.elements.email.classList.add("invalido");
    form.elements.email.focus();
    setStatus("Informe um e-mail válido.", "erro");
    return false;
  }
  return true;
}

async function salvar() {
  await setDoc(doc(db, "assinaturas", usuario.uid), { ...dadosForm(), atualizadoEm: serverTimestamp() });
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!validar()) return;
  setStatus("Salvando…");
  try {
    await salvar();
    setStatus("Dados salvos ✓", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Erro ao salvar: " + (e.code || e.message), "erro");
  }
});

/** Gera a imagem final (sem textos de exemplo) em alta resolução. */
async function imagemFinal() {
  await prepararRecursos();
  const canvas = document.createElement("canvas");
  await desenhar(canvas, dadosForm(), { escala: 2 });
  return canvas;
}

function nomeArquivo() {
  const base = form.elements.nome.value.trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `assinatura-${base || "email"}.jpg`;
}

$("btn-jpeg").addEventListener("click", async () => {
  if (!validar()) return;
  setStatus("Gerando imagem…");
  try {
    const canvas = await imagemFinal();
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.download = nomeArquivo();
    a.click();
    setStatus("Imagem JPEG criada ✓", "ok");
    // Guarda os dados para a próxima vez (sem bloquear o download)
    salvar().catch((e) => console.error(e));
  } catch (e) {
    console.error(e);
    setStatus("Não foi possível gerar a imagem.", "erro");
  }
});

$("btn-copiar").addEventListener("click", async () => {
  if (!validar()) return;
  try {
    const canvas = await imagemFinal();
    const png = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    setStatus("Imagem copiada ✓ — cole com Ctrl+V", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Seu navegador não permitiu copiar. Use “Criar imagem (JPEG)”.", "erro");
  }
});
