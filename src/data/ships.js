export const shipsDatabase = {


  // === INIMIGOS TIPO II (2 Tripulantes / 12 Pontos) ===
  barracuda_enemy: { id: "barracuda_enemy", name: "Barracuda II", shipClass: "type_II", isEnemy: true, status: "desativada", currentHP: 50, maxHP: 50, totalPoints: 12, attributes: { weapons: 4, controls: 3, shields: 2, engines: 3 }, crew: { hasCopiloto: false, torretas: [{ id: "centro", label: "Torreta Central", capabilities: ["Tiro"] }] }, activeCrew: [] },
  mako_enemy: { id: "mako_enemy", name: "Mako II", shipClass: "type_II", isEnemy: true, status: "desativada", currentHP: 60, maxHP: 60, totalPoints: 12, attributes: { weapons: 5, controls: 2, shields: 1, engines: 4 }, crew: { hasCopiloto: false, torretas: [{ id: "centro", label: "Torreta Central", capabilities: ["Tiro"] }] }, activeCrew: [] },
  piranha_enemy: { id: "piranha_enemy", name: "Piranha II", shipClass: "type_II", isEnemy: true, status: "desativada", currentHP: 45, maxHP: 45, totalPoints: 12, attributes: { weapons: 6, controls: 1, shields: 0, engines: 5 }, crew: { hasCopiloto: false, torretas: [{ id: "centro", label: "Torreta Central", capabilities: ["Tiro"] }] }, activeCrew: [] },
  moray_enemy: { id: "moray_enemy", name: "Moray II", shipClass: "type_II", isEnemy: true, status: "desativada", currentHP: 70, maxHP: 70, totalPoints: 12, attributes: { weapons: 2, controls: 4, shields: 4, engines: 2 }, crew: { hasCopiloto: false, torretas: [{ id: "centro", label: "Torreta Central", capabilities: ["Tiro"] }] }, activeCrew: [] },
  lionfish_enemy: { id: "lionfish_enemy", name: "Lionfish II", shipClass: "type_II", isEnemy: true, status: "desativada", currentHP: 55, maxHP: 55, totalPoints: 12, attributes: { weapons: 3, controls: 4, shields: 2, engines: 3 }, crew: { hasCopiloto: false, torretas: [{ id: "centro", label: "Torreta Central", capabilities: ["Tiro"] }] }, activeCrew: [] },

  // === INIMIGOS TIPO III (5 Tripulantes / 14 Pontos) ===
  megalodon_enemy: { id: "megalodon_enemy", name: "Megalodon III", shipClass: "type_III", isEnemy: true, status: "desativada", currentHP: 120, maxHP: 120, totalPoints: 14, attributes: { weapons: 5, missiles: 3, controls: 2, shields: 2, engines: 2 }, crew: { hasCopiloto: true, torretas: [{ id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] }, { id: "centro", label: "Torreta Centro", capabilities: ["Tiro", "Míssil"] }, { id: "direita", label: "Torreta Direita", capabilities: ["Tiro"] }] }, activeCrew: [] },
  kraken_enemy: { id: "kraken_enemy", name: "Kraken III", shipClass: "type_III", isEnemy: true, status: "desativada", currentHP: 90, maxHP: 90, totalPoints: 14, attributes: { weapons: 3, missiles: 4, controls: 4, shields: 1, engines: 2 }, crew: { hasCopiloto: true, torretas: [{ id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] }, { id: "centro", label: "Torreta Centro", capabilities: ["Tiro", "Míssil"] }, { id: "direita", label: "Torreta Direita", capabilities: ["Tiro"] }] }, activeCrew: [] },
  leviathan_enemy: { id: "leviathan_enemy", name: "Leviathan III", shipClass: "type_III", isEnemy: true, status: "desativada", currentHP: 150, maxHP: 150, totalPoints: 14, attributes: { weapons: 2, missiles: 2, controls: 2, shields: 6, engines: 2 }, crew: { hasCopiloto: true, torretas: [{ id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] }, { id: "centro", label: "Torreta Centro", capabilities: ["Tiro", "Míssil"] }, { id: "direita", label: "Torreta Direita", capabilities: ["Tiro"] }] }, activeCrew: [] },
  sturgeon_enemy: { id: "sturgeon_enemy", name: "Sturgeon III", shipClass: "type_III", isEnemy: true, status: "desativada", currentHP: 85, maxHP: 85, totalPoints: 14, attributes: { weapons: 4, missiles: 2, controls: 3, shields: 3, engines: 2 }, crew: { hasCopiloto: true, torretas: [{ id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] }, { id: "centro", label: "Torreta Centro", capabilities: ["Tiro", "Míssil"] }, { id: "direita", label: "Torreta Direita", capabilities: ["Tiro"] }] }, activeCrew: [] },
  arapaima_enemy: { id: "arapaima_enemy", name: "Arapaima III", shipClass: "type_III", isEnemy: true, status: "desativada", currentHP: 80, maxHP: 80, totalPoints: 14, attributes: { weapons: 3, missiles: 3, controls: 3, shields: 2, engines: 3 }, crew: { hasCopiloto: true, torretas: [{ id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] }, { id: "centro", label: "Torreta Centro", capabilities: ["Tiro", "Míssil"] }, { id: "direita", label: "Torreta Direita", capabilities: ["Tiro"] }] }, activeCrew: [] },

  hawthorne_iii: {
    id: "hawthorne_iii",
    name: "Hawthorne III",
    shipClass: "type_III",
    currentHP: 60,
    maxHP: 80,
    totalPoints: 14,
    attributes: {
      weapons: 3,
      missiles: 3,
      controls: 3,
      shields: 3,
      engines: 2
    },
    // Configuração de tripulação desta nave
    crew: {
      // copiloto é uma vaga separada das torretas
      hasCopiloto: true,
      torretas: [
        { id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] },
        { id: "centro",   label: "Torreta Centro",   capabilities: ["Tiro", "Míssil"] },
        { id: "direita",  label: "Torreta Direita",  capabilities: ["Tiro"] },
      ]
    }
  },

  vanguard_ii: {
    id: "vanguard_ii",
    name: "Vanguard II",
    shipClass: "type_II",
    currentHP: 60,
    maxHP: 60,
    totalPoints: 12,
    attributes: {
      weapons: 0,
      controls: 0,
      shields: 0,
      engines: 0
    },
    // Vanguard: copiloto É o operador da torreta central (sem míssil)
    crew: {
      hasCopiloto: false,
      torretas: [
        { id: "centro", label: "Torreta Central", capabilities: ["Tiro"] },
      ]
    }
  },

  fusca_ii: {
    id: "fusca_ii",
    name: "Fusca 2.0",
    shipClass: "type_II",
    currentHP: 50,
    maxHP: 70,
    totalPoints: 14,
    attributes: {
      weapons: 0,
      controls: 0,
      shields: 0,
      engines: 0
    },
    crew: {
      hasCopiloto: false,
      torretas: [
        { id: "centro", label: "Torreta Central", capabilities: ["Tiro"] },
      ]
    }
  }


  
};

export const shipsList = [
  { id: "hawthorne_iii", label: "MS Hawthorne III" },
  { id: "vanguard_ii",   label: "Vanguard II" },
  { id: "fusca_ii",      label: "Fusca 2.0" }
];