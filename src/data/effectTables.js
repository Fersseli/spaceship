// Tabelas de efeitos para cada atributo baseado no nível
// Cada nível afeta o valor de bonificação da nave
export const effectTables = {
  // Tabela de armas: determinam o dano causado
  weapons: {
    0: "No Bonus",
    1: "1d8",
    2: "1d8+3",
    3: "2d8",
    4: "2d8+3",
    5: "2d9+3",
    6: "2d10+6"
  },

  // Tabela de mísseis: determinam o dano de área
  missiles: {
    0: "No Bonus",
    1: "1d6+1",
    2: "2d6",
    3: "5d6",
    4: "6d6",
    5: "7d6",
    6: "8d6"
  },

  // Tabela de controles: modificam precisão e manobra
  controls: {
    0: "No Bonus",
    1: "-25%",
    2: "-10%",
    3: "0%",
    4: "+5%",
    5: "+15%",
    6: "+25%"
  },

  // Tabela de escudos: determinam proteção
  shields: {
    0: "No Bonus",
    1: "6",
    2: "10",
    3: "13",
    4: "15",
    5: "17",
    6: "19"
  },

  // Tabela de motores: determinam velocidade e versão do motor
  engines: {
    0: "No Bonus",
    1: "3x and VM7",
    2: "3x and VM10",
    3: "4x and VM12",
    4: "4x and VM14",
    5: "5x and VM17",
    6: "6x and VM21"
  }
};