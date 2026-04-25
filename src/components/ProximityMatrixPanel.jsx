import React from "react";
import { changeProximity } from "../utils/mockApi";

const ProximityMatrixPanel = ({ allShips, proximityMatrix = {}, onUpdate }) => {
  const allies = Object.values(allShips).filter((s) => !s.isEnemy);
  const enemies = Object.values(allShips).filter(
    (s) => s.isEnemy && s.status === "ativa"
  );

  if (allies.length === 0 || enemies.length === 0) return null;

  const getProxFromMatrix = (aliadoId, inimigoId) => {
    const key = `${aliadoId}__${inimigoId}`;
    return proximityMatrix[key] !== undefined ? proximityMatrix[key] : 3;
  };

  const handleChange = async (aliadoId, inimigoId, delta) => {
    await changeProximity(aliadoId, inimigoId, delta);

    if (onUpdate) {
      await onUpdate();
    }
  };

  const proxColor = (p) => {
    if (p <= 1) return "#ff3c1e";
    if (p === 2) return "#ff8c00";
    if (p === 3) return "#ffae00";
    if (p === 4) return "#4a9eff";
    return "#6b7a8d";
  };

  const proxLabel = (p) =>
    ["", "CONTATO", "PERTO", "MÉDIO", "LONGE", "LIMITE"][p] ?? "—";

  return (
    <div className="tc-prox-matrix-panel">
      <div className="tc-prox-matrix-title">// MATRIZ DE PROXIMIDADE</div>

      <div
        className="tc-prox-matrix-grid"
        style={{
          gridTemplateColumns: `max-content repeat(${enemies.length}, 1fr)`,
        }}
      >
        <div className="tc-prox-cell tc-prox-header-corner" />

        {enemies.map((enemy) => (
          <div key={enemy.id} className="tc-prox-cell tc-prox-header-enemy">
            {enemy.name.split(" ")[0].toUpperCase()}
          </div>
        ))}

        {allies.map((ally) => (
          <React.Fragment key={ally.id}>
            <div className="tc-prox-cell tc-prox-header-ally">
              {ally.name.split(" ")[0].toUpperCase()}
            </div>

            {enemies.map((enemy) => {
              const p = getProxFromMatrix(ally.id, enemy.id);
              const color = proxColor(p);

              return (
                <div key={enemy.id} className="tc-prox-cell tc-prox-value">
                  <button
                    className="tc-prox-btn tc-prox-btn--minus"
                    onClick={() => handleChange(ally.id, enemy.id, +1)}
                    disabled={p >= 5}
                    title="Afastar"
                  >
                    ▶
                  </button>

                  <span
                    className="tc-prox-number"
                    style={{ color, borderColor: color }}
                    title={proxLabel(p)}
                  >
                    P{p}
                  </span>

                  <button
                    className="tc-prox-btn tc-prox-btn--plus"
                    onClick={() => handleChange(ally.id, enemy.id, -1)}
                    disabled={p <= 1}
                    title="Aproximar"
                  >
                    ◀
                  </button>
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