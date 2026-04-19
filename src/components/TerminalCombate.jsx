import React, { useState, useEffect, useRef } from "react";// Localize esta linha no topo do TerminalCombate.jsx
import { 
  getAllShips, 
  updateShipConfig, 
  applyModuleDamage, // ADICIONE ESTA
  processGlobalTurn  // ADICIONE ESTA
} from "../utils/mockApi";
import { getEffect } from "../utils/effectHelpers";
import { rollDamage, parseShield, rollHit } from "../utils/diceHelpers";
import "../styles/TerminalCombate.css";

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

// Fallback seguro para precisao — NPCs antigos podem não ter o campo
const getPrecisao = (member) =>
  typeof member.precisao === "number" ? member.precisao : "—";

// ─── Slot de tripulante ───────────────────────────────────────────────────────

// ─── Slot de tripulante ───────────────────────────────────────────────────────

const CrewSlot = ({ member, attackerShip, allShips, onFire }) => {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState(member.missileTarget || "");
  
  // Atualiza o select caso a mira mude no banco
  useEffect(() => {
    if (member.missileTarget) setTargetId(member.missileTarget);
  }, [member.missileTarget]);

  const isMissileLocked = member.missileTarget === targetId;
  const isMissileReady = member.missileReady;

  const fires = canFire(member, attackerShip.shipClass);
  const missiles = usesMissiles(member, attackerShip.shipClass);
  const precisao = getPrecisao(member);

  // Lê o status atual do banco de dados
  const status = member.moduleStatus || 'operacional';
  const turnos = member.turnosParaReparo || 0;
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

  return (
    <div className={`tc-crew-slot ${slotClass(member.role)} ${open ? "is-open" : ""}`}>
      
      {/* --- NOVO: BOLINHAS DE AVARIA --- */}
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

      {/* Botão ATACAR — Dinâmico com base no Status */}
      {fires && !open && (
        <button 
          className="tc-attack-toggle-btn" 
          onClick={() => setOpen(true)}
          disabled={!isOperacional}
        >
          {status === "destruida" ? "DESTRUÍDA" : status === "avariada" ? "AVARIADA" : (missiles ? " ATACAR" : " ATACAR")}
        </button>
      )}

      {/* Painel de ataque expandido - Só abre se estiver operacional */}
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
              onClick={() => { setOpen(false); setTargetId(""); }}
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
                : (missiles ? " MÍSSIL" : "DISPARAR")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de ajuste rápido para o Mestre
const ShipAttributeAdjuster = ({ ship, onUpdate }) => {
  const handleLevelChange = (attr, delta) => {
  const currentAttrs = { ...ship.attributes };

  const currentTotal = Object.values(currentAttrs).reduce((sum, v) => sum + v, 0);
  const currentValue = currentAttrs[attr] || 0;

  // impedir valores negativos
  if (currentValue + delta < 0) return;

  // impedir ultrapassar o totalPoints
  if (delta > 0 && currentTotal >= ship.totalPoints) return;

    // impedir valor > 6
  if (currentValue + delta > 6) return;
  
  const newAttrs = {
    ...currentAttrs,
    [attr]: currentValue + delta
  };

  updateShipConfig(ship.id, { attributes: newAttrs });
  onUpdate();
};

  return (
    <div className="tc-attr-compact-row">
      {Object.entries(ship.attributes || {}).map(([attr, val]) => (
        <div key={attr} className="tc-mini-ctrl">
          <span className="tc-mini-label">{attr.substring(0,3).toUpperCase()}</span>
          <div className="tc-mini-btns">
            <button onClick={() => handleLevelChange(attr, 1)}>+</button>
            <span className="tc-mini-val">{val}</span>
            <button onClick={() => handleLevelChange(attr, -1)}>-</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Card Tático ──────────────────────────────────────────────────────────────

const TacticalCard = ({ ship, allShips, onFire, onUpdate }) => {  
  const hpPct = Math.round((ship.currentHP / ship.maxHP) * 100);
  const crew  = ship.activeCrew || [];
  const isDestroyed = ship.currentHP <= 0; // <-- ADICIONE ESTA VARIÁVEL

  return (
    <div className={`tc-card ${isDestroyed ? "is-destroyed" : ""}`}>
      
      {/* --- NOVO OVERLAY --- */}
      {isDestroyed && (
        <div className="tc-card-destroyed-overlay">
          DESTRUÍDA
        </div>
      )}

      <div className="tc-card-header">
        <div className="tc-card-header-left">
          <span className="tc-card-class-badge">
            {ship.shipClass === "type_III" ? "CLASSE III" : "CLASSE II"}
          </span>
          <span className="tc-card-ship-name">{ship.name}</span>
        </div>

        <div className="tc-card-header-right">
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
      <ShipAttributeAdjuster ship={ship} onUpdate={onUpdate} />        {crew.length === 0 ? (
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
      <div key={i} className={`tc-log-entry ${entry.hit ? "hit" : "miss"}`}>
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
  const turnSound = useRef(new Audio('/passarturno.wav'));

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
    return () => {clearInterval(interval);         document.body.style.cursor = "default";
}
  }, []);

useEffect(() => {
    const handlePlayerAttack = (e) => {
      if (e.key === "last_combat_event" && e.newValue) {
        const data = JSON.parse(e.newValue);
        addLog({ hit: data.damage > 0, text: data.logText });
        refresh(); // Atualiza as barras de HP da nave na tela do Mestre na hora!
      }
      // --- NOVO: SE O BANCO MUDOU (NAVE FOI DESTRUÍDA), REFRESH ---
      if (e.key === "heavens_door_ships_db") {
        refresh();
      }
    };
    window.addEventListener('storage', handlePlayerAttack);
    return () => window.removeEventListener('storage', handlePlayerAttack);
  }, []);

  // ── Motor de Resolução ────────────────────────────────────────────────────

const handleFire = (member, attackerShip, targetId, missiles) => {
    const ships = getAllShips();
    const target = ships[targetId];

    // --- NOVO: VERIFICAÇÃO DE RECARGA ---
    if (missiles && attackerShip.missileCooldown > 0) {
      addLog({ 
        hit: false, 
        text: `⏳ ${attackerShip.name}: Sistemas de mísseis em recarga (${attackerShip.missileCooldown}t restantes).` 
      });
      return;
    }

    if (missiles && attackerShip.shipClass !== "type_II") {
      const attackerCrewMember = ships[attackerShip.id].activeCrew.find(m => m.id === member.id);

      if (attackerCrewMember.missileTarget !== targetId) {
        // Inicia a mira e para a função (não atira ainda)
        attackerCrewMember.missileTarget = targetId;
        attackerCrewMember.missileReady = false;
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));

        addLog({ hit: false, text: `⚠️ ${attackerShip.name} iniciou travamento de mira em ${target.name}!` });
        refresh();
        return; 
      } else if (!attackerCrewMember.missileReady) {
        addLog({ hit: false, text: `⏳ ${attackerShip.name} ainda está calculando a mira. Aguarde o Turno Global.` });
        return;
      } else {
        // --- CORREÇÃO: Limpa a mira, INICIA A RECARGA e permite o dano! ---
        attackerCrewMember.missileTarget = null;
        attackerCrewMember.missileReady = false;
        
        // Aplica o cooldown na memória antes de salvar
        ships[attackerShip.id].missileCooldown = 2; 
        
        localStorage.setItem("heavens_door_ships_db", JSON.stringify(ships));
      }
    }
    
    // ... O resto da função original a partir de: "const precisao = member.precisao || 50;"
    const precisao = member.precisao || 50;

    // Configura os dados da arma
    const weaponLabel = missiles ? "Mísseis" : "Armas";
    const attrLevel = attackerShip.attributes[missiles ? "missiles" : "weapons"];
    const effectStr = getEffect(attackerShip.shipClass, missiles ? "missiles" : "weapons", attrLevel);

    // d100 com verificação de extremo
    const { acertou, isExtremo, rolou } = rollHit(precisao);

    // LOG DE FALHA
    if (!acertou) {
      const msgFalha = [
        `${member.id} [${weaponLabel} Nv.${attrLevel}: ${effectStr}]`,
        `→ ${target.name}`,
        `| d100: ${rolou}/${precisao}% ✗`,
        `| ERROU O ALVO`
      ].join("  ");
      
      // --- COMUNICAÇÃO ENTRE GUIAS: Avisa o Painel do Jogador que o tiro FALHOU ---
      localStorage.setItem("last_combat_event", JSON.stringify({
        targetName: target.name,
        damage: 0,
        isAbsorbed: false, 
        timestamp: Date.now(),
        logText: msgFalha
      }));

      addLog({ hit: false, text: msgFalha });
      return;
    }

    // Puxar dano (usando flag isExtremo)
    const { total: rawDamage, isCritico, breakdown } = rollDamage(effectStr, isExtremo);

    // Redução de escudo
    const shieldValue = parseShield(getEffect(target.shipClass, "shields", target.attributes.shields));
    const finalDamage = Math.max(0, rawDamage - shieldValue);
    
    // Aplicar dano estrutural
    // Aplicar dano estrutural
    const newHP = Math.max(0, target.currentHP - finalDamage);
    updateShipConfig(targetId, { currentHP: newHP });

    // --- NOVO: DESTRUIÇÃO AUTOMÁTICA ---
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
if (isExtremo) tags.push("[EXTREMO!]");
else if (isCritico) tags.push("[CRÍTICO!]");

   let moduleMsg = "";
let moduleTag = ""; // ← NOVO
if ((isCritico || isExtremo) && finalDamage > 0 && target.activeCrew?.length > 0) {  const alvosAvariaveis = target.activeCrew.filter(m => {
    if (!m.function) return false;
    if (m.function.includes("TORRETA")) return true;
    if (target.shipClass === "type_II" && m.function.includes("COPILOTO")) return true;
    return false;
  });
  
  if (alvosAvariaveis.length > 0) {
    const randomModule = alvosAvariaveis[Math.floor(Math.random() * alvosAvariaveis.length)];
    moduleMsg = applyModuleDamage(targetId, randomModule.id);
    moduleTag = `[MÓDULO: ${moduleMsg}]`; // ← NOVO: cria a tag
  }
}

// LOG DE ACERTO
const msg = [
  `${member.id} [${weaponLabel} Nv.${attrLevel}: ${effectStr}]`,
  `→ ${target.name}`,
  `| d100: ${rolou}/${precisao}% ✓`,
  `| Rolou: ${breakdown} = ${rawDamage}`,
  `| Escudo: -${shieldValue}`,
  `| Dano: ${finalDamage} HP`,
  `| HP: ${newHP}/${target.maxHP}`,
  ...tags,
  ...(moduleTag ? [moduleTag] : []), // ← NOVO: inclui a tag no log
].join("  ");


    // --- COMUNICAÇÃO ENTRE GUIAS: Avisa o Painel do Jogador do DANO ou se foi ABSORVIDO ---
    localStorage.setItem("last_combat_event", JSON.stringify({
      targetName: target.name,
      damage: finalDamage,
      isAbsorbed: rawDamage > 0 && finalDamage === 0, // Se rolou > 0 mas o dano final foi 0 = Absorvido
      timestamp: Date.now(),
      logText: msg
    }));

    addLog({ hit: true, text: msg });
    refresh();
  };

  const addLog = (entry) => {
    const time = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    setCombatLog((prev) => [...prev, { ...entry, time }]);
  };

  const totalCrew = activeEnemies.reduce(
    (sum, s) => sum + (s.activeCrew?.length || 0), 0
  );
  const timeStr = lastRefresh.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

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

              if (turnSound.current) {
                turnSound.current.currentTime = 0; // Reseta o som caso clique rápido
                turnSound.current.play().catch(e => console.warn("Áudio bloqueado:", e));
              }
              
              const reparos = processGlobalTurn();
              if (reparos.length > 0) {
                // Adiciona ao log local do mestre
                reparos.forEach(msg => addLog({ hit: false, text: `🔧 ${msg}` }));
                
                // Agrupa as mensagens se houver mais de um reparo no mesmo turno
                const fullMsg = `🔧 ` + reparos.join(" | 🔧 ");
                
                // Cria o evento de reparo
                const repairEvent = {
                  targetName: "Sistema",
                  damage: 0,
                  isAbsorbed: false,
                  isRepair: true, // Nova flag para identificar o reparo
                  timestamp: Date.now(),
                  logText: fullMsg
                };

                // Dispara para outras abas (Painel do Jogador)
                localStorage.setItem("last_combat_event", JSON.stringify(repairEvent));
                // Dispara para a mesma aba (caso o mestre esteja com o painel aberto em background)
                window.dispatchEvent(new CustomEvent("combat:event", { detail: repairEvent }));
              }
              refresh();
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
        <span className="tc-footer-text">
          HEAVEN'S DOOR <span>//</span> CLASSIFIED — MESTRE ONLY
        </span>
        <span className="tc-footer-text">AUTO-REFRESH <span>5s</span></span>
      </footer>
    </div>
  );
};

export default TerminalCombate;
