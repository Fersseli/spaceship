// Função auxiliar para obter o efeito de um atributo baseado no seu nível
import { effectTables } from "../data/effectTables";

/**
 * Retorna o efeito correspondente ao tipo de atributo e nível
 * @param {string} type - Tipo do atributo (weapons, missiles, controls, shields, engines)
 * @param {number} level - Nível do atributo (0-6)
 * @returns {string} - Descrição do efeito
 * 
 * Exemplo: getEffect("weapons", 4) retorna "2d8+3"
 */
export const getEffect = (type, level) => {
  // Valida se o tipo de atributo existe
  if (!effectTables[type]) {
    return "Unknown";
  }

  // Retorna o efeito ou "No Bonus" se nível é 0
  return effectTables[type][level] || "No Bonus";
};

/**
 * Calcula os pontos disponíveis para distribuição
 * @param {object} attributes - Objeto com os valores dos atributos
 * @param {number} totalPoints - Total de pontos disponíveis (geralmente 14)
 * @returns {number} - Quantidade de pontos não utilizados
 */
export const calculateRemainingPoints = (attributes, totalPoints) => {
  // Soma todos os valores dos atributos
  const usedPoints = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  
  // Retorna a diferença entre total e usado
  return totalPoints - usedPoints;
};