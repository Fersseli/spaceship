import React, { useState, useEffect, useRef } from "react";
import {
  getAllShips,
  updateShipConfig,
  applyModuleDamage,
  applyShieldDamage,
  applyEnginesDamage,
  selectDamageTarget,
  processGlobalTurn,
  incrementMissileLock,
  incrementBallisticLock,
  isBallisticLockEligible,
  getShipMaxAttributes,
  enforceAttributeLimits,
  getProximityModifiers,
  getProximity,
  changeProximity,
  resolveEngagement,
  ensureNavigationFields,
} from "../utils/mockApi";
import { getEffect } from "../utils/effectHelpers";
import { rollDamage, parseShield, rollHit } from "../utils/diceHelpers";
import "../styles/TerminalCombate.css";
import ConfirmModal from "./ConfirmModal";
import RadarTatico from "./RadarTatico";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const canFire = (member, shipClass) => {
  if (member.role === "piloto") return false;
  if (shipClass === "type_III" && member.role === "copiloto") return false;
  return true;
};

const usesMissiles = (member, shipClass) =>
  shipClass !== "type_II" && member.function.includes("CENTRO");

const slotClass = (role) => {
  if (role === "piloto")   return "is-piloto";
  if (role === "copiloto") return "is-copiloto";
  return "";
};

const hpBarClass = (current, max) => {
  const pct = (current / max) * 100;
  if (pct > 55) return "healthy";
  if (pct > 25) return "damaged";
  return "critical";
};

const getPrecisao = (member) =>
  typeof member.precisao === "number" ? member.precisao : "—";

// ─── Slot de tripulante ───────────────────────────────────────────────────────

const CrewSlot = ({ member, attackerShip, allShips, onFire }) => {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (member.missileTarget)        setTargetId(member.missileTarget);
    else if (member.ballisticTarget) setTargetId(member.ballisticTarget);
  }, [member.missileTarget, member.ballisticTarget]);

  const fires         = canFire(member, attackerShip.shipClass);
  const missiles      = usesMissiles(member, attackerShip.shipClass);
  const usesBallistic = isBallisticLockEligible(member, attackerShip);

  const precisao    = getPrecisao(member);
  const status      = member.moduleStatus || 'operacional';
  const turnos      = member.turnosParaReparo || 0;
  const isOperacional = status === 'operacional';

  const missileLockLevel   = member.missileLockLevel   || 0;
  const isMissileAiming    = !!member.missileTarget;
  const isMissileReady     = member.missileReady;
  const ballisticLockLevel = member.ballisticLockLevel || 0;
  const isBallisticAiming  = !!member.ballisticTarget;

  // Proximidade do atacante (inimigo) em relação a cada alvo aliado
  // Para inimigos, a proximidade é lida da matriz: getProximity(aliadoId, inimigoId)
  // O atacante é inimigo → procuramos a menor proximidade com qualquer aliado
  // (ou usamos o targetId selecionado para pegar a prox específica)
  const getProxForTarget = (tId) => {
    // Se o alvo é aliado, pegamos getProximity(tId, attackerShip.id)
    // Se o alvo é inimigo, getProximity(attackerShip.id, tId)
    const ships = allShips;
    const target = ships[tId];
    if (!target) return 3;
    if (!target.isEnemy) {
      // atacante inimigo → alvo aliado: prox = getProximity(aliadoId, inimigoId)
      return getProximity(tId, attackerShip.id);
    }
    // atacante inimigo → alvo inimigo (fogo amigo, raro)
    return 3;
  };

  const proximity   = targetId ? getProxForTarget(targetId) : 3;
  const proxMods    = getProximityModifiers(proximity, attackerShip.isDerrapando);

  const targetOptions = Object.values(allShips)
    .filter((s) => s.id !== attackerShip.id && s.status !== "desativada" && s.status !== "destruida")
    .sort((a, b) => {
      if (a.isEnemy === b.isEnemy) return 0;
      return a.isEnemy ? 1 : -1;
    });

  const handleDisparo = () => {
    onFire(member, attackerShip, targetId, missiles);
    setOpen(false);
    setTargetId("");
  };

  const handleCancelBallistic = () => {
    setOpen(false);
    setTargetId("");
    const ships = getAllShips();
    const ship  = ships[attackerShip.id];
    const crewMember = ship?.activeCrew?.find(m => m.id === member.id);
    if (crewMember) {
      crewMember.ballisticTarget    = null;
      crewMember.ballisticLockLevel = 0;
      localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
    }
  };

  const getFireLabel = () => {
    if (proxMods.blocked) return "FORA DE ALCANCE";
    if (missiles) {
      if (!isMissileAiming) return "MIRAR MÍSSIL";
      if (!isMissileReady)  return "MIRANDO...";
      return "DISPARAR MÍSSIL";
    }
    if (usesBallistic) {
      if (!isBallisticAiming)         return "MIRAR BALÍSTICO";
      if (ballisticLockLevel < 3)     return `MIRANDO... (${ballisticLockLevel}/3)`;
      return "DISPARAR";
    }
    return "DISPARAR";
  };

  const isFireDisabled = () => {
    if (!targetId) return true;
    if (proxMods.blocked) return true;
    if (missiles && isMissileAiming && !isMissileReady) return true;
    return false;
  };

  return (
    <div className={`tc-crew-slot ${slotClass(member.role)} ${open ? "is-open" : ""}`}>

      <div className="tc-crew-status-dots">
        {status === "avariada" && Array.from({ length: turnos }).map((_, i) => (
          <span key={i} className="status-dot purple" title={`${turnos} turno(s) restante(s)`}></span>
        ))}
        {status === "destruida" && (
          <span className="status-dot black" title="Destruída Permanentemente"></span>
        )}
      </div>

      <div className="tc-crew-role-dot" />
      <div className="tc-crew-function">{member.function}</div>
      <div className="tc-crew-name">{member.id}</div>

      <div className="tc-crew-attrs">
        <span className="tc-crew-attr">
          <span className="tc-crew-attr-label">D: </span>
          <span className="tc-crew-attr-value">{member.des}</span>
        </span>
        <span className="tc-crew-attr">
          <span className="tc-crew-attr-label">E: </span>
          <span className="tc-crew-attr-value">{member.esq}</span>
        </span>
        <span className="tc-crew-attr">
          <span className="tc-crew-attr-label">PREC: </span>
          <span className="tc-crew-attr-value">
            {precisao !== "—" ? `${precisao}%` : precisao}
          </span>
        </span>
      </div>

      {missiles && (
        <div className="tc-missile-lock-indicator">
          <span className="tc-lock-label">LOCK MSL:</span>
          <span className={`tc-lock-box ${missileLockLevel >= 1 ? 'filled' : ''}`}></span>
          <span className={`tc-lock-box ${missileLockLevel >= 2 ? 'filled' : ''}`}></span>
          <span className={`tc-lock-box ${missileLockLevel >= 3 ? 'filled blink-red' : ''}`}></span>
        </div>
      )}

      {usesBallistic && (
        <div className="tc-ballistic-lock-indicator">
          <span className="tc-lock-label tc-lock-label--ballistic">LOCK BAL:</span>
          <span className={`tc-lock-box tc-lock-box--ballistic ${ballisticLockLevel >= 1 ? 'filled' : ''}`}></span>
          <span className={`tc-lock-box tc-lock-box--ballistic ${ballisticLockLevel >= 2 ? 'filled' : ''}`}></span>
          <span className={`tc-lock-box tc-lock-box--ballistic ${ballisticLockLevel >= 3 ? 'filled blink-green' : ''}`}></span>
        </div>
      )}

      {/* Badge de proximidade: aparece após selecionar alvo */}
      {targetId && (
        <div className={`tc-prox-slot-badge ${proxMods.blocked ? 'blocked' : proxMods.advantageBonus > 0 ? 'advantage' : proximity === 4 ? 'penalty' : ''}`}>
          P{proximity}
          {proxMods.blocked         && ' 🚫 BLOQUEADO'}
          {proxMods.advantageBonus > 0 && ` +${proxMods.advantageBonus}d VTG`}
          {proxMods.precisionMultiplier < 1 && ' PREC÷2'}
          {attackerShip.isDerrapando && ' −20%'}
        </div>
      )}

      {fires && !open && (
        <button
          className="tc-attack-toggle-btn"
          onClick={() => setOpen(true)}
          disabled={!isOperacional}
        >
          {status === "destruida" ? "DESTRUÍDA" : status === "avariada" ? "AVARIADA" : "ATACAR"}
        </button>
      )}

      {fires && open && isOperacional && (
        <div className="tc-fire-controls">
          <select
            className="tc-target-select"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={(missiles && isMissileAiming) || (usesBallistic && isBallisticAiming)}
          >
            <option value="">— Selecionar Alvo —</option>
            {targetOptions.map((s) => {
              // Para opções aliadas, mostrar proximidade do alvo em relação ao atacante
              const tProx = s.isEnemy ? 3 : getProximity(s.id, attackerShip.id);
              const tBlocked = !s.isEnemy && getProximityModifiers(tProx).blocked;
              return (
                <option key={s.id} value={s.id} disabled={tBlocked}>
                  {s.isEnemy ? "[HOSTIL]" : "[ALIADA]"} {s.name}
                  {!s.isEnemy ? ` [P${tProx}]` : ""}
                  {tBlocked ? " 🚫" : ""}
                </option>
              );
            })}
          </select>

          <div className="tc-fire-row">
            <button
              className="tc-cancel-btn"
              onClick={() => {
                setOpen(false);
                setTargetId("");
                if (member.missileTarget) {
                  const ships = getAllShips();
                  const ship  = ships[attackerShip.id];
                  const crewMember = ship?.activeCrew?.find(m => m.id === member.id);
                  if (crewMember) {
                    crewMember.missileTarget    = null;
                    crewMember.missileLockLevel = 0;
                    crewMember.missileReady     = false;
                    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
                  }
                }
                if (member.ballisticTarget) handleCancelBallistic();
              }}
            >
              ✕
            </button>
            <button
              className={`tc-fire-btn ${usesBallistic && isBallisticAiming && ballisticLockLevel >= 1 ? 'tc-fire-btn--ballistic-lock' : ''} ${proxMods.blocked ? 'tc-fire-btn--blocked' : ''}`}
              disabled={isFireDisabled()}
              onClick={handleDisparo}
            >
              {getFireLabel()}
            </button>
          </div>

          {usesBallistic && isBallisticAiming && ballisticLockLevel >= 2 && (
            <div className="tc-ballistic-advantage-alert">
              {ballisticLockLevel === 2 ? "VANTAGEM: ROLE 2d100" : "SUPER VANTAGEM: ROLE 3d100"} — USE O MENOR!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Ajustador de atributos ───────────────────────────────────────────────────

const ShipAttributeAdjuster = ({ ship, onUpdate }) => {
  const maxAttrs = getShipMaxAttributes(ship);

  const handleLevelChange = (attr, delta) => {
    const currentAttrs = { ...ship.attributes };
    const currentTotal = Object.values(currentAttrs).reduce((sum, v) => sum + v, 0);
    const currentValue = currentAttrs[attr] || 0;
    const maxAllowed   = maxAttrs[attr];

    if (currentValue + delta < 0) return;
    if (delta > 0 && currentTotal >= ship.totalPoints) return;
    if (currentValue + delta > 6) return;
    if (currentValue + delta > maxAllowed) return;

    const newAttrs = { ...currentAttrs, [attr]: currentValue + delta };
    updateShipConfig(ship.id, { attributes: newAttrs });
    onUpdate();
  };

  return (
    <div className="tc-attr-compact-row">
      {Object.entries(ship.attributes || {}).map(([attr, val]) => {
        const maxAllowed = maxAttrs[attr];
        const isBlocked  = val >= maxAllowed && maxAllowed < 6;
        return (
          <div key={attr} className={`tc-mini-ctrl ${isBlocked ? 'tc-mini-ctrl--blocked' : ''}`}>
            <span className="tc-mini-label">{attr.substring(0, 3).toUpperCase()}</span>
            <div className="tc-mini-btns">
              <button onClick={() => handleLevelChange(attr, 1)}>+</button>
              <span className="tc-mini-val">{val}</span>
              <button onClick={() => handleLevelChange(attr, -1)}>-</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Card Tático ──────────────────────────────────────────────────────────────

const TacticalCard = ({ ship, allShips, onFire, onUpdate }) => {
  const hpPct       = Math.round((ship.currentHP / ship.maxHP) * 100);
  const crew        = ship.activeCrew || [];
  const isDestroyed = ship.currentHP <= 0;

  const shieldStatus  = ship.shieldStatus  || 'operacional';
  const shieldTurnos  = ship.shieldTurnosParaReparo  || 0;
  const enginesStatus = ship.enginesStatus || 'operacional';
  const enginesTurnos = ship.enginesTurnosParaReparo || 0;

  // Para o card tático (inimigos), mostramos a proximidade mínima
  // com qualquer aliado (pior caso para o inimigo = mais próximo)
  const allies = Object.values(allShips).filter(s => !s.isEnemy);
  const proxPerAlly = allies.map(a => ({
    aliadoName: a.name.split(" ")[0],
    prox: getProximity(a.id, ship.id),
  }));
  const minProx = proxPerAlly.length > 0 ? Math.min(...proxPerAlly.map(x => x.prox)) : 3;

  const proxColor =
    minProx <= 1 ? "#ff3c1e" :
    minProx === 2 ? "#ff8c00" :
    minProx === 3 ? "#ffae00" :
    minProx === 4 ? "#4a9eff" : "#6b7a8d";

  return (
    <div className={`tc-card ${isDestroyed ? "is-destroyed" : ""}`}>

      {isDestroyed && <div className="tc-card-destroyed-overlay">DESTRUÍDA</div>}

      <div className="tc-card-header">
        <div className="tc-card-header-left">
          <span className="tc-card-class-badge">
            {ship.shipClass === "type_III" ? "CLASSE III" : "CLASSE II"}
          </span>
          <span className="tc-card-ship-name">{ship.name}</span>
          {/* Proximidades por aliado */}
          {proxPerAlly.length > 0 && (
            <div className="tc-card-prox-multi">
              {proxPerAlly.map(({ aliadoName, prox }) => {
                const c =
                  prox <= 1 ? "#ff3c1e" :
                  prox === 2 ? "#ff8c00" :
                  prox === 3 ? "#ffae00" :
                  prox === 4 ? "#4a9eff" : "#6b7a8d";
                return (
                  <span
                    key={aliadoName}
                    className="tc-card-prox-badge"
                    style={{ borderColor: c, color: c }}
                    title={aliadoName}
                  >
                    {aliadoName.slice(0, 4)} P{prox}
                  </span>
                );
              })}
            </div>
          )}
          {ship.isDerrapando && (
            <span className="tc-card-derrap-badge">DERRAP</span>
          )}
        </div>

        <div className="tc-card-header-right">
          {shieldStatus !== 'operacional' && (
            <div className="tc-shield-status-badge" title={`Escudos: ${shieldStatus} — ${shieldTurnos} turno(s)`}>
              <span className="tc-shield-icon">🛡</span>
              <div className="tc-shield-dots">
                {Array.from({ length: shieldTurnos }).map((_, i) => (
                  <span key={i} className={`tc-shield-dot ${shieldStatus === 'destruida' ? 'destroyed' : 'damaged'}`} />
                ))}
              </div>
              <span className={`tc-shield-label ${shieldStatus === 'destruida' ? 'destroyed' : 'damaged'}`}>
                {shieldStatus === 'destruida' ? 'OFFLINE' : 'AVARIADO'}
              </span>
            </div>
          )}

          {enginesStatus !== 'operacional' && (
            <div className="tc-engines-status-badge" title={`Motores: ${enginesStatus} — ${enginesTurnos} turno(s)`}>
              <span className="tc-engines-icon">⚙</span>
              <div className="tc-shield-dots">
                {Array.from({ length: enginesTurnos }).map((_, i) => (
                  <span key={i} className={`tc-shield-dot ${enginesStatus === 'destruida' ? 'destroyed' : 'damaged'}`} />
                ))}
              </div>
              <span className={`tc-shield-label ${enginesStatus === 'destruida' ? 'destroyed' : 'damaged'}`}>
                {enginesStatus === 'destruida' ? 'OFFLINE' : 'AVARIADO'}
              </span>
            </div>
          )}

          <div className="tc-hp-block">
            <span className="tc-hp-label">HP</span>
            <span className="tc-hp-value">{ship.currentHP}/{ship.maxHP}</span>
          </div>
          <div className="tc-hp-bar-wrap">
            <div
              className={`tc-hp-bar-fill ${hpBarClass(ship.currentHP, ship.maxHP)}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="tc-card-body">
        <ShipAttributeAdjuster ship={ship} onUpdate={onUpdate} />
        {crew.length === 0 ? (
          <span className="tc-no-crew">SEM DADOS DE TRIPULAÇÃO</span>
        ) : (
          crew.map((member, idx) => (
            <CrewSlot
              key={`${member.id}-${idx}`}
              member={member}
              attackerShip={ship}
              allShips={allShips}
              onFire={onFire}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Log de Combate ───────────────────────────────────────────────────────────

const CombatLog = ({ entries }) => (
  <div className="tc-log">
    <div className="tc-log-title">// LOG DE COMBATE</div>
    {entries.length === 0 && <div className="tc-log-empty">Aguardando ações...</div>}
    {[...entries].reverse().map((entry, i) => (
      <div
        key={i}
        className={`tc-log-entry ${entry.hit ? "hit" : "miss"} ${entry.isShield ? "shield-hit" : ""} ${entry.isEngines ? "engines-hit" : ""}`}
      >
        <span className="tc-log-time">[{entry.time}]</span>
        <span className="tc-log-text">{entry.text}</span>
      </div>
    ))}
  </div>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

const TerminalCombate = ({ onBack }) => {
  const [allShips,      setAllShips]      = useState({});
  const [activeEnemies, setActiveEnemies] = useState([]);
  const [combatLog,     setCombatLog]     = useState([]);
  const [lastRefresh,   setLastRefresh]   = useState(new Date());

  // Seletor de nave aliada para o radar do Terminal
  const [selectedAllyId, setSelectedAllyId] = useState("");

  const turnSound         = useRef(new Audio('/passarturno.wav'));
  const missileReadySound = useRef(new Audio('/missileready.wav'));
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const closeConfirm = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const refresh = () => {
    const ships = getAllShips();
    setAllShips(ships);
    setActiveEnemies(Object.values(ships).filter((s) => s.isEnemy && s.status === "ativa"));
    setLastRefresh(new Date());
  };

  // Naves aliadas disponíveis para perspectiva do radar
  const alliedShips = Object.values(allShips).filter(
    s => !s.isEnemy && s.status !== "destruida" && Object.keys(s.attributes || {}).length > 0
  );

  // ID da nave aliada exibida no radar (auto-seleciona a primeira)
  const radarShipId = selectedAllyId || alliedShips[0]?.id || "";

  useEffect(() => {
    document.body.style.cursor = "url('/normal.cur'), auto";
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { clearInterval(interval); document.body.style.cursor = "default"; };
  }, []);

  useEffect(() => {
    const handlePlayerAttack = (e) => {
      if (e.key === "last_combat_event" && e.newValue) {
        const data = JSON.parse(e.newValue);
        addLog({ hit: data.damage > 0, text: data.logText, isShield: data.shieldHit, isEngines: data.enginesHit });
        refresh();
      }
      if (e.key === "heavens_door_ships_db" || e.key === "heavens_door_proximity_matrix") refresh();
    };
    window.addEventListener('storage', handlePlayerAttack);
    return () => window.removeEventListener('storage', handlePlayerAttack);
  }, []);

  // ── Motor de Resolução ────────────────────────────────────────────────────

  const handleFire = (member, attackerShip, targetId, missiles) => {
    const ships  = getAllShips();
    const target = ships[targetId];

    if (!target.shieldStatus)  target.shieldStatus  = 'operacional';
    if (target.shieldTurnosParaReparo  === undefined) target.shieldTurnosParaReparo  = 0;
    if (!target.enginesStatus) target.enginesStatus = 'operacional';
    if (target.enginesTurnosParaReparo === undefined) target.enginesTurnosParaReparo = 0;

    const attackerCrewMember = ships[attackerShip.id].activeCrew.find(m => m.id === member.id);

    // ── Proximidade: atacante (inimigo) → alvo ────────────────────────────────
    // Se o alvo é aliado: prox = getProximity(aliadoId, inimigoId)
    const targetShipData = ships[targetId];
    let proximity = 3;
    if (!targetShipData.isEnemy) {
      // atacante é inimigo, alvo é aliado
      proximity = getProximity(targetId, attackerShip.id);
    }
    const proxMods = getProximityModifiers(proximity, attackerShip.isDerrapando);

    if (proxMods.blocked) {
      addLog({ hit: false, text: `🚫 ${attackerShip.name} - ${member.function}: Fora de alcance (P${proximity}). Ataque bloqueado.` });
      return;
    }

    // ── FLUXO DE MÍSSIL ──────────────────────────────────────────────────────
    if (missiles) {
      if (attackerShip.missileCooldown > 0) {
        addLog({ hit: false, text: `⏳ ${attackerShip.name}: Sistemas de mísseis em recarga (${attackerShip.missileCooldown}t restantes).` });
        return;
      }
      if (attackerShip.shipClass !== "type_II") {
        if (attackerCrewMember.missileTarget !== targetId) {
          attackerCrewMember.missileTarget    = targetId;
          attackerCrewMember.missileReady     = false;
          attackerCrewMember.missileLockLevel = 0;
          localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
          addLog({ hit: false, text: `⚠️ ${attackerShip.name} iniciou travamento de mira de MÍSSIL em ${target.name}!` });
          refresh();
          return;
        }
        if (!attackerCrewMember.missileReady) {
          addLog({ hit: false, text: `⏳ ${attackerShip.name}: mira de míssil ainda calculando. Aguarde o Turno Global.` });
          return;
        }
      }
    }

    // ── FLUXO BALÍSTICO COM LOCK ──────────────────────────────────────────────
    const hasBallistic = isBallisticLockEligible(member, attackerShip);
    if (!missiles && hasBallistic) {
      if (!attackerCrewMember.ballisticTarget) {
        attackerCrewMember.ballisticTarget    = targetId;
        attackerCrewMember.ballisticLockLevel = 0;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
        addLog({ hit: false, text: `🎯 ${attackerShip.name} - ${member.function} iniciou mira balística em ${target.name}!` });
        refresh();
        return;
      }
      if (attackerCrewMember.ballisticTarget !== targetId) {
        attackerCrewMember.ballisticTarget    = targetId;
        attackerCrewMember.ballisticLockLevel = 0;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
        addLog({ hit: false, text: `🎯 ${attackerShip.name} - ${member.function} redirecionou mira balística para ${target.name}!` });
        refresh();
        return;
      }
    }

    const precisao    = member.precisao || 50;
    const attrLevel   = attackerShip.attributes[missiles ? "missiles" : "weapons"];
    const effectStr   = getEffect(attackerShip.shipClass, missiles ? "missiles" : "weapons", attrLevel);
    const weaponLabel = missiles ? "Mísseis" : "Armas";

    const missileLockLevel   = attackerCrewMember.missileLockLevel   || 0;
    const ballisticLockLevel = attackerCrewMember.ballisticLockLevel || 0;

    let advantageLevel = 1 + proxMods.advantageBonus;
    if (missiles) {
      if (missileLockLevel === 2) advantageLevel += 1;
      if (missileLockLevel >= 3) advantageLevel += 2;
    } else if (hasBallistic) {
      if (ballisticLockLevel === 2) advantageLevel += 1;
      if (ballisticLockLevel >= 3) advantageLevel += 2;
    }

    const precisaoAjustada = Math.max(1,
      Math.round(precisao * proxMods.precisionMultiplier) + proxMods.derrapagemPenalty
    );

    const proxLabel =
      proximity <= 2 ? ` [P${proximity}/VTG+${proxMods.advantageBonus}]` :
      proximity === 4 ? ` [P${proximity}/PREC÷2]` :
      attackerShip.isDerrapando ? ` [P${proximity}/DERRAP−20]` :
      ` [P${proximity}]`;

    const { acertou, isExtremo, rolou, allRolls } = rollHit(precisaoAjustada, advantageLevel);

    if (!acertou) {
      const logRolls = advantageLevel > 1 ? `[${allRolls.join(', ')}] -> ` : '';
      const msgFalha = [
        `${member.id} [${weaponLabel} Nv.${attrLevel}: ${effectStr}]${proxLabel}`,
        `→ ${target.name}`,
        `| d100: ${logRolls}${rolou}/${precisaoAjustada}% ✗`,
        `| ERROU O ALVO`
      ].join("  ");

      localStorage.setItem("last_combat_event", JSON.stringify({
        targetName: target.name, damage: 0, isAbsorbed: false, timestamp: Date.now(), logText: msgFalha
      }));
      addLog({ hit: false, text: msgFalha });

      if (missiles) {
        attackerCrewMember.missileLockLevel = 0;
        attackerCrewMember.missileTarget    = null;
        attackerCrewMember.missileReady     = false;
        ships[attackerShip.id].missileCooldown = 2;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
      } else if (hasBallistic) {
        attackerCrewMember.ballisticLockLevel = 0;
        attackerCrewMember.ballisticTarget    = null;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
      }
      return;
    }

    const { total: rawDamage, isCritico, breakdown } = rollDamage(effectStr, isExtremo);
    const shieldValue = parseShield(getEffect(target.shipClass, "shields", target.attributes.shields));
    const finalDamage = Math.max(0, rawDamage - shieldValue);

    const newHP = Math.max(0, target.currentHP - finalDamage);
    updateShipConfig(targetId, { currentHP: newHP });
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'heavens_door_ships_db',
      newValue: JSON.stringify(getAllShips())
    }));

    if (newHP <= 0 && target.status !== "destruida") {
      setTimeout(() => {
        const currentShips = getAllShips();
        if (currentShips[targetId] && currentShips[targetId].currentHP <= 0) {
          updateShipConfig(targetId, { status: "destruida", activeCrew: [] });
          refresh();
        }
      }, 4000);
    }

    const tags = [];
    if (isExtremo)      tags.push("[EXTREMO!]");
    else if (isCritico) tags.push("[CRÍTICO!]");

    let moduleMsg    = "";
    let moduleTag    = "";
    let isShieldHit  = false;
    let isEnginesHit = false;

    if ((isCritico || isExtremo) && finalDamage > 0) {
      const freshShips  = getAllShips();
      const freshTarget = freshShips[targetId];
      if (!freshTarget.shieldStatus)  freshTarget.shieldStatus  = 'operacional';
      if (!freshTarget.enginesStatus) freshTarget.enginesStatus = 'operacional';

      const dmgTarget = selectDamageTarget(freshTarget);

      if (dmgTarget) {
        if (dmgTarget.tipo === 'torreta') {
          const tMember = (freshTarget.activeCrew || []).find(m => m.id === dmgTarget.memberId);
          if (tMember) {
            if (tMember.moduleStatus === 'operacional') {
              tMember.moduleStatus = 'avariada'; tMember.turnosParaReparo = 2;
              moduleMsg = `${tMember.function} AVARIADA`;
              moduleTag = `[AVARIA: ${tMember.function}]`;
            } else if (tMember.moduleStatus === 'avariada') {
              tMember.moduleStatus = 'destruida'; tMember.turnosParaReparo = 0;
              moduleMsg = `${tMember.function} DESTRUÍDA`;
              moduleTag = `[MÓDULO DESTRUÍDO: ${tMember.function}]`;
            }
          }
        } else if (dmgTarget.tipo === 'escudo') {
          isShieldHit = true;
          if (freshTarget.shieldStatus === 'operacional') {
            freshTarget.shieldStatus = 'avariada'; freshTarget.shieldTurnosParaReparo = 2;
            moduleMsg = "ESCUDOS AVARIADOS (nível máx. 2 — 2 turnos)";
            moduleTag = `[ESCUDO: AVARIADOS]`;
          } else if (freshTarget.shieldStatus === 'avariada') {
            freshTarget.shieldStatus = 'destruida'; freshTarget.shieldTurnosParaReparo = 3;
            moduleMsg = "ESCUDOS DESTRUÍDOS (offline — 3 turnos)";
            moduleTag = `[ESCUDO: DESTRUÍDOS]`;
          }
        } else if (dmgTarget.tipo === 'motores') {
          isEnginesHit = true;
          if (freshTarget.enginesStatus === 'operacional') {
            freshTarget.enginesStatus = 'avariada'; freshTarget.enginesTurnosParaReparo = 2;
            moduleMsg = "MOTORES AVARIADOS (nível máx. 3 — 2 turnos)";
            moduleTag = `[MOTORES: AVARIADOS]`;
          } else if (freshTarget.enginesStatus === 'avariada') {
            freshTarget.enginesStatus = 'destruida'; freshTarget.enginesTurnosParaReparo = 3;
            moduleMsg = "MOTORES DESTRUÍDOS (offline — 3 turnos)";
            moduleTag = `[MOTORES: DESTRUÍDOS]`;
          }
        }

        if (freshTarget.attributes) enforceAttributeLimits(freshTarget);
        freshShips[targetId] = freshTarget;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(freshShips));
      }
    }

    const logRolls       = advantageLevel > 1 ? `[${allRolls.join(', ')}] -> ` : '';
    const advantageLabel =
      advantageLevel === 2 ? " [VANTAGEM]"  :
      advantageLevel === 3 ? " [DUPLA VTG]" :
      advantageLevel >= 4  ? " [SUPER VTG]" : "";

    const msg = [
      `${member.id} [${weaponLabel} Nv.${attrLevel}: ${effectStr}]${proxLabel}${advantageLabel}`,
      `→ ${target.name}`,
      `| d100: ${logRolls}${rolou}/${precisaoAjustada}% ✓`,
      `| Rolou: ${breakdown} = ${rawDamage}`,
      `| Escudo: -${shieldValue}`,
      `| Dano: ${finalDamage} HP`,
      `| HP: ${newHP}/${target.maxHP}`,
      ...tags,
      ...(moduleTag ? [moduleTag] : []),
    ].join("  ");

    localStorage.setItem("last_combat_event", JSON.stringify({
      targetName: target.name, damage: finalDamage,
      isAbsorbed: rawDamage > 0 && finalDamage === 0,
      timestamp: Date.now(), logText: msg,
      shieldHit: isShieldHit,
      shieldDestroyed: moduleTag.includes("DESTRUÍDOS") && isShieldHit,
      enginesHit: isEnginesHit,
      enginesDestroyed: moduleTag.includes("DESTRUÍDOS") && isEnginesHit,
    }));

    addLog({ hit: true, text: msg, isShield: isShieldHit, isEngines: isEnginesHit });

    const finalShips = getAllShips();
    const finalAttackerCrew = finalShips[attackerShip.id].activeCrew.find(m => m.id === member.id);

    if (missiles) {
      finalAttackerCrew.missileLockLevel    = 0;
      finalAttackerCrew.missileTarget       = null;
      finalAttackerCrew.missileReady        = false;
      finalShips[attackerShip.id].missileCooldown = 2;
      localStorage.setItem("heavens_door_ships_db", JSON.stringify(finalShips));
    } else if (hasBallistic) {
      finalAttackerCrew.ballisticLockLevel = 0;
      finalAttackerCrew.ballisticTarget    = null;
      localStorage.setItem("heavens_door_ships_db", JSON.stringify(finalShips));
    }

    refresh();
  };

  const addLog = (entry) => {
    const time = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    setCombatLog((prev) => [...prev, { ...entry, time }]);
  };

  const totalCrew = activeEnemies.reduce((sum, s) => sum + (s.activeCrew?.length || 0), 0);
  const timeStr   = lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const handleConfirmTurn = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));

    if (turnSound.current) {
      turnSound.current.currentTime = 0;
      turnSound.current.play().catch(e => console.warn("Áudio bloqueado:", e));
    }

    const ships = getAllShips();
    let alertas = [];

    Object.values(ships).forEach(ship => {
      if (ship.status === 'ativa' || !ship.isEnemy) {
        const alertasMissile = incrementMissileLock(ship.id);
        if (alertasMissile?.length) alertas.push(...alertasMissile);

        const alertasBallistic = incrementBallisticLock(ship.id);
        if (alertasBallistic?.length) alertas.push(...alertasBallistic);
      }
    });

    const reparos = processGlobalTurn();
    if (reparos.length > 0) {
      reparos.forEach(msg => addLog({ hit: false, text: `🔧 ${msg}` }));
      const fullMsg = `🔧 ` + reparos.join(" | 🔧 ");
      const repairEvent = {
        targetName: "Sistema", damage: 0, isAbsorbed: false, isRepair: true,
        timestamp: Date.now(), logText: fullMsg
      };
      localStorage.setItem("last_combat_event", JSON.stringify(repairEvent));
      window.dispatchEvent(new CustomEvent("combat:event", { detail: repairEvent }));
    }

    refresh();

    if (alertas.length > 0) {
      setTimeout(() => {
        if (missileReadySound.current) {
          missileReadySound.current.currentTime = 0;
          missileReadySound.current.volume = 1.0;
          missileReadySound.current.play().catch(e => console.warn("Áudio bloqueado:", e));
        }
        setModalConfig({
          isOpen: true,
          title: "ALERTA TÁTICO",
          message: alertas.join("\n\n"),
          subtext: "TRAVAMENTO DE ARMA ATINGIDO — VERIFICAR SISTEMAS",
          variant: "danger",
          confirmLabel: "CIENTE",
          hideCancel: true,
          onConfirm: closeConfirm
        });
      }, 400);
    }
  };

  return (
    <div className="terminal-combate">
      <header className="tc-header">
        <div className="tc-header-left">
          <div className="tc-alert-dot" />
          <div className="tc-title-block">
            <div className="tc-eyebrow">Heaven's Door // Acesso Restrito</div>
            <h1 className="tc-title">Terminal <span>Tático</span> de Combate</h1>
          </div>
        </div>

        <div className="tc-header-right">
          <button
            className="tc-fire-btn"
            style={{ background: '#ffae00', color: '#000', width: 'auto', padding: '0.5rem 1rem' }}
            onClick={() => {
              const ships   = getAllShips();
              let bloqueios = [];
              Object.values(ships).forEach(s => {
                if (s.activeCrew) {
                  s.activeCrew.forEach(m => {
                    if (m.missileLockLevel >= 3) bloqueios.push(`${s.name} (${m.function}) — MÍSSIL`);
                  });
                }
              });

              if (bloqueios.length > 0) {
                if (missileReadySound.current) {
                  missileReadySound.current.currentTime = 0;
                  missileReadySound.current.play().catch(() => {});
                }
                setModalConfig({
                  isOpen: true,
                  title: "SISTEMA TRAVADO",
                  message: `Impossível avançar o Turno Global.\nAs seguintes naves atingiram carga máxima de mísseis e devem disparar:\n\n${bloqueios.join("\n")}`,
                  subtext: "PROTOCOLO DE SEGURANÇA ATIVO",
                  variant: "danger",
                  confirmLabel: "CIENTE",
                  hideCancel: true,
                  onConfirm: closeConfirm
                });
                return;
              }

              setModalConfig({
                isOpen: true,
                title: "AVANÇAR TURNO GLOBAL",
                message: "Deseja processar os cálculos de trajetória, recarga de mísseis, miras balísticas e reparos de sistemas para todas as naves?",
                subtext: "ESTA AÇÃO É IRREVERSÍVEL",
                variant: "warning",
                confirmLabel: "CONFIRMAR TURNO",
                cancelLabel: "CANCELAR",
                hideCancel: false,
                onConfirm: handleConfirmTurn
              });
            }}
          >
            PASSAR TURNO GLOBAL
          </button>

          <div className="tc-stat">
            <span className="tc-stat-label">Naves Ativas</span>
            <span className="tc-stat-value">{activeEnemies.length}</span>
          </div>
          <div className="tc-stat">
            <span className="tc-stat-label">Tripulantes</span>
            <span className="tc-stat-value">{totalCrew}</span>
          </div>
          <button className="tc-back-btn" onClick={onBack}>← Voltar</button>
        </div>
      </header>

      <div className="tc-statusbar">
        <span className="tc-statusbar-item active">SCAN EM EXECUÇÃO</span>
        <span className="tc-statusbar-item">ÚLTIMA ATUALIZAÇÃO: {timeStr}</span>
        <span className="tc-statusbar-item">PROTOCOLO: COMBATE ATIVO</span>
      </div>

      <div className="tc-layout">
        {/* ── Cards de Naves Inimigas ── */}
        <div className="tc-body">
          {/* Matriz de Proximidade editável */}
          {activeEnemies.length === 0 ? (
            <div className="tc-empty">
              <div className="tc-empty-icon">◉</div>
              <div className="tc-empty-text">Nenhum alvo detectado no setor</div>
            </div>
          ) : (
            activeEnemies.map((ship) => (
              <TacticalCard
                key={ship.id}
                ship={ship}
                allShips={allShips}
                onFire={handleFire}
                onUpdate={refresh}
              />
            ))
          )}
        </div>

        {/* ── Radar Tático do Mestre (perspectiva da aliada selecionada) ── */}
        <div className="tc-radar-panel">
          {/* Seletor de nave aliada para perspectiva do radar */}
          {alliedShips.length > 1 && (
            <div className="tc-radar-ally-selector">
              <span className="tc-radar-ally-label">PERSPECTIVA:</span>
              <select
                className="tc-radar-ally-select"
                value={selectedAllyId}
                onChange={e => setSelectedAllyId(e.target.value)}
              >
                {alliedShips.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          {radarShipId && (
            <RadarTatico
              playerShipId={radarShipId}
              playerRole="mestre"
              onProximityChange={refresh}
            />
          )}
        </div>

        {/* ── Log de Combate ── */}
        <CombatLog entries={combatLog} />
      </div>

      <footer className="tc-footer">
        <span className="tc-footer-text">HEAVEN'S DOOR <span>//</span> CLASSIFIED — MESTRE ONLY</span>
        <span className="tc-footer-text">AUTO-REFRESH <span>5s</span></span>
      </footer>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        subtext={modalConfig.subtext}
        variant={modalConfig.variant}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
        hideCancel={modalConfig.hideCancel}
        onConfirm={modalConfig.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default TerminalCombate;
