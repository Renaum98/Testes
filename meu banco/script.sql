CREATE TABLE alunos(
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    idade INTEGER,
    curso TEXT
);
INSERT INTO alunos(id, nome, idade, curso) VALUES (3,'Ana', 23,'ADM')

SELECT * FROM alunos;