import React, { useState, useEffect } from "react";
import { playersList } from "../utils/players";
import { getShipData } from "../utils/mockApi";
import "../styles/AssignCrew.css";
import { removePlayerFromAllCrews } from "../utils/mockApi"; // Adicione o import para a função de limpeza de tripulação


const CREW_STORAGE_KEY = "crew_assignments";

const loadAssignments = (shipId) => {
  try {
    // Cada nave tem seu próprio espaço de atribuições no storage
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

  // Puxa a configuração da nave diretamente do banco
  const shipInfo = getShipData(shipId);
  const crewConfig = shipInfo?.crew;
  const TORRETAS = crewConfig?.torretas ?? [];
  const hasCopiloto = crewConfig?.hasCopiloto ?? true;

  const [assignments, setAssignments] = useState(() => loadAssignments(shipId));
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

  // Filtra jogadores da mesma nave. Se ship_ não estiver salvo ainda,
  // assume hawthorne_iii (padrão do sistema).
  const crewPlayers = playersList.filter((p) => {
    if (p.id === currentPlayer.nickname) return false;
    const savedShip = localStorage.getItem(`ship_${p.id}`) || "hawthorne_iii";
    return savedShip === shipId;
  });

  // --- HANDLERS ---

  const handleSetCopiloto = (playerId) => {
    if (!isPilot || !hasCopiloto) return;
    setError("");
    setAssignments((prev) => {
      if (prev.copiloto === playerId) {
        return { ...prev, copiloto: null };
      }
      // Remove da torreta se estava lá
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
      // Na Hawthorne: copiloto não pode também estar numa torreta
      if (hasCopiloto && prev.copiloto === playerId) {
        setError("O co-piloto não pode assumir posições em torretas simultaneamente.");
        return prev;
      }
      setError("");
      const newTorretas = { ...prev.torretas };

      // Remove de qualquer torreta que já esteja
      Object.keys(newTorretas).forEach((t) => {
        if (newTorretas[t] === playerId) delete newTorretas[t];
      });

      // Toggle: se já era desta torreta, só remove
      if (prev.torretas[torretaId] === playerId) {
        return { ...prev, torretas: newTorretas };
      }

      // Na Vanguard (sem copiloto separado): torreta central = posto de co-piloto
      // Apenas um jogador pode ocupar a torreta central
      newTorretas[torretaId] = playerId;
      return { ...prev, torretas: newTorretas };
    });
  };

  const handleSave = () => {
    // Validação: Hawthorne exige copiloto; Vanguard exige torreta central ocupada
    if (hasCopiloto && !assignments.copiloto) {
      setError("É necessário definir um co-piloto para salvar.");
      return;
    }
    if (!hasCopiloto && !assignments.torretas["centro"]) {
      setError("É necessário atribuir um tripulante à Torreta Central.");
      return;
    }

    // Promove/despromove cargos no localStorage
    if (hasCopiloto && assignments.copiloto) {
      localStorage.setItem(`role_${assignments.copiloto}`, "copiloto");
      // Rebaixa quem perdeu a vaga de copiloto nesta nave
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
      // Na Vanguard, quem está na torreta central é o co-piloto/artilheiro
      if (!hasCopiloto && torretaEntry[0] === "centro") return "Co-piloto / Artilheiro";
      return `Torreta ${torretaEntry[0].charAt(0).toUpperCase() + torretaEntry[0].slice(1)}`;
    }
    return "Tripulante";
  };

  return (
    <div className="assign-overlay" onClick={onClose}>
      <div className="assign-modal" onClick={(e) => e.stopPropagation()}>

        <div className="assign-header">
          <h2 className="assign-title">ASSIGN CREW — {shipInfo?.name?.toUpperCase()}</h2>
          <button className="assign-close" onClick={onClose}>×</button>
        </div>

        {!isPilot && (
          <p className="assign-readonly-notice">Apenas o piloto pode alterar as atribuições.</p>
        )}

        <div className="assign-body">

          {/* Lista de jogadores DA MESMA NAVE */}
          <div className="assign-players">
            {crewPlayers.length === 0 && (
              <p style={{ color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.8rem" }}>
                Nenhum tripulante desta nave está disponível.
              </p>
            )}

            {crewPlayers.map((player) => {
              const isOnline = onlineMap[player.id];
              const isCopiloto = hasCopiloto && assignments.copiloto === player.id;
              const torretaEntry = Object.entries(assignments.torretas).find(([, v]) => v === player.id);
              const torretaAtual = torretaEntry ? torretaEntry[0] : null;

              return (
                <div key={player.id} className={`assign-player-row ${isCopiloto ? "is-copiloto" : ""}`}>
                  <div className="assign-player-info">
                    <span
                      className="assign-status-dot"
                      style={{ background: isOnline ? "#2a9aae" : "#383d41" }}
                      title={isOnline ? "Online" : "Offline"}
                    />
                    <span className="assign-player-name">{player.label}</span>
                    <span className="assign-player-role">{getRoleLabel(player.id)}</span>
                  </div>

                  {isPilot && (
                    <div className="assign-player-controls">

                      {/* Botão co-piloto — só aparece em naves que têm a vaga separada */}
                      {hasCopiloto && (
                        <button
                          className={`assign-btn ${isCopiloto ? "active" : ""}`}
                          onClick={() => handleSetCopiloto(player.id)}
                          title="Definir como co-piloto"
                        >
                          CO-PIL
                        </button>
                      )}

                      {/* Torretas da nave */}
                      {TORRETAS.map((torreta) => {
                        const ocupado = assignments.torretas[torreta.id];
                        const isMinha = torretaAtual === torreta.id;
                        const bloqueado = isCopiloto || (!isMinha && ocupado && ocupado !== player.id);

                        return (
                          <button
                            key={torreta.id}
                            className={`assign-btn ${isMinha ? "active" : ""} ${bloqueado ? "blocked" : ""}`}
                            onClick={() => handleSetTorreta(player.id, torreta.id)}
                            disabled={!isPilot || bloqueado}
                            title={`${torreta.label} — ${torreta.capabilities.join(", ")}`}
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

{/* Resumo de torretas com indicadores de avaria */}
          <div className="assign-torretas-summary">
  {hasCopiloto && (
    <div className="assign-torreta-card">
      <div className="assign-torreta-name">Co-piloto</div>
      <div className="assign-torreta-caps">Controles · Navegação</div>
      <div className={`assign-torreta-ocupante ${assignments.copiloto ? "filled" : "empty"}`}>
        {assignments.copiloto || "—"}
      </div>
    </div>
  )}

  {TORRETAS.map((torreta) => {
    const ocupante = assignments.torretas[torreta.id];
    
    // Puxa os dados dinâmicos da nave para checar avarias
    const shipGlobal = getShipData(shipId); 
    const memberData = shipGlobal?.activeCrew?.find(m => 
      m.function === `TORRETA ${torreta.id.toUpperCase()}`
    );

    const status = memberData?.moduleStatus || 'operacional';
    const turnos = memberData?.turnosParaReparo || 0;

    return (
      <div key={torreta.id} className={`assign-torreta-card status-${status}`}>
        <div className="assign-torreta-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div className="assign-torreta-name" style={{ fontSize: '0.7rem', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase' }}>
            {torreta.label}
          </div>
          
          {/* Bolinhas roxas ao lado do nome */}
          <div className="assign-status-dots" style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            {status === "avariada" && Array.from({ length: turnos }).map((_, i) => (
              <span key={i} className="status-dot purple" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#b026ff', boxShadow: '0 0 5px #b026ff' }}></span>
            ))}
          </div>

          {/* Botão de Reparo Exclusivo para o Piloto */}
          {isPilot && status === "avariada" && (
            <button 
              onClick={() => {
                const requests = JSON.parse(localStorage.getItem("repair_requests") || "[]");
                const newRequest = {
                  id: Date.now(),
                  shipName: shipInfo.name,
                  shipId: shipId,
                  module: torreta.label,
                  moduleId: memberData.id,
                  pilot: currentPlayer.nickname
                };
                localStorage.setItem("repair_requests", JSON.stringify([...requests, newRequest]));
                alert("Solicitação de reparo enviada ao comando.");
              }}
              style={{ 
                fontSize: '0.5rem', padding: '1px 4px', background: 'rgba(176, 38, 255, 0.2)', 
                border: '1px solid #b026ff', color: '#b026ff', cursor: 'pointer', borderRadius: '2px',
                fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold'
              }}
            >
              REPARO
            </button>
          )}
        </div>
        
        <div className="assign-torreta-caps" style={{ fontSize: '0.65rem', color: '#b8b8b8', marginBottom: '8px' }}>
          {torreta.capabilities.join(" · ")}
        </div>
        
        <div className={`assign-torreta-ocupante ${ocupante ? "filled" : "empty"}`} style={{ fontSize: '0.8rem', fontWeight: '700', color: ocupante ? '#98fbff' : 'rgba(200, 200, 200, 0.3)' }}>
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