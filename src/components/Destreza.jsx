import React, { useMemo } from "react";
import { playersList } from "../utils/players";
import { shipsList } from "../data/ships";
import { getAllShips } from "../utils/mockApi";
import "../styles/Destreza.css";

const DexterityRanking = ({ onClose }) => {
  const rankedPlayers = useMemo(() => {
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
          <div>
            <div className="dex-eyebrow">HEAVEN'S DOOR // TACTICAL ANALYSIS</div>
            <h2 className="dex-title">ORDEM DE DESTREZA</h2>
          </div>
          <button className="dex-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="dex-body">
          {rankedPlayers.map((p, index) => (
            <div key={`${p.id}-${index}`} className={`dex-card ${p.isEnemy ? 'enemy' : 'ally'}`}>
              <div className="dex-row-top">
                <span className="dex-name">
                  <span className="dex-index">{String(index + 1).padStart(2, '0')}.</span> 
                  <span className="dex-cmdt">CMDT.</span> {p.label}
                </span>
                <span className="dex-stats">
                  <span className="dex-stat-lbl">D:</span>{p.des} <span className="dex-stat-lbl">E:</span>{p.esq}
                </span>
              </div>
              <div className="dex-row-bottom">
                <span className="dex-ship">{p.ship}</span>
                <span className="dex-separator">//</span>
                <span className="dex-func">{p.function}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DexterityRanking;