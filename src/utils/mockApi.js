// src/utils/mockApi.js
import { shipsDatabase } from '../data/ships';
import { rollDamage, parseShield } from "./diceHelpers";
import { getEffect } from "./effectHelpers";

const DB_KEY         = "heavens_door_ships_db";
const DB_VERSION     = 9; // bumped to force re-init if needed
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

// ─── LIMITES DE ENERGIA POR AVARIA ───────────────────────────────────────────
export const getShipMaxAttributes = (ship) => {
  const maxAttrs = { weapons: 6, missiles: 6, controls: 6, shields: 6, engines: 6 };
  if (!ship || !ship.activeCrew) return maxAttrs;

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

  // ─── AVARIA DE ESCUDOS ─────────────────────────────────────────────────────
  // shieldStatus é armazenado diretamente na nave (não num membro de tripulação)
  if (ship.shieldStatus === 'avariada') {
    maxAttrs.shields = 2; // bloqueia distribuição acima do nível 4
  } else if (ship.shieldStatus === 'destruida') {
    maxAttrs.shields = 0; // escudo completamente desativado
  }

  return maxAttrs;
};

export const enforceAttributeLimits = (ship) => {
  if (!ship || !ship.attributes) return false;
  let changed = false;
  const maxAttrs = getShipMaxAttributes(ship);

  Object.keys(ship.attributes).forEach(attr => {
    if (ship.attributes[attr] > maxAttrs[attr]) {
      ship.attributes[attr] = maxAttrs[attr];
      changed = true;
    }
  });
  return changed;
};

// ─── INICIALIZAÇÃO DE TRIPULAÇÃO DE NAVE ALIADA ───────────────────────────────
export const getShipData = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];

  if (ship && !ship.isEnemy && (!ship.activeCrew || ship.activeCrew.length === 0)) {
    ship.activeCrew = ship.crew.torretas.map(t => ({
      id: t.id,
      role: 'tripulante',
      function: `TORRETA ${t.id.toUpperCase()}`,
      moduleStatus: 'operacional',
      turnosParaReparo: 0
    }));
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }

  // Garante que shieldStatus exista
  if (ship && ship.shieldStatus === undefined) {
    ship.shieldStatus = 'operacional';
    ship.shieldTurnosParaReparo = 0;
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

export const deactivateAllEnemies = () => {
  const ships = getAllShips();
  let changed = false;
  Object.values(ships).forEach(s => {
    if (s.isEnemy && s.status !== "desativada") {
      s.status = "desativada";
      s.activeCrew = [];
      changed = true;
    }
  });
  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

export const enemyNamesPool = [...new Set([
  "Solo", "Calrissian", "Maverick", "Goose", "Senna", "Verstappo", "Alonso", "Cruise", "Torreto", "Pitt", "Fujiwara", "McQueen", "Gosling", "Drive", "Sega", "Skywalker", "Ligthyear", "Nemo", "Kaneda", "Tetsuo", "West", "O'conner", "Grace", "Mountain", "Hudson", "Dusty", "Quill", "Jones", "Reeve", "Stilgar", "Dameron", "Deckard", "Flint", "Ayanami", "Ikari", "Asuka", "Boss", "Snake", "Chief", "Hamiltton", "Kojima", "Walker", "Idaho", "Atreides", "Scytale", "Leto", "Harah", "Kenobi", "Hutt", "Alves", "Welles", "Ashura", "Mahat", "Zepelli", "Joestar", "Akbar", "Shitto", "Hirose", "Madera", "Edge", "Iceman", "Caveman", "Murderkill", "Harkonnen", "Feyd-Rautha", "Rabban", "Corrino", "Liet-Kynes", "Sardaukar", "Shadout", "Assad", "Bashar", "Gesserit", "Nate", "Megaton", "Chance", "Tano", "Destroyer", "Momoa", "Armas", "Rossi", "Telles", "Cody", "Moff", "Fett", "Tarantino", "Kubrick", "Windu", "Amidala", "Antilles", "Rorschach", "Mata", "Maniac", "Russo", "Mohammed", "Abdul", "Kakyoin", "Matte", "Croft", "Hannibal", "Krueger", "Xenomorph", "Samara", "Khan", "Harvey", "Fring", "Black", "Montana", "Punisher", "Terminator", "Ted", "Wayne", "Berkowitz", "Brudos", "Doe", "Rapid", "Strangler", "DeAngelo", "Nightstalker", "Zedong", "Saddam", "Franco", "Maduro", "Mugabe", "Barack", "Capone", "Haunter", "Mirror", "Raven", "Mortis", "Graves", "Banshee", "Voss", "Wraith"
])];

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
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto",    function: "PILOTO",   des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto", function: "COPILOTO", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
    } else {
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto",    function: "PILOTO",           des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto",   function: "COPILOTO",         des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[2]) newCrew.push({ id: chosen[2].toUpperCase(), role: "tripulante", function: "TORRETA ESQUERDA", des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[3]) newCrew.push({ id: chosen[3].toUpperCase(), role: "tripulante", function: "TORRETA CENTRO",   des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
      if (chosen[4]) newCrew.push({ id: chosen[4].toUpperCase(), role: "tripulante", function: "TORRETA DIREITA",  des: rndDes(), esq: rndEsq(), precisao: rndPrecisao(), moduleStatus: 'operacional', turnosParaReparo: 0 });
    }
    ship.activeCrew = newCrew;
    // Garante campos de escudo na ativação
    ship.shieldStatus = 'operacional';
    ship.shieldTurnosParaReparo = 0;
  }

  if (newStatus === "desativada") {
    ship.activeCrew = [];
  }

  ship.status = newStatus;
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

// ─── AVARIA DE MÓDULO (TRIPULANTE) ────────────────────────────────────────────
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

  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return statusMsg;
};

// ─── AVARIA DE ESCUDOS ────────────────────────────────────────────────────────
/**
 * Aplica dano ao sistema de escudos da nave.
 * Retorna uma string de log descrevendo o que ocorreu.
 */
export const applyShieldDamage = (shipId) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship) return "Nave não encontrada";

  // Garante campos existam
  if (!ship.shieldStatus) ship.shieldStatus = 'operacional';
  if (!ship.shieldTurnosParaReparo) ship.shieldTurnosParaReparo = 0;

  let statusMsg = "";

  if (ship.shieldStatus === 'operacional') {
    ship.shieldStatus = 'avariada';
    ship.shieldTurnosParaReparo = 2;
    statusMsg = `ESCUDOS AVARIADOS! Limite: nível 4 (2 turnos para reparo)`;
  } else if (ship.shieldStatus === 'avariada') {
    ship.shieldStatus = 'destruida';
    ship.shieldTurnosParaReparo = 3;
    statusMsg = `ESCUDOS DESTRUÍDOS! Completamente offline (3 turnos para reparo)`;
  } else {
    return "Escudos já estão completamente destruídos";
  }

  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return statusMsg;
};

// ─── SELEÇÃO DE MÓDULO PARA AVARIA (COM PROBABILIDADE AUMENTADA) ──────────────
/**
 * Seleciona qual módulo será avariado num acerto crítico/extremo.
 * Módulos já avariados têm +5% de chance de ser escolhidos novamente (destruindo-os).
 *
 * Retorna { tipo: 'torreta'|'escudo', memberId?: string }
 */
export const selectDamageTarget = (ship) => {
  // Candidatos: torretas (e copiloto em type_II) + escudos
  const torretaMembers = (ship.activeCrew || []).filter(m => {
    if (!m.function) return false;
    if (m.function.includes("TORRETA")) return true;
    if (ship.shipClass === "type_II" && m.function.includes("COPILOTO")) return true;
    return false;
  });

  // Monta lista de candidatos com pesos
  // Base weight = 10 por candidato; já avariado = +5 (50% a mais)
  const candidates = [];

  torretaMembers.forEach(m => {
    if (m.moduleStatus === 'destruida') return; // já destruída, não conta
    const baseWeight = 10;
    const extraWeight = m.moduleStatus === 'avariada' ? 5 : 0;
    candidates.push({ tipo: 'torreta', memberId: m.id, weight: baseWeight + extraWeight });
  });

  // Escudos: se já destruídos, não entra
  const shieldStatus = ship.shieldStatus || 'operacional';
  if (shieldStatus !== 'destruida') {
    const baseWeight = 10;
    const extraWeight = shieldStatus === 'avariada' ? 5 : 0;
    candidates.push({ tipo: 'escudo', weight: baseWeight + extraWeight });
  }

  if (candidates.length === 0) return null;

  // Seleção ponderada
  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const c of candidates) {
    rand -= c.weight;
    if (rand <= 0) return c;
  }
  return candidates[candidates.length - 1];
};

// ─── TURNO GLOBAL ─────────────────────────────────────────────────────────────
export const processGlobalTurn = () => {
  const ships = getAllShips();
  let relatorio = [];

  Object.values(ships).forEach(ship => {
    // Redução de cooldown de mísseis
    if (ship.missileCooldown > 0) {
      ship.missileCooldown -= 1;
      if (ship.missileCooldown === 0) {
        relatorio.push(`${ship.name}: Lançadores de mísseis recarregados.`);
      }
    }

    // Reparo de módulos de tripulação
    if (ship.activeCrew) {
      ship.activeCrew.forEach(member => {
        if (member.moduleStatus === 'avariada' && member.turnosParaReparo > 0) {
          member.turnosParaReparo -= 1;
          if (member.turnosParaReparo === 0) {
            member.moduleStatus = 'operacional';
            relatorio.push(`${ship.name}: ${member.id} reparada!`);
          }
        }

        // Mira de míssil
        if (member.missileTarget && !member.missileReady) {
          member.missileReady = true;
          const targetName = ships[member.missileTarget]?.name || "alvo";
          relatorio.push(`${ship.name}: Mira de míssil em ${targetName} travada!`);
        }
      });
    }

    // ─── Reparo de escudos por turno ────────────────────────────────────────
    if (ship.shieldStatus && ship.shieldStatus !== 'operacional' && ship.shieldTurnosParaReparo > 0) {
      ship.shieldTurnosParaReparo -= 1;
      if (ship.shieldTurnosParaReparo === 0) {
        ship.shieldStatus = 'operacional';
        relatorio.push(`${ship.name}: Escudos restaurados!`);
      }
    }

    enforceAttributeLimits(ship);
  });

  localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  return relatorio;
};

// ─── ATAQUE DE JOGADOR ────────────────────────────────────────────────────────
export const processPlayerAttack = (attackerShipId, targetShipId, inputDamage, isExtremo, weaponEffect, isMissile = false) => {
  const ships = getAllShips();
  const attacker = ships[attackerShipId];
  const target   = ships[targetShipId];

  if (!attacker || !target) return;

  // Garante campos de escudo
  if (!target.shieldStatus) target.shieldStatus = 'operacional';
  if (!target.shieldTurnosParaReparo) target.shieldTurnosParaReparo = 0;

  const { maxDamage } = rollDamage(weaponEffect, true);
  const finalRawDamage = isExtremo ? maxDamage : parseInt(inputDamage || 0);
  const isCritico = !isExtremo && finalRawDamage >= (maxDamage * 0.8);

  const targetShieldLevel = target.attributes?.shields ?? 0;
  const shieldEffect = getEffect(target.shipClass, "shields", targetShieldLevel);
  const shieldValue  = parseShield(shieldEffect);
  const finalDamage  = Math.max(0, finalRawDamage - shieldValue);

  target.currentHP = Math.max(0, (target.currentHP ?? target.maxHP) - finalDamage);

  let moduleLog = "";

  if ((isCritico || isExtremo) && finalDamage > 0) {
    const dmgTarget = selectDamageTarget(target);

    if (dmgTarget) {
      if (dmgTarget.tipo === 'torreta') {
        const member = (target.activeCrew || []).find(m => m.id === dmgTarget.memberId);
        if (member) {
          if (member.moduleStatus === 'operacional') {
            member.moduleStatus = 'avariada';
            member.turnosParaReparo = 2;
            moduleLog = ` [AVARIA: ${member.function}]`;
          } else if (member.moduleStatus === 'avariada') {
            member.moduleStatus = 'destruida';
            member.turnosParaReparo = 0;
            moduleLog = ` [MÓDULO DESTRUÍDO: ${member.function}]`;
          }
        }
      } else if (dmgTarget.tipo === 'escudo') {
        const shieldMsg = applyShieldDamageInternal(target);
        moduleLog = ` [ESCUDO: ${shieldMsg}]`;
      }
    }
  }

  enforceAttributeLimits(target);

  if (isMissile) {
    attacker.missileCooldown = 2;
    if (attacker.activeCrew) {
      attacker.activeCrew.forEach(m => {
        if (m.missileTarget || m.missileLockLevel > 0) {
          m.missileLockLevel = 0;
          m.missileTarget    = null;
          m.missileReady     = false;
        }
      });
    }
    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
  }

  if (target.currentHP <= 0 && target.status !== "destruida" && target.isEnemy) {
    setTimeout(() => {
      const currentShips = JSON.parse(localStorage.getItem("heavens_door_ships_db") || "{}");
      if (currentShips[targetShipId] && currentShips[targetShipId].currentHP <= 0) {
        currentShips[targetShipId].status     = "destruida";
        currentShips[targetShipId].activeCrew = [];
        const dbString = JSON.stringify(currentShips);
        localStorage.setItem("heavens_door_ships_db", dbString);
        window.dispatchEvent(new StorageEvent('storage', { key: 'heavens_door_ships_db', newValue: dbString }));
      }
    }, 4000);
  }

  localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));

  const tags = [];
  if (isExtremo)  tags.push("[🔥 ACERTO EXTREMO!]");
  else if (isCritico) tags.push("[✨ CRÍTICO!]");
  if (moduleLog)  tags.push(moduleLog);

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
    isAbsorbed: finalRawDamage > 0 && finalDamage === 0,
    timestamp: Date.now(),
    logText,
    isPlayerAction: true,
    shieldHit: moduleLog.includes("ESCUDO"),
    shieldDestroyed: moduleLog.includes("DESTRUÍDOS"),
  };

  localStorage.setItem("last_combat_event", JSON.stringify(combatEvent));
  window.dispatchEvent(new CustomEvent("combat:event", { detail: combatEvent }));
};

// Helper interno — aplica dano de escudo ao objeto ship já carregado (sem re-ler o DB)
const applyShieldDamageInternal = (ship) => {
  if (!ship.shieldStatus) ship.shieldStatus = 'operacional';

  if (ship.shieldStatus === 'operacional') {
    ship.shieldStatus = 'avariada';
    ship.shieldTurnosParaReparo = 2;
    return `AVARIADOS! Limite nível 4 (2 turnos)`;
  } else if (ship.shieldStatus === 'avariada') {
    ship.shieldStatus = 'destruida';
    ship.shieldTurnosParaReparo = 3;
    return `DESTRUÍDOS! Offline (3 turnos)`;
  }
  return "já destruídos";
};

// ─── REPARO GLOBAL ────────────────────────────────────────────────────────────
export const repairAllShipsGlobal = () => {
  const ships = getAllShips();
  let changed = false;

  Object.values(ships).forEach(ship => {
    if (ship.currentHP < ship.maxHP) { ship.currentHP = ship.maxHP; changed = true; }

    if (!ship.isEnemy && ship.status === "destruida") { ship.status = "ativa"; changed = true; }

    if (ship.activeCrew) {
      ship.activeCrew.forEach(member => {
        if (member.moduleStatus !== 'operacional') {
          member.moduleStatus     = 'operacional';
          member.turnosParaReparo = 0;
          changed = true;
        }
      });
    }

    // Repara escudos também
    if (ship.shieldStatus && ship.shieldStatus !== 'operacional') {
      ship.shieldStatus            = 'operacional';
      ship.shieldTurnosParaReparo  = 0;
      changed = true;
    }

    enforceAttributeLimits(ship);
  });

  if (changed) localStorage.setItem(DB_KEY, JSON.stringify(ships));
  return changed;
};

// ─── REPARO DE ESCUDO PELO ADMIN ──────────────────────────────────────────────
export const repairShieldByAdmin = (shipId) => {
  const ships = getAllShips();
  const ship  = ships[shipId];
  if (!ship) return;
  ship.shieldStatus           = 'operacional';
  ship.shieldTurnosParaReparo = 0;
  enforceAttributeLimits(ship);
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

// ─── INCREMENTO DE TRAVA DE MÍSSIL ───────────────────────────────────────────
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
