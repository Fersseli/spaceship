import React from "react";
import { getProximity, changeProximity } from "../utils/mockApi"; // Ajuste o caminho se necessário

const ProximityMatrixPanel = ({ allShips, onUpdate }) => {
  const allies  = Object.values(allShips).filter(s => !s.isEnemy);
  const enemies = Object.values(allShips).filter(s => s.isEnemy && s.status === "ativa");

  if (allies.length === 0 || enemies.length === 0) return null;

  const handleChange = (aliadoId, inimigoId, delta) => {
    changeProximity(aliadoId, inimigoId, delta);
    // dispara storage event para todos os componentes reagirem
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'heavens_door_proximity_matrix',
      newValue: localStorage.getItem('heavens_door_proximity_matrix'),
    }));
    if (onUpdate) onUpdate();
  };

  const proxColor = (p) => {
    if (p <= 1) return "#ff3c1e";
    if (p === 2) return "#ff8c00";
    if (p === 3) return "#ffae00";
    if (p === 4) return "#4a9eff";
    return "#6b7a8d";
  };

  const proxLabel = (p) => ["","CONTATO","PERTO","MÉDIO","LONGE","LIMITE"][p] ?? "—";

  return (
    <div className="tc-prox-matrix-panel">
      <div className="tc-prox-matrix-title">// MATRIZ DE PROXIMIDADE</div>
<div className="tc-prox-matrix-grid" style={{ gridTemplateColumns: `max-content repeat(${enemies.length}, 1fr)` }}>        {/* Cabeçalho: nomes dos inimigos */}
        <div className="tc-prox-cell tc-prox-header-corner" />
        {enemies.map(e => (
          <div key={e.id} className="tc-prox-cell tc-prox-header-enemy">
            {e.name.split(" ")[0].toUpperCase()}
          </div>
        ))}
        {/* Linhas: cada aliado */}
        {allies.map(ally => (
          <React.Fragment key={ally.id}>
            <div className="tc-prox-cell tc-prox-header-ally">
              {ally.name.split(" ")[0].toUpperCase()}
            </div>
            {enemies.map(enemy => {
              const p = getProximity(ally.id, enemy.id);
              const c = proxColor(p);
              return (
                <div key={enemy.id} className="tc-prox-cell tc-prox-value">
                  <button
                    className="tc-prox-btn tc-prox-btn--minus"
                    onClick={() => handleChange(ally.id, enemy.id, +1)}
                    disabled={p >= 5}
                    title="Afastar"
                  >▶</button>
                  <span
                    className="tc-prox-number"
                    style={{ color: c, borderColor: c }}
                    title={proxLabel(p)}
                  >
                    P{p}
                  </span>
                  <button
                    className="tc-prox-btn tc-prox-btn--plus"
                    onClick={() => handleChange(ally.id, enemy.id, -1)}
                    disabled={p <= 1}
                    title="Aproximar"
                  >◀</button>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProximityMatrixPanel;