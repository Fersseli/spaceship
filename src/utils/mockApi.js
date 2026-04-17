import { shipsDatabase } from '../data/ships';

// Esta é a chave "mestra" onde guardaremos todas as naves no navegador
const DB_KEY = "heavens_door_ships_db";

/**
 * INICIALIZAÇÃO: Verifica se o banco de dados já existe.
 * Se não existir, copia os dados originais do arquivo estático (shipsDatabase).
 */
export const initDB = () => {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(shipsDatabase));
  }
};

/**
 * Retorna TODAS as naves do sistema (Ideal para o painel do Admin)
 */
export const getAllShips = () => {
  initDB();
  return JSON.parse(localStorage.getItem(DB_KEY));
};

/**
 * Retorna os dados de UMA nave específica (Ideal para o Dashboard)
 */
export const getShipData = (shipId) => {
  const ships = getAllShips();
  return ships[shipId];
};

/**
 * Piloto salva apenas os atributos de energia da nave atual
 */
export const updateShipAttributes = (shipId, newAttributes) => {
  const ships = getAllShips();
  if (ships[shipId]) {
    ships[shipId].attributes = newAttributes;
    // Salva o objeto inteiro atualizado no banco
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
  }
};

/**
 * Admin salva configurações profundas da nave (HP, Total de Pontos, etc.)
 */
export const updateShipConfig = (shipId, newData) => {
  const ships = getAllShips();
  if (ships[shipId]) {
    ships[shipId] = { ...ships[shipId], ...newData };
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
  }
};