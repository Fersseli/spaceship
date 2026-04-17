import React, { useState, useEffect } from "react";
import { playersList } from "../utils/players";
import "../styles/AssignCrew.css";

const TORRETAS = [
  { id: "esquerda", label: "Torreta Esquerda", capabilities: ["Tiro"] },
  { id: "centro",   label: "Torreta Centro",   capabilities: ["Tiro", "Míssil"] },
  { id: "direita",  label: "Torreta Direita",  capabilities: ["Tiro"] },
];

const CREW_STORAGE_KEY = "crew_assignments";

const loadAssignments = () => {
  try {
    const raw = localStorage.getItem(CREW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { copiloto: null, torretas: {} };
  } catch {
    return { copiloto: null, torretas: {} };
  }
};

const saveAssignments = (data) => {
  localStorage.setItem(CREW_STORAGE_KEY, JSON.stringify(data));
};

const AssignCrew = ({ currentPlayer, currentRole, onClose }) => {
  const isPilot = currentRole === "piloto";

  const [assignments, setAssignments] = useState(loadAssignments);
  const [onlineMap, setOnlineMap] = useState({});
  const [error, setError] = useState("");

  // Lê status online de todos os jogadores
  useEffect(() => {
    const readOnline = () => {
      const map = {};
      playersList.forEach((p) => {
        map[p.id] = localStorage.getItem(`status_${p.id}`) === "online";
      });
      setOnlineMap(map);
    };

    readOnline();
    const interval = setInterval(readOnline, 3000);
    return () => clearInterval(interval);
  }, []);

  // Jogadores que não são o piloto atual
  const otherPlayers = playersList.filter((p) => p.id !== currentPlayer.nickname);

  const handleSetCopiloto = (playerId) => {
    if (!isPilot) return;
    setError("");

    setAssignments((prev) => {
      // Se ele já é copiloto e estamos clicando de novo, apenas remove o cargo (toggle)
      if (prev.copiloto === playerId) {
        return { ...prev, copiloto: null };
      }

      // Se ele está virando copiloto agora, removemos de qualquer torreta
      const newTorretas = { ...prev.torretas };
      Object.keys(newTorretas).forEach((t) => {
        if (newTorretas[t] === playerId) delete newTorretas[t];
      });

      return {
        ...prev,
        copiloto: playerId,
        torretas: newTorretas,
      };
    });
  };

  const handleSetTorreta = (playerId, torretaId) => {
    if (!isPilot) return;

    setAssignments((prev) => {
      // --- NOVO: Impede que o copiloto assuma uma torreta ---
      if (prev.copiloto === playerId) {
        setError("O co-piloto não pode assumir posições em torretas simultaneamente.");
        return prev;
      }
      // ------------------------------------------------------
      
      setError("");
      const newTorretas = { ...prev.torretas };

      // Remove jogador de qualquer torreta que já esteja
      Object.keys(newTorretas).forEach((t) => {
        if (newTorretas[t] === playerId) delete newTorretas[t];
      });

      // Se clicou na torreta que já era dele, só remove (toggle)
      const current = prev.torretas[torretaId];
      if (current === playerId) return { ...prev, torretas: newTorretas };

      // Se a torreta já tem outro jogador, libera ela
      newTorretas[torretaId] = playerId;

      return { ...prev, torretas: newTorretas };
    });
  };

  const handleSave = () => {
    if (!assignments.copiloto) {
      setError("É necessário ter um co-piloto para salvar.");
      return;
    }

    // --- NOVO: Promove e despromove jogadores em tempo real ---
    
    // 1. O jogador escolhido é promovido a co-piloto no sistema
    localStorage.setItem(`role_${assignments.copiloto}`, "copiloto");

    // 2. Procura quem perdeu a vaga e rebaixa para tripulante
    playersList.forEach((p) => {
      if (p.id !== assignments.copiloto && p.id !== currentPlayer.nickname) {
        if (localStorage.getItem(`role_${p.id}`) === "copiloto") {
          localStorage.setItem(`role_${p.id}`, "tripulante");
        }
      }
    });
    // ----------------------------------------------------------

    saveAssignments(assignments);
    onClose();
  };

  const getRoleLabel = (playerId) => {
  if (playerId === currentPlayer.nickname) return "Piloto";
  if (assignments.copiloto === playerId) return "Co-piloto";
  const torreta = Object.entries(assignments.torretas).find(([, v]) => v === playerId);
  if (torreta) return `Torreta ${torreta[0].charAt(0).toUpperCase() + torreta[0].slice(1)}`;
  return localStorage.getItem(`role_${playerId}`) === "copiloto" ? "Co-piloto" : "Tripulante"; // <- muda só essa linha
  };

  return (
    <div className="assign-overlay" onClick={onClose}>
      <div className="assign-modal" onClick={(e) => e.stopPropagation()}>

        <div className="assign-header">
          <h2 className="assign-title">ASSIGN CREW</h2>
          <button className="assign-close" onClick={onClose}>×</button>
        </div>

        {!isPilot && (
          <p className="assign-readonly-notice">Apenas o piloto pode alterar as atribuições.</p>
        )}

        <div className="assign-body">

          {/* Lista de jogadores */}
          <div className="assign-players">
            {otherPlayers.map((player) => {
              const isOnline = onlineMap[player.id];
              const isCopiloto = assignments.copiloto === player.id;
              const torretaEntry = Object.entries(assignments.torretas).find(([, v]) => v === player.id);
              const torretaAtual = torretaEntry ? torretaEntry[0] : null;

              return (
                <div key={player.id} className={`assign-player-row ${isCopiloto ? "is-copiloto" : ""}`}>

                  {/* Nome + status */}
                  <div className="assign-player-info">
                    <span
                      className="assign-status-dot"
                      style={{ background: isOnline ? "#2a9aae" : "#383d41" }}
                      title={isOnline ? "Online" : "Offline"}
                    />
                    <span className="assign-player-name">{player.label}</span>
                    <span className="assign-player-role">{getRoleLabel(player.id)}</span>
                  </div>

                  {/* --- NOVO: Controles ocultos para não-pilotos --- */}
                  {isPilot && (
                    <div className="assign-player-controls">
                      {/* Botão co-piloto */}
                      <button
                        className={`assign-btn ${isCopiloto ? "active" : ""}`}
                        onClick={() => handleSetCopiloto(player.id)}
                        title="Definir como co-piloto"
                      >
                        CO-PIL
                      </button>

                      {/* Torretas */}
                    {TORRETAS.map((torreta) => {
                      const ocupado = assignments.torretas[torreta.id];
                      const isMinha = torretaAtual === torreta.id;
                      
                      const isSelfPilot = player.id === currentPlayer.nickname && currentPlayer.role === "piloto";
  const bloqueado = isCopiloto || isSelfPilot || (!isMinha && ocupado && ocupado !== player.id);

  return (
    <button
      key={torreta.id}
      className={`assign-btn ${isMinha ? "active" : ""} ${bloqueado ? "blocked" : ""}`}
      onClick={() => handleSetTorreta(player.id, torreta.id)}
      disabled={!isPilot || bloqueado} // O botão fica desativado nativamente
                          title={`${torreta.label} — ${torreta.capabilities.join(", ")}`}
                        >
                          {torreta.id === "esquerda" && "T.ESQ"}
                          {torreta.id === "centro"   && "T.CTR"}
                          {torreta.id === "direita"  && "T.DIR"}
                        </button>
                      );
                    })}
                    </div>
                  )}
                  {/* ----------------------------------------------- */}

                </div>
              );
            })}
          </div>

          {/* Resumo de torretas */}
          <div className="assign-torretas-summary">
            {TORRETAS.map((torreta) => {
              const ocupante = assignments.torretas[torreta.id];
              return (
                <div key={torreta.id} className="assign-torreta-card">
                  <div className="assign-torreta-name">{torreta.label}</div>
                  <div className="assign-torreta-caps">{torreta.capabilities.join(" · ")}</div>
                  <div className={`assign-torreta-ocupante ${ocupante ? "filled" : "empty"}`}>
                    {ocupante || "—"}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {error && <div className="assign-error">{error}</div>}

        {isPilot && (
          <div className="assign-footer">
            <button className="assign-save-btn" onClick={handleSave}>
              Salvar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AssignCrew;
