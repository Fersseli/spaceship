import React, { useState, useEffect, useRef } from "react";
import "../styles/ShipDashboard.css";
import { canEdit } from "../utils/rolePermissions";
import { calculateRemainingPoints, getEffect } from "../utils/effectHelpers";
import { shipsDatabase } from "../data/ships";
import ShipRadarChart from "./ShipRadarChart";
import AssignCrew from "./AssignCrew";
import { removePlayerFromAllCrews } from "../utils/mockApi";
import DexterityRanking from "./Destreza";
import { getShipData, updateShipAttributes, getAllShips, processPlayerAttack, updateShipConfig, getShipMaxAttributes } from "../utils/mockApi";
import ConfirmModal from "./ConfirmModal";

const ShipDashboard = ({ playerData, onLogout }) => {

  const [attackWeaponType, setAttackWeaponType] = useState("weapons");
  const [hitEvent, setHitEvent] = useState(null);
  const [headerLog, setHeaderLog] = useState("");
  const [showAssignCrew, setShowAssignCrew] = useState(false);
  const [showDexterityModal, setShowDexterityModal] = useState(false);
  const [shipDataState, setShipDataState] = useState(getShipData(playerData.ship));
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [attackTarget, setAttackTarget] = useState("");
  const [isExtremo, setIsExtremo] = useState(false);
  const [attackDamage, setAttackDamage] = useState("");
  const [allShipsList, setAllShipsList] = useState([]);
  const [combatJournal, setCombatJournal] = useState([]);

  const [confirmState, setConfirmState] = useState({
    isOpen: false, title: "", message: "", subtext: "",
    variant: "danger", confirmLabel: "CONFIRMAR", onConfirm: null,
  });

  const showConfirm = (opts) => setConfirmState({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  // --- Áudio ---
  const rechargeSound    = useRef(new Audio('/recharge.mp3'));
  const powerDownGeneric = useRef(new Audio('/outage1.mp3'));
  const powerDownOutage  = useRef(new Audio('/outage.mp3'));
  const missSound        = useRef(new Audio('/miss.wav'));
  const hitSound         = useRef(new Audio('/hit.mp3'));
  const critSound        = useRef(new Audio('/magic_crumple2.ogg'));
  const shieldSound      = useRef(new Audio('/shield.mp3'));
  const soundTimeout     = useRef(null);
  const targetSound      = useRef(new Audio('/mira.wav'));
  const confirmSound     = useRef(new Audio('/confirm.wav'));

  const currentlyTargeted = allShipsList.some(s =>
    s.activeCrew && s.activeCrew.some(m => m.missileTarget === playerData.ship)
  );

  useEffect(() => {
    if (currentlyTargeted) {
      if (targetSound.current) {
        targetSound.current.loop = true;
        if (targetSound.current.paused) {
          targetSound.current.play().catch(e => console.warn("Áudio bloqueado:", e));
        }
      }
    } else {
      if (targetSound.current) {
        targetSound.current.pause();
        targetSound.current.currentTime = 0;
      }
    }
  }, [currentlyTargeted]);

  const playPowerUpSound = (startLevel, endLevel) => {
    if (!rechargeSound.current) return;
    if (soundTimeout.current) clearTimeout(soundTimeout.current);
    const difference = endLevel - startLevel;
    if (difference <= 0) return;
    const startSecond      = startLevel * 0.5;
    const normalDurationMs = difference * 500;
    const desiredDurationMs = 500 + (difference - 1) * 200;
    const speedMultiplier  = normalDurationMs / desiredDurationMs;
    rechargeSound.current.currentTime  = startSecond;
    rechargeSound.current.playbackRate = speedMultiplier;
    rechargeSound.current.volume       = 1.0;
    rechargeSound.current.play().catch(e => console.warn("Áudio bloqueado", e));
    soundTimeout.current = setTimeout(() => {
      rechargeSound.current.pause();
      rechargeSound.current.playbackRate = 1.0;
    }, desiredDurationMs);
  };

  useEffect(() => {
    setAllShipsList(Object.values(getAllShips()));
    const initialLog = JSON.parse(localStorage.getItem("combat_journal") || "[]");
    setCombatJournal(initialLog);

    const handleStorageChange = (e) => {
      if (e.key === "heavens_door_ships_db") {
        if (e.newValue) {
          const allShips   = JSON.parse(e.newValue);
          setAllShipsList(Object.values(allShips));
          const updatedShip = allShips[playerData.ship];
          if (updatedShip) {
            setAttributes(updatedShip.attributes);
            setShipDataState(updatedShip);
          }
        }
      }
      if (e.key === "combat_journal" && e.newValue) {
        setCombatJournal(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [playerData.ship]);

  useEffect(() => {
    document.body.style.cursor = "url('/normal.cur'), auto";
    localStorage.setItem(`status_${playerData.nickname}`, "online");
    localStorage.setItem(`role_${playerData.nickname}`, playerData.role);
    localStorage.setItem(`ship_${playerData.nickname}`, playerData.ship);
    removePlayerFromAllCrews(playerData.nickname);
    return () => {
      document.body.style.cursor = "default";
      localStorage.removeItem(`status_${playerData.nickname}`);
      localStorage.removeItem(`role_${playerData.nickname}`);
      removePlayerFromAllCrews(playerData.nickname);
    };
  }, [playerData]);

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      let overlayText = "";
      let overlayType = "hit";
      let extraTag    = "";
      let moduleMsg   = "";

      if (data.logText) {
        // Torretas
        if (data.logText.includes("[MÓDULO:")) {
          const match = data.logText.match(/\[MÓDULO: (.*?)\]/);
          if (match) moduleMsg = match[1];
        } else if (data.logText.includes("[AVARIA:")) {
          const match = data.logText.match(/\[AVARIA: (.*?)\]/);
          if (match) moduleMsg = `${match[1]} AVARIADA`;
        } else if (data.logText.includes("[MÓDULO DESTRUÍDO:")) {
          const match = data.logText.match(/\[MÓDULO DESTRUÍDO: (.*?)\]/);
          if (match) moduleMsg = `${match[1]} DESTRUÍDA`;
        }
        // Escudos
        else if (data.logText.includes("[ESCUDO: AVARIADOS]")) {
          moduleMsg = "⚡ ESCUDOS AVARIADOS";
        } else if (data.logText.includes("[ESCUDO: DESTRUÍDOS]")) {
          moduleMsg = "💀 ESCUDOS DESTRUÍDOS";
        }
        // Motores
        else if (data.logText.includes("[MOTORES: AVARIADOS]")) {
          moduleMsg = "⚙ MOTORES AVARIADOS";
        } else if (data.logText.includes("[MOTORES: DESTRUÍDOS]")) {
          moduleMsg = "💀 MOTORES DESTRUÍDOS";
        }

        if (data.logText.includes("EXTREMO"))  extraTag = "extremo.";
        else if (data.logText.includes("CRÍTICO")) extraTag = "crítico.";
      }

      if (data.isRepair) {
        overlayText = "reparo";
        overlayType = "miss";
      } else if (data.isAbsorbed) {
        overlayText = "absorvido!";
        overlayType = "miss";
      } else if (data.damage > 0) {
        overlayText = `-${data.damage} HP`;
        overlayType = data.isPlayerAction ? "damage-dealt" : "hit";
      } else {
        overlayText = "falhou!";
        overlayType = "miss";
      }

      setHitEvent({ text: overlayText, type: overlayType, extraTag, moduleMsg, id: data.timestamp || Date.now() });
      setHeaderLog(data.logText);
      setTimeout(() => setHitEvent(null), 4000);
    };

    window.addEventListener("combat:event", handler);
    return () => window.removeEventListener("combat:event", handler);
  }, []);

  useEffect(() => {
    if (hitEvent) {
      if (hitEvent.type === "hit" || hitEvent.type === "damage-dealt") {
        if (hitEvent.extraTag) {
          if (critSound.current) { critSound.current.currentTime = 0; critSound.current.volume = 1.0; critSound.current.play().catch(() => {}); }
        } else {
          if (hitSound.current) { hitSound.current.currentTime = 0; hitSound.current.volume = 1.0; hitSound.current.play().catch(() => {}); }
        }
      } else if (hitEvent.text === "ABSORVIDO" || hitEvent.text === "absorvido!") {
        if (shieldSound.current) {
          shieldSound.current.currentTime = 0; shieldSound.current.volume = 1.0;
          shieldSound.current.play().catch(() => {});
          setTimeout(() => { if (shieldSound.current) shieldSound.current.pause(); }, 1200);
        }
      } else if (hitEvent.type === "miss") {
        if (missSound.current) { missSound.current.currentTime = 0; missSound.current.volume = 1.0; missSound.current.play().catch(() => {}); }
      }
    }
  }, [hitEvent]);

  const shipInfo = getShipData(playerData.ship);
  const [attributes, setAttributes] = useState(shipInfo.attributes);
  const remainingPoints = calculateRemainingPoints(attributes, shipInfo.totalPoints);

  const playPowerDownSound = (isOutage = false) => {
    const soundToPlay = isOutage ? powerDownOutage.current : powerDownGeneric.current;
    if (!soundToPlay) return;
    if (soundTimeout.current) clearTimeout(soundTimeout.current);
    soundToPlay.currentTime = 0; soundToPlay.volume = 1.0; soundToPlay.playbackRate = 1.0;
    soundToPlay.play().catch(() => {});
    soundTimeout.current = setTimeout(() => { soundToPlay.pause(); }, isOutage ? 1500 : 500);
  };

  const [currentRole, setCurrentRole] = useState(playerData.role);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "last_combat_event" && e.newValue) {
        const data = JSON.parse(e.newValue);
        let overlayText = "", overlayType = "hit";
        let extraTag = "", moduleMsg = "";

        if (data.isRepair) {
          overlayText = "REPARO"; overlayType = "miss";
        } else if (data.isAbsorbed) {
          overlayText = "absorvido!"; overlayType = "miss";
        } else if (data.damage > 0) {
          overlayText = `-${data.damage} HP`; overlayType = "hit";
          if (data.logText) {
            if (data.logText.includes("[MÓDULO:")) { const m = data.logText.match(/\[MÓDULO: (.*?)\]/); if (m) moduleMsg = m[1]; }
            else if (data.logText.includes("[AVARIA:")) { const m = data.logText.match(/\[AVARIA: (.*?)\]/); if (m) moduleMsg = `${m[1]} AVARIADA`; }
            else if (data.logText.includes("[MÓDULO DESTRUÍDO:")) { const m = data.logText.match(/\[MÓDULO DESTRUÍDO: (.*?)\]/); if (m) moduleMsg = `${m[1]} DESTRUÍDA`; }
            else if (data.logText.includes("[ESCUDO: AVARIADOS]")) { moduleMsg = "⚡ ESCUDOS AVARIADOS"; }
            else if (data.logText.includes("[ESCUDO: DESTRUÍDOS]")) { moduleMsg = "💀 ESCUDOS DESTRUÍDOS"; }
            else if (data.logText.includes("[MOTORES: AVARIADOS]")) { moduleMsg = "⚙ MOTORES AVARIADOS"; }
            else if (data.logText.includes("[MOTORES: DESTRUÍDOS]")) { moduleMsg = "💀 MOTORES DESTRUÍDOS"; }if (data.logText.includes("EXTREMO")) extraTag = "EXTREMO.";
            else if (data.logText.includes("CRÍTICO")) extraTag = "CRÍTICO.";
          }
        } else {
          overlayText = "falhou!"; overlayType = "miss";
        }

        setHitEvent({ text: overlayText, type: overlayType, id: data.timestamp, extraTag, moduleMsg });
        setHeaderLog(data.logText);
        setTimeout(() => setHitEvent(null), 4000);
      }

      if (e.key === "heavens_door_ships_db" && e.newValue) {
        const allShips = JSON.parse(e.newValue);
        setAllShipsList(Object.values(allShips));
        const updatedShip = allShips[playerData.ship];
        if (updatedShip) {
          setAttributes(updatedShip.attributes);
          setShipDataState(updatedShip);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [playerData.ship]);

  useEffect(() => {
    const checkRole = () => {
      const savedRole = localStorage.getItem(`role_${playerData.nickname}`);
      if (savedRole && savedRole !== currentRole) setCurrentRole(savedRole);
    };
    const interval = setInterval(checkRole, 3000);
    return () => clearInterval(interval);
  }, [currentRole, playerData.nickname]);

  const handleManualSync = () => {
    if (currentRole === "piloto" || currentRole === "copiloto") {
      updateShipAttributes(playerData.ship, attributes);
      if (confirmSound.current) {
        confirmSound.current.currentTime = 0;
        confirmSound.current.volume = 1.0;
        confirmSound.current.play().catch(e => console.warn("Áudio bloqueado pelo navegador:", e));
      }
    }
  };

  const handleIncrement = (attributeName) => {
    if (!canEdit(currentRole) || attributes[attributeName] >= 6 || remainingPoints <= 0) return;
    setAttributes({ ...attributes, [attributeName]: attributes[attributeName] + 1 });
  };

  const handleDecrement = (attributeName) => {
    if (!canEdit(currentRole) || attributes[attributeName] <= 0) return;
    setAttributes({ ...attributes, [attributeName]: attributes[attributeName] - 1 });
  };

  const handleConfirmAttack = () => {
    if (!attackTarget) return;

    if (attackWeaponType === "missiles" && shipInfo.missileCooldown > 0) {
      showConfirm({
        title: "SISTEMA EM RECARGA",
        message: `Aguarde ${shipInfo.missileCooldown} turno(s) global(is) para disparar mísseis novamente.`,
        variant: "warning", confirmLabel: "ENTENDIDO", onConfirm: closeConfirm,
      });
      return;
    }

    if (attackWeaponType === "missiles" && shipInfo.shipClass !== "type_II") {
      const currentShips = getAllShips();
      const myShip = currentShips[playerData.ship];

      if (myShip && myShip.activeCrew) {
        const centerTurret = myShip.activeCrew.find(m => m.function.includes("CENTRO"));

        if (!centerTurret) {
          showConfirm({
            title: "SISTEMA OFFLINE",
            message: "Sistema de Mísseis offline. Não há tripulação operacional na Torreta Central para operar a mira.",
            variant: "danger", confirmLabel: "ENTENDIDO", onConfirm: closeConfirm,
          });
          return;
        }

        if (centerTurret.missileTarget !== attackTarget) {
          centerTurret.missileTarget    = attackTarget;
          centerTurret.missileReady     = false;
          centerTurret.missileLockLevel = 0;
          updateShipConfig(playerData.ship, { activeCrew: myShip.activeCrew });
          window.dispatchEvent(new StorageEvent('storage', { key: 'heavens_door_ships_db', newValue: JSON.stringify(getAllShips()) }));
          setShowAttackModal(false);
          showConfirm({
            title: "MIRA INICIADA",
            message: "Aguarde o Mestre passar 1 Turno Global para concluir o cálculo de trajetória.",
            subtext: "SISTEMA DE GUIAGEM ATIVO",
            variant: "warning", confirmLabel: "ENTENDIDO", onConfirm: closeConfirm,
          });
          return;
        } else if (!centerTurret.missileReady) {
          showConfirm({
            title: "MIRA NÃO PRONTA",
            message: "O sistema de guiagem ainda está calculando a trajetória. O Mestre precisa passar o Turno Global.",
            variant: "warning", confirmLabel: "AGUARDAR", onConfirm: closeConfirm,
          });
          return;
        } else {
          centerTurret.missileTarget    = null;
          centerTurret.missileReady     = false;
          centerTurret.missileLockLevel = 0;
          updateShipConfig(playerData.ship, { activeCrew: myShip.activeCrew, missileCooldown: 2 });
        }
      }
    }

    const currentWeaponEffect = getEffect(shipInfo.shipClass, attackWeaponType, attributes[attackWeaponType]);
    const isMissileAttack     = attackWeaponType === "missiles";

    processPlayerAttack(playerData.ship, attackTarget, attackDamage, isExtremo, currentWeaponEffect, isMissileAttack);

    const updatedShip = getShipData(playerData.ship);
    setShipDataState(updatedShip);

    setShowAttackModal(false);
    setAttackTarget("");
    setAttackDamage("");
    setIsExtremo(false);
  };

  const handleCancelMissileLock = () => {
    const currentShips = getAllShips();
    const myShip = currentShips[playerData.ship];
    if (myShip && myShip.activeCrew) {
      const turret = myShip.activeCrew.find(m => m.function.includes("CENTRO"));
      if (turret) {
        turret.missileTarget    = null;
        turret.missileReady     = false;
        turret.missileLockLevel = 0;
        updateShipConfig(playerData.ship, { activeCrew: myShip.activeCrew });
        window.dispatchEvent(new StorageEvent('storage', { key: 'heavens_door_ships_db', newValue: JSON.stringify(getAllShips()) }));
        setShowAttackModal(false);
        setAttackTarget("");
      }
    }
  };

  const centerTurret = shipDataState?.activeCrew?.find(m => {
    if (shipDataState.crew && shipDataState.crew.torretas) {
      const torreta = shipDataState.crew.torretas.find(t => m.function.includes(t.id.toUpperCase()));
      return torreta && torreta.capabilities.includes("Míssil");
    }
    return false;
  });
  const lockLevel = centerTurret?.missileLockLevel || 0;

  const maxAttrs = getShipMaxAttributes(shipDataState);

  // ─── Estado de escudos da nave do jogador ─────────────────────────────────
  const shieldStatus = shipDataState?.shieldStatus || 'operacional';
  const shieldTurnos = shipDataState?.shieldTurnosParaReparo || 0;
    // ─── Estado de motores da nave do jogador ─────────────────────────────────
  const enginesStatus = shipDataState?.enginesStatus || 'operacional';
  const enginesTurnos = shipDataState?.enginesTurnosParaReparo || 0;
 
  const renderBars = (attributeName, currentLevel) => {
    const maxAllowed = maxAttrs[attributeName];

    return Array.from({ length: 6 }).map((_, idx) => {
      const targetLevel = idx + 1;
      const isActive  = idx < currentLevel;
      const isBlocked = targetLevel > maxAllowed;

      return (
        <div
          key={idx}
          className={`control-bar ${isActive ? "active" : ""} ${isBlocked ? "blocked" : ""}`}
          title={isBlocked ? "SISTEMA AVARIADO - BLOQUEADO" : ""}
          onClick={(e) => {
            e.stopPropagation();
            if (!canEdit(currentRole) || isBlocked) return;

            let newLevel   = targetLevel;
            if (targetLevel === currentLevel) newLevel = currentLevel - 1;
            const difference = newLevel - currentLevel;

            if (difference > 0) {
              const pointsToApply = Math.min(difference, remainingPoints);
              if (pointsToApply > 0) {
                const finalLevel = currentLevel + pointsToApply;
                if (finalLevel <= maxAllowed) {
                  playPowerUpSound(currentLevel, finalLevel);
                  setAttributes({ ...attributes, [attributeName]: finalLevel });
                }
              }
            } else if (difference < 0) {
              playPowerDownSound(newLevel <= 0);
              setAttributes({ ...attributes, [attributeName]: Math.max(0, newLevel) });
            }
          }}
        />
      );
    });
  };

  const attrNames = { weapons: "Armas", missiles: "Mísseis", controls: "Controles", shields: "Escudos", engines: "Motores" };
  const attrShort = { weapons: "ARM", missiles: "MSL", controls: "CON", shields: "ESC", engines: "MOT" };

  const targetShip = allShipsList.find(s => s.id === attackTarget);
  const isCurrentlyAiming = attackWeaponType === "missiles" && centerTurret && centerTurret.missileTarget;
  const isMissileReady    = attackWeaponType === "missiles" && isCurrentlyAiming && centerTurret.missileReady;
  const showDamageFields  = attackWeaponType === "weapons" || isMissileReady;
  const isAimingWait      = isCurrentlyAiming && !isMissileReady;

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-info">
            <div className="ship-title-container">
              <img src="/256.png" alt="Ship Icon" className="ship-header-icon" />
              <h1>{shipInfo.name}</h1>
            </div>
            <p>COMANDANTE: {playerData.nickname.toUpperCase()} | FUNÇÃO: {currentRole.toUpperCase()}</p>
          </div>
          <div className="logout-button-container">
            {currentRole === "piloto" && (
              <>
                <span className="logout-text">ATACAR</span>
                <button
                  onClick={() => setShowAttackModal(true)}
                  className="logout-button"
                  title="Sistemas de Armas"
                  style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem", borderColor: '#ff4a4a', color: '#ff4a4a' }}
                >
                  LT
                </button>
              </>
            )}
            <span className="logout-text">TRIPULACAO</span>
            <button onClick={() => setShowAssignCrew(true)} className="logout-button" title="Assign Crew" style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem" }}>
              X
            </button>
            <span className="logout-text">DESTREZA</span>
            <button onClick={() => setShowDexterityModal(true)} className="logout-button" title="Ranking Geral" style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem" }}>
              Y
            </button>
            <span className="logout-text">deslogar</span>
            <button onClick={onLogout} className="logout-button" style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem" }}>
              B
            </button>
          </div>
          <div className="sd-header-log">{headerLog}</div>
        </header>

        <main className="dashboard-main">
          <section className="attributes-list">
            <h2>Atributos</h2>
            {Object.entries(attributes).map(([name, value]) => (
              <div className="attribute-item" key={name}>
                <div className="attribute-item-name">{attrNames[name]}</div>
                <div className="attribute-item-value">
                  <span>[ {value} ]</span>
                  <span>{getEffect(shipInfo.shipClass, name, value)}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="ship-control-panel">
            <div className="ship-title">
              <h2>{shipInfo.name}</h2>
              <p>Sistema de Distribuição de Pontos</p>
            </div>
            <div className="control-grid">
              {Object.entries(attributes).map(([name, value]) => (
                <div key={name} className="control-slot">
                  <div className="control-slot-label">{attrShort[name]}</div>
                  <div className="control-slot-bars">{renderBars(name, value)}</div>

                  {/* ─── BOLINHAS DE AVARIA DOS ESCUDOS ─────────────────── */}
                  {name === "shields" && shieldStatus !== 'operacional' && (
                    <div className="shield-damage-indicator">
                      {/* 2 bolinhas = avariado; 3 bolinhas = destruído */}
                      {Array.from({ length: shieldTurnos }).map((_, i) => (
                        <span
                          key={i}
                          className={`shield-dmg-dot ${shieldStatus === 'destruida' ? 'destroyed' : 'damaged'}`}
                          title={`Escudos ${shieldStatus} — ${shieldTurnos} turno(s)`}
                        />
                      ))}
                      <span className={`shield-dmg-label ${shieldStatus === 'destruida' ? 'destroyed' : 'damaged'}`}>
                        {shieldStatus === 'destruida' ? 'OFFLINE' : 'AVARIADO'}
                      </span>
                    </div>
                  )}

                  {/* ─── BOLINHAS DE AVARIA DOS MOTORES ──────────────────── */}
                  {name === "engines" && enginesStatus !== 'operacional' && (
                    <div className="shield-damage-indicator">
                      {Array.from({ length: enginesTurnos }).map((_, i) => (
                        <span
                          key={i}
                          className={`shield-dmg-dot ${enginesStatus === 'destruida' ? 'destroyed' : 'damaged-engines'}`}
                          title={`Motores ${enginesStatus} — ${enginesTurnos} turno(s)`}
                        />
                      ))}
                      <span className={`shield-dmg-label ${enginesStatus === 'destruida' ? 'destroyed' : 'damaged-engines'}`}>
                        {enginesStatus === 'destruida' ? 'OFFLINE' : 'AVARIADO'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="ship-display">
              {(() => {
                const TOTAL_SELECTABLE_POINTS = shipInfo.totalPoints;
                const pointsUsed = Object.values(attributes).reduce((sum, val) => sum + val, 0);
                return (
                  <>
                    <div className="point-selector-grid">
                      {Array.from({ length: TOTAL_SELECTABLE_POINTS }).map((_, idx) => (
                        <div key={idx} className={`point-segment ${idx < pointsUsed ? "active" : ""}`} />
                      ))}
                    </div>
                    <div className="points-counter">
                      <span className="points-used">{pointsUsed}</span>
                      <span className="points-total">/{TOTAL_SELECTABLE_POINTS}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            {(currentRole === "piloto" || currentRole === "copiloto") && (
              <div className="send-button-wrapper" style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span className="logout-text" style={{ marginRight: '10px' }}>ENVIAR</span>
                <button className="logout-button" onClick={handleManualSync} title="Enviar Atributos para a Nave" style={{ fontSize: "0.8rem", width: "40px", height: "30px" }}>
                  A
                </button>
              </div>
            )}
          </section>

          <section className="player-info-panel">
            <div className="player-info-section">
              <div className="player-info-label">Comandante</div>
              <div className="player-info-value">{playerData.nickname.toUpperCase()}</div>
            </div>
            <div className="player-info-section">
              <div className="player-info-label">Função</div>
              <div className="player-info-value">
                {currentRole === "piloto" && "Piloto"}
                {currentRole === "copiloto" && "Co-piloto"}
                {currentRole === "tripulante" && "Tripulante"}
              </div>
            </div>
            <div className="player-info-section">
              <div className="player-info-label">Des | Esq</div>
              <div className="player-info-value player-info-value--small">{playerData.des} | {playerData.esq}</div>
            </div>
            <div className="player-info-section">
              <div className="player-info-label">HP da Nave</div>
              <div className="hp-container">
                <div className="hp-label">{shipInfo.currentHP}/{shipInfo.maxHP}</div>
                <div className="hp-bar-bg">
                  <div className="hp-bar-fill" style={{ width: `${(shipInfo.currentHP / shipInfo.maxHP) * 100}%` }} />
                </div>
              </div>
              <div className="radar-container" style={{ height: "250px", marginTop: "20px" }}>
                <ShipRadarChart attributes={attributes} />
              </div>
            </div>
            <div className="remaining-points-box">
              <div className="remaining-label">Pontos Restantes</div>
              <div className="remaining-value">{remainingPoints}</div>
            </div>
          </section>
        </main>
      </div>

      {showAssignCrew && (
        <AssignCrew currentPlayer={playerData} currentRole={currentRole} onClose={() => setShowAssignCrew(false)} />
      )}
      {showDexterityModal && (
        <DexterityRanking onClose={() => setShowDexterityModal(false)} />
      )}

      {hitEvent && (
        <>
          <div key={hitEvent.id} className={`hit-overlay ${hitEvent.type}`}>
            {hitEvent.extraTag && <div className="hit-tag-heavy">{hitEvent.extraTag}</div>}
            <div className="hit-damage-row">
              {hitEvent.text.split("").map((char, i) => (
                <span key={i} className="hit-letter" style={{ animationDelay: `${i * 0.03}s` }}>{char}</span>
              ))}
            </div>
          </div>
          {hitEvent.moduleMsg && <div className="hit-module-msg">{hitEvent.moduleMsg}</div>}
        </>
      )}

      {/* MODAL DE ATAQUE */}
      {showAttackModal && (
        <div className="assign-overlay" onClick={() => setShowAttackModal(false)}>
          <div className="attack-modal" onClick={e => e.stopPropagation()}>
            <div className="attack-modal__scanline" />
            <div className="attack-modal__header">
              <div className="attack-modal__header-left">
                <div className="attack-modal__alert-dot" />
                <div>
                  <div className="attack-modal__eyebrow">HEAVEN'S DOOR // ARTILHARIA</div>
                  <h2 className="attack-modal__title">Sistema de Armas</h2>
                </div>
              </div>
              <button className="attack-modal__close" onClick={() => setShowAttackModal(false)}>×</button>
            </div>

            <div className="attack-modal__weapon-row">
              <button
                className={`attack-modal__weapon-btn ${attackWeaponType === "weapons" ? "active" : ""}`}
                onClick={() => setAttackWeaponType("weapons")}
              >
                <span className="attack-modal__weapon-icon">⬡</span>
                <span className="attack-modal__weapon-label">Balístico</span>
                <span className="attack-modal__weapon-dmg">{getEffect(shipInfo.shipClass, "weapons", attributes["weapons"])}</span>
              </button>

              <button
                className={`attack-modal__weapon-btn ${attackWeaponType === "missiles" ? "active" : ""} ${shipInfo.missileCooldown > 0 ? "cooldown" : ""}`}
                onClick={() => setAttackWeaponType("missiles")}
              >
                <span className="attack-modal__weapon-icon">◈</span>
                <span className="attack-modal__weapon-label">
                  Míssil {shipInfo.missileCooldown > 0 && <span className="attack-modal__cooldown-badge">{shipInfo.missileCooldown}T</span>}
                </span>
                <div className="attack-modal__lock-indicator">
                  LOCK:
                  <span className={`am-lock-box ${lockLevel >= 1 ? 'filled' : ''}`}></span>
                  <span className={`am-lock-box ${lockLevel >= 2 ? 'filled' : ''}`}></span>
                  <span className={`am-lock-box ${lockLevel >= 3 ? 'filled blink-red' : ''}`}></span>
                </div>
                <span className="attack-modal__weapon-dmg">{getEffect(shipInfo.shipClass, "missiles", attributes["missiles"])}</span>
              </button>
            </div>

            {attackWeaponType === "missiles" && lockLevel >= 2 && (
              <div className="attack-modal__advantage-alert">
                {lockLevel === 2 ? "VANTAGEM: ROLE 2d100" : "SUPER VANTAGEM: ROLE 3d100"} E USE O MENOR VALOR!
              </div>
            )}

            <div className="attack-modal__body">
              <div className="attack-modal__field">
                <label className="attack-modal__field-label">
                  <span className="attack-modal__field-num">01</span> Selecionar Alvo
                </label>
                <select
                  className="attack-modal__select"
                  value={isCurrentlyAiming ? centerTurret.missileTarget : attackTarget}
                  onChange={(e) => setAttackTarget(e.target.value)}
                  disabled={isCurrentlyAiming}
                >
                  <option value="">— Nenhum alvo selecionado —</option>
                  {allShipsList
                    .filter(s => s.id !== playerData.ship && s.status !== "desativada" && s.status !== "destruida")
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.isEnemy ? "[HOSTIL]" : "[ALIADA]"} {s.name}
                      </option>
                    ))}
                </select>

                {targetShip && (
                  <div className="attack-modal__target-info">
                    <div className="attack-modal__target-row">
                      <span className="attack-modal__target-key">CLASSE</span>
                      <span className="attack-modal__target-val">{targetShip.shipClass === "type_III" ? "III" : "II"}</span>
                    </div>
                    <div className="attack-modal__target-row">
                      <span className="attack-modal__target-key">INTEGRIDADE</span>
                      <span className="attack-modal__target-val" style={{ color: targetShip.currentHP / targetShip.maxHP > 0.5 ? '#2aff8c' : '#ff3c1e' }}>
                        {targetShip.currentHP}/{targetShip.maxHP} HP
                      </span>
                    </div>
                    <div className="attack-modal__target-row">
                      <span className="attack-modal__target-key">ESCUDO</span>
                      <span
                        className="attack-modal__target-val"
                        style={{
                          color: (targetShip.shieldStatus === 'destruida') ? '#ff3c1e'
                               : (targetShip.shieldStatus === 'avariada')  ? '#ffae00'
                               : undefined
                        }}
                      >
                        {getEffect(targetShip.shipClass, "shields", targetShip.attributes?.shields ?? 0)}
                        {targetShip.shieldStatus === 'avariada'  && ' ⚡'}
                        {targetShip.shieldStatus === 'destruida' && ' 💀'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {showDamageFields && (
                <div className="attack-modal__field">
                  <label className="attack-modal__field-label">
                    <span className="attack-modal__field-num">02</span> Modificador de Disparo
                  </label>
                  <label className="attack-modal__extremo-toggle">
                    <div
                      className={`attack-modal__extremo-track ${isExtremo ? "active" : ""}`}
                      onClick={() => setIsExtremo(!isExtremo)}
                    >
                      <div className="attack-modal__extremo-thumb" />
                    </div>
                    <div>
                      <div className="attack-modal__extremo-name">Acerto Extremo</div>
                      <div className="attack-modal__extremo-sub">Dano máximo automático — sem rolagem</div>
                    </div>
                  </label>
                </div>
              )}

              {showDamageFields && !isExtremo && (
                <div className="attack-modal__field">
                  <label className="attack-modal__field-label">
                    <span className="attack-modal__field-num">03</span> Dano Rolado (dado físico)
                  </label>
                  <input
                    type="number"
                    className="attack-modal__input"
                    value={attackDamage}
                    onChange={(e) => setAttackDamage(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              <div className="attack-modal__damage-preview">
                <div className="attack-modal__damage-label">POTENCIAL DE DANO</div>
                <div className="attack-modal__damage-value">
                  {getEffect(shipInfo.shipClass, attackWeaponType, attributes[attackWeaponType])}
                </div>
              </div>
            </div>

            <div className="attack-modal__footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="attack-modal__fire-btn"
                onClick={handleConfirmAttack}
                disabled={(!isCurrentlyAiming && !attackTarget) || (showDamageFields && !isExtremo && !attackDamage) || isAimingWait}
              >
                <span>
                  {attackWeaponType === "missiles"
                    ? (!isCurrentlyAiming ? "INICIAR MIRA" : (isMissileReady ? "DISPARAR MÍSSIL" : "MIRANDO... (AGUARDE)"))
                    : "CONFIRMAR DISPARO"}
                </span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {isCurrentlyAiming && (
                <button
                  className="attack-modal__fire-btn"
                  onClick={handleCancelMissileLock}
                  style={{ background: 'rgba(255, 174, 0, 0.1)', borderColor: '#ffae00', color: '#ffae00' }}
                >
                  <span>CANCELAR MIRA E DESTRAVAR SISTEMA</span>
                </button>
              )}
            </div>

            <div className="attack-modal__corner attack-modal__corner--tl" />
            <div className="attack-modal__corner attack-modal__corner--tr" />
            <div className="attack-modal__corner attack-modal__corner--bl" />
            <div className="attack-modal__corner attack-modal__corner--br" />
          </div>
        </div>
      )}

      {/* Overlay de mira */}
      {currentlyTargeted && (
        <div className="missile-lock-overlay">
          <div className="crosshair-container">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div className="ml-corner tl" />
              <div className="ml-corner tr" />
              <div className="ml-corner bl" />
              <div className="ml-corner br" />
              <div className="crosshair-symbol">
                <div className="ml-ring-outer" style={{ position: 'absolute', inset: 0 }}>
                  <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,60,30,0.3)" strokeWidth="1" strokeDasharray="6 5"/>
                    <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,60,30,0.45)" strokeWidth="1" strokeDasharray="3 9"/>
                    <path d="M100 8 A92 92 0 0 1 157 27" fill="none" stroke="#ff3c1e" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M192 100 A92 92 0 0 1 173 157" fill="none" stroke="#ff3c1e" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M100 192 A92 92 0 0 1 43 173" fill="none" stroke="#ff3c1e" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M8 100 A92 92 0 0 1 27 43" fill="none" stroke="#ff3c1e" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ position: 'absolute', inset: 0 }}>
                  <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <line x1="100" y1="8" x2="100" y2="26" stroke="rgba(255,60,30,0.9)" strokeWidth="1.5"/>
                    <line x1="100" y1="174" x2="100" y2="192" stroke="rgba(255,60,30,0.9)" strokeWidth="1.5"/>
                    <line x1="8" y1="100" x2="26" y2="100" stroke="rgba(255,60,30,0.9)" strokeWidth="1.5"/>
                    <line x1="174" y1="100" x2="192" y2="100" stroke="rgba(255,60,30,0.9)" strokeWidth="1.5"/>
                    <line x1="34" y1="34" x2="44" y2="44" stroke="rgba(255,60,30,0.45)" strokeWidth="1"/>
                    <line x1="166" y1="34" x2="156" y2="44" stroke="rgba(255,60,30,0.45)" strokeWidth="1"/>
                    <line x1="34" y1="166" x2="44" y2="156" stroke="rgba(255,60,30,0.45)" strokeWidth="1"/>
                    <line x1="166" y1="166" x2="156" y2="156" stroke="rgba(255,60,30,0.45)" strokeWidth="1"/>
                    <circle cx="100" cy="100" r="22" fill="none" stroke="rgba(255,60,30,0.9)" strokeWidth="1.5"/>
                    <line x1="28" y1="100" x2="76" y2="100" stroke="rgba(255,60,30,0.85)" strokeWidth="1"/>
                    <line x1="124" y1="100" x2="172" y2="100" stroke="rgba(255,60,30,0.85)" strokeWidth="1"/>
                    <line x1="100" y1="28" x2="100" y2="76" stroke="rgba(255,60,30,0.85)" strokeWidth="1"/>
                    <line x1="100" y1="124" x2="100" y2="172" stroke="rgba(255,60,30,0.85)" strokeWidth="1"/>
                    <line x1="28" y1="94" x2="28" y2="106" stroke="rgba(255,60,30,0.55)" strokeWidth="1"/>
                    <line x1="172" y1="94" x2="172" y2="106" stroke="rgba(255,60,30,0.55)" strokeWidth="1"/>
                    <line x1="94" y1="28" x2="106" y2="28" stroke="rgba(255,60,30,0.55)" strokeWidth="1"/>
                    <line x1="94" y1="172" x2="106" y2="172" stroke="rgba(255,60,30,0.55)" strokeWidth="1"/>
                  </svg>
                  <div className="ml-dot" />
                </div>
                <div className="ml-ring-inner" style={{ position: 'absolute', inset: 0 }}>
                  <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255,60,30,0.25)" strokeWidth="1" strokeDasharray="4 6"/>
                  </svg>
                </div>
              </div>
            </div>
            <div className="crosshair-text">⚠ ALERTA: MIRA DE MÍSSIL DETECTADA</div>
            <div className="ml-sublabel">missile lock · target acquired</div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        subtext={confirmState.subtext}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={() => { confirmState.onConfirm && confirmState.onConfirm(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default ShipDashboard;
