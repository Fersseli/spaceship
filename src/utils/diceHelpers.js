// src/utils/diceHelpers.js

const rollDie = (faces) => {
  return Math.floor(Math.random() * faces) + 1;
  // return 1;
};


/**
 * Interpretador de dano atualizado com Crítico e suporte para Extremo.
 */
export const rollDamage = (effectStr, isExtremo = false) => {
  if (!effectStr || effectStr.includes("%") || effectStr.includes("VM")) {
    return { total: 0, maxDamage: 0, isCritico: false, breakdown: "sem dano" };
  }

  const str = effectStr.trim();
  const diceRegex = /(\d*)d(\d+)([+-]\d+)?/gi;
  let match;
  let total = 0;
  let maxPossible = 0;
  let found = false;
  let breakdownParts = [];

  while ((match = diceRegex.exec(str)) !== null) {
    found = true;
    const count = parseInt(match[1] || "1");
    const faces = parseInt(match[2]);
    const bonus = parseInt(match[3] || "0");

    const currentMax = (count * faces) + bonus;
    maxPossible += currentMax;

    if (isExtremo) {
      total += currentMax;
      breakdownParts.push(`[MAX:${currentMax}]`);
    } else {
      const rolls = Array.from({ length: count }, () => rollDie(faces));
      const rollSum = rolls.reduce((a, b) => a + b, 0) + bonus;
      total += rollSum;
      breakdownParts.push(`[${rolls.join("+")}]${bonus !== 0 ? (bonus > 0 ? `+${bonus}` : bonus) : ""}`);
    }
  }

  if (!found) {
    const num = parseInt(str);
    const val = isNaN(num) ? 0 : num;
    return { total: val, maxDamage: val, isCritico: false, breakdown: `${val}` };
  }

  // Regra: Crítico se dano >= 80% do máximo (e não for extremo)
  const isCritico = !isExtremo && total >= (maxPossible * 0.8);

  return { 
    total, 
    maxDamage: maxPossible, 
    isCritico: isCritico || isExtremo, 
    breakdown: breakdownParts.join(" ") 
  };
};

export const parseShield = (shieldStr) => {
  if (!shieldStr) return 0;
  const str = shieldStr.trim();
  const noOp = ["Sem Bonus", "Sem Bônus", "N/D", "—", "-"];
  if (noOp.some((s) => str.toLowerCase().includes(s.toLowerCase()))) return 0;
  const num = parseInt(str);
  return isNaN(num) ? 0 : num;
};

export const rollHit = (precisao) => {
  const rolou = rollDie(100);
  const extremo = Math.floor(precisao / 5);
  return { 
    acertou: rolou <= precisao, 
    isExtremo: rolou <= extremo,
    rolou 
  };
};