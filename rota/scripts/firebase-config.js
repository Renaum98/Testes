// firebase-config.js - VERSÃO CORRIGIDA
const firebaseConfig = {
  apiKey: "AIzaSyBFkjsaD4sp0Wx2Vb5HrISDa2_-UrOfQ_E",
  authDomain: "rotas-ac730.firebaseapp.com",
  projectId: "rotas-ac730",
  storageBucket: "rotas-ac730.firebasestorage.app",
  messagingSenderId: "608855484396",
  appId: "1:608855484396:web:e76211a08e327be05842c9"
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);

// Criar instância do Firestore SEM declarar como const global
const firestoreInstance = firebase.firestore();

// Configurar (remova as settings se estiver causando o warning)
// firestoreInstance.settings({
//   ignoreUndefinedProperties: true
// });

// Exportar para uso global
window.firebaseDb = {
  rotas: firestoreInstance.collection('rotas'),
  rotaAtual: firestoreInstance.collection('sistema').doc('rotaAtual'),
  db: firestoreInstance  // Exportar a instância
};