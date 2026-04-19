import React, { useMemo } from "react";
import { playersList } from "../utils/players";
import { shipsList } from "../data/ships";
import { getAllShips } from "../utils/mockApi";
import "../styles/Destreza.css";

const DexterityRanking = ({ onClose }) => {
  // useMemo garante que a lista só é calculada quando o modal abre
  const rankedPlayers = useMemo(() => {
    // 1. Mapeia os jogadores normais
    const rawMappedData = playersList.map((player) => {
      const rawRole = localStorage.getItem(`role_${player.id}`);
      const currentRole = (rawRole === "piloto" || rawRole === "copiloto") ? rawRole : "tripulante";
      
      const savedShipId = localStorage.getItem(`ship_${player.id}`) || "hawthorne_iii"; 
      const shipLabel = shipsList.find(s => s.id === savedShipId)?.label || "MS Hawthorne III";
      
      let assignedFunction = "LIVRE"; 

      try {
        const crewKey = `crew_assignments_${savedShipId}`;
        const crew = JSON.parse(localStorage.getItem(crewKey) || '{"copiloto": null, "torretas": {}}');

        if (currentRole === "piloto") {
          assignedFunction = "PILOTO";
        } else if (crew.copiloto === player.id) {
          assignedFunction = "COPILOTO";
        } else {
          const torretaEntry = Object.entries(crew.torretas || {}).find(([_, uid]) => uid === player.id);
          if (torretaEntry) {
            assignedFunction = `TORRETA ${torretaEntry[0].toUpperCase()}`;
          }
        }
      } catch (e) {}

      return {
        id: player.id,
        label: player.label,
        des: player.des,
        esq: player.esq,
        ship: shipLabel,
        function: assignedFunction,
        isEnemy: false
      };
    });

    // 2. Mapeia os inimigos ATIVOS
    const dbShips = getAllShips();
    const enemyCrewMembers = [];
    Object.values(dbShips).forEach(ship => {
      if (ship.isEnemy && ship.status === "ativa" && ship.activeCrew) {
        ship.activeCrew.forEach(member => {
          enemyCrewMembers.push({
            id: member.id,
            label: member.id,
            des: member.des,
            esq: member.esq,
            ship: ship.name,
            function: member.function,
            isEnemy: true
          });
        });
      }
    });

    // 3. Combina e Ordena (Prioridade: DES > ESQ)
    const combinedData = [...rawMappedData, ...enemyCrewMembers];
    combinedData.sort((a, b) => {
      if (b.des !== a.des) return b.des - a.des;
      return b.esq - a.esq;
    });

    return combinedData;
  }, []);

  return (
    <div className="dex-overlay" onClick={onClose}>
      <div className="dex-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dex-header">
          <h2 className="dex-title">ORDEM DE DESTREZA</h2>
          <button className="dex-close" onClick={onClose}>×</button>
        </div>
        
        <div className="dex-body">
          {rankedPlayers.map((p, index) => (
            <div key={`${p.id}-${index}`} className={`dex-card ${p.isEnemy ? 'enemy' : ''}`}>
              <div className="dex-row-top">
                <span className="dex-name">
                {index + 1}. <span className="dex-cmdt">CMDT</span>. {p.label}
                </span>
                <span className="dex-stats">(D:{p.des} | E:{p.esq})</span>
              </div>
              <div className="dex-row-bottom">
                {p.ship} — {p.function}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DexterityRanking;