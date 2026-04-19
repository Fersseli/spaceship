import React, { useState, useEffect, useRef } from "react";import "../styles/ShipDashboard.css";
import { canEdit } from "../utils/rolePermissions";
import { calculateRemainingPoints, getEffect } from "../utils/effectHelpers";
import { shipsDatabase } from "../data/ships";
import ShipRadarChart from "./ShipRadarChart";
import AssignCrew from "./AssignCrew";
import { removePlayerFromAllCrews } from "../utils/mockApi"; // Adicione o import para a função de limpeza de tripulação
import DexterityRanking from "./Destreza"; // <-- NOVO IMPORT
import { getShipData, updateShipAttributes, getAllShips, processPlayerAttack } from "../utils/mockApi";


// Painel principal da nave com interface Starfield
const ShipDashboard = ({ playerData, onLogout }) => {

// Localize onde estão os outros estados de ataque (por volta da linha 20)
const [attackWeaponType, setAttackWeaponType] = useState("weapons"); // "weapons" ou "missiles"
  const [hitEvent, setHitEvent] = useState(null);
const [headerLog, setHeaderLog] = useState("");
const [showAssignCrew, setShowAssignCrew] = useState(false);
const [showDexterityModal, setShowDexterityModal] = useState(false);
const [shipDataState, setShipDataState] = useState(getShipData(playerData.ship));
// Novos estados para o Sistema de Combate
const [showAttackModal, setShowAttackModal] = useState(false);
const [attackTarget, setAttackTarget] = useState("");
const [isExtremo, setIsExtremo] = useState(false);
const [attackDamage, setAttackDamage] = useState("");
const [allShipsList, setAllShipsList] = useState([]);
const [combatJournal, setCombatJournal] = useState([]); // <--- ADICIONE ESTA LINHA

// --- NOVO: Referências de áudio e do timer ---
const rechargeSound = useRef(new Audio('/recharge.mp3'));
const powerDownGeneric = useRef(new Audio('/outage1.mp3')); 
const powerDownOutage = useRef(new Audio('/outage.mp3'));   
const hitSound = useRef(new Audio('/hit.mp3'));             // <-- NOVO: Dano normal
const critSound = useRef(new Audio('/magic_crumple2.ogg')); // <-- NOVO: Crítico/Extremo
const shieldSound = useRef(new Audio('/shield.mp3')); // <--- ADICIONE ESTA LINHA
const soundTimeout = useRef(null);



 // --- Função que toca sons com velocidade dinâmica e volume máximo ---
  const playPowerUpSound = (startLevel, endLevel) => {
    if (!rechargeSound.current) return;

    if (soundTimeout.current) {
      clearTimeout(soundTimeout.current);
    }

    const difference = endLevel - startLevel;
    if (difference <= 0) return;

    // Calcula de qual segundo o áudio deve começar
    const startSecond = startLevel * 0.5;

    // O tempo "normal" que a varredura levaria em velocidade 1x
    const normalDurationMs = difference * 500;

    // NOVO TEMPO: Começa em 500ms e adiciona 200ms por palito.
    // Pulo de 6 palitos agora leva exatamente 1500ms (1.5 segundos).
    const desiredDurationMs = 500 + (difference - 1) * 200;

    // Descobre o quanto precisa acelerar o áudio para caber no novo tempo
    const speedMultiplier = normalDurationMs / desiredDurationMs;

    // Configura os parâmetros do áudio
    rechargeSound.current.currentTime = startSecond;
    rechargeSound.current.playbackRate = speedMultiplier; 
    
    // NOVO: Força o volume no máximo do navegador (1.0 = 100%)
    rechargeSound.current.volume = 1.0; 

    // Dá o Play
    rechargeSound.current.play().catch(e => console.warn("Áudio bloqueado", e));

    // Programa o corte para o tempo exato
    soundTimeout.current = setTimeout(() => {
      rechargeSound.current.pause();
      rechargeSound.current.playbackRate = 1.0; // Reseta a velocidade pro padrão
    }, desiredDurationMs); 
  };
// src/components/ShipDashboard.jsx - Ajuste no useEffect de monitoramento

useEffect(() => {
  setAllShipsList(Object.values(getAllShips()));

  // Carrega o log inicial
  const initialLog = JSON.parse(localStorage.getItem("combat_journal") || "[]");
  setCombatJournal(initialLog);

  const handleStorageChange = (e) => {
    if (e.key === "heavens_door_ships_db") {
      if (e.newValue) {
        const allShips = JSON.parse(e.newValue);
        setAllShipsList(Object.values(allShips));
        const updatedShip = allShips[playerData.ship];
        if (updatedShip) {
          // Atualiza atributos E também o HP atual
          setAttributes(updatedShip.attributes);
          // O shipInfo usado no render virá do getShipData atualizado no próximo ciclo
          // mas para garantir atualização imediata da UI de HP:
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

    // Garante que ao entrar, ele saia de qualquer configuração antiga de tripulação
    // que possa ter restado de sessões anteriores
    removePlayerFromAllCrews(playerData.nickname);

    return () => {
        document.body.style.cursor = "default";
        localStorage.removeItem(`status_${playerData.nickname}`);
        localStorage.removeItem(`role_${playerData.nickname}`);
        // Opcional: remover também ao deslogar
        removePlayerFromAllCrews(playerData.nickname);
    };
}, [playerData]);

useEffect(() => {
  const handler = (e) => {
    const data = e.detail;
    let overlayText = "";
    let overlayType = "hit";
    let extraTag = ""; // "CRÍTICO" ou "EXTREMO"
    let moduleMsg = ""; // Mensagem de avaria

    // Tenta extrair avaria do logText enviado pelo TerminalCombate/Mestre
// CÓDIGO NOVO:
    if (data.logText) {
      // Procura formato do Mestre
      if (data.logText.includes("[MÓDULO:")) {
        const match = data.logText.match(/\[MÓDULO: (.*?)\]/);
        if (match) moduleMsg = match[1];
      } 
      // Procura formato do Jogador (Avaria)
      else if (data.logText.includes("[AVARIA:")) {
        const match = data.logText.match(/\[AVARIA: (.*?)\]/);
        if (match) moduleMsg = `${match[1]} AVARIADA`;
      } 
      // Procura formato do Jogador (Destruição)
      else if (data.logText.includes("[MÓDULO DESTRUÍDO:")) {
        const match = data.logText.match(/\[MÓDULO DESTRUÍDO: (.*?)\]/);
        if (match) moduleMsg = `${match[1]} DESTRUÍDA`;
      }
      
      if (data.logText.includes("EXTREMO")) extraTag = "extremo.";
      else if (data.logText.includes("CRÍTICO")) extraTag = "crítico.";
    }

    if (data.isRepair) {
      overlayText = "REPARO";
      overlayType = "miss";
    } else if (data.isAbsorbed) {
      overlayText = "ABSORVIDO";
      overlayType = "miss";
    } else if (data.damage > 0) {
      overlayText = `-${data.damage} HP`;
      overlayType = data.isPlayerAction ? "damage-dealt" : "hit";
    } else {
      overlayText = "FALHOU!";
      overlayType = "miss";
    }

    setHitEvent({
      text: overlayText,
      type: overlayType,
      extraTag: extraTag, // Nova propriedade
      moduleMsg: moduleMsg, // Nova propriedade
      id: data.timestamp || Date.now()
    });

    setHeaderLog(data.logText);
    setTimeout(() => setHitEvent(null), 4000);
  };

  window.addEventListener("combat:event", handler);
  return () => window.removeEventListener("combat:event", handler);
}, []);

// --- NOVO: EFEITO SONORO DE DANO ---
useEffect(() => {
  if (hitEvent) {
    // Filtramos para tocar som apenas se for um acerto com dano
    if (hitEvent.type === "hit" || hitEvent.type === "damage-dealt") {
      
      if (hitEvent.extraTag) {
        // Se houver a tag de EXTREMO ou CRÍTICO, toca o som especial
        if (critSound.current) {
          critSound.current.currentTime = 0;
          critSound.current.volume = 1.0;
          critSound.current.play().catch(e => console.warn("Áudio bloqueado:", e));
        }
      } else {
        // Caso contrário, toca o som de dano normal
        if (hitSound.current) {
          hitSound.current.currentTime = 0;
          hitSound.current.volume = 1.0;
          hitSound.current.play().catch(e => console.warn("Áudio bloqueado:", e));
        }
      }
      
    }
  // 2. Lógica para ABSORVIDO (Escudo)
    else if (hitEvent.text === "ABSORVIDO" || hitEvent.text === "absorvido!") {
      if (shieldSound.current) {
        shieldSound.current.currentTime = 0;
        shieldSound.current.volume = 1.0;
        shieldSound.current.play().catch(e => console.warn("Erro áudio:", e));

        // Corta o som após 1 segundo (1000ms)
        setTimeout(() => {
          if (shieldSound.current) {
            shieldSound.current.pause();
          }
        }, 1200);
      }
    }
  }
}, [hitEvent]);


  // Obtém informações da nave do banco de dados
// 1. Puxa as informações VIVAS da nave do nosso "banco de dados"
  const shipInfo = getShipData(playerData.ship);

  // 2. Inicializa os atributos baseado no banco
  const [attributes, setAttributes] = useState(shipInfo.attributes);

  // Calcula os pontos restantes para distribuição
  const remainingPoints = calculateRemainingPoints(attributes, shipInfo.totalPoints);

// --- Função para som de Desligamento / Redução ---
const playPowerDownSound = (isOutage = false) => {
  // Escolhe o áudio baseado na condição de "apagão" (zero de energia)
  const soundToPlay = isOutage ? powerDownOutage.current : powerDownGeneric.current;

  if (!soundToPlay) return;

  // Limpa timeouts anteriores para não cortar o som novo precocemente
  if (soundTimeout.current) {
    clearTimeout(soundTimeout.current);
  }

  // Reseta e toca
  soundToPlay.currentTime = 0;
  soundToPlay.volume = 1.0;
  soundToPlay.playbackRate = 1.0;

  soundToPlay.play().catch(e => console.warn("Áudio bloqueado", e));

  // Corta o som após um tempo (ajuste conforme a duração dos seus arquivos)
  soundTimeout.current = setTimeout(() => {
    soundToPlay.pause();
  }, isOutage ? 1500 : 500); // O som de outage costuma ser mais longo que o clique genérico
};

const [currentRole, setCurrentRole] = useState(playerData.role);

  // EFEITO: Ouvir mudanças feitas por outras abas em tempo real
// ... linha anterior: useEffect(() => {
// ... linha anterior: const [currentRole, setCurrentRole] = useState(playerData.role);

useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "last_combat_event" && e.newValue) {
        const data = JSON.parse(e.newValue);
        let overlayText = "", overlayType = "hit";
        let extraTag = "";      // ← ADICIONE ESTA LINHA
        let moduleMsg = "";     // ← ADICIONE ESTA LINHA

        // Adicionamos a checagem de Reparo AQUI também:
        if (data.isRepair) {
          overlayText = "REPARO";
          overlayType = "miss";
        } else if (data.isAbsorbed) {
          overlayText = "absorvido!";
          overlayType = "miss";
        } else if (data.damage > 0) {
          overlayText = `-${data.damage} HP`;
          overlayType = "hit";
          
          // ← ADICIONE ESTA SEÇÃO AQUI
          // CÓDIGO NOVO:
          if (data.logText) {
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
            
            if (data.logText.includes("EXTREMO")) extraTag = "EXTREMO.";
            else if (data.logText.includes("CRÍTICO")) extraTag = "CRÍTICO.";
          }
          
        } else {
          overlayText = "falhou!";
          overlayType = "miss";
        }

        setHitEvent({ 
          text: overlayText, 
          type: overlayType, 
          id: data.timestamp,
          extraTag: extraTag,      // ← ADICIONE
          moduleMsg: moduleMsg      // ← ADICIONE
        });
        setHeaderLog(data.logText);
        setTimeout(() => setHitEvent(null), 4000);
      }
      
      if (e.key === "heavens_door_ships_db" && e.newValue) {
        const allShips = JSON.parse(e.newValue);
        setAllShipsList(Object.values(allShips));
        const updatedShip = allShips[playerData.ship];
        if (updatedShip) setAttributes(updatedShip.attributes);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [playerData.ship]);

  // EFEITO: Checar cargo
// ... linha posterior: useEffect(() => {

  // EFEITO: Checar cargo
  useEffect(() => {
    const checkRole = () => {
      const savedRole = localStorage.getItem(`role_${playerData.nickname}`);
      if (savedRole && savedRole !== currentRole) {
        setCurrentRole(savedRole);
      }
    };

    const interval = setInterval(checkRole, 3000);
    return () => clearInterval(interval);
  }, [currentRole, playerData.nickname]);
  
  // FUNÇÃO DO BOTÃO ENVIAR (Apenas uma vez, usando a nova API)
  const handleManualSync = () => {
    if (currentRole === "piloto" || currentRole === "copiloto") {
      updateShipAttributes(playerData.ship, attributes);
      console.log(`Atributos da nave ${playerData.ship} atualizados na rede!`);
    }
  };

  // Função para incrementar um atributo
  const handleIncrement = (attributeName) => {
    // Verifica se o jogador tem permissão para editar
    if (!canEdit(currentRole)) {
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
    if (!canEdit(currentRole)) {
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

  // Localização: src/components/ShipDashboard.jsx
// Abaixo de handleManualSync ou handleDecrement

// Localize esta função por volta da linha 250 do ShipDashboard.jsx
const handleConfirmAttack = () => {
  if (!attackTarget) return;
  
  const currentWeaponEffect = getEffect(
    shipInfo.shipClass, 
    attackWeaponType, 
    attributes[attackWeaponType]
  );
  
  // Chamada original da API
  processPlayerAttack(
    playerData.ship, 
    attackTarget, 
    attackDamage, 
    isExtremo, 
    currentWeaponEffect
  );

  // --- CORREÇÃO AQUI ---
  // Se for extremo, precisamos simular um valor > 0 para o overlay não dizer "falhou"
  // Podemos calcular o dano real ou apenas passar um valor simbólico, 
  // já que o processPlayerAttack cuidará do banco de dados.
//const visualDamage = isExtremo ? 999 : parseInt(attackDamage || 0);
/*
  const localFeedback = {
    targetName: attackTarget,
    damage: visualDamage, 
    isAbsorbed: false,
    isPlayerAction: true, 
    isExtremo: isExtremo, // Passamos a flag para o visual também
    timestamp: Date.now(),
    logText: isExtremo ? "DISPARO EXTREMO CONFIRMADO!" : "Disparo confirmado..." 
  };*/

  //window.dispatchEvent(new CustomEvent("combat:event", { detail: localFeedback }));

  setShowAttackModal(false);
  setAttackTarget("");
  setAttackDamage("");
  setIsExtremo(false);
};

  // Gera a visualização das barras de ativação
 const renderBars = (attributeName, currentLevel) => {
  return Array.from({ length: 6 }).map((_, idx) => {
    const targetLevel = idx + 1;
    const isActive = idx < currentLevel;

    return (
      
      <div
        key={idx}
        className={`control-bar ${isActive ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!canEdit(currentRole)) return;

          let newLevel = targetLevel;

          // Se clicar no nível atual, ele reduz para o nível imediatamente abaixo
          if (targetLevel === currentLevel) {
            newLevel = currentLevel - 1;
          }

          const difference = newLevel - currentLevel;

          if (difference > 0) {
            const pointsToApply = Math.min(difference, remainingPoints);
            
            if (pointsToApply > 0) {
              const finalLevel = currentLevel + pointsToApply;
              
              // --- NOVO: Passamos de onde estava para onde vai ---
              playPowerUpSound(currentLevel, finalLevel);
              
              setAttributes({
                ...attributes,
                [attributeName]: finalLevel
              });
            }
          }
          else if (difference < 0) {
            // Verifica se o novo nível será exatamente ZERO
            const isZero = newLevel <= 0;
            
            // Dispara o som correspondente
            playPowerDownSound(isZero);

            setAttributes({
              ...attributes,
              [attributeName]: Math.max(0, newLevel)
            });
          }
        }}
      />
    );
  });
};

  return (
    
    
    <div className="dashboard">
      <div className="dashboard-content">
        {/* Header */}
        <header className="dashboard-header">
  <div className="header-info">
    <div className="ship-title-container">
      {/* IMAGEM ADICIONADA AQUI */}
      <img
        src="/256.png" /* O caminho começa com / porque está na pasta public */
        alt="Ship Icon"
        className="ship-header-icon"
      />
    <h1>{shipInfo.name}</h1>
    </div>
<p>COMANDANTE: {playerData.nickname.toUpperCase()} | FUNÇÃO: {currentRole.toUpperCase()}</p>  </div>
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
    {playerData.role === "piloto" || true ? (
      <button
        onClick={() => setShowAssignCrew(true)}
        className="logout-button"
        title="Assign Crew"
        style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem" }}
      >
        X
      </button>
    ) : null}

    <span className="logout-text">DESTREZA</span>
    <button 
      onClick={() => setShowDexterityModal(true)} 
      className="logout-button" 
      title="Ranking Geral"
      style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem" }}
    >
      Y
    </button>

    <span className="logout-text">deslogar</span>
    <button onClick={onLogout} className="logout-button" style={{ fontSize: "0.6rem", letterSpacing: "1px", width: "auto", padding: "0 0.75rem" }}
      >
      B
    </button>
  </div>
  <div className="sd-header-log">
  {headerLog}
</div>
</header>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Painel Esquerdo - Lista de Atributos */}
          <section className="attributes-list">
            <h2>Atributos</h2>
            {Object.entries(attributes).map(([name, value]) => (
            <div className="attribute-item" key={name}>
              <div className="attribute-item-name">
                {name === "weapons" && "Armas"}
                {name === "missiles" && "Mísseis"}
                {name === "controls" && "Controles"}
                {name === "shields" && "Escudos"}
                {name === "engines" && "Motores"}
              </div>
              <div className="attribute-item-value">
                <span>[ {value} ]</span>
                <span>{getEffect(shipInfo.shipClass, name, value)}</span>
              </div>
            </div>
          ))}
          </section>

          {/* Central - Painel de Controle da Nave */}
          <section className="ship-control-panel">
            <div className="ship-title">
              <h2>{shipInfo.name}</h2>
              <p>Sistema de Distribuição de Pontos</p>
            </div>

            {/* Grid de Controles */}
            <div className="control-grid">
              {Object.entries(attributes).map(([name, value]) => (
              <div key={name} className="control-slot">
                  <div className="control-slot-label">
                    {name === "weapons" && "ARM"}
                    {name === "missiles" && "MSL"}
                    {name === "controls" && "CON"}
                    {name === "shields" && "ESC"}
                    {name === "engines" && "MOT"}
                  </div>
                  <div className="control-slot-bars">
                    {renderBars(name,value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Display Central */}
              <div className="ship-display">
              {(() => {
                // AGORA: Puxa o limite exato definido para ESTA nave no banco de dados!
                const TOTAL_SELECTABLE_POINTS = shipInfo.totalPoints; 
                
                const pointsUsed = Object.values(attributes).reduce((sum, val) => sum + val, 0);

                return (
                  <>
                    {/* Container dos retângulos de pontos */}
                    <div className="point-selector-grid">
                      {Array.from({ length: TOTAL_SELECTABLE_POINTS }).map((_, idx) => (
                        <div 
                          key={idx}
                          className={`point-segment ${idx < pointsUsed ? "active" : ""}`}
                        />
                      ))}
                    </div>

                    {/* --- NOVO: Contador numérico alinhado à direita --- */}
                    <div className="points-counter">
                      <span className="points-used">{pointsUsed}</span>
                      <span className="points-total">/{TOTAL_SELECTABLE_POINTS}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* --- NOVO BOTÃO ENVIAR (ABAIXO DO DISPLAY CENTRAL) --- */}
            {(currentRole === "piloto" || currentRole === "copiloto") && (
              <div className="send-button-wrapper" style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span className="logout-text" style={{ marginRight: '10px' }}>ENVIAR</span>
                <button 
                  className="logout-button" 
                  onClick={handleManualSync}
                  title="Enviar Atributos para a Nave"
                  style={{ fontSize: "0.8rem", width: "40px", height: "30px" }}
                >
                  A
                </button>
                
              </div>
            )}
            {/* --------------------------------------------------- */}
          </section>

          {/* Painel Direito - Informações do Jogador */}
          <section className="player-info-panel">
            <div className="player-info-section">
              <div className="player-info-label">Comandante</div>
              <div className="player-info-value">{playerData.nickname.toUpperCase()}</div>            </div>

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
            <div className="player-info-value player-info-value--small">
              {playerData.des} | {playerData.esq}
            </div>
          </div>

            <div className="player-info-section">
              <div className="player-info-label">HP da Nave</div>
              <div className="hp-container">
                <div className="hp-label">{shipInfo.currentHP}/{shipInfo.maxHP}</div>
                <div className="hp-bar-bg">
                  <div
                    className="hp-bar-fill"
                    style={{
                      width: `${(shipInfo.currentHP / shipInfo.maxHP) * 100}%`
                    }}
                  />
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
        <AssignCrew
          currentPlayer={playerData}
          currentRole={currentRole} // <-- ADICIONE ESTA LINHA
          onClose={() => setShowAssignCrew(false)}
        />
      )}

      {/* --- ADICIONE ESTAS 3 LINHAS AQUI --- */}
      {showDexterityModal && (
        <DexterityRanking onClose={() => setShowDexterityModal(false)} />
      )}

     {/* Exibição do Hit Event que já estava aí */}
      {hitEvent && (
  <>
    {/* OVERLAY principal com dano e EXTREMO */}
    <div key={hitEvent.id} className={`hit-overlay ${hitEvent.type}`}>
      {/* Texto de impacto (EXTREMO ou CRÍTICO) - APARECE COM O DANO */}
      {hitEvent.extraTag && (
        <div className="hit-tag-heavy">
          {hitEvent.extraTag}
        </div>
      )}

      {/* Dano normal */}
      <div className="hit-damage-row">
        {hitEvent.text.split("").map((char, i) => (
          <span
            key={i}
            className="hit-letter"
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>

    {/* OVERLAY SEPARADO para a legenda do módulo */}
    {hitEvent.moduleMsg && (
      <div className="hit-module-msg">
        {hitEvent.moduleMsg}
      </div>
    )}
  </>
)}

      {showAttackModal && (
  <div className="assign-overlay" onClick={() => setShowAttackModal(false)}>
    <div className="assign-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
      <div className="assign-header">
        <h2 className="assign-title">SISTEMA DE ARMAS</h2>
        <button className="assign-close" onClick={() => setShowAttackModal(false)}>×</button>
      </div>
      
      <div className="assign-body">
        {/* SELETOR DE ARMA */}
        <div className="weapon-selector">
          <button 
            className={attackWeaponType === "weapons" ? "active" : ""}
            onClick={() => setAttackWeaponType("weapons")}
          >
            BALÍSTICO
          </button>
          <button 
            className={attackWeaponType === "missiles" ? "active" : ""}
            onClick={() => setAttackWeaponType("missiles")}
          >
            MÍSSIL
          </button>
        </div>

        <div className="damage-display">
          DANO: <span className="damage-value">{getEffect(shipInfo.shipClass, attackWeaponType, attributes[attackWeaponType])}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="modal-input-group">
            <label className="modal-input-label">SELECIONAR ALVO:</label>
            <select 
              className="modal-select"
              value={attackTarget} 
              onChange={(e) => setAttackTarget(e.target.value)}
            >
              <option value="">-- SELECIONE UM ALVO --</option>
              {allShipsList.filter(s => s.id !== playerData.ship && s.status !== "desativada" && s.status !== "destruida").map(s => (
                <option key={s.id} value={s.id}>
                  {s.isEnemy ? "[HOSTIL]" : "[ALIADA]"} {s.name}
                </option>
              ))}
            </select>
          </div>

          <label className="checkbox-wrapper">
            <input 
              type="checkbox" 
              checked={isExtremo} 
              onChange={(e) => setIsExtremo(e.target.checked)} 
            />
            <span className="checkbox-label">[+] ACERTO EXTREMO?</span>
          </label>

          {!isExtremo && (
            <div className="modal-input-group">
              <label className="modal-input-label">DANO ROLADO (DADO FÍSICO):</label>
              <input 
                type="number" 
                className="modal-input"
                value={attackDamage} 
                onChange={(e) => setAttackDamage(e.target.value)}
                placeholder="Insira o dano..."
              />
            </div>
          )}
        </div>

        <button 
          className="confirm-attack-button"
          onClick={handleConfirmAttack}
          disabled={!attackTarget || (!isExtremo && !attackDamage)}
        >
          CONFIRMAR DISPARO
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}; // <--- FIM DO COMPONENTE SHIPDASHBOARD

export default ShipDashboard;