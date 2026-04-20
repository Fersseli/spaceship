import React, { useState, useEffect, useRef } from "react";
import {
  getAllShips,
  updateShipConfig,
  applyModuleDamage,
  applyShieldDamage,
  selectDamageTarget,
  processGlobalTurn,
  incrementMissileLock,
  getShipMaxAttributes,
  enforceAttributeLimits
} from "../utils/mockApi";
import { getEffect } from "../utils/effectHelpers";
import { rollDamage, parseShield, rollHit } from "../utils/diceHelpers";
import "../styles/TerminalCombate.css";
import ConfirmModal from "./ConfirmModal";

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
  const [targetId, setTargetId] = useState(member.missileTarget || "");

  useEffect(() => {
    if (member.missileTarget) setTargetId(member.missileTarget);
  }, [member.missileTarget]);

  const isMissileLocked = member.missileTarget === targetId;
  const isMissileReady  = member.missileReady;

  const fires    = canFire(member, attackerShip.shipClass);
  const missiles = usesMissiles(member, attackerShip.shipClass);
  const precisao = getPrecisao(member);

  const status       = member.moduleStatus || 'operacional';
  const turnos       = member.turnosParaReparo || 0;
  const isOperacional = status === 'operacional';

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

  const lockLevel = member.missileLockLevel || 0;

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
          <span className="tc-lock-label">LOCK:</span>
          <span className={`tc-lock-box ${lockLevel >= 1 ? 'filled' : ''}`}></span>
          <span className={`tc-lock-box ${lockLevel >= 2 ? 'filled' : ''}`}></span>
          <span className={`tc-lock-box ${lockLevel >= 3 ? 'filled blink-red' : ''}`}></span>
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
          >
            <option value="">— Selecionar Alvo —</option>
            {targetOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.isEnemy ? "[HOSTIL]" : "[ALIADA]"} {s.name}
              </option>
            ))}
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
                  const crewMember = ship.activeCrew.find(m => m.id === member.id);
                  if (crewMember) {
                    crewMember.missileTarget  = null;
                    crewMember.missileLockLevel = 0;
                    crewMember.missileReady   = false;
                    localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
                  }
                }
              }}
            >
              ✕
            </button>
            <button
              className="tc-fire-btn"
              disabled={!targetId}
              onClick={handleDisparo}
            >
              {missiles && attackerShip.shipClass !== "type_II" && targetId
                ? (!isMissileLocked ? "MIRAR MÍSSIL" : (!isMissileReady ? "MIRANDO..." : "DISPARAR MÍSSIL"))
                : "DISPARAR"}
            </button>
          </div>
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

  const shieldStatus = ship.shieldStatus || 'operacional';
  const shieldTurnos = ship.shieldTurnosParaReparo || 0;

  return (
    <div className={`tc-card ${isDestroyed ? "is-destroyed" : ""}`}>

      {isDestroyed && (
        <div className="tc-card-destroyed-overlay">DESTRUÍDA</div>
      )}

      <div className="tc-card-header">
        <div className="tc-card-header-left">
          <span className="tc-card-class-badge">
            {ship.shipClass === "type_III" ? "CLASSE III" : "CLASSE II"}
          </span>
          <span className="tc-card-ship-name">{ship.name}</span>
        </div>

        <div className="tc-card-header-right">
          {/* Indicador de escudos avariados */}
          {shieldStatus !== 'operacional' && (
            <div className="tc-shield-status-badge" title={`Escudos: ${shieldStatus} — ${shieldTurnos} turno(s)`}>
              <span className="tc-shield-icon">🛡</span>
              <div className="tc-shield-dots">
                {Array.from({ length: shieldTurnos }).map((_, i) => (
                  <span
                    key={i}
                    className={`tc-shield-dot ${shieldStatus === 'destruida' ? 'destroyed' : 'damaged'}`}
                  />
                ))}
              </div>
              <span className={`tc-shield-label ${shieldStatus === 'destruida' ? 'destroyed' : 'damaged'}`}>
                {shieldStatus === 'destruida' ? 'OFFLINE' : 'AVARIADO'}
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
    {entries.length === 0 && (
      <div className="tc-log-empty">Aguardando ações...</div>
    )}
    {[...entries].reverse().map((entry, i) => (
      <div key={i} className={`tc-log-entry ${entry.hit ? "hit" : "miss"} ${entry.isShield ? "shield-hit" : ""}`}>
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
  const turnSound          = useRef(new Audio('/passarturno.wav'));
  const [modalConfig, setModalConfig] = useState({ isOpen: false });
  const closeConfirm = () => setModalConfig(prev => ({ ...prev, isOpen: false }));
  const missileReadySound  = useRef(new Audio('/missileready.wav'));

  const refresh = () => {
    const ships = getAllShips();
    setAllShips(ships);
    setActiveEnemies(
      Object.values(ships).filter((s) => s.isEnemy && s.status === "ativa")
    );
    setLastRefresh(new Date());
  };

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
        addLog({ hit: data.damage > 0, text: data.logText, isShield: data.shieldHit });
        refresh();
      }
      if (e.key === "heavens_door_ships_db") refresh();
    };
    window.addEventListener('storage', handlePlayerAttack);
    return () => window.removeEventListener('storage', handlePlayerAttack);
  }, []);

  // ── Motor de Resolução ────────────────────────────────────────────────────

  const handleFire = (member, attackerShip, targetId, missiles) => {
    const ships  = getAllShips();
    const target = ships[targetId];

    // Garante campos de escudo no alvo
    if (!target.shieldStatus) target.shieldStatus = 'operacional';
    if (target.shieldTurnosParaReparo === undefined) target.shieldTurnosParaReparo = 0;

    if (missiles && attackerShip.missileCooldown > 0) {
      addLog({ hit: false, text: `⏳ ${attackerShip.name}: Sistemas de mísseis em recarga (${attackerShip.missileCooldown}t restantes).` });
      return;
    }

    if (missiles && attackerShip.shipClass !== "type_II") {
      const attackerCrewMember = ships[attackerShip.id].activeCrew.find(m => m.id === member.id);

      if (attackerCrewMember.missileTarget !== targetId) {
        attackerCrewMember.missileTarget    = targetId;
        attackerCrewMember.missileReady     = false;
        attackerCrewMember.missileLockLevel = 0;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
        addLog({ hit: false, text: `⚠️ ${attackerShip.name} iniciou travamento de mira em ${target.name}!` });
        refresh();
        return;
      } else if (!attackerCrewMember.missileReady) {
        addLog({ hit: false, text: `⏳ ${attackerShip.name} ainda está calculando a mira. Aguarde o Turno Global.` });
        return;
      }
    }

    const precisao       = member.precisao || 50;
    const weaponLabel    = missiles ? "Mísseis" : "Armas";
    const attrLevel      = attackerShip.attributes[missiles ? "missiles" : "weapons"];
    const effectStr      = getEffect(attackerShip.shipClass, missiles ? "missiles" : "weapons", attrLevel);
    const attackerCrewMember = ships[attackerShip.id].activeCrew.find(m => m.id === member.id);
    const lockLevel      = attackerCrewMember.missileLockLevel || 0;
    let advantageLevel   = 1;

    if (missiles) {
      if (lockLevel === 2) advantageLevel = 2;
      if (lockLevel >= 3) advantageLevel = 3;
    }

    const { acertou, isExtremo, rolou, allRolls } = rollHit(precisao, advantageLevel);

    if (!acertou) {
      const logRolls = missiles && advantageLevel > 1 ? `[${allRolls.join(', ')}] -> ` : '';
      const msgFalha = [
        `${member.id} [${weaponLabel} Nv.${attrLevel}: ${effectStr}]`,
        `→ ${target.name}`,
        `| d100: ${logRolls}${rolou}/${precisao}% ✗`,
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
      }
      return;
    }

    const { total: rawDamage, isCritico, breakdown } = rollDamage(effectStr, isExtremo);
    const shieldValue  = parseShield(getEffect(target.shipClass, "shields", target.attributes.shields));
    const finalDamage  = Math.max(0, rawDamage - shieldValue);

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
    if (isExtremo)  tags.push("[EXTREMO!]");
    else if (isCritico) tags.push("[CRÍTICO!]");

    // ─── Avaria de Módulo com Probabilidade Ponderada ──────────────────────
    let moduleMsg = "";
    let moduleTag = "";
    let isShieldHit = false;

    if ((isCritico || isExtremo) && finalDamage > 0) {
      // Re-lê o alvo do banco para ter o estado mais recente
      const freshShips = getAllShips();
      const freshTarget = freshShips[targetId];
      if (!freshTarget.shieldStatus) freshTarget.shieldStatus = 'operacional';

      const dmgTarget = selectDamageTarget(freshTarget);

      if (dmgTarget) {
        if (dmgTarget.tipo === 'torreta') {
          const tMember = (freshTarget.activeCrew || []).find(m => m.id === dmgTarget.memberId);
          if (tMember) {
            if (tMember.moduleStatus === 'operacional') {
              tMember.moduleStatus     = 'avariada';
              tMember.turnosParaReparo = 2;
              moduleMsg = `${tMember.function} AVARIADA`;
              moduleTag = `[AVARIA: ${tMember.function}]`;
            } else if (tMember.moduleStatus === 'avariada') {
              tMember.moduleStatus     = 'destruida';
              tMember.turnosParaReparo = 0;
              moduleMsg = `${tMember.function} DESTRUÍDA`;
              moduleTag = `[MÓDULO DESTRUÍDO: ${tMember.function}]`;
            }
          }
        } else if (dmgTarget.tipo === 'escudo') {
          isShieldHit = true;
          if (freshTarget.shieldStatus === 'operacional') {
            freshTarget.shieldStatus            = 'avariada';
            freshTarget.shieldTurnosParaReparo  = 2;
            moduleMsg = "ESCUDOS AVARIADOS (nível máx. 2 — 2 turnos)";
            moduleTag = `[ESCUDO: AVARIADOS]`;
          } else if (freshTarget.shieldStatus === 'avariada') {
            freshTarget.shieldStatus            = 'destruida';
            freshTarget.shieldTurnosParaReparo  = 3;
            moduleMsg = "ESCUDOS DESTRUÍDOS (offline — 3 turnos)";
            moduleTag = `[ESCUDO: DESTRUÍDOS]`;
          }
        }

        // APENAS ISTO:
if (freshTarget.attributes) {
  // A função enforceAttributeLimits já está importada no topo do arquivo
  enforceAttributeLimits(freshTarget); 
}
        freshShips[targetId] = freshTarget;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(freshShips));
      }
    }

    const logRolls      = missiles && advantageLevel > 1 ? `[${allRolls.join(', ')}] -> ` : '';
    const advantageLabel = advantageLevel === 2 ? " [VANTAGEM]" : advantageLevel === 3 ? " [SUPER VANTAGEM]" : "";

    const msg = [
      `${member.id} [${weaponLabel} Nv.${attrLevel}: ${effectStr}]${advantageLabel}`,
      `→ ${target.name}`,
      `| d100: ${logRolls}${rolou}/${precisao}% ✓`,
      `| Rolou: ${breakdown} = ${rawDamage}`,
      `| Escudo: -${shieldValue}`,
      `| Dano: ${finalDamage} HP`,
      `| HP: ${newHP}/${target.maxHP}`,
      ...tags,
      ...(moduleTag ? [moduleTag] : []),
    ].join("  ");

    localStorage.setItem("last_combat_event", JSON.stringify({
      targetName: target.name,
      damage: finalDamage,
      isAbsorbed: rawDamage > 0 && finalDamage === 0,
      timestamp: Date.now(),
      logText: msg,
      shieldHit: isShieldHit,
      shieldDestroyed: moduleTag.includes("DESTRUÍDOS"),
    }));

    addLog({ hit: true, text: msg, isShield: isShieldHit });

    if (missiles) {
      attackerCrewMember.missileLockLevel    = 0;
      attackerCrewMember.missileTarget       = null;
      attackerCrewMember.missileReady        = false;
      ships[attackerShip.id].missileCooldown = 2;
      localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
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

    const ships   = getAllShips();
    let alertas   = [];
    Object.values(ships).forEach(ship => {
      if (ship.status === 'ativa' || !ship.isEnemy) {
        const alertasNave = incrementMissileLock(ship.id);
        if (alertasNave && alertasNave.length > 0) alertas.push(...alertasNave);
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
          subtext: "TRAVA MÁXIMA DE MÍSSIL ATINGIDA — LANÇAMENTO IMINENTE",
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
                    if (m.missileLockLevel >= 3) bloqueios.push(`${s.name} (${m.function})`);
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
                message: "Deseja processar os cálculos de trajetória, recarga de mísseis e reparos de sistemas para todas as naves?",
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
        <div className="tc-body">
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
