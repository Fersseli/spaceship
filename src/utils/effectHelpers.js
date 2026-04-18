// Função auxiliar para obter o efeito de um atributo baseado no seu nível
import { getEffect as getEffectFromTable } from "../data/effectTables";

/*
 * Retorna o efeito correspondente ao tipo de atributo e nível,
 * considerando a classe da nave.
 * @param {string} shipClass - Classe da nave (type_II, type_III)
 * @param {string} type - Tipo do atributo (weapons, missiles, controls, shields, engines)
 * @param {number} level - Nível do atributo (0-6)
 * @returns {string} - Descrição do efeito
 *
 * Exemplo: getEffect("type_III", "weapons", 4) retorna "2d8+3"
 */
export const getEffect = (shipClass, type, level) => {
  return getEffectFromTable(shipClass, type, level);
};

/*
 * Calcula os pontos disponíveis para distribuição
 * @param {object} attributes - Objeto com os valores dos atributos
 * @param {number} totalPoints - Total de pontos disponíveis (geralmente 14)
 * @returns {number} - Quantidade de pontos não utilizados
 */
export const calculateRemainingPoints = (attributes, totalPoints) => {
  const usedPoints = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  return totalPoints - usedPoints;
};