// src/utils/mockApi.js
import { shipsDatabase } from '../data/ships';
import { rollDamage, parseShield } from "./diceHelpers";
import { getEffect } from "./effectHelpers"; // ou effectHelper

const DB_KEY         = "heavens_door_ships_db";
const DB_VERSION     = 8;
const DB_VERSION_KEY = "heavens_door_ships_db_version";

export const removePlayerFromAllCrews = (playerId) => {
  const CREW_PREFIX = "crew_assignments_";
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CREW_PREFIX)) {
      try {
        const assignments = JSON.parse(localStorage.getItem(key));
        let changed = false;
        if (assignments.copiloto === playerId) {
          assignments.copiloto = null;
          changed = true;
        }
        if (assignments.torretas) {
          Object.keys(assignments.torretas).forEach(tId => {
            if (assignments.torretas[tId] === playerId) {
              delete assignments.torretas[tId];
              changed = true;
            }
          });
        }
        if (changed) localStorage.setItem(key, JSON.stringify(assignments));
      } catch (e) {
        console.error("Erro ao limpar tripulação na chave:", key, e);
      }
    }
  });
};

export const initDB = () => {
  const savedVersion = parseInt(localStorage.getItem(DB_VERSION_KEY) || "0");
  if (!localStorage.getItem(DB_KEY) || savedVersion < DB_VERSION) {
    localStorage.setItem(DB_KEY, JSON.stringify(shipsDatabase));
    localStorage.setItem(DB_VERSION_KEY, String(DB_VERSION));
  }
};

export const getAllShips = () => {
  initDB();
  return JSON.parse(localStorage.getItem(DB_KEY));
};

  // No src/utils/mockApi.js, adicione esta lógica para inicializar a tripulação se ela não existir
export const getShipData = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];

  // Se for uma nave de jogador e não tiver activeCrew, criamos um baseado na config de torretas
  if (ship && !ship.isEnemy && (!ship.activeCrew || ship.activeCrew.length === 0)) {
    ship.activeCrew = ship.crew.torretas.map(t => ({
      id: t.id, // ex: 'esquerda'
      role: 'tripulante',
      function: `TORRETA ${t.id.toUpperCase()}`,
      moduleStatus: 'operacional',
      turnosParaReparo: 0
    }));
    // Salva a inicialização
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }
  return ship;
};

export const getCrewByShip = (shipId) => {
  const keys = Object.keys(localStorage);
  return keys
    .filter(k => k.startsWith("ship_") && localStorage.getItem(k) === shipId)
    .map(k => k.replace("ship_", ""));
};

export const updateShipAttributes = (shipId, newAttributes) => {
  const ships = getAllShips();
  if (ships[shipId]) {
    ships[shipId].attributes = newAttributes;
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
  }
};

export const updateShipConfig = (shipId, newData) => {
  const ships = getAllShips();
  if (ships[shipId]) {
    ships[shipId] = { ...ships[shipId], ...newData };
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
  }
};
export const clearDestroyedEnemies = () => {
  const ships = getAllShips();
  let changed = false;
  Object.values(ships).forEach(s => {
    if (s.isEnemy && s.status === "destruida") {
      s.status = "desativada";
      s.activeCrew = [];
      changed = true;
    }
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

// --- ADICIONE ESTA NOVA FUNÇÃO AQUI ---
export const deactivateAllEnemies = () => {
  const ships = getAllShips();
  let changed = false;
  Object.values(ships).forEach(s => {
    // Pega em todas as naves inimigas que não estejam já desativadas (inclui as ativas e as destruídas)
    if (s.isEnemy && s.status !== "desativada") {
      s.status = "desativada";
      s.activeCrew = []; // Esvazia a tripulação
      changed = true;
    }
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
};


export const enemyNamesPool = [...new Set([
  "Solo", "Calrissian", "Maverick", "Goose", "Senna", "Verstappo", "Alonso", "Cruise", "Torreto", "Pitt", "Fujiwara", "McQueen", "Gosling", "Drive", "Sega", "Skywalker", "Ligthyear", "Nemo", "Kaneda", "Tetsuo", "West", "O'conner", "Grace", "Mountain", "Hudson", "Dusty", "Quill", "Jones", "Reeve", "Stilgar", "Dameron", "Deckard", "Flint", "Ayanami", "Ikari", "Asuka", "Boss", "Snake", "Chief", "Hamiltton", "Kojima", "Walker", "Idaho", "Atreides", "Scytale", "Leto", "Harah", "Kenobi", "Hutt", "Alves", "Welles", "Ashura", "Mahat", "Zepelli", "Joestar", "Akbar", "Shitto", "Hirose", "Madera", "Edge", "Iceman", "Caveman", "Murderkill", "Harkonnen", "Feyd-Rautha", "Rabban", "Corrino", "Liet-Kynes", "Sardaukar", "Shadout", "Assad", "Bashar", "Gesserit", "Nate", "Megaton", "Chance", "Tano", "Destroyer", "Momoa", "Armas", "Rossi", "Telles", "Cody", "Moff", "Fett", "Tarantino", "Kubrick", "Windu", "Amidala", "Antilles", "Rorschach", "Mata", "Maniac", "Russo", "Mohammed", "Abdul", "Kakyoin", "Matte", "Croft", "Hannibal", "Krueger", "Xenomorph", "Samara", "Khan", "Harvey", "Fring", "Black", "Montana", "Punisher", "Terminator", "Ted", "Wayne", "Berkowitz", "Brudos", "Doe", "Rapid", "Strangler", "DeAngelo", "Nightstalker", "Zedong", "Saddam", "Franco", "Maduro", "Mugabe", "Barack", "Capone", "Haunter", "Mirror", "Raven", "Mortis", "Graves", "Banshee", "Voss", "Wraith"
])];

const rndPrecisao = () => Math.floor(Math.random() * (70 - 30 + 1)) + 30;

export const setEnemyShipStatus = (shipId, newStatus) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship || !ship.isEnemy) return;

  if (newStatus === "ativa" && ship.status !== "ativa") {
    const usedNames = [];
    Object.values(ships).forEach(s => {
      if (s.isEnemy && (s.status === "ativa" || s.status === "destruida") && s.activeCrew) {
        s.activeCrew.forEach(c => usedNames.push(c.id.toUpperCase()));
      }
    });

    const availableNames = enemyNamesPool.filter(n => !usedNames.includes(n.toUpperCase()));
    availableNames.sort(() => Math.random() - 0.5);
    const crewSize = ship.shipClass === "type_III" ? 5 : 2;
    const chosen = availableNames.slice(0, crewSize);

    const newCrew = [];
    const rndDes = () => Math.floor(Math.random() * (17 - 8 + 1)) + 8;
    const rndEsq = () => Math.floor(Math.random() * (75 - 35 + 1)) + 35;
    
    if (ship.shipClass === "type_II") {
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto", function: "PILOTO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto", function: "COPILOTO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
    } else {
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto", function: "PILOTO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto", function: "COPILOTO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[2]) newCrew.push({ id: chosen[2].toUpperCase(), role: "tripulante", function: "TORRETA ESQUERDA", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[3]) newCrew.push({ id: chosen[3].toUpperCase(), role: "tripulante", function: "TORRETA CENTRO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[4]) newCrew.push({ id: chosen[4].toUpperCase(), role: "tripulante", function: "TORRETA DIREITA", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
    }
    ship.activeCrew = newCrew;
  }

  if (newStatus === "desativada") {
    ship.activeCrew = [];
  }

  ship.status = newStatus;
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

/**
 * Aplica degradação de status a um módulo (tripulante)
 */
export const applyModuleDamage = (shipId, memberId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship || !ship.activeCrew) return "Alvo não encontrado";

  const member = ship.activeCrew.find(m => m.id === memberId);
  if (!member) return "Módulo não encontrado";

  let statusMsg = "";
  if (member.moduleStatus === 'operacional') {
    member.moduleStatus = 'avariada';
    member.turnosParaReparo = 2;
    statusMsg = `${member.id} AVARIADA! (2 turnos)`;
  } else if (member.moduleStatus === 'avariada') {
    member.moduleStatus = 'destruida';
    member.turnosParaReparo = 0;
    statusMsg = `${member.id} DESTRUÍDA PERMANENTEMENTE!`;
  } else {
    return "Módulo já está destruído";
  }
  
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return statusMsg;
};

/**
 * Processa a recuperação de módulos avariados globalmente
 */
export const processGlobalTurn = () => {
  const ships = getAllShips();
  let relatorio = [];

  Object.values(ships).forEach(ship => {
    if (ship.activeCrew) {
      ship.activeCrew.forEach(member => {
        if (member.moduleStatus === 'avariada' && member.turnosParaReparo > 0) {
          member.turnosParaReparo -= 1;
          if (member.turnosParaReparo === 0) {
            member.moduleStatus = 'operacional';
            relatorio.push(`${ship.name}: ${member.id} reparada!`);
          }
        }
      });
    }
  });

  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return relatorio;
};

export const processPlayerAttack = (attackerShipId, targetShipId, inputDamage, isExtremo, weaponEffect) => {
  const ships = getAllShips();
  const attacker = ships[attackerShipId];
  const target = ships[targetShipId];
  
  if (!attacker || !target) return;

  // 1. Calcular Dano Máximo e Crítico
  const { maxDamage } = rollDamage(weaponEffect, true);
  const finalRawDamage = isExtremo ? maxDamage : parseInt(inputDamage || 0);
  const isCritico = !isExtremo && finalRawDamage >= (maxDamage * 0.8);

  // 2. Resolução de Escudos
  const targetShieldLevel = target.attributes?.shields ?? 0;
  const shieldEffect = getEffect(target.shipClass, "shields", targetShieldLevel);
  const shieldValue = parseShield(shieldEffect);
  const finalDamage = Math.max(0, finalRawDamage - shieldValue);

  // 3. Aplicar Dano
  target.currentHP = Math.max(0, (target.currentHP ?? target.maxHP) - finalDamage);

  // 4. Avaria de Módulo (Crítico/Extremo)
  // 4. Avaria de Módulo (Crítico/Extremo)
  let moduleLog = "";
  // Só causa avaria se o dano ultrapassou o escudo (finalDamage > 0)
  if ((isCritico || isExtremo) && finalDamage > 0 && target.activeCrew?.length > 0) { // Filtra Torretas. Se for Classe II, o Copiloto também é um alvo válido
    const alvosAvariaveis = target.activeCrew.filter(m => {
      if (!m.function) return false;
      if (m.function.includes("TORRETA")) return true;
      if (target.shipClass === "type_II" && m.function.includes("COPILOTO")) return true;
      return false;
    });
    
    // Só aplica avaria se existir algum alvo válido na nave
    if (alvosAvariaveis.length > 0) {
      const randomIdx = Math.floor(Math.random() * alvosAvariaveis.length);
      const targetModule = alvosAvariaveis[randomIdx];

      if (targetModule.moduleStatus === 'operacional') {
        targetModule.moduleStatus = 'avariada';
        targetModule.turnosParaReparo = 2;
        moduleLog = ` [AVARIA: ${targetModule.function}]`;
      } else if (targetModule.moduleStatus === 'avariada') {
        targetModule.moduleStatus = 'destruida';
        targetModule.turnosParaReparo = 0;
        moduleLog = ` [MÓDULO DESTRUÍDO: ${targetModule.function}]`;
      }
    }
  }

  // 4. Avaria de Módulo (Crítico/Extremo)
   if (target.currentHP <= 0 && target.status !== "destruida" && target.isEnemy) {
    setTimeout(() => {
      const currentShips = JSON.parse(localStorage.getItem("heavens_door_ships_db") || "{}");
      if (currentShips[targetShipId] && currentShips[targetShipId].currentHP <= 0) {
        currentShips[targetShipId].status = "destruida";
        currentShips[targetShipId].activeCrew = [];
        
        // Converte o novo banco para texto
        const dbString = JSON.stringify(currentShips);
        localStorage.setItem("heavens_door_ships_db", dbString);
        
        // CORREÇÃO: Força a própria aba do jogador a "ouvir" essa alteração
        // Isso fará com que o ShipDashboard atualize a lista na hora!
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'heavens_door_ships_db',
          newValue: dbString
        }));
      }
    }, 4000); 
  }
  localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));

  // 5. Integração com o Log Nativo do Header (Usando o Novo Padrão)
  const tags = [];
  if (isExtremo) tags.push("[🔥 ACERTO EXTREMO!]");
  else if (isCritico) tags.push("[✨ CRÍTICO!]");
  if (moduleLog) tags.push(moduleLog);

  const logText = [
    `${attacker.name} [ARMA FÍSICA: ${weaponEffect}]`,
    `→ ${target.name}`,
    `| Dano ROLADO: ${finalRawDamage}`,
    `| Escudo: -${shieldValue}`,
    `| Dano: ${finalDamage} HP`,
    `| HP: ${target.currentHP}/${target.maxHP}`,
    ...tags,
  ].join("  ");
  
const combatEvent = {
    targetName: target.name,
    damage: finalDamage,
    // Só é absorvido se havia dano inicial rolado, mas o dano final bateu no escudo e foi a zero
    isAbsorbed: finalRawDamage > 0 && finalDamage === 0, 
    timestamp: Date.now(),
    logText: logText,
    isPlayerAction: true // <--- ADICIONE ESTA LINHA PARA FICAR AZUL!
  };

  // Aciona outras abas (Ex: Copiloto vendo o tiro do Piloto)
  localStorage.setItem("last_combat_event", JSON.stringify(combatEvent));
  
  // Aciona a aba atual (O próprio Piloto que atirou)
  window.dispatchEvent(new CustomEvent("combat:event", { detail: combatEvent }));
};



// Localize o final do arquivo src/utils/mockApi.js e adicione:

export const repairAllShipsGlobal = () => {
  const ships = getAllShips();
  let changed = false;

  Object.values(ships).forEach(ship => {
    // 1. Restaura o HP para o máximo
    if (ship.currentHP < ship.maxHP) {
      ship.currentHP = ship.maxHP;
      changed = true;
    }

    // 2. Restaura todos os módulos/tripulação (bolinhas roxas)
    if (ship.activeCrew) {
      ship.activeCrew.forEach(member => {
        if (member.moduleStatus !== 'operacional') {
          member.moduleStatus = 'operacional';
          member.turnosParaReparo = 0;
          changed = true;
        }
      });
    }
  });

  if (changed) {
    localStorage.setItem(DB_KEY, JSON.stringify(ships)); //
  }
  return changed;
};