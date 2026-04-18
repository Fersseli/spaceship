import React from "react";
import "../styles/AttributeControl.css";
import { getEffect } from "../utils/effectHelpers";

// Componente para controlar um atributo individual com botões +/-
const AttributeControl = ({
  attributeName,
  value,
  shipClass,       // <-- NOVA PROP: classe da nave (type_II, type_III)
  onIncrement,
  onDecrement,
  canEdit,
  isMaxed,
  isMinned
}) => {
  const displayName =
    attributeName.charAt(0).toUpperCase() + attributeName.slice(1);

  // Agora passa shipClass para puxar a tabela correta
  const effect = getEffect(shipClass, attributeName, value);

  return (
    <div className="attribute-control">
      <h3 className="attribute-name">{displayName}</h3>

      <div className="attribute-level">
        <span className="level-label">Level:</span>
        <span className="level-value">[{value}]</span>
      </div>

      <div className="attribute-effect">
        <span className="effect-label">Effect:</span>
        <span className="effect-value">{effect}</span>
      </div>

      {canEdit && (
        <div className="control-buttons">
          <button
            onClick={onDecrement}
            disabled={isMinned}
            className="btn-decrease"
            title="Decrease attribute"
          >
            −
          </button>

          <button
            onClick={onIncrement}
            disabled={isMaxed}
            className="btn-increase"
            title="Increase attribute"
          >
            +
          </button>
        </div>
      )}

      {!canEdit && (
        <div className="read-only-notice">
          <p>Read-only view</p>
        </div>
      )}
    </div>
  );
};

export default AttributeControl;