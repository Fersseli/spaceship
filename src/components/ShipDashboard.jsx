import React, { useState } from "react";
import "../styles/ShipDashboard.css";
import ShipStatusCard from "./ShipStatusCard";
import AttributeControl from "./AttributeControl";
import { canEdit } from "../utils/rolePermissions";
import { calculateRemainingPoints } from "../utils/effectHelpers";
import { shipsDatabase } from "../data/ships";

// Painel principal da nave onde o jogador gerencia os atributos
const ShipDashboard = ({ playerData, onLogout }) => {
  // Estado para armazenar os atributos da nave
  const [attributes, setAttributes] = useState(
    shipsDatabase[playerData.ship].attributes
  );

  // Obtém informações da nave do banco de dados
  const shipInfo = shipsDatabase[playerData.ship];

  // Calcula os pontos restantes para distribuição
  const remainingPoints = calculateRemainingPoints(attributes, shipInfo.totalPoints);

  // Função para incrementar um atributo
  const handleIncrement = (attributeName) => {
    // Verifica se o jogador tem permissão para editar
    if (!canEdit(playerData.role)) {
      return;
    }

    // Valida se o atributo não está no máximo (6)
    if (attributes[attributeName] >= 6) {
      return;
    }

    // Valida se há pontos disponíveis
    if (remainingPoints <= 0) {
      return;
    }

    // Incrementa o atributo
    setAttributes({
      ...attributes,
      [attributeName]: attributes[attributeName] + 1
    });
  };

  // Função para decrementar um atributo
  const handleDecrement = (attributeName) => {
    // Verifica se o jogador tem permissão para editar
    if (!canEdit(playerData.role)) {
      return;
    }

    // Valida se o atributo não está no mínimo (0)
    if (attributes[attributeName] <= 0) {
      return;
    }

    // Decrementa o atributo
    setAttributes({
      ...attributes,
      [attributeName]: attributes[attributeName] - 1
    });
  };

  return (
    <div className="dashboard">
      {/* Cabeçalho com informações do jogador */}
      <header className="dashboard-header">
        <div className="header-info">
          <h1>{shipInfo.name}</h1>
          <p>Commander: {playerData.nickname} | Role: {playerData.role}</p>
        </div>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      {/* Conteúdo principal do painel */}
      <main className="dashboard-content">
        {/* Cartão de status da nave */}
        <ShipStatusCard shipInfo={shipInfo} />

        {/* Seção de controle de atributos */}
        <section className="attributes-section">
          <h2>Ship Attributes</h2>
          <div className="attributes-grid">
            {/* Renderiza um controle para cada atributo */}
            {Object.entries(attributes).map(([attributeName, value]) => (
              <AttributeControl
                key={attributeName}
                attributeName={attributeName}
                value={value}
                onIncrement={() => handleIncrement(attributeName)}
                onDecrement={() => handleDecrement(attributeName)}
                canEdit={canEdit(playerData.role)}
                isMaxed={value === 6}
                isMinned={value === 0}
              />
            ))}
          </div>

          {/* Exibe os pontos restantes para distribuição */}
          <div className="remaining-points">
            <p className="points-label">Remaining Points:</p>
            <p className={`points-value ${remainingPoints === 0 ? "fully-used" : ""}`}>
              {remainingPoints}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ShipDashboard;