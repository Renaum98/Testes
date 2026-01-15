// ============================================
// VARIÁVEIS GLOBAIS COMPARTILHADAS (ESTADO)
// ============================================
export const state = {
  rotaAtual: null,
  rotas: [],
  db: null,
  veiculoSelecionado: null,
};

// ============================================
// CONSTANTES DE NEGÓCIO
// ============================================
// ALTERE AQUI O PREÇO DA GASOLINA QUANDO PRECISAR
export const PRECO_GASOLINA_POR_LITRO = 6.35;

export const CONSUMO_VEICULOS = {
  moto_125: 40,
  moto_250: 30,
  carro_popular: 14,
  "carro_1.4": 12,
  "carro_1.8": 10,
  "carro_2.0": 8,
  caminhonete: 7,
  personalizado: null,
};
