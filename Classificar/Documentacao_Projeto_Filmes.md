
# 📘 Documentação do Projeto: Filmes Firebase

## Introdução
Este projeto é uma aplicação web simples que permite que usuários adicionem, visualizem e avaliem filmes.
Os dados são armazenados em tempo real no banco de dados em nuvem **Firestore (Firebase)**, permitindo que várias pessoas visualizem e interajam simultaneamente.

---

## 🧩 Estrutura Geral
O projeto é composto por três partes principais:

1. **HTML** — Responsável pela interface do usuário (formulário e exibição dos filmes).  
2. **JavaScript** — Gerencia os eventos do formulário, exibição dos filmes e integração com o Firebase.  
3. **Firebase Firestore** — Banco de dados em nuvem onde os filmes e avaliações são armazenados.

---

## 🔧 Configuração do Firebase

```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
```

---

## ⚙️ Fluxo de Funcionamento

1. O usuário escolhe seu nome, insere o nome do filme, o serviço onde ele está disponível e o gênero.  
2. Ao clicar em **Enviar**, o JavaScript salva os dados no Firestore.  
3. O site automaticamente lê todos os filmes do banco e os exibe na tela.  
4. Cada filme possui dois botões:  
   - 🗑️ **Excluir**: remove o filme do Firestore.  
   - ⭐ **Assisti**: abre um modal onde o usuário escolhe seu nome e dá uma nota de 0 a 5.  
5. A média de avaliações é calculada dinamicamente e mostrada abaixo do filme, junto com o avatar dos avaliadores.  

---

## 🌟 Funcionalidades Principais

- Adicionar filmes com informações personalizadas.  
- Salvar e recuperar dados do Firestore.  
- Exibir todos os filmes em cards.  
- Excluir filmes individualmente.  
- Avaliar filmes com notas de 0 a 5.  
- Mostrar a média de avaliações e os perfis dos avaliadores.  
- Exibir o mais novo filme no topo da lista.  

---

## 🚀 Melhorias Futuras

- Implementar autenticação (para cada usuário ter seu perfil real do Firebase).  
- Adicionar sistema de comentários.  
- Criar ranking de “Top 10 Filmes” baseado nas avaliações.  
- Permitir upload de imagem personalizada do filme.  
