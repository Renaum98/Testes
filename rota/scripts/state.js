// ============================================
// VARIÁVEIS GLOBAIS COMPARTILHADAS (ESTADO)
// ============================================
export const state = {
  rotaAtual: null,
  rotas: [],
  db: null,
  veiculoSelecionado: null
};

// ============================================
// CONSTANTES DE NEGÓCIO
// ============================================
export const PRECO_GASOLINA_POR_LITRO = 6.35;

export const CONSUMO_VEICULOS = {
  // Motos
  moto_125: 40, // 40 km/L
  moto_250: 30, // 30 km/L

  // Carros
  carro_popular: 14, // 1.0 flex
  "carro_1.4": 12, // 1.4 flex
  "carro_1.8": 10, // 1.6-1.8
  "carro_2.0": 8, // 2.0+

  // Outros
  caminhonete: 7, // S10, Ranger, etc.
  personalizado: null, // Será definido pelo usuário
};