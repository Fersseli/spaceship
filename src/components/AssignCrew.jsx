import React, { useState, useEffect } from "react";
import { playersList } from "../utils/players";
import { getShipData, removePlayerFromAllCrews } from "../utils/mockApi";
import "../styles/AssignCrew.css";

const CREW_STORAGE_KEY = "crew_assignments";

const loadAssignments = (shipId) => {
  try {
    const raw = localStorage.getItem(`${CREW_STORAGE_KEY}_${shipId}`);
    return raw ? JSON.parse(raw) : { copiloto: null, torretas: {} };
  } catch {
    return { copiloto: null, torretas: {} };
  }
};

const saveAssignments = (shipId, data) => {
  localStorage.setItem(`${CREW_STORAGE_KEY}_${shipId}`, JSON.stringify(data));
};

const AssignCrew = ({ currentPlayer, currentRole, onClose }) => {
  const isPilot = currentRole === "piloto";
  const shipId = currentPlayer.ship;

  const [shipData, setShipData] = useState(() => getShipData(shipId));
  const crewConfig = shipData?.crew;
  const TORRETAS = crewConfig?.torretas ?? [];
  const hasCopiloto = crewConfig?.hasCopiloto ?? true;

  const [assignments, setAssignments] = useState(() => loadAssignments(shipId));
  const [onlineMap, setOnlineMap] = useState({});
  const [error, setError] = useState("");

  // Atualiza a aba instantaneamente se a nave tomar dano
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "heavens_door_ships_db") {
        setShipData(getShipData(shipId));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [shipId]);

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

  const crewPlayers = playersList.filter((p) => {
    if (p.id === currentPlayer.nickname) return false;
    const savedShip = localStorage.getItem(`ship_${p.id}`) || "hawthorne_iii";
    return savedShip === shipId;
  });

  const handleSetCopiloto = (playerId) => {
    if (!isPilot || !hasCopiloto) return;
    setError("");
    setAssignments((prev) => {
      if (prev.copiloto === playerId) return { ...prev, copiloto: null };
      const newTorretas = { ...prev.torretas };
      Object.keys(newTorretas).forEach((t) => {
        if (newTorretas[t] === playerId) delete newTorretas[t];
      });
      return { ...prev, copiloto: playerId, torretas: newTorretas };
    });
  };

  const handleSetTorreta = (playerId, torretaId) => {
    if (!isPilot) return;
    setAssignments((prev) => {
      if (hasCopiloto && prev.copiloto === playerId) {
        setError("O co-piloto não pode assumir posições em torretas simultaneamente.");
        return prev;
      }
      setError("");
      const newTorretas = { ...prev.torretas };
      Object.keys(newTorretas).forEach((t) => {
        if (newTorretas[t] === playerId) delete newTorretas[t];
      });
      if (prev.torretas[torretaId] === playerId) return { ...prev, torretas: newTorretas };
      newTorretas[torretaId] = playerId;
      return { ...prev, torretas: newTorretas };
    });
  };

  const handleSave = () => {
    if (hasCopiloto && !assignments.copiloto) {
      setError("É necessário definir um co-piloto para salvar.");
      return;
    }
    if (!hasCopiloto && !assignments.torretas["centro"]) {
      setError("É necessário atribuir um tripulante à Torreta Central.");
      return;
    }
    if (hasCopiloto && assignments.copiloto) {
      localStorage.setItem(`role_${assignments.copiloto}`, "copiloto");
      playersList.forEach((p) => {
        if (p.id !== assignments.copiloto && p.id !== currentPlayer.nickname) {
          if (localStorage.getItem(`role_${p.id}`) === "copiloto") {
            localStorage.setItem(`role_${p.id}`, "tripulante");
          }
        }
      });
    }
    saveAssignments(shipId, assignments);
    onClose();
  };

  const getRoleLabel = (playerId) => {
    if (playerId === currentPlayer.nickname) return "Piloto";
    if (hasCopiloto && assignments.copiloto === playerId) return "Co-piloto";
    const torretaEntry = Object.entries(assignments.torretas).find(([, v]) => v === playerId);
    if (torretaEntry) {
      if (!hasCopiloto && torretaEntry[0] === "centro") return "Co-piloto / Artilheiro";
      return `Torreta ${torretaEntry[0].charAt(0).toUpperCase() + torretaEntry[0].slice(1)}`;
    }
    return "Tripulante";
  };

  return (
    <div className="assign-overlay" onClick={onClose}>
      <div className="assign-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* ELEMENTOS VISUAIS DO HUD */}
        <div className="assign-scanline" />
        <div className="assign-corner assign-corner--tl" />
        <div className="assign-corner assign-corner--tr" />
        <div className="assign-corner assign-corner--bl" />
        <div className="assign-corner assign-corner--br" />

        <div className="assign-header">
          <div className="assign-header-left">
            <div className="assign-alert-dot" />
            <div>
              <div className="assign-eyebrow">HEAVEN'S DOOR // CREW MGT</div>
              <h2 className="assign-title">{shipData?.name?.toUpperCase()}</h2>
            </div>
          </div>
          <button className="assign-close" onClick={onClose}>×</button>
        </div>

        {!isPilot && (
          <p className="assign-readonly-notice">STATUS: MODO DE VISUALIZAÇÃO APENAS</p>
        )}

        <div className="assign-body">
          <div className="assign-players">
            {crewPlayers.length === 0 && (
              <p className="assign-empty-msg">Nenhum tripulante detectado no setor.</p>
            )}

            {crewPlayers.map((player) => {
              const isOnline = onlineMap[player.id];
              const isCopiloto = hasCopiloto && assignments.copiloto === player.id;

              return (
                <div key={player.id} className={`assign-player-row ${isCopiloto ? "is-copiloto" : ""}`}>
                  <div className="assign-player-info">
                    <span
                      className={`assign-status-dot ${isOnline ? "online" : "offline"}`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                    <div className="assign-player-text">
                      <span className="assign-player-name">{player.label}</span>
                      <span className="assign-player-role">{getRoleLabel(player.id)}</span>
                    </div>
                  </div>

                  {/* Restaurei os botões para o piloto poder escolher as posições dos jogadores */}
                  {isPilot && (
                    <div className="assign-player-controls">
                      {hasCopiloto && (
                        <button
                          className={`assign-btn ${isCopiloto ? "active" : ""}`}
                          onClick={() => handleSetCopiloto(player.id)}
                        >
                          CO-PIL
                        </button>
                      )}
                      {TORRETAS.map((torreta) => {
                        // Verifica quem está ocupando e bloqueia lógicas
                        const ocupado = assignments.torretas[torreta.id];
                        const torretaEntry = Object.entries(assignments.torretas).find(([, v]) => v === player.id);
                        const torretaAtual = torretaEntry ? torretaEntry[0] : null;
                        
                        const isMinha = torretaAtual === torreta.id;
                        const bloqueado = isCopiloto || (!isMinha && ocupado && ocupado !== player.id);

                        return (
                          <button
                            key={torreta.id}
                            className={`assign-btn ${isMinha ? "active" : ""} ${bloqueado ? "blocked" : ""}`}
                            onClick={() => handleSetTorreta(player.id, torreta.id)}
                            disabled={!isPilot || bloqueado}
                          >
                            {torreta.id === "esquerda" && "T.ESQ"}
                            {torreta.id === "centro"   && (hasCopiloto ? "T.CTR" : "CO-PIL")}
                            {torreta.id === "direita"  && "T.DIR"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="assign-torretas-summary">
            {hasCopiloto && (
              <div className="assign-torreta-card">
                <div className="assign-torreta-header">
                  <span className="assign-torreta-name">CO-PILOTO</span>
                </div>
                <div className="assign-torreta-caps">NAVEGAÇÃO · CONTROLES</div>
                <div className={`assign-torreta-ocupante ${assignments.copiloto ? "filled" : "empty"}`}>
                  {assignments.copiloto || "— VAGO —"}
                </div>
              </div>
            )}

            {/* Este é o lugar correto dos cartões das torretas (com avarias) */}
            {TORRETAS.map((torreta) => {
              const ocupante = assignments.torretas[torreta.id];
              
              // Busca a torreta usando o estado dinâmico (shipData)
              const memberData = shipData?.activeCrew?.find(m => 
                m.id === torreta.id || m.function.includes(torreta.id.toUpperCase())
              );

              const status = memberData?.moduleStatus || 'operacional';
              const turnos = memberData?.turnosParaReparo || 0;

              return (
                <div key={torreta.id} className={`assign-torreta-card status-${status}`}>
                  <div className="assign-torreta-header">
                    <span className="assign-torreta-name">{torreta.label}</span>
                    <div className="assign-status-dots">
                      {status === "avariada" && Array.from({ length: turnos }).map((_, i) => (
                        <span key={i} className="status-dot purple"></span>
                      ))}
                    </div>
                    {isPilot && status === "avariada" && (
                      <button 
                        className="assign-repair-btn"
                        onClick={() => {
                          const requests = JSON.parse(localStorage.getItem("repair_requests") || "[]");
                          const newRequest = {
                            id: Date.now(), shipName: shipData.name, shipId: shipId,
                            module: torreta.label, moduleId: memberData.id, pilot: currentPlayer.nickname
                          };
                          localStorage.setItem("repair_requests", JSON.stringify([...requests, newRequest]));
                          alert("Solicitação de reparo enviada ao comando.");
                        }}
                      >
                        REPARO
                      </button>
                    )}
                  </div>
                  <div className="assign-torreta-caps">{torreta.capabilities.join(" · ")}</div>
                  <div className={`assign-torreta-ocupante ${ocupante ? "filled" : "empty"}`}>
                    {ocupante || "— VAGA —"}
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
              CONFIRMAR ALTERAÇÕES
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AssignCrew;