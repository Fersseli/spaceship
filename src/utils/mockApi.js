import { shipsDatabase } from '../data/ships';

const DB_KEY         = "heavens_door_ships_db";
const DB_VERSION     = 8; // incrementar sempre que mudar estrutura de dados
const DB_VERSION_KEY = "heavens_door_ships_db_version";

// src/utils/mockApi.js

export const removePlayerFromAllCrews = (playerId) => {
  const CREW_PREFIX = "crew_assignments_";
  
  // Percorre todas as chaves do localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CREW_PREFIX)) {
      try {
        const assignments = JSON.parse(localStorage.getItem(key));
        let changed = false;

        // Remove do posto de copiloto
        if (assignments.copiloto === playerId) {
          assignments.copiloto = null;
          changed = true;
        }

        // Remove das torretas
        if (assignments.torretas) {
          Object.keys(assignments.torretas).forEach(tId => {
            if (assignments.torretas[tId] === playerId) {
              delete assignments.torretas[tId];
              changed = true;
            }
          });
        }

        if (changed) {
          localStorage.setItem(key, JSON.stringify(assignments));
        }
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

export const getShipData = (shipId) => {
  const ships = getAllShips();
  return ships[shipId];
};

/**
 * Retorna apenas os jogadores que estão na mesma nave (ship_<id> === shipId)
 * Usado pelo AssignCrew para filtrar a lista de tripulantes.
 */
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

// src/utils/mockApi.js

// Matriz de Nomes (Removi as duplicatas automaticamente usando Set)
export const enemyNamesPool = [...new Set([
  "Solo", "Calrissian", "Maverick", "Goose", "Senna", "Verstappo", "Alonso", "Cruise", "Torreto", "Pitt", "Fujiwara", "McQueen", "Gosling", "Drive", "Sega", "Skywalker", "Ligthyear", "Nemo", "Kaneda", "Tetsuo", "West", "O'conner", "Grace", "Mountain", "Hudson", "Dusty", "Quill", "Jones", "Reeve", "Stilgar", "Dameron", "Deckard", "Flint", "Ayanami", "Ikari", "Asuka", "Boss", "Snake", "Chief", "Hamiltton", "Kojima", "Walker", "Idaho", "Atreides", "Scytale", "Leto", "Harah", "Kenobi", "Hutt", "Alves", "Welles", "Ashura", "Mahat", "Zepelli", "Joestar", "Akbar", "Shitto", "Hirose", "Madera", "Edge", "Iceman", "Caveman", "Murderkill", "Harkonnen", "Feyd-Rautha", "Rabban", "Corrino", "Liet-Kynes", "Sardaukar", "Shadout", "Assad", "Bashar", "Gesserit", "Nate", "Megaton", "Chance", "Tano", "Destroyer", "Momoa", "Armas", "Rossi", "Telles", "Cody", "Moff", "Fett", "Tarantino", "Kubrick", "Windu", "Amidala", "Antilles", "Rorschach", "Mata", "Maniac", "Russo", "Mohammed", "Abdul", "Kakyoin", "Matte", "Croft", "Hannibal", "Krueger", "Xenomorph", "Samara", "Khan", "Harvey", "Fring", "Black", "Montana", "Punisher", "Terminator", "Ted", "Wayne", "Berkowitz", "Brudos", "Doe", "Rapid", "Strangler", "DeAngelo", "Nightstalker", "Zedong", "Saddam", "Franco", "Maduro", "Mugabe", "Barack", "Capone", "Haunter", "Mirror", "Raven", "Mortis", "Graves", "Banshee", "Voss", "Wraith"
])];

export const setEnemyShipStatus = (shipId, newStatus) => {
  const ships = getAllShips();
  const ship = ships[shipId];
  if (!ship || !ship.isEnemy) return;

  // Se ativada e antes não estava, gerar tripulação
  if (newStatus === "ativa" && ship.status !== "ativa") {
    // 1. Pegar nomes que já estão em uso (ativas ou destruídas)
    const usedNames = [];
    Object.values(ships).forEach(s => {
      if (s.isEnemy && (s.status === "ativa" || s.status === "destruida") && s.activeCrew) {
        s.activeCrew.forEach(c => usedNames.push(c.id.toUpperCase()));
      }
    });

    // 2. Filtrar matriz
    const availableNames = enemyNamesPool.filter(n => !usedNames.includes(n.toUpperCase()));
    
    // 3. Embaralhar e escolher
    availableNames.sort(() => Math.random() - 0.5);
    const crewSize = ship.shipClass === "type_III" ? 5 : 2;
    const chosen = availableNames.slice(0, crewSize);

    // 4. Montar a tripulação com status fictícios aleatórios de DES e ESQ
    const newCrew = [];
    
    // Funções geradoras com os novos limites
    const rndDes = () => Math.floor(Math.random() * (17 - 8 + 1)) + 8;  // Entre 8 e 17
    const rndEsq = () => Math.floor(Math.random() * (75 - 35 + 1)) + 35; // Entre 35 e 75

    if (ship.shipClass === "type_II") {
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto", function: "PILOTO", des: rndDes(), esq: rndEsq() });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto", function: "COPILOTO", des: rndDes(), esq: rndEsq() });
    } else {
      newCrew.push({ id: chosen[0].toUpperCase(), role: "piloto", function: "PILOTO", des: rndDes(), esq: rndEsq() });
      if (chosen[1]) newCrew.push({ id: chosen[1].toUpperCase(), role: "copiloto", function: "COPILOTO", des: rndDes(), esq: rndEsq() });
      if (chosen[2]) newCrew.push({ id: chosen[2].toUpperCase(), role: "tripulante", function: "TORRETA ESQUERDA", des: rndDes(), esq: rndEsq() });
      if (chosen[3]) newCrew.push({ id: chosen[3].toUpperCase(), role: "tripulante", function: "TORRETA CENTRO", des: rndDes(), esq: rndEsq() });
      if (chosen[4]) newCrew.push({ id: chosen[4].toUpperCase(), role: "tripulante", function: "TORRETA DIREITA", des: rndDes(), esq: rndEsq() });
    }
    
    ship.activeCrew = newCrew;

  // Se for DESATIVADA, a tripulação some do log
  if (newStatus === "desativada") {
    ship.activeCrew = [];
  }
}

  ship.status = newStatus;
  localStorage.setItem(DB_KEY, JSON.stringify(ships));
};

// Função para o botão do Admin purgar o cemitério de naves
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
  if (changed) {
    localStorage.setItem(DB_KEY, JSON.stringify(ships));
  }
};