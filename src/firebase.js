import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAsgCo7bbda_JNXQ2cSYaOi9-jvtF6vOgE",
  authDomain: "studio-7395892416-751c9.firebaseapp.com",
  projectId: "studio-7395892416-751c9",
  storageBucket: "studio-7395892416-751c9.firebasestorage.app",
  messagingSenderId: "84880366025",
  appId: "1:84880366025:web:8ea4e6d59abda36352b018",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "southamerica-east1");

export const DOMINIO = "educacao.mg.gov.br";

export function emailInstitucional(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@" + DOMINIO);
}
