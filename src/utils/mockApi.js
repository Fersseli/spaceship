// src/utils/mockApi.js — VERSÃO COM MATRIZ DE PROXIMIDADE RELACIONAL
import { shipsDatabase } from '../data/ships';
import { rollDamage, parseShield } from "./diceHelpers";
import { getEffect } from "./effectHelpers";

const DB_KEY         = "heavens_door_ships_db";
const DB_VERSION     = 13; // bumped: proximity matrix system
const DB_VERSION_KEY = "heavens_door_ships_db_version";

// ═══════════════════════════════════════════════════════════════════
// MATRIZ DE PROXIMIDADE RELACIONAL
// Estrutura: { "aliadoId__inimigoId": 3, ... }
// Chave composta: `${aliadoId}__${enemyId}`
// ═══════════════════════════════════════════════════════════════════

const PROX_KEY = "heavens_door_proximity_matrix";

export const getProximityMatrix = () => {
  try {
    return JSON.parse(localStorage.getItem(PROX_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveProximityMatrix = (matrix) => {
  localStorage.setItem(PROX_KEY, JSON.stringify(matrix));
};

const proxKey = (aliadoId, inimigoId) => `${aliadoId}__${inimigoId}`;

/**
 * Retorna a proximidade entre uma nave aliada e uma nave inimiga.
 * Default: 3 (Médio).
 */
export const getProximity = (aliadoId, inimigoId) => {
  const matrix = getProximityMatrix();
  const val = matrix[proxKey(aliadoId, inimigoId)];
  return val !== undefined ? val : 3;
};

/**
 * Define a proximidade entre uma nave aliada e uma nave inimiga.
 * Garante que fique entre 1 e 5.
 */
export const setProximity = (aliadoId, inimigoId, value) => {
  const matrix = getProximityMatrix();
  matrix[proxKey(aliadoId, inimigoId)] = Math.max(1, Math.min(5, value));
  saveProximityMatrix(matrix);
  return matrix[proxKey(aliadoId, inimigoId)];
};

/**
 * Muda a proximidade de forma relativa (delta).
 */
export const changeProximity = (aliadoId, inimigoId, delta) => {
  const current = getProximity(aliadoId, inimigoId);
  return setProximity(aliadoId, inimigoId, current + delta);
};

/**
 * Remove todas as entradas de proximidade envolvendo uma nave específica
 * (útil quando uma nave é destruída ou desativada).
 */
export const removeProximityEntries = (shipId) => {
  const matrix = getProximityMatrix();
  const newMatrix = {};
  Object.entries(matrix).forEach(([key, val]) => {
    const [a, b] = key.split("__");
    if (a !== shipId && b !== shipId) {
      newMatrix[key] = val;
    }
  });
  saveProximityMatrix(newMatrix);
};

/**
 * Inicializa entradas de proximidade para um inimigo recém-ativado
 * contra todas as naves aliadas ativas (default P3).
 */
export const initEnemyProximity = (enemyId) => {
  const ships = getAllShips();
  const matrix = getProximityMatrix();
  Object.values(ships).forEach(ship => {
    if (!ship.isEnemy) {
      const key = proxKey(ship.id, enemyId);
      if (matrix[key] === undefined) {
        matrix[key] = 3;
      }
    }
  });
  saveProximityMatrix(matrix);
};

/**
 * Retorna todos os inimigos e suas proximidades relativas a uma nave aliada.
 * Formato: [{ enemyId, enemyName, proximity }]
 */
export const getEnemyProximitiesForShip = (aliadoId) => {
  const ships = getAllShips();
  const result = [];
  Object.values(ships).forEach(ship => {
    if (ship.isEnemy && ship.status === "ativa") {
      result.push({
        enemyId: ship.id,
        enemyName: ship.name,
        proximity: getProximity(aliadoId, ship.id),
      });
    }
  });
  return result;
};

// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE DOGFIGHT — Navegação
// ═══════════════════════════════════════════════════════════════════

export const ensureNavigationFields = (ship) => {
  if (!ship) return;
  if (ship.currentSpeed === undefined) ship.currentSpeed = 0;
  if (ship.isDerrapando === undefined) ship.isDerrapando = false;
  // proximity agora é gerenciado pela matriz, mas mantemos o campo
  // no objeto inimigo para compatibilidade com código legado no Terminal
  // (será sincronizado via getProximity)
};

export const getMaxSpeed = (ship) => {
  if (!ship || !ship.attributes) return 0;
  const engineEffect = getEffect(ship.shipClass, "engines", ship.attributes.engines ?? 0);
  if (!engineEffect || engineEffect === "Sem Bonus" || engineEffect === "—") return 0;
  const match = engineEffect.match(/VM(\d+)/);
  return match ? parseInt(match[1]) : 0;
};

export const accelerateShip = (shipId, rollValue) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship) return { newSpeed: 0, maxSpeed: 0 };
  ensureNavigationFields(ship);
  const maxSpeed = getMaxSpeed(ship);
  const newSpeed = Math.min(ship.currentSpeed + parseInt(rollValue || 0), maxSpeed);
  ship.currentSpeed = newSpeed;
  ship.isDerrapando = false;
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return { newSpeed, maxSpeed };
};

export const failManeuver = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship) return 0;
  ensureNavigationFields(ship);
  ship.currentSpeed = Math.floor(ship.currentSpeed / 2);
  ship.isDerrapando = true;
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return ship.currentSpeed;
};

export const rollEnemySpeed = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship || !ship.isEnemy) return { newSpeed: 0, maxSpeed: 0, rolled: 0, success: false };
  ensureNavigationFields(ship);

  const maxSpeed = getMaxSpeed(ship);
  if (maxSpeed === 0) return { newSpeed: 0, maxSpeed: 0, rolled: 0, success: false };

  const pilot = ship.activeCrew?.find(m => m.role === "piloto" || m.function === "PILOTO");
  const precisao = pilot?.precisao || 50;

  const d100 = Math.floor(Math.random() * 100) + 1;
  const success = d100 <= precisao;

  if (success) {
    const diceMax = Math.max(1, Math.floor(maxSpeed / 2));
    const rolled  = Math.floor(Math.random() * diceMax) + 1;
    const newSpeed = Math.min(ship.currentSpeed + rolled, maxSpeed);
    ship.currentSpeed = newSpeed;
    ship.isDerrapando = false;
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
    return { newSpeed, maxSpeed, rolled, success, d100, precisao };
  } else {
    const newSpeed = Math.floor(ship.currentSpeed / 2);
    ship.currentSpeed = newSpeed;
    ship.isDerrapando = true;
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
    return { newSpeed, maxSpeed, rolled: 0, success, d100, precisao };
  }
};

/**
 * Resolve engajamento entre UMA nave aliada e todos os inimigos ativos.
 * Retorna resultados individuais com proximidades relativas àquela nave aliada.
 */
export const resolveEngagement = (playerShipId) => {
  const ships = getAllShips();
  const playerShip = ships[playerShipId];
  if (!playerShip) return [];
  ensureNavigationFields(playerShip);
  const playerSpeed = playerShip.currentSpeed;
  const results = [];
  Object.values(ships).forEach(ship => {
    if (!ship.isEnemy || ship.status !== "ativa") return;
    ensureNavigationFields(ship);
    results.push({
      enemyId:     ship.id,
      enemyName:   ship.name,
      aliadoId:    playerShipId,  // <-- qual aliado está engajando
      playerSpeed,
      enemySpeed:  ship.currentSpeed,
      winner:      playerSpeed >= ship.currentSpeed ? "player" : "enemy",
    });
  });
  return results;
};

export const getProximityModifiers = (proximity, isDerrapando = false) => {
  let advantageBonus    = 0;
  let precisionMultiplier = 1;
  let blocked           = false;
  switch (proximity) {
    case 1: advantageBonus = 2; break;
    case 2: advantageBonus = 1; break;
    case 3: break;
    case 4: precisionMultiplier = 0.5; break;
    case 5: blocked = true; break;
    default: break;
  }
  const derrapagemPenalty = isDerrapando ? -20 : 0;
  return { advantageBonus, precisionMultiplier, blocked, derrapagemPenalty };
};

// ═══════════════════════════════════════════════════════════════════
// CÓDIGO ORIGINAL (mantido integralmente)
// ═══════════════════════════════════════════════════════════════════

export const removePlayerFromAllCrews = (playerId) => {
  const CREW_PREFIX = "crew_assignments_";
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CREW_PREFIX)) {
      try {
        const assignments = JSON.parse(localStorage.getItem(key));
        let changed = false;
        if (assignments.copiloto === playerId) { assignments.copiloto = null; changed = true; }
        if (assignments.torretas) {
          Object.keys(assignments.torretas).forEach(tId => {
            if (assignments.torretas[tId] === playerId) { delete assignments.torretas[tId]; changed = true; }
          });
        }
        if (changed) localStorage.setItem(key, JSON.stringify(assignments));
      } catch (e) { console.error("Erro ao limpar tripulação na chave:", key, e); }
    }
  });
};

export const initDB = () => {
  const savedVersion = parseInt(localStorage.getItem(DB_VERSION_KEY) || "0");
  if (!localStorage.getItem(DB_KEY) || savedVersion < DB_VERSION) {
    localStorage.setItem(DB_KEY, JSON.stringify(shipsDatabase));
    localStorage.setItem(DB_VERSION_KEY, String(DB_VERSION));
  }
  const allShipsForInit = JSON.parse(localStorage.getItem(DB_KEY) || "{}");
  let navChanged = false;
  Object.values(allShipsForInit).forEach(ship => {
    const before = JSON.stringify(ship);
    ensureNavigationFields(ship);
    if (JSON.stringify(ship) !== before) navChanged = true;
  });
  if (navChanged) localStorage.setItem(DB_KEY, JSON.stringify(allShipsForInit));
};

export const getAllShips = () => {
  initDB();
  return JSON.parse(localStorage.getItem(DB_KEY));
};

export const getShipMaxAttributes = (ship) => {
  const maxAttrs = { weapons: 6, missiles: 6, controls: 6, shields: 6, engines: 6 };
  if (!ship) return maxAttrs;
  if (ship.activeCrew && ship.activeCrew.length > 0) {
    if (ship.shipClass === "type_III") {
      const left   = ship.activeCrew.find(m => m.function && m.function.includes("ESQUERDA"));
      const right  = ship.activeCrew.find(m => m.function && m.function.includes("DIREITA"));
      const center = ship.activeCrew.find(m => m.function && m.function.includes("CENTRO"));
      let sideDownCount = 0;
      if (left  && left.moduleStatus  !== 'operacional') sideDownCount++;
      if (right && right.moduleStatus !== 'operacional') sideDownCount++;
      if (sideDownCount === 1) maxAttrs.weapons = 3;
      if (sideDownCount === 2) maxAttrs.weapons = 0;
      if (center && center.moduleStatus !== 'operacional') maxAttrs.missiles = 0;
    } else if (ship.shipClass === "type_II") {
      const copilot = ship.activeCrew.find(m => m.function && (m.function.includes("COPILOTO") || m.function.includes("CENTRO")));
      if (copilot) {
        if (copilot.moduleStatus === 'avariada')  maxAttrs.weapons = 2;
        if (copilot.moduleStatus === 'destruida') maxAttrs.weapons = 0;
      }
    }
  }
  if (ship.shieldStatus === 'avariada')   maxAttrs.shields = 2;
  else if (ship.shieldStatus === 'destruida')  maxAttrs.shields = 0;
  if (ship.enginesStatus === 'avariada')  maxAttrs.engines = 3;
  else if (ship.enginesStatus === 'destruida') maxAttrs.engines = 0;
  return maxAttrs;
};

export const enforceAttributeLimits = (ship) => {
  if (!ship || !ship.attributes) return false;
  let changed = false;
  const maxAttrs = getShipMaxAttributes(ship);
  Object.keys(ship.attributes).forEach(attr => {
    if (ship.attributes[attr] > maxAttrs[attr]) { ship.attributes[attr] = maxAttrs[attr]; changed = true; }
  });
  return changed;
};

export const getShipData = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];

  if (ship && !ship.isEnemy && (!ship.activeCrew || ship.activeCrew.length === 0)) {
    ship.activeCrew = ship.crew.torretas.map(t => ({
      id: t.id, role: 'tripulante',
      function: `TORRETA ${t.id.toUpperCase()}`,
      moduleStatus: 'operacional', turnosParaReparo: 0
    }));
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }
  if (ship && ship.shieldStatus === undefined) {
    ship.shieldStatus = 'operacional'; ship.shieldTurnosParaReparo = 0;
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }
  if (ship && ship.enginesStatus === undefined) {
    ship.enginesStatus = 'operacional'; ship.enginesTurnosParaReparo = 0;
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }
  if (ship) ensureNavigationFields(ship);
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
  if (ships[shipId]) { ships[shipId].attributes = newAttributes; localStorage.setItem(DB_KEY, JSON.stringify(ships)); }
};

export const updateShipConfig = (shipId, newData) => {
  const ships = getAllShips();
  if (ships[shipId]) { ships[shipId] = { ...ships[shipId], ...newData }; localStorage.setItem(DB_KEY, JSON.stringify(ships)); }
};

export const clearDestroyedEnemies = () => {
  const ships = getAllShips();
  let changed = false;
  Object.values(ships).forEach(s => {
    if (s.isEnemy && s.status === "destruida") {
      removeProximityEntries(s.id);
      s.status = "desativada"; s.activeCrew = []; changed = true;
    }
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

export const deactivateAllEnemies = () => {
  const ships = getAllShips();
  let changed = false;
  Object.values(ships).forEach(s => {
    if (s.isEnemy && s.status !== "desativada") {
      removeProximityEntries(s.id);
      s.status = "desativada"; s.activeCrew = []; changed = true;
    }
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

export const enemyNamesPool = [...new Set([
  "Solo", "Calrissian", "Maverick", "Goose", "Senna", "Verstappo", "Alonso", "Cruise", "Torreto", "Pitt", "Fujiwara", "McQueen", "Gosling", "Drive", "Sega", "Skywalker", "Ligthyear", "Nemo", "Kaneda", "Tetsuo", "West", "O'conner", "Grace", "Mountain", "Hudson", "Dusty", "Quill", "Jones", "Reeve", "Stilgar", "Dameron", "Deckard", "Flint", "Ayanami", "Ikari", "Asuka", "Boss", "Snake", "Chief", "Hamiltton", "Kojima", "Walker", "Idaho", "Atreides", "Scytale", "Leto", "Harah", "Kenobi", "Hutt", "Alves", "Welles", "Ashura", "Mahat", "Zepelli", "Joestar", "Akbar", "Shitto", "Hirose", "Madera", "Edge", "Iceman", "Caveman", "Murderkill", "Harkonnen", "Feyd-Rautha", "Rabban", "Corrino", "Liet-Kynes", "Sardaukar", "Shadout", "Assad", "Bashar", "Gesserit", "Nate", "Megaton", "Chance", "Tano", "Destroyer", "Momoa", "Armas", "Rossi", "Telles", "Cody", "Moff", "Fett", "Tarantino", "Kubrick", "Windu", "Amidala", "Antilles", "Rorschach", "Mata", "Maniac", "Russo", "Mohammed", "Abdul", "Kakyoin", "Matte", "Croft", "Hannibal", "Krueger", "Xenomorph", "Samara", "Khan", "Harvey", "Fring", "Black", "Montana", "Punisher", "Terminator", "Ted", "Wayne", "Berkowitz", "Brudos", "Doe", "Rapid", "Strangler", "DeAngelo", "Nightstalker", "Zedong", "Saddam", "Franco", "Maduro", "Mugabe", "Barack", "Capone", "Haunter", "Mirror", "Raven", "Mortis", "Graves", "Banshee", "Voss", "Wraith"
])];

const rndPrecisaoPiloto = () => Math.floor(Math.random() * (75 - 50 + 1)) + 50;
const rndPrecisao = () => Math.floor(Math.random() * (70 - 40 + 1)) + 40;

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
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto",    function: "PILOTO",   des: rndDes(), esq: rndEsq(), precisao: rndPrecisaoPiloto(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto", function: "COPILOTO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
    } else {
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto",    function: "PILOTO",           des: rndDes(), esq: rndEsq(), precisao: rndPrecisaoPiloto(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto",   function: "COPILOTO",         des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[2]) newCrew.push({ id: chosen[2].toUpperCase(), role: "tripulante", function: "TORRETA ESQUERDA", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[3]) newCrew.push({ id: chosen[3].toUpperCase(), role: "tripulante", function: "TORRETA CENTRO",   des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[4]) newCrew.push({ id: chosen[4].toUpperCase(), role: "tripulante", function: "TORRETA DIREITA",  des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
    }
    ship.activeCrew = newCrew;
    ship.shieldStatus  = 'operacional'; ship.shieldTurnosParaReparo  = 0;
    ship.enginesStatus = 'operacional'; ship.enginesTurnosParaReparo = 0;
    ship.currentSpeed = 0;
    ship.isDerrapando = false;
    // Inicializa proximidade na matriz para todos os aliados
    ship.status = newStatus;
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
    initEnemyProximity(shipId);
    return;
  }

  if (newStatus === "desativada") {
    ship.activeCrew = [];
    removeProximityEntries(shipId);
  }
  if (newStatus === "destruida") {
    // mantém crew congelada, mas remove da matriz
    removeProximityEntries(shipId);
  }

  ship.status = newStatus;
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

export const applyModuleDamage = (shipId, memberId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship || !ship.activeCrew) return "Alvo não encontrado";
  const member = ship.activeCrew.find(m => m.id === memberId);
  if (!member) return "Módulo não encontrado";
  let statusMsg = "";
  if (member.moduleStatus === 'operacional') { member.moduleStatus = 'avariada'; member.turnosParaReparo = 2; statusMsg = `${member.id} AVARIADA! (2 turnos)`; }
  else if (member.moduleStatus === 'avariada') { member.moduleStatus = 'destruida'; member.turnosParaReparo = 0; statusMsg = `${member.id} DESTRUÍDA PERMANENTEMENTE!`; }
  else return "Módulo já está destruído";
  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return statusMsg;
};

export const applyShieldDamage = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship) return "Nave não encontrada";
  if (!ship.shieldStatus) ship.shieldStatus = 'operacional';
  if (!ship.shieldTurnosParaReparo) ship.shieldTurnosParaReparo = 0;
  if (ship.shieldStatus === 'operacional') { ship.shieldStatus = 'avariada'; ship.shieldTurnosParaReparo = 2; }
  else if (ship.shieldStatus === 'avariada') { ship.shieldStatus = 'destruida'; ship.shieldTurnosParaReparo = 3; }
  else return "Escudos já estão completamente destruídos";
  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return "ok";
};

export const applyEnginesDamage = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship) return "Nave não encontrada";
  if (!ship.enginesStatus) ship.enginesStatus = 'operacional';
  if (!ship.enginesTurnosParaReparo) ship.enginesTurnosParaReparo = 0;
  if (ship.enginesStatus === 'operacional') { ship.enginesStatus = 'avariada'; ship.enginesTurnosParaReparo = 2; }
  else if (ship.enginesStatus === 'avariada') { ship.enginesStatus = 'destruida'; ship.enginesTurnosParaReparo = 3; }
  else return "Motores já estão completamente destruídos";
  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return "ok";
};

export const selectDamageTarget = (ship) => {
  const torretaMembers = (ship.activeCrew || []).filter(m => {
    if (!m.function) return false;
    if (m.function.includes("TORRETA")) return true;
    if (ship.shipClass === "type_II" && m.function.includes("COPILOTO")) return true;
    return false;
  });
  const candidates = [];
  torretaMembers.forEach(m => {
    if (m.moduleStatus === 'destruida') return;
    candidates.push({ tipo: 'torreta', memberId: m.id, weight: 10 + (m.moduleStatus === 'avariada' ? 5 : 0) });
  });
  const ss = ship.shieldStatus || 'operacional';
  if (ss !== 'destruida') candidates.push({ tipo: 'escudo',  weight: 10 + (ss === 'avariada' ? 5 : 0) });
  const es = ship.enginesStatus || 'operacional';
  if (es !== 'destruida') candidates.push({ tipo: 'motores', weight: 10 + (es === 'avariada' ? 5 : 0) });
  if (candidates.length === 0) return null;
  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const c of candidates) { rand -= c.weight; if (rand <= 0) return c; }
  return candidates[candidates.length - 1];
};

export const processGlobalTurn = () => {
  const ships = getAllShips();
  let relatorio = [];

  Object.values(ships).forEach(ship => {
    if (ship.missileCooldown > 0) {
      ship.missileCooldown -= 1;
      if (ship.missileCooldown === 0) relatorio.push(`${ship.name}: Lançadores de mísseis recarregados.`);
    }
    if (ship.activeCrew) {
      ship.activeCrew.forEach(member => {
        if (member.moduleStatus === 'avariada' && member.turnosParaReparo > 0) {
          member.turnosParaReparo -= 1;
          if (member.turnosParaReparo === 0) { member.moduleStatus = 'operacional'; relatorio.push(`${ship.name}: ${member.id} reparada!`); }
        }
        if (member.missileTarget && !member.missileReady) {
          member.missileReady = true;
          const targetName = ships[member.missileTarget]?.name || "alvo";
          relatorio.push(`${ship.name}: Mira de míssil em ${targetName} travada!`);
        }
      });
    }
    if (ship.shieldStatus && ship.shieldStatus !== 'operacional' && ship.shieldTurnosParaReparo > 0) {
      ship.shieldTurnosParaReparo -= 1;
      if (ship.shieldTurnosParaReparo === 0) { ship.shieldStatus = 'operacional'; relatorio.push(`${ship.name}: Escudos restaurados!`); }
    }
    if (ship.enginesStatus && ship.enginesStatus !== 'operacional' && ship.enginesTurnosParaReparo > 0) {
      ship.enginesTurnosParaReparo -= 1;
      if (ship.enginesTurnosParaReparo === 0) { ship.enginesStatus = 'operacional'; relatorio.push(`${ship.name}: Motores restaurados!`); }
    }
    if (ship.isDerrapando) { ship.isDerrapando = false; }
    enforceAttributeLimits(ship);
  });

  localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  return relatorio;
};

export const processPlayerAttack = (attackerShipId, targetShipId, inputDamage, isExtremo, weaponEffect, isMissile = false) => {
  const ships = getAllShips();
  const attacker = ships[attackerShipId];
  const target   = ships[targetShipId];
  if (!attacker || !target) return;
  if (!target.shieldStatus) target.shieldStatus = 'operacional';
  if (!target.shieldTurnosParaReparo) target.shieldTurnosParaReparo = 0;
  if (!target.enginesStatus) target.enginesStatus = 'operacional';
  if (!target.enginesTurnosParaReparo) target.enginesTurnosParaReparo = 0;

  const { maxDamage } = rollDamage(weaponEffect, true);
  const finalRawDamage = isExtremo ? maxDamage : parseInt(inputDamage || 0);
  const isCritico = !isExtremo && finalRawDamage >= (maxDamage * 0.8);
  const shieldValue = parseShield(getEffect(target.shipClass, "shields", target.attributes?.shields ?? 0));
  const finalDamage = Math.max(0, finalRawDamage - shieldValue);
  target.currentHP = Math.max(0, (target.currentHP ?? target.maxHP) - finalDamage);

  let moduleLog = "";
  if ((isCritico || isExtremo) && finalDamage > 0) {
    const dmgTarget = selectDamageTarget(target);
    if (dmgTarget) {
      if (dmgTarget.tipo === 'torreta') {
        const member = (target.activeCrew || []).find(m => m.id === dmgTarget.memberId);
        if (member) {
          if (member.moduleStatus === 'operacional') { member.moduleStatus = 'avariada'; member.turnosParaReparo = 2; moduleLog = ` [AVARIA: ${member.function}]`; }
          else if (member.moduleStatus === 'avariada') { member.moduleStatus = 'destruida'; member.turnosParaReparo = 0; moduleLog = ` [MÓDULO DESTRUÍDO: ${member.function}]`; }
        }
      } else if (dmgTarget.tipo === 'escudo') {
        const shieldMsg = applyShieldDamageInternal(target); moduleLog = ` [ESCUDO: ${shieldMsg}]`;
      } else if (dmgTarget.tipo === 'motores') {
        const enginesMsg = applyEnginesDamageInternal(target); moduleLog = ` [MOTORES: ${enginesMsg}]`;
      }
    }
  }

  enforceAttributeLimits(target);

  if (isMissile) {
    attacker.missileCooldown = 2;
    if (attacker.activeCrew) {
      attacker.activeCrew.forEach(m => {
        if (m.missileTarget || m.missileLockLevel > 0) { m.missileLockLevel = 0; m.missileTarget = null; m.missileReady = false; }
      });
    }
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }

  if (target.currentHP <= 0 && target.status !== "destruida" && target.isEnemy) {
    setTimeout(() => {
      const currentShips = JSON.parse(localStorage.getItem("heavens_door_ships_db") || "{}");
      if (currentShips[targetShipId] && currentShips[targetShipId].currentHP <= 0) {
        currentShips[targetShipId].status = "destruida"; currentShips[targetShipId].activeCrew = [];
        removeProximityEntries(targetShipId);
        const dbString = JSON.stringify(currentShips);
        localStorage.setItem("heavens_door_ships_db", dbString);
        window.dispatchEvent(new StorageEvent('storage', { key: 'heavens_door_ships_db', newValue: dbString }));
      }
    }, 4000);
  }

  localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));

  const tags = [];
  if (isExtremo) tags.push("[🔥 ACERTO EXTREMO!]");
  else if (isCritico) tags.push("[✨ CRÍTICO!]");
  if (moduleLog) tags.push(moduleLog);

  // Proximidade do atacante em relação ao alvo
  const proxVal = getProximity(attackerShipId, targetShipId);
  const proxInfo = target.isEnemy ? ` [P${proxVal}]` : "";

  const logText = [
    `${attacker.name} [ARMA FÍSICA: ${weaponEffect}]${proxInfo}`,
    `→ ${target.name}`,
    `| Dano ROLADO: ${finalRawDamage}`,
    `| Escudo: -${shieldValue}`,
    `| Dano: ${finalDamage} HP`,
    `| HP: ${target.currentHP}/${target.maxHP}`,
    ...tags,
  ].join("  ");

  const combatEvent = {
    targetName: target.name, damage: finalDamage,
    isAbsorbed: finalRawDamage > 0 && finalDamage === 0,
    timestamp: Date.now(), logText, isPlayerAction: true,
    shieldHit: moduleLog.includes("ESCUDO"),
    shieldDestroyed: moduleLog.includes("DESTRUÍDOS") && moduleLog.includes("ESCUDO"),
    enginesHit: moduleLog.includes("MOTORES"),
    enginesDestroyed: moduleLog.includes("DESTRUÍDOS") && moduleLog.includes("MOTORES"),
  };

  localStorage.setItem("last_combat_event", JSON.stringify(combatEvent));
  window.dispatchEvent(new CustomEvent("combat:event", { detail: combatEvent }));
};

const applyShieldDamageInternal = (ship) => {
  if (!ship.shieldStatus) ship.shieldStatus = 'operacional';
  if (ship.shieldStatus === 'operacional') { ship.shieldStatus = 'avariada'; ship.shieldTurnosParaReparo = 2; return 'AVARIADOS'; }
  if (ship.shieldStatus === 'avariada')    { ship.shieldStatus = 'destruida'; ship.shieldTurnosParaReparo = 3; return 'DESTRUÍDOS'; }
  return "já destruídos";
};

const applyEnginesDamageInternal = (ship) => {
  if (!ship.enginesStatus) ship.enginesStatus = 'operacional';
  if (ship.enginesStatus === 'operacional') { ship.enginesStatus = 'avariada'; ship.enginesTurnosParaReparo = 2; return 'AVARIADOS'; }
  if (ship.enginesStatus === 'avariada')    { ship.enginesStatus = 'destruida'; ship.enginesTurnosParaReparo = 3; return 'DESTRUÍDOS'; }
  return "já destruídos";
};

export const repairAllShipsGlobal = () => {
  const ships = getAllShips();
  let changed = false;
  Object.values(ships).forEach(ship => {
    if (ship.currentHP < ship.maxHP) { ship.currentHP = ship.maxHP; changed = true; }
    if (!ship.isEnemy && ship.status === "destruida") { ship.status = "ativa"; changed = true; }
    if (ship.activeCrew) {
      ship.activeCrew.forEach(member => {
        if (member.moduleStatus !== 'operacional') { member.moduleStatus = 'operacional'; member.turnosParaReparo = 0; changed = true; }
      });
    }
    if (ship.shieldStatus && ship.shieldStatus !== 'operacional') { ship.shieldStatus = 'operacional'; ship.shieldTurnosParaReparo = 0; changed = true; }
    if (ship.enginesStatus && ship.enginesStatus !== 'operacional') { ship.enginesStatus = 'operacional'; ship.enginesTurnosParaReparo = 0; changed = true; }
    enforceAttributeLimits(ship);
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return changed;
};

export const repairShieldByAdmin = (shipId) => {
  const ships = getAllShips();
  const ship  = ships[shipId];
  if (!ship) return;
  ship.shieldStatus = 'operacional'; ship.shieldTurnosParaReparo = 0;
  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

export const repairEnginesByAdmin = (shipId) => {
  const ships = getAllShips();
  const ship  = ships[shipId];
  if (!ship) return;
  ship.enginesStatus = 'operacional'; ship.enginesTurnosParaReparo = 0;
  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

export const incrementMissileLock = (shipId) => {
  const ships = getAllShips();
  const ship  = ships[shipId];
  let alerts  = [];
  let changed = false;
  if (ship && ship.activeCrew) {
    ship.activeCrew.forEach(member => {
      let hasMissile = false;
      if (ship.crew && ship.crew.torretas) {
        const torreta = ship.crew.torretas.find(t => member.function && member.function.includes(t.id.toUpperCase()));
        if (torreta && torreta.capabilities.includes("Míssil")) hasMissile = true;
      }
      if (hasMissile && member.missileTarget) {
        if (member.missileLockLevel === undefined) member.missileLockLevel = 0;
        if (member.missileLockLevel < 3) { member.missileLockLevel += 1; changed = true; }
        if (member.missileLockLevel === 3) {
          alerts.push(`ALERTA TÁTICO: O Míssil da ${ship.name} - ${member.function} atingiu trava máxima e deve ser lançado imediatamente!`);
        }
      }
    });
    if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
  }
  return alerts;
};

export const isBallisticLockEligible = (member, ship) => {
  if (!ship.isEnemy) return false;
  if (ship.shipClass === "type_III") {
    return member.function.includes("TORRETA ESQUERDA") || member.function.includes("TORRETA DIREITA");
  }
  if (ship.shipClass === "type_II") return member.function.includes("COPILOTO");
  return false;
};

export const incrementBallisticLock = (shipId) => {
  const ships = getAllShips();
  const ship  = ships[shipId];
  let alerts  = [];
  let changed = false;
  if (!ship || !ship.isEnemy || !ship.activeCrew) return alerts;
  ship.activeCrew.forEach(member => {
    if (!member.ballisticTarget) return;
    if (!isBallisticLockEligible(member, ship)) return;
    if (member.ballisticLockLevel === undefined) member.ballisticLockLevel = 0;
    if (member.ballisticLockLevel < 3) { member.ballisticLockLevel += 1; changed = true; }
    if (member.ballisticLockLevel === 3) {
      alerts.push(`ALERTA TÁTICO: Mira balística da ${ship.name} - ${member.function} atingiu trava máxima! Disparo com SUPER VANTAGEM disponível.`);
    }
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return alerts;
};
