import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import {
  getAllShips,
  getMaxSpeed,
  accelerateShip,
  failManeuver,
  rollEnemySpeed,
  resolveEngagement,
  getProximityModifiers,
  getProximity,
  changeProximity,
  getProximityMatrix,
} from "../utils/mockApi";
import "../styles/RadarTatico.css";

const proximityLabel = (p) => ["", "CONTATO", "PERTO", "MÉDIO", "LONGE", "LIMITE"][p] ?? "—";

const blipPosition = (index, total, ringRadius) => {
  const angle = ((2 * Math.PI) / total) * index - Math.PI / 2;
  return {
    x: 50 + ringRadius * Math.cos(angle),
    y: 50 + ringRadius * Math.sin(angle),
  };
};

const RING_RADII = [0, 10, 20, 30, 40, 48];

const RadarTatico = ({
  playerShipId,
  playerRole,
  onProximityChange,
  theme = "default",
  onFail,
}) => {
  const isMestre   = playerRole === "mestre";
  const isPiloto   = playerRole === "piloto";
  const isStarfield = theme === "starfield";

  const getProximityColor = (p) => {
    if (isStarfield) {
      if (p <= 2) return "#a2312d";
      if (p === 3) return "#d89329";
      if (p === 4) return "#2a9aae";
      return "#809aab";
    }
    if (p <= 1) return "#ff3c1e";
    if (p === 2) return "#ff8c00";
    if (p === 3) return "#ffae00";
    if (p === 4) return "#4a9eff";
    return "#6b7a8d";
  };

  const radarThemeColors = {
    bgPulse:       isStarfield ? "rgba(42, 154, 174, 0.08)" : "rgba(255,80,40,0.06)",
    sweep:         isStarfield ? "rgba(42, 154, 174, 0.4)"  : "rgba(255,80,40,0.35)",
    player:        isStarfield ? "#64a9b8" : "#4a9eff",
    ringStroke:    isStarfield ? "rgba(208,208,208,0.15)"   : "rgba(255,255,255,0.06)",
    ringMidStroke: isStarfield ? "rgba(208,208,208,0.4)"    : "rgba(255,255,255,0.12)",
  };

  const [allShips,    setAllShips]    = useState({});
  const [playerShip,  setPlayerShip]  = useState(null);
  const [enemies,     setEnemies]     = useState([]);
  // proxMatrix: { "aliadoId__inimigoId": number }
  const [proxMatrix,  setProxMatrix]  = useState({});
  const [accelInput,  setAccelInput]  = useState("");
  const [engagementResult, setEngagementResult] = useState(null);
  const [pendingChoice,    setPendingChoice]    = useState(null);
  const [flashBlip,   setFlashBlip]   = useState(null);
  const [statusMsg,   setStatusMsg]   = useState("");
  const [engagingAliadoId, setEngagingAliadoId] = useState(null);

  const accelerateSound = useRef(new Audio("/acelerar.wav"));

  const refresh = useCallback(async () => {
    const ships  = await getAllShips();
    const matrix = await getProximityMatrix();
    setAllShips(ships);
    setProxMatrix(matrix);
    const ps = ships[playerShipId];
    if (ps) setPlayerShip(ps);
    setEnemies(
      Object.values(ships).filter((s) => s.isEnemy && s.status === "ativa")
    );
  }, [playerShipId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    const handleStorage = (e) => {
      if (
        e.key === "heavens_door_ships_db" ||
        e.key === "heavens_door_proximity_matrix"
      ) {
        refresh();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  // Helper: lê a proximidade da matriz local (síncrono, sem Firebase)
  const getProxFromMatrix = (aliadoId, inimigoId) => {
    const key = `${aliadoId}__${inimigoId}`;
    return proxMatrix[key] !== undefined ? proxMatrix[key] : 3;
  };

  const handleAccelerate = async () => {
    const val = parseInt(accelInput);
    if (isNaN(val) || val < 0) return;
    const result = await accelerateShip(playerShipId, val);
    if (accelerateSound.current) {
      accelerateSound.current.currentTime = 0;
      accelerateSound.current.volume = 1.0;
      accelerateSound.current.play().catch((e) =>
        console.warn("Áudio bloqueado:", e)
      );
    }
    setAccelInput("");
    setStatusMsg(`⚡ Velocidade: ${result.newSpeed} / VM${result.maxSpeed}`);
    refresh();
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const handleFailManeuver = async () => {
    const newSpeed = await failManeuver(playerShipId);
    if (onFail) onFail();
    setStatusMsg(
      `💥 DERRAPAGEM! Velocidade caiu para ${newSpeed}. -20% precisão neste turno.`
    );
    refresh();
    setTimeout(() => setStatusMsg(""), 4000);
  };

  const handleRollEnemySpeed = async (shipId) => {
    const result = await rollEnemySpeed(shipId);
    setFlashBlip(shipId);
    if (result.success) {
      setStatusMsg(
        `✅ ${allShips[shipId]?.name}: Pilotagem [${result.d100}/${result.precisao}%]. Rolou +${result.rolled} → VM ${result.newSpeed}/${result.maxSpeed}`
      );
    } else {
      setStatusMsg(
        `💥 ${allShips[shipId]?.name}: FALHOU na Pilotagem [${result.d100}/${result.precisao}%]! Nave derrapou (VM ${result.newSpeed}).`
      );
    }
    refresh();
    setTimeout(() => setFlashBlip(null), 800);
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const handleResolveEngagement = async () => {
    const results = await resolveEngagement(playerShipId);
    if (results.length === 0) {
      setStatusMsg("Nenhuma nave inimiga ativa.");
      setTimeout(() => setStatusMsg(""), 3000);
      return;
    }
    setEngagingAliadoId(playerShipId);
    setEngagementResult(results);
    setPendingChoice(results[0]);
  };

  const handleProximityChoice = async (delta) => {
    if (!pendingChoice) return;
    const aliadoId = pendingChoice.aliadoId || playerShipId;
    await changeProximity(aliadoId, pendingChoice.enemyId, delta);

    setFlashBlip(pendingChoice.enemyId);
    setTimeout(() => setFlashBlip(null), 600);

    const remaining = engagementResult.filter(
      (r) => r.enemyId !== pendingChoice.enemyId
    );
    setEngagementResult(remaining);
    if (remaining.length > 0) {
      setPendingChoice(remaining[0]);
    } else {
      setPendingChoice(null);
      setEngagementResult(null);
      setEngagingAliadoId(null);
      setStatusMsg("✅ Engajamento resolvido!");
      setTimeout(() => setStatusMsg(""), 3000);
    }
    await refresh();
    if (onProximityChange) onProximityChange();
  };

  const renderRadar = () => {
    const rings = [1, 2, 3, 4, 5];

    // Agrupa inimigos pela proximidade relativa a esta nave (lida da matriz local)
    const byProximity = {};
    enemies.forEach((e) => {
      const p = getProxFromMatrix(playerShipId, e.id);
      if (!byProximity[p]) byProximity[p] = [];
      byProximity[p].push({ ...e, _displayProx: p });
    });

    return (
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="rt-svg"
      >
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={radarThemeColors.bgPulse} />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <filter id="blipGlow">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="50" cy="50" r="50" fill="url(#radarBg)" />
        <line
          x1="50" y1="2" x2="50" y2="98"
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.3"
        />
        <line
          x1="2" y1="50" x2="98" y2="50"
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.3"
        />

        {rings.map((r) => (
          <g key={r}>
            <circle
              cx="50" cy="50"
              r={RING_RADII[r]}
              fill="none"
              stroke={r === 3 ? radarThemeColors.ringMidStroke : radarThemeColors.ringStroke}
              strokeWidth={r === 3 ? "0.4" : "0.25"}
              strokeDasharray={r === 5 ? "1.5 2" : "none"}
            />
            <text
              x={50 + RING_RADII[r] - 0.5}
              y="51.5"
              fontSize="2.2"
              fill={getProximityColor(r)}
              opacity="0.8"
              fontFamily="JetBrains Mono, monospace"
            >
              P{r}
            </text>
          </g>
        ))}

        <line
          x1="50" y1="50" x2="50" y2="2"
          stroke={radarThemeColors.sweep}
          strokeWidth="0.5"
          className="rt-sweep"
        />

        <g>
          <circle
            cx="50" cy="50" r="2.5"
            fill={radarThemeColors.player}
            className="rt-player-pulse"
          />
          <polygon
            points="50,46.5 52.5,52 50,50.5 47.5,52"
            fill={radarThemeColors.player}
            opacity="0.9"
          />
          {playerShip?.isDerrapando && (
            <circle
              cx="50" cy="50" r="4"
              fill="none"
              stroke="#d89329"
              strokeWidth="0.5"
              strokeDasharray="1 1"
              className="rt-derrap-ring"
            />
          )}
        </g>

        {rings.map((ring) => {
          const group = byProximity[ring] || [];
          return group.map((enemy, idx) => {
            const pos = blipPosition(
              idx,
              Math.max(group.length, 1),
              RING_RADII[ring]
            );
            const isFlashing = flashBlip === enemy.id;
            const color = getProximityColor(enemy._displayProx);
            return (
              <g key={enemy.id} filter="url(#blipGlow)">
                <circle
                  cx={pos.x} cy={pos.y}
                  r={isFlashing ? 3.2 : 2.2}
                  fill={color}
                  opacity={isFlashing ? 1 : 0.85}
                  className="rt-blip"
                />
                <text
                  x={pos.x} y={pos.y - 3.2}
                  fontSize="2"
                  fill={color}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  opacity="0.8"
                >
                  {enemy.name.split(" ")[0].slice(0, 6).toUpperCase()}
                </text>
              </g>
            );
          });
        })}
      </svg>
    );
  };

  const maxSpeedDisplay = playerShip ? getMaxSpeed(playerShip) : 0;
  const currentSpeed    = playerShip?.currentSpeed ?? 0;
  const isDerrapando    = playerShip?.isDerrapando ?? false;
  const speedPct        =
    maxSpeedDisplay > 0 ? (currentSpeed / maxSpeedDisplay) * 100 : 0;

  return (
    <div className={`rt-root ${isStarfield ? "theme-starfield" : ""}`}>
      <div className="rt-header">
        <div className="rt-eyebrow">HEAVEN'S DOOR // SONAR TÁTICO</div>
        <div className="rt-subtitle">RADAR DE NAVEGAÇÃO</div>
      </div>

      <div className="rt-radar-wrap">
        {renderRadar()}
        <div className="rt-speed-hud">
          <div className="rt-speed-label">VELOC.</div>
          <div className={`rt-speed-val ${isDerrapando ? "is-derrap" : ""}`}>
            {currentSpeed}
            <span className="rt-speed-max">/{maxSpeedDisplay}</span>
          </div>
          <div className="rt-speed-bar-bg">
            <div
              className={`rt-speed-bar-fill ${
                speedPct > 80 ? "high" : speedPct > 40 ? "mid" : "low"
              }`}
              style={{ width: `${speedPct}%` }}
            />
          </div>
          {isDerrapando && (
            <div className="rt-derrap-badge">⚠ DERRAPANDO −20%</div>
          )}
        </div>
      </div>

      {/* Lista de inimigos com proximidade relativa a ESTA nave */}
      <div className="rt-enemy-list">
        {enemies.length === 0 && (
          <div className="rt-no-enemies">Sem contatos ativos</div>
        )}
        {enemies.map((enemy) => {
          const prox  = getProxFromMatrix(playerShipId, enemy.id);
          const mods  = getProximityModifiers(prox, enemy.isDerrapando);
          const color = getProximityColor(prox);
          return (
            <div key={enemy.id} className="rt-enemy-row">
              <div className="rt-enemy-left">
                <span className="rt-enemy-name">{enemy.name}</span>
                <span className="rt-enemy-speed">
                  {enemy.currentSpeed ?? 0}/{getMaxSpeed(enemy)} VM
                  {enemy.isDerrapando && (
                    <span className="rt-skid-tag"> DERRAP</span>
                  )}
                </span>
              </div>
              <div className="rt-enemy-right">
                <span
                  className="rt-prox-badge"
                  style={{ borderColor: color, color }}
                >
                  P{prox} {proximityLabel(prox)}
                </span>
                {mods.advantageBonus > 0 && (
                  <span className="rt-mod-tag green">
                    +{mods.advantageBonus}d VTG
                  </span>
                )}
                {prox === 4 && (
                  <span className="rt-mod-tag yellow">PREC ÷2</span>
                )}
                {prox === 5 && (
                  <span className="rt-mod-tag red">BLOQUEADO</span>
                )}
                {isMestre && (
                  <div className="rt-master-enemy-btns">
                    <button
                      className="rt-mini-btn"
                      onClick={() => handleRollEnemySpeed(enemy.id)}
                    >
                      🎲 VEL
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {statusMsg && <div className="rt-status-msg">{statusMsg}</div>}

      {/* Popup de Engajamento */}
      {pendingChoice && (
        <div className="rt-engagement-popup">
          <div className="rt-eng-header">
            <div className="rt-eng-dot" />
            <span>RESOLUÇÃO DE ENGAJAMENTO</span>
            {engagingAliadoId && (
              <span
                style={{
                  marginLeft: "auto",
                  color: "rgba(74,158,255,0.7)",
                  fontSize: "0.5rem",
                }}
              >
                [{allShips[engagingAliadoId]?.name || engagingAliadoId}]
              </span>
            )}
          </div>
          <div className="rt-eng-body">
            <div className="rt-eng-name">{pendingChoice.enemyName}</div>
            <div className="rt-eng-speeds">
              <span className="rt-eng-spd ally">
                Jogadores: {pendingChoice.playerSpeed}
              </span>
              <span className="rt-eng-vs">VS</span>
              <span className="rt-eng-spd enemy">
                Inimigo: {pendingChoice.enemySpeed}
              </span>
            </div>
            <div
              className={`rt-eng-winner ${
                pendingChoice.winner === "player" ? "ally" : "enemy"
              }`}
            >
              {pendingChoice.winner === "player"
                ? "⚡ JOGADORES VENCERAM A MANOBRA"
                : "⚡ INIMIGO VENCEU A MANOBRA"}
            </div>
            <div className="rt-eng-question">
              {pendingChoice.winner === "player"
                ? "Mestre: deseja aproximar ou afastar esta nave?"
                : "Mestre: o inimigo deseja aproximar ou afastar?"}
            </div>
            <div className="rt-eng-btns">
              <button
                className="rt-eng-btn closer"
                onClick={() => handleProximityChoice(-1)}
              >
                ◀ APROXIMAR (P−1)
              </button>
              <button
                className="rt-eng-btn further"
                onClick={() => handleProximityChoice(+1)}
              >
                AFASTAR (P+1) ▶
              </button>
            </div>
            {engagementResult && engagementResult.length > 1 && (
              <div className="rt-eng-remaining">
                +{engagementResult.length - 1} nave(s) restante(s)
              </div>
            )}
          </div>
        </div>
      )}

      {isPiloto && (
        <div className="rt-pilot-controls">
          <div className="rt-ctrl-label">
            ACELERAÇÃO — insira o dado rolado
          </div>
          <div className="rt-accel-row">
            <input
              type="number"
              className="rt-accel-input"
              value={accelInput}
              onChange={(e) => setAccelInput(e.target.value)}
              placeholder="dado"
              min={0}
            />
            <button className="rt-accel-btn" onClick={handleAccelerate}>
              ACELERAR
            </button>
          </div>
          <button className="rt-fail-btn" onClick={handleFailManeuver}>
            ⚠ FALHA EM MANOBRA
          </button>
        </div>
      )}

      {isMestre && (
        <div className="rt-master-controls">
          <button
            className="rt-resolve-btn"
            onClick={handleResolveEngagement}
            disabled={!!pendingChoice}
          >
            ENGAJAMENTO
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(RadarTatico);