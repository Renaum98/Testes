// ===========================================================
// 🚀 CONFIGURAÇÃO DO FIREBASE (compartilhada entre as páginas)
// ===========================================================

// Importa a função para inicializar o aplicativo Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Importa funções específicas do Firestore (banco de dados em nuvem do Firebase)
import {
  getFirestore,   // inicializa e conecta ao Firestore
  collection,     // acessa uma coleção dentro do banco
  addDoc,         // adiciona um novo documento a uma coleção
  deleteDoc,      // exclui um documento específico
  doc,            // acessa um documento específico (por ID)
  updateDoc,      // atualiza campos de um documento
  onSnapshot,     // cria um "listener" em tempo real (escuta alterações no banco)
  query,          // permite criar consultas personalizadas
  orderBy,        // ordena os resultados de uma consulta
  serverTimestamp // gera automaticamente a data e hora do servidor
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ===========================================================
// 🔧 CONFIGURAÇÕES DE CONEXÃO COM O FIREBASE
// ===========================================================

// Objeto com as credenciais e identificadores do projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyATcKzRQ5IzxRXAGhUvySWLQvsT-858r4g",        // chave pública da API do Firebase
  authDomain: "filmes-cb4a9.firebaseapp.com",                // domínio de autenticação do projeto
  projectId: "filmes-cb4a9",                                 // ID único do projeto no Firebase
  storageBucket: "filmes-cb4a9.firebasestorage.app",         // URL do bucket de armazenamento (para arquivos/imagens)
  messagingSenderId: "867531338215",                         // identificador do serviço de mensagens (usado em notificações)
  appId: "1:867531338215:web:8cebf9649b83651c6ecd42"         // identificador único da aplicação web
};

// ===========================================================
// 🔥 INICIALIZAÇÃO DO FIREBASE E DO FIRESTORE
// ===========================================================

// Inicializa o app Firebase usando as configurações acima
const app = initializeApp(firebaseConfig);

// Cria uma instância do banco de dados Firestore associada ao app
const db = getFirestore(app);

// ===========================================================
// 📦 EXPORTAÇÃO DOS MÓDULOS
// ===========================================================

// Exporta o banco (db) e as funções do Firestore para que
// possam ser usadas em outros arquivos JavaScript do projeto
export {
  db,              // referência ao banco de dados Firestore
  collection,      // função para acessar coleções
  addDoc,          // função para adicionar documentos
  deleteDoc,       // função para excluir documentos
  doc,             // função para acessar documento específico
  updateDoc,       // função para atualizar campos
  onSnapshot,      // listener em tempo real
  query,           // criação de consultas
  orderBy,         // ordenação de resultados
  serverTimestamp  // data/hora automática do servidor
};
