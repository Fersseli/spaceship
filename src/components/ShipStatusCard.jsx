import React from "react";
import "../styles/ShipStatusCard.css";

// Cartão que exibe o status atual da nave (HP)
const ShipStatusCard = ({ shipInfo }) => {
  // Calcula a percentagem de HP para a barra visual
  const hpPercentage = (shipInfo.currentHP / shipInfo.maxHP) * 100;

  // Determina a cor da barra baseado na percentagem
  const getHPColor = () => {
    if (hpPercentage > 50) return "hp-healthy";
    if (hpPercentage > 25) return "hp-damaged";
    return "hp-critical";
  };

  return (
    <div className="status-card">
      <h2>Ship Status</h2>

      {/* Exibe HP atual e máximo */}
      <div className="hp-display">
        <span className="hp-text">
          {shipInfo.currentHP} / {shipInfo.maxHP} HP
        </span>
      </div>

      {/* Barra visual de HP */}
      <div className="hp-bar-container">
        <div
          className={`hp-bar ${getHPColor()}`}
          style={{ width: `${hpPercentage}%` }}
        />
      </div>

      {/* Percentagem de HP */}
      <div className="hp-percentage">
        {Math.round(hpPercentage)}% Healthy
      </div>
    </div>
  );
};

export default ShipStatusCard;