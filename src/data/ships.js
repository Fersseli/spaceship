// Definição dos dados das naves disponíveis no sistema
export const shipsDatabase = {
  hawthorne_iii: {
    id: "hawthorne_iii",
    name: "Hawthorne III",
    currentHP: 60,
    maxHP: 80,
    totalPoints: 14,
    attributes: {
      weapons: 3,
      missiles: 3,
      controls: 3,
      shields: 3,
      engines: 2
    }
  },
  valkyrie_nova: {
    id: "valkyrie_nova",
    name: "Valkyrie Nova",
    currentHP: 75,
    maxHP: 100,
    totalPoints: 14,
    attributes: {
      weapons: 2,
      missiles: 4,
      controls: 2,
      shields: 4,
      engines: 2
    }
  },
  orion_vx: {
    id: "orion_vx",
    name: "Orion VX",
    currentHP: 50,
    maxHP: 70,
    totalPoints: 14,
    attributes: {
      weapons: 4,
      missiles: 2,
      controls: 4,
      shields: 2,
      engines: 2
    }
  }
};

// Lista de naves disponíveis para seleção
export const shipsList = [
  { id: "hawthorne_iii", label: "Hawthorne III" },
  { id: "valkyrie_nova", label: "Valkyrie Nova" },
  { id: "orion_vx", label: "Orion VX" }
];