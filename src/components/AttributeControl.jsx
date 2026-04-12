import React from "react";
import "../styles/AttributeControl.css";
import { getEffect } from "../utils/effectHelpers";

// Componente para controlar um atributo individual com botões +/-
const AttributeControl = ({
  attributeName,
  value,
  onIncrement,
  onDecrement,
  canEdit,
  isMaxed,
  isMinned
}) => {
  // Formata o nome do atributo para exibição (weapons -> Weapons)
  const displayName =
    attributeName.charAt(0).toUpperCase() + attributeName.slice(1);

  // Obtém o efeito correspondente ao nível do atributo
  const effect = getEffect(attributeName, value);

  return (
    <div className="attribute-control">
      {/* Nome do atributo */}
      <h3 className="attribute-name">{displayName}</h3>

      {/* Mostra o nível atual do atributo */}
      <div className="attribute-level">
        <span className="level-label">Level:</span>
        <span className="level-value">[{value}]</span>
      </div>

      {/* Mostra o efeito do atributo atual */}
      <div className="attribute-effect">
        <span className="effect-label">Effect:</span>
        <span className="effect-value">{effect}</span>
      </div>

      {/* Botões de controle (apenas se o jogador pode editar) */}
      {canEdit && (
        <div className="control-buttons">
          {/* Botão para incrementar o atributo */}
          <button
            onClick={onDecrement}
            disabled={isMinned}
            className="btn-decrease"
            title="Decrease attribute"
          >
            −
          </button>

          {/* Botão para decrementar o atributo */}
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

      {/* Mensagem para Gunner (apenas leitura) */}
      {!canEdit && (
        <div className="read-only-notice">
          <p>Read-only view</p>
        </div>
      )}
    </div>
  );
};

export default AttributeControl;