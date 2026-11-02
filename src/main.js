import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, DOMINIO, emailInstitucional } from "./firebase.js";
import { gerarAssinatura } from "./signature.js";

const $ = (id) => document.getElementById(id);
const telas = { login: $("tela-login"), carregando: $("tela-carregando"), editor: $("tela-editor") };
const form = $("form");
const CAMPOS = ["nome", "cargo", "masp", "setor", "unidade", "endereco", "telefone"];

let usuario = null;
let temLogo = false;

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

// Verifica se o logotipo existe no Hosting; sem ele, a assinatura sai sem imagem.
const img = new Image();
img.onload = () => { temLogo = true; atualizarPreview(); };
img.src = "/logo-mg.png";

function dadosForm() {
  const d = {};
  for (const c of CAMPOS) d[c] = form.elements[c].value.trim();
  d.email = usuario?.email ?? "";
  return d;
}

function htmlAtual() {
  return gerarAssinatura(dadosForm(), { comLogo: temLogo });
}

function atualizarPreview() {
  if (!usuario) return;
  $("preview").innerHTML = htmlAtual();
}

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
  form.elements.email.value = user.email;
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
  atualizarPreview();
  mostrar("editor");
});

// ---------- Editor ----------
form.addEventListener("input", () => { atualizarPreview(); setStatus(""); });

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!form.elements.nome.value.trim()) {
    form.elements.nome.focus();
    setStatus("Informe o nome.", "erro");
    return;
  }
  setStatus("Salvando…");
  try {
    await setDoc(doc(db, "assinaturas", usuario.uid), { ...dadosForm(), atualizadoEm: serverTimestamp() });
    setStatus("Salvo ✓", "ok");
  } catch (e) {
    console.error(e);
    setStatus("Erro ao salvar: " + (e.code || e.message), "erro");
  }
});

async function copiar(html, comoTexto) {
  try {
    if (!comoTexto && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([$("preview").innerText], { type: "text/plain" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(html);
    }
    setStatus(comoTexto ? "HTML copiado ✓" : "Assinatura copiada ✓ — cole no Gmail", "ok");
  } catch {
    // Fallback: seleciona a pré-visualização para o usuário copiar manualmente
    const r = document.createRange();
    r.selectNodeContents($("preview"));
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    setStatus("Selecionado — pressione Ctrl+C para copiar.");
  }
}

$("btn-copiar").addEventListener("click", () => copiar(htmlAtual(), false));
$("btn-copiar-html").addEventListener("click", () => copiar(htmlAtual(), true));

$("btn-baixar").addEventListener("click", () => {
  const pagina = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Assinatura</title></head><body>${htmlAtual()}</body></html>`;
  const url = URL.createObjectURL(new Blob([pagina], { type: "text/html" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "assinatura.html" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
