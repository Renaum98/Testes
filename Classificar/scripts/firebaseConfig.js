// ===========================================================
// 🚀 CONFIGURAÇÃO DO FIREBASE (compartilhada entre as páginas)
// ===========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyATcKzRQ5IzxRXAGhUvySWLQvsT-858r4g",
  authDomain: "filmes-cb4a9.firebaseapp.com",
  projectId: "filmes-cb4a9",
  storageBucket: "filmes-cb4a9.firebasestorage.app",
  messagingSenderId: "867531338215",
  appId: "1:867531338215:web:8cebf9649b83651c6ecd42"
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp };
