import React, { useState, useEffect, useRef } from "react";import "../styles/ShipDashboard.css";
import { canEdit } from "../utils/rolePermissions";
import { calculateRemainingPoints, getEffect } from "../utils/effectHelpers";
import { shipsDatabase } from "../data/ships";
import ShipRadarChart from "./ShipRadarChart";
import AssignCrew from "./AssignCrew";
import { removePlayerFromAllCrews } from "../utils/mockApi"; // Adicione o import para a função de limpeza de tripulação
import DexterityRanking from "./Destreza"; // <-- NOVO IMPORT
import { getShipData, updateShipAttributes } from "../utils/mockApi";



// Painel principal da nave com interface Starfield
const ShipDashboard = ({ playerData, onLogout }) => {

    const [showAssignCrew, setShowAssignCrew] = useState(false);
  const [showDexterityModal, setShowDexterityModal] = useState(false);

// --- NOVO: Referências de áudio e do timer ---
const rechargeSound = useRef(new Audio('/recharge.mp3'));
const powerDownGeneric = useRef(new Audio('/outage1.mp3')); // Som para reduções normais
const powerDownOutage = useRef(new Audio('/outage.mp3'));   // Som para quando chega a zero
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

   // src/components/ShipDashboard.jsx

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
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Agora ouvimos a chave mestra do banco de dados
      if (e.key === "heavens_door_ships_db") {
        if (e.newValue) {
          const allShips = JSON.parse(e.newValue);
          const updatedShip = allShips[playerData.ship];
          if (updatedShip) {
            setAttributes(updatedShip.attributes);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [playerData.ship]);

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
    </div>
  );
};

export default ShipDashboard;