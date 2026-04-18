// Tabelas de efeitos para cada atributo baseado no nível
// Cada nível afeta o valor de bonificação da nave
export const classEffectTables = {
  "type_III": {
    name: "Classe III",
    weapons: {
      0: "Sem Bonus",
      1: "1d8",
      2: "1d8+3",
      3: "2d8",
      4: "2d8+3",
      5: "2d9+3",
      6: "2d10+6"
    },
    missiles: {
      0: "Sem Bonus",
      1: "1d6+1",
      2: "2d6",
      3: "5d6",
      4: "6d6",
      5: "7d6",
      6: "8d6"
    },
    controls: {
      0: "-25%",
      1: "-20%",
      2: "-10%",
      3: "0%",
      4: "+5%",
      5: "+15%",
      6: "+25%"
    },
    shields: {
      0: "Sem Bônus",
      1: "6",
      2: "10",
      3: "13",
      4: "15",
      5: "17",
      6: "19"
    },
    engines: {
      0: "Sem Bonus",
      1: "3x e VM7",
      2: "3x e VM10",
      3: "4x e VM12",
      4: "4x e VM14",
      5: "5x e VM17",
      6: "6x e VM21"
    }
  },

  "type_II": {
    name: "Classe II",
    weapons: {
      0: "Sem Bonus",
      1: "1d10",
      2: "1d10+3",
      3: "2d8+2",
      4: "2d8+4",
      5: "2d9+3",
      6: "2d10+6"
    },
    missiles: false,
    controls: {
      0: "-25%",
      1: "-20%",
      2: "-10%",
      3: "0%",
      4: "+5%",
      5: "+15%",
      6: "+25%"
    },
    shields: {
      0: "Sem Bônus",
      1: "3",
      2: "4",
      3: "6",
      4: "8",
      5: "10",
      6: "13"
    },
    engines: {
      0: "Sem Bonus",
      1: "4x e VM8",
      2: "6x e VM14",
      3: "9x e VM18",
      4: "10x e VM20",
      5: "11x e VM22",
      6: "12x e VM24"
    }
  }
};

// Retorna o efeito correto baseado na classe da nave, atributo e nível
export const getEffect = (shipClass, attributeName, value) => {
  const classData = classEffectTables[shipClass];

  // Classe não encontrada
  if (!classData) return "N/D";

  const table = classData[attributeName];

  // false = nave não possui este sistema (ex: type_II sem mísseis)
  if (table === false) return "—";

  // Atributo desconhecido para esta classe
  if (!table) return "N/D";

  // Busca o valor na tabela; null coalescing para não confundir "0%" com falsy
  return table[value] ?? "MÁXIMO";
};