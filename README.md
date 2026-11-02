# Assinatura de E-mail · Governo de Minas Gerais (SEE/MG)

Gerador de assinatura de e-mail institucional em imagem (JPEG). Qualquer servidor com conta
**@educacao.mg.gov.br** entra com o Google, preenche seus dados, vê a imagem sendo montada
em tempo real e baixa a assinatura pronta.

O modelo segue a planilha `PlanilhaGGOV.xlsx`: a arte de fundo é
[public/assinatura-base.png](public/assinatura-base.png) (840 × 350 px) e os textos são
desenhados por cima em [src/assinatura.js](src/assinatura.js), com as mesmas regras das
fórmulas da aba "Imagem base" (órgão/secretaria em maiúsculas, "fixo / celular").

**Stack:** Vite + JavaScript, Firebase Authentication (Google), Cloud Firestore, Firebase Hosting.

## Restrição de acesso ao domínio

A restrição é aplicada em duas camadas:

1. **No app** ([src/main.js](src/main.js)): o login do Google usa `hd=educacao.mg.gov.br`
   e qualquer conta fora do domínio é desconectada na hora.
2. **No Firestore** ([firestore.rules](firestore.rules)): só leem/gravam usuários com
   `email_verified` e e-mail terminado em `@educacao.mg.gov.br`, e cada um só acessa
   o próprio documento `assinaturas/{uid}`.

## Configuração no Console do Firebase (uma vez)

1. **Authentication → Sign-in method → Google → Ativar.**
2. **Authentication → Settings → Authorized domains:** confira se `assinatura.educacaoensa.com`, `assinatura-ensa.web.app`, `studio-7395892416-751c9.web.app`
   e `localhost` estão na lista (adicione seu domínio próprio, se usar).
3. **Firestore Database → Criar banco de dados** (modo produção, região `southamerica-east1`).

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase login
npm run deploy                  # build + deploy de Hosting e regras do Firestore
```

Endereços:
- https://assinatura.educacaoensa.com (site `assinatura-ensa`)
- https://studio-7395892416-751c9.web.app
