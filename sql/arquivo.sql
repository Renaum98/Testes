CREATE TABLE clientes(
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT
);
INSERT INTO clientes(id,nome, email) 
VALUES(10,'João','jojo@hotmail.com')