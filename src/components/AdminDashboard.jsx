import React, { useState, useEffect, useCallback } from "react";
import { playersList } from "../utils/players";
import { shipsList } from "../data/ships";
import "../styles/AdminDashboard.css";

// 1. IMPORTAÇÕES DO FIREBASE
import { db } from "../utils/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { 
  getAllShips, 
  updateShipConfig, 
  setEnemyShipStatus, 
  clearDestroyedEnemies, 
  deactivateAllEnemies, 
  repairAllShipsGlobal, 
  enforceAttributeLimits, 
  repairShieldByAdmin, 
  repairEnginesByAdmin,
  getAllCrewAssignments, getProximityMatrix // <-- NOVA FUNÇÃO IMPORTADA
} from "../utils/mockApi";
import TerminalCombate from "./TerminalCombate";
import ConfirmModal from "./ConfirmModal";
import ProximityMatrixPanel from './ProximityMatrixPanel';

const applySorting = (data, config) => {
  const { key, direction } = config;
  return [...data].sort((a, b) => {
    if (key === "des") {
      if (a.des !== b.des) return direction === "asc" ? a.des - b.des : b.des - a.des;
      return direction === "asc" ? a.esq - b.esq : b.esq - a.esq;
    }
    const valA = (a[key] || "").toString().toLowerCase();
    const valB = (b[key] || "").toString().toLowerCase();
    
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    
    // NOVO CÓDIGO DE DESEMPATE: Se os valores forem iguais, ordena por nome
    const labelA = (a.label || "").toString().toLowerCase();
    const labelB = (b.label || "").toString().toLowerCase();
    if (labelA < labelB) return -1;
    if (labelA > labelB) return 1;

    return 0;
  });
};


const AdminDashboard = ({ onLogout }) => {
  const [proximityMatrix, setProximityMatrix] = useState({});
  const [usersData,   setUsersData]   = useState([]);
  const [sortConfig,  setSortConfig]  = useState({ key: "label", direction: "asc" });
  const [confirmState, setConfirmState] = useState({ isOpen: false });
  const showConfirm = (opts) => setConfirmState({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

  const [activeTab,     setActiveTab]     = useState("crew");
  const [fleetData,     setFleetData]     = useState({});
  const [selectedShipId, setSelectedShipId] = useState("");
  const [editForm, setEditForm] = useState({ name: "", maxHP: 0, totalPoints: 0 });
  const [isCombatMode,  setIsCombatMode]  = useState(false);
  const [repairRequests, setRepairRequests] = useState([]);

  // Estados para a Aba 04 (Alterar Mestre)
  const [alterSelectedId, setAlterSelectedId] = useState("");
  const [alterDraft, setAlterDraft] = useState(null);

  // 2. PEDIDOS DE REPARO AGORA LÊM DO FIREBASE
  useEffect(() => {
    const checkRequests = async () => {
      const snap = await getDoc(doc(db, "gameData", "repairRequests"));
      if (snap.exists()) {
        setRepairRequests(snap.data().requests || []);
      }
    };
    const interval = setInterval(checkRequests, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptRepair = async (req) => { // ASYNC
    if (req.isShield) {
      await repairShieldByAdmin(req.shipId);
    } else if (req.isEngines) {
      await repairEnginesByAdmin(req.shipId);
    } else {
      const ships = await getAllShips();
      const ship  = ships[req.shipId];
      if (ship && ship.activeCrew) {
        const member = ship.activeCrew.find(m => m.id === req.moduleId);
        if (member) {
          member.moduleStatus     = 'operacional';
          member.turnosParaReparo = 0;
          enforceAttributeLimits(ship);
          await setDoc(doc(db, "gameData", "ships"), ships);
        }
      }
    }
    
    // Atualiza os pedidos no Firebase
    const filtered = repairRequests.filter(r => r.id !== req.id);
    await setDoc(doc(db, "gameData", "repairRequests"), { requests: filtered });
    setRepairRequests(filtered);
    refreshData();
  };

  const handleRejectRepair = async (reqId) => { // ASYNC
    const filtered = repairRequests.filter(r => r.id !== reqId);
    await setDoc(doc(db, "gameData", "repairRequests"), { requests: filtered });
    setRepairRequests(filtered);
  };

  // 3. ABA FROTA E ALTERAR AGORA PUXAM NAVES COM AWAIT
  useEffect(() => {
    const loadFleet = async () => {
      if (activeTab === "fleet" || activeTab === "alter") {
        const data = await getAllShips();
        setFleetData(data);
        if (activeTab === "fleet" && !selectedShipId) {
          const firstShipId = Object.keys(data)[0];
          if (firstShipId) handleSelectShip(firstShipId, data);
        }
      }
    };
    loadFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedShipId]);

  const handleSelectShip = (shipId, data = fleetData) => {
    setSelectedShipId(shipId);
    const ship = data[shipId];
    if (ship) setEditForm({ name: ship.name, maxHP: ship.maxHP, totalPoints: ship.totalPoints });
  };

  const handleSaveShip = async () => { // ASYNC
    await updateShipConfig(selectedShipId, {
      name: editForm.name,
      maxHP: parseInt(editForm.maxHP),
      currentHP: parseInt(editForm.maxHP),
      totalPoints: parseInt(editForm.totalPoints)
    });
    setFleetData(await getAllShips());
    alert(`Especificações da classe ${editForm.name} atualizadas na rede!`);
  };

  // ─── LÓGICA DA ABA 04 (ALTERAR) ─────────────────────────────────────────────
  const handleSelectAlterShip = async (shipId) => { // ASYNC
    setAlterSelectedId(shipId);
    if (!shipId) {
      setAlterDraft(null);
      return;
    }
    const data = await getAllShips();
    setAlterDraft(JSON.parse(JSON.stringify(data[shipId])));
  };

  const handleSaveAlterations = () => {
    if (!alterDraft) return;
    
    showConfirm({
      title: "SOBRESCREVER DADOS",
      message: `Deseja forçar a aplicação das alterações na nave [${alterDraft.name}]?`,
      subtext: "ESTA AÇÃO SOBRESCREVE A REDE E IGNORA LIMITADORES",
      variant: "white",
      confirmLabel: "APLICAR NA REDE",
      onConfirm: async () => { // ASYNC NO CONFIRM
        const ships = await getAllShips();
        const updatedShip = { ...alterDraft };
        
        enforceAttributeLimits(updatedShip);
        
        ships[updatedShip.id] = updatedShip;
        await setDoc(doc(db, "gameData", "ships"), ships); // FIREBASE
        setFleetData(ships);
        refreshData();
      }
    });
  };

  const handleClearLocks = (memberId) => {
    setAlterDraft(prev => {
      const next = { ...prev };
      const member = next.activeCrew.find(m => m.id === memberId);
      if (member) {
        member.missileTarget = null;
        member.missileLockLevel = 0;
        member.missileReady = false;
        member.ballisticTarget = null;
        member.ballisticLockLevel = 0;
      }
      return next;
    });
  };
  // ────────────────────────────────────────────────────────────────────────────

  // 4. REFRESH DATA AGORA É ASYNC E LÊ TRIPULAÇÃO DA NUVEM
const refreshData = useCallback(async () => {
      const allAssignments = await getAllCrewAssignments(); // FIREBASE

    const rawMappedData = playersList.map((player) => {
      // Deixamos os status de login do player no localStorage por enquanto
      const isOnline   = localStorage.getItem(`status_${player.id}`) === "online";
      const rawRole    = localStorage.getItem(`role_${player.id}`);
      const currentRole = (rawRole === "piloto" || rawRole === "copiloto") ? rawRole : "tripulante";
      const savedShipId = localStorage.getItem(`ship_${player.id}`) || "hawthorne_iii";
      const shipLabel   = shipsList.find(s => s.id === savedShipId)?.label || "MS Hawthorne III";

      let assignedFunction = "LIVRE";
      try {
        const crewKey = `crew_assignments_${savedShipId}`;
        const crew = allAssignments[crewKey] || { copiloto: null, torretas: {} };
        
        if (currentRole === "piloto") {
          assignedFunction = "PILOTO";
        } else if (crew.copiloto === player.id) {
          assignedFunction = "COPILOTO";
        } else {
          const torretaEntry = Object.entries(crew.torretas || {}).find(([_, uid]) => uid === player.id);
          if (torretaEntry) assignedFunction = `TORRETA ${torretaEntry[0].toUpperCase()}`;
        }
      } catch (e) { assignedFunction = currentRole.toUpperCase(); }

      return { ...player, online: isOnline, role: currentRole, ship: shipLabel, function: assignedFunction };
    });

    const dbShips = await getAllShips();
const matrix = await getProximityMatrix();

setFleetData(dbShips);
setProximityMatrix(matrix);

    const enemyCrewMembers = [];
    Object.values(dbShips).forEach(ship => {
      if (ship.isEnemy && ship.status === "ativa" && ship.activeCrew) {
        ship.activeCrew.forEach(member => {
          enemyCrewMembers.push({
            id: member.id, label: member.id,
            des: member.des, esq: member.esq,
            online: true, role: member.role,
            ship: ship.name, function: member.function,
            isEnemy: true
          });
        });
      }
    });

    const combinedData = [...rawMappedData, ...enemyCrewMembers];
    const sortedData   = applySorting(combinedData, sortConfig);
    setUsersData(sortedData);
  }, [sortConfig]);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleForceLogout = (playerId) => {
    localStorage.removeItem(`status_${playerId}`);
    localStorage.removeItem(`role_${playerId}`);
    refreshData();
  };

  useEffect(() => {
  refreshData();
  const interval = setInterval(refreshData, 3000);
  return () => clearInterval(interval);
}, [refreshData]);

  if (isCombatMode) return <TerminalCombate onBack={() => setIsCombatMode(false)} />;

  return (
    <div className="admin-dashboard-screen">
      <div className="hazard-sidebar">
        <div className="hazard-title">HEAVEN'S DOOR</div>
        <div className="hazard-stripes"></div>
      </div>

      <div className="admin-datapad-wrapper">
        <button className="datapad-close-btn" onClick={onLogout} title="Encerrar Sessão">×</button>
        <div className="datapad-spine"></div>

        <div className="admin-dashboard-container">
          <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="datapad-title">Heaven's Systems Log</h1>
              <div className="datapad-metadata">
                Heaven's Door Internal Network<br/>
                Status: Live Monitoring<br/>
                Date: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}/2313
              </div>
            </div>

            {/* 5. AWAIT NOS BOTÕES DA FROTA */}
            {activeTab === "fleet" && (
              <div className="header-fleet-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="fleet-save-btn header-btn"
                  style={{ background: 'rgba(42, 255, 140, 0.1)', color: '#2aff8c', border: '1px solid #2aff8c', margin: 0, padding: '0.5rem 1rem', fontSize: '0.7rem' }}
                  onClick={() => showConfirm({
                    title: "REPARO GLOBAL",
                    message: "Restaurar integridade estrutural e módulos de TODAS as naves da frota?",
                    subtext: "OPERAÇÃO IRREVERSÍVEL — AFETA TODOS OS REGISTROS",
                    variant: "success", confirmLabel: "EXECUTAR REPARO",
                    onConfirm: async () => { 
                      await repairAllShipsGlobal(); 
                      setFleetData(await getAllShips()); 
                      refreshData(); 
                    },
                  })}
                >
                  REPARO GLOBAL
                </button>

                <button
                  className="fleet-save-btn header-btn"
                  style={{ background: 'rgba(255, 174, 0, 0.1)', color: '#ffae00', border: '1px solid #ffae00', margin: 0, padding: '0.5rem 1rem', fontSize: '0.7rem' }}
                  onClick={() => showConfirm({
                    title: "DESATIVAR HOSTIS",
                    message: "Desativar e remover a tripulação de todas as naves hostis ativas?",
                    subtext: "NAVES DESTRUÍDAS PERMANECEM NO REGISTRO",
                    variant: "warning", confirmLabel: "DESATIVAR TODAS",
                    onConfirm: async () => { 
                      await deactivateAllEnemies(); 
                      setFleetData(await getAllShips()); 
                      refreshData(); 
                    },
                  })}
                >
                  DESATIVAR TODAS
                </button>

                <button
                  className="fleet-save-btn header-btn"
                  style={{ background: 'rgba(255, 50, 50, 0.1)', color: '#ff4a4a', border: '1px solid #ff4a4a', margin: 0, padding: '0.5rem 1rem', fontSize: '0.7rem' }}
                  onClick={() => showConfirm({
                    title: "PURGAR DESTRUÍDAS",
                    message: "Remover todos os registros de naves hostis destruídas do banco de dados?",
                    subtext: "DADOS ELIMINADOS PERMANENTEMENTE",
                    variant: "danger", confirmLabel: "PURGAR REGISTROS",
                    onConfirm: async () => { 
                      await clearDestroyedEnemies(); 
                      setFleetData(await getAllShips()); 
                      refreshData(); 
                    },
                  })}
                >
                  PURGAR DESTRUÍDAS
                </button>
              </div>
            )}
          </header>

          <div className="admin-tabs">
            <button className={`admin-tab-btn ${activeTab === "crew" ? "active" : ""}`} onClick={() => setActiveTab("crew")}>
              [ 01. TRIPULAÇÃO ]
            </button>
            <button className={`admin-tab-btn ${activeTab === "fleet" ? "active" : ""}`} onClick={() => setActiveTab("fleet")}>
              [ 02. FROTA ]
            </button>
            <button
              className="admin-tab-btn"
              style={{ borderColor: 'rgba(255, 60, 30, 0.5)', color: '#ff5028' }}
              onClick={() => window.open('/terminal-combate', 'terminal-combate')}
            >
              [ 03. TERMINAL ]
            </button>
            <button className={`admin-tab-btn ${activeTab === "alter" ? "active" : ""}`} onClick={() => setActiveTab("alter")}>
              [ 04. ALTERAR ]
            </button>
          </div>

          {/* ABA 01: TRIPULAÇÃO */}
          {activeTab === "crew" && (
            <>
              <div className="admin-controls">
                <button onClick={() => handleSort("label")} className="sort-btn">
                  ORDENAR POR NOME {sortConfig.key === "label" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </button>
                <button onClick={() => handleSort("ship")} className="sort-btn">
                  ORDENAR POR NAVE {sortConfig.key === "ship" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </button>
                <button onClick={() => handleSort("des")} className="sort-btn">
                  ORDENAR POR ATRIBUTOS {sortConfig.key === "des" && (sortConfig.direction === "asc" ? "▲" : "▼")}
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>STATUS</th>
                      <th>COMANDANTE</th>
                      <th>CARGO ATUAL</th>
                      <th>FUNÇÃO NA NAVE</th>
                      <th>NAVE</th>
                      <th>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map((user) => (
                      <tr key={user.id} className={`${user.online ? "row-online" : "row-offline"} ${user.isEnemy ? "hostile-row" : ""}`}>
                        <td>
                          <span className={`status-indicator ${user.online ? "online" : "offline"}`}>
                            {user.online ? "ONLINE" : "OFFLINE"}
                          </span>
                        </td>
                        <td className="user-name">
                          {user.label}
                          <span style={{ fontSize: '0.7rem', color: user.isEnemy ? '#ff4a4a' : '#4a9eff', marginLeft: '10px' }}>
                            (D:{user.des} | E:{user.esq})
                          </span>
                        </td>
                        <td className="user-role">{user.role.toUpperCase()}</td>
                        <td className={`user-func ${user.function === "LIVRE" ? "is-free" : ""} ${user.isEnemy ? "is-enemy-func" : ""}`}>
                          {user.function}
                        </td>
                        <td className="user-ship" style={{ color: user.isEnemy ? '#ff4a4a' : '' }}>
                          {user.ship}
                        </td>
                        <td>
                          {user.online && (
                            <button
                              onClick={() => handleForceLogout(user.id)}
                              className="sort-btn"
                              style={{ padding: '2px 8px', fontSize: '0.6rem', borderColor: '#ff4a4a', color: '#ff4a4a' }}
                              title="Forçar Logout"
                            >
                              ENCERRAR
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ABA 02: ENGENHARIA DE FROTA */}
          {activeTab === "fleet" && (
            <div className="fleet-engineering-grid">
              <div className="fleet-list-panel">
                <h3 className="fleet-panel-title">CATÁLOGO DE CLASSES</h3>
                <div className="fleet-list">
                  {Object.entries(fleetData)
                    // ADICIONE ESTA LINHA ABAIXO PARA ORDENAR PELO NOME
                    .sort(([, shipA], [, shipB]) => shipA.name.localeCompare(shipB.name))
                    .map(([id, ship]) => (
                      <div
                        key={id}
                        className={`fleet-list-item ${selectedShipId === id ? "selected" : ""}`}
                        onClick={() => handleSelectShip(id)}
                      >
                        {ship.isEnemy ? `[HOSTIL] ` : `[ALIADA] `}
                        {ship.name.toUpperCase()}
                      </div>
                    ))}
                </div>
              </div>

              <div className="fleet-editor-panel">
                <h3 className="fleet-panel-title">ESPECIFICAÇÕES DO SISTEMA</h3>
                {selectedShipId && (
                  <div className="fleet-form">
                    {fleetData[selectedShipId]?.isEnemy && (
                      <div className="fleet-form-group">
                        <label>STATUS DE COMBATE</label>
                        <select
                          className="fleet-input highlight-input"
                          style={{ color: fleetData[selectedShipId].status === "ativa" ? '#ff4a4a' : '#fff' }}
                          value={fleetData[selectedShipId].status || "desativada"}
                          onChange={(e) => {
                          const novoStatus = e.target.value;
                          
                          // 🚀 1. Atualização Otimista: Muda a cor e o texto na hora!
                          setFleetData(prev => ({
                            ...prev,
                            [selectedShipId]: {
                              ...prev[selectedShipId],
                              status: novoStatus
                            }
                          }));
                          
                          // 🚀 2. Envia para o Firebase em background (sem await travando)
                          setEnemyShipStatus(selectedShipId, novoStatus)
                            .then(() => {
                              refreshData();
                            })
                            .catch(err => console.error("Erro ao mudar status:", err));
                          
                          if (novoStatus === "ativa") {
                            localStorage.setItem("enemy_activated_event", Date.now().toString());
                          }
                        }}
                        >
                          <option value="desativada">DESATIVADA (Oculta)</option>
                          <option value="ativa">ATIVA (Combate)</option>
                          <option value="destruida">DESTRUÍDA (Congela Nomes)</option>
                        </select>
                      </div>
                    )}
                    <div className="fleet-form-group">
                      <label>NOME DA CLASSE</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="fleet-input"
                        disabled={fleetData[selectedShipId]?.isEnemy}
                      />
                    </div>
                    <div className="fleet-form-group">
                      <label>INTEGRIDADE ESTRUTURAL (HP)</label>
                      <input
                        type="number"
                        value={editForm.maxHP}
                        onChange={(e) => setEditForm({ ...editForm, maxHP: e.target.value })}
                        className="fleet-input"
                      />
                    </div>
                    <div className="fleet-form-group">
                      <label>PONTOS TOTAIS DE REATOR</label>
                      <input
                        type="number"
                        value={editForm.totalPoints}
                        onChange={(e) => setEditForm({ ...editForm, totalPoints: e.target.value })}
                        className="fleet-input highlight-input"
                      />
                    </div>
                    <button className="fleet-save-btn" onClick={handleSaveShip}>SALVAR ESPECIFICAÇÕES</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 04: ALTERAR (GOD MODE DO MESTRE) - Versão Compacta */}
          {activeTab === "alter" && (
            <div style={{ padding: '0.5rem', color: '#fff', height: '65vh', overflowY: 'auto', paddingBottom: '2rem', fontSize: '0.75rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.2rem' }}>
                  SELECIONAR ALVO PARA SOBRESCRITA (Somente Aliadas e Hostis Ativas)
                </label>
                <select 
                  className="fleet-input" 
                  style={{ width: '100%', maxWidth: '350px', padding: '0.3rem', fontSize: '0.75rem' }}
                  value={alterSelectedId}
                  onChange={(e) => handleSelectAlterShip(e.target.value)}
                >
                  <option value="">-- Selecione uma Nave --</option>
                  {Object.values(fleetData)
                    .filter(ship => !ship.isEnemy || ship.status === 'ativa')
                    .map(ship => (
                      <option key={ship.id} value={ship.id}>
                        {ship.isEnemy ? "[HOSTIL]" : "[ALIADA]"} {ship.name}
                      </option>
                  ))}
                </select>
              </div>

              {alterDraft && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  
                  {/* COLUNA ESQUERDA: GERAL E NAVEGAÇÃO */}
                  <div>
                    <h4 style={{ color: '#4a9eff', borderBottom: '1px solid #4a9eff', paddingBottom: '0.3rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>SISTEMAS GERAIS & NAVEGAÇÃO</h4>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div className="fleet-form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.1rem' }}>HP ATUAL</label>
                        <input 
                          type="number" className="fleet-input" style={{ padding: '0.3rem', fontSize: '0.75rem' }}
                          value={alterDraft.currentHP} 
                          onChange={(e) => setAlterDraft({...alterDraft, currentHP: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div className="fleet-form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.1rem' }}>MAX HP</label>
                        <input 
                          type="number" className="fleet-input" disabled style={{ padding: '0.3rem', fontSize: '0.75rem' }}
                          value={alterDraft.maxHP} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {alterDraft.isEnemy && (
                        <div className="fleet-form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: '0.65rem', marginBottom: '0.1rem' }}>PROXIMIDADE</label>
                          <select 
                            className="fleet-input" style={{ padding: '0.3rem', fontSize: '0.7rem' }}
                            value={alterDraft.proximity || 3}
                            onChange={(e) => setAlterDraft({...alterDraft, proximity: parseInt(e.target.value)})}
                          >
                            <option value="1">P1 (Contato/+2)</option>
                            <option value="2">P2 (Perto/+1)</option>
                            <option value="3">P3 (Médio)</option>
                            <option value="4">P4 (Longe/÷2)</option>
                            <option value="5">P5 (Bloqueado)</option>
                          </select>
                        </div>
                      )}
                      
                      <div className="fleet-form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label style={{ fontSize: '0.65rem', marginBottom: '0.1rem' }}>DERRAPAGEM</label>
                        <select 
                          className="fleet-input highlight-input" style={{ padding: '0.3rem', fontSize: '0.7rem' }}
                          value={alterDraft.isDerrapando ? "sim" : "nao"}
                          onChange={(e) => setAlterDraft({...alterDraft, isDerrapando: e.target.value === "sim"})}
                        >
                          <option value="nao">Não (Normal)</option>
                          <option value="sim">Sim (-20% Prec)</option>
                        </select>
                      </div>
                    </div>

                    <h4 style={{ color: '#ffae00', borderBottom: '1px solid #ffae00', paddingBottom: '0.3rem', marginBottom: '0.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>MÓDULOS DE NAVE</h4>
                    
                    {/* ESCUDOS */}
                    <div style={{ marginBottom: '0.5rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)' }}>
                      <label style={{ color: '#ffae00', fontWeight: 'bold', fontSize: '0.7rem' }}>ESCUDOS</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <select 
                          className="fleet-input" style={{ flex: 2, padding: '0.2rem', fontSize: '0.7rem' }}
                          value={alterDraft.shieldStatus || 'operacional'}
                          onChange={(e) => setAlterDraft({...alterDraft, shieldStatus: e.target.value})}
                        >
                          <option value="operacional">Operacional</option>
                          <option value="avariada">Avariado</option>
                          <option value="destruida">Destruído</option>
                        </select>
                        <input 
                          type="number" className="fleet-input" style={{ flex: 1, padding: '0.2rem', fontSize: '0.7rem' }} placeholder="Turnos"
                          value={alterDraft.shieldTurnosParaReparo || 0}
                          onChange={(e) => setAlterDraft({...alterDraft, shieldTurnosParaReparo: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    {/* MOTORES */}
                    <div style={{ marginBottom: '0.5rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)' }}>
                      <label style={{ color: '#ff8c00', fontWeight: 'bold', fontSize: '0.7rem' }}>MOTORES</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <select 
                          className="fleet-input" style={{ flex: 2, padding: '0.2rem', fontSize: '0.7rem' }}
                          value={alterDraft.enginesStatus || 'operacional'}
                          onChange={(e) => setAlterDraft({...alterDraft, enginesStatus: e.target.value})}
                        >
                          <option value="operacional">Operacional</option>
                          <option value="avariada">Avariado</option>
                          <option value="destruida">Destruído</option>
                        </select>
                        <input 
                          type="number" className="fleet-input" style={{ flex: 1, padding: '0.2rem', fontSize: '0.7rem' }} placeholder="Turnos"
                          value={alterDraft.enginesTurnosParaReparo || 0}
                          onChange={(e) => setAlterDraft({...alterDraft, enginesTurnosParaReparo: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    {/* VELOCIDADE ATUAL */}
                    <div style={{ marginBottom: '0.5rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)' }}>
                      <label style={{ color: '#2aff8c', fontWeight: 'bold', fontSize: '0.7rem' }}>VELOCIDADE ATUAL (Forçada)</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <input 
                          type="number" 
                          className="fleet-input" 
                          style={{ width: '100%', padding: '0.2rem', fontSize: '0.7rem' }} 
                          placeholder="Ex: 3"
                          value={alterDraft.currentSpeed || 0}
                          onChange={(e) => setAlterDraft({...alterDraft, currentSpeed: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                      
                      {/* --- COMPONENTE DA MATRIZ DE PROXIMIDADE ADICIONADO AQUI --- */}
              <div style={{ marginBottom: '2rem' }}>
                <ProximityMatrixPanel 
                    allShips={fleetData}
                    proximityMatrix={proximityMatrix}
                    onUpdate={refreshData}
                  />
              </div>
                  </div>

                  {/* COLUNA DIREITA: TRIPULAÇÃO & ARMAS */}
                  <div>
                    <h4 style={{ color: '#ff4a4a', borderBottom: '1px solid #ff4a4a', paddingBottom: '0.3rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>MÓDULOS DE TORRETAS & TRIPULAÇÃO</h4>
                    
                    {alterDraft.activeCrew && alterDraft.activeCrew.length > 0 ? (
                      alterDraft.activeCrew.map((member, idx) => (
                        <div key={idx} style={{ marginBottom: '0.5rem', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid #ff4a4a' }}>
                          <label style={{ display: 'block', color: '#fff', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.7rem' }}>
                            {member.function} ({member.id})
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <select 
                              className="fleet-input" style={{ flex: 2, padding: '0.2rem', fontSize: '0.7rem' }}
                              value={member.moduleStatus || 'operacional'}
                              onChange={(e) => {
                                const newCrew = [...alterDraft.activeCrew];
                                newCrew[idx].moduleStatus = e.target.value;
                                setAlterDraft({...alterDraft, activeCrew: newCrew});
                              }}
                            >
                              <option value="operacional">Operacional</option>
                              <option value="avariada">Avariado</option>
                              <option value="destruida">Destruído</option>
                            </select>
                            <input 
                              type="number" className="fleet-input" style={{ flex: 1, padding: '0.2rem', fontSize: '0.7rem' }} placeholder="Turnos"
                              value={member.turnosParaReparo || 0}
                              onChange={(e) => {
                                const newCrew = [...alterDraft.activeCrew];
                                newCrew[idx].turnosParaReparo = parseInt(e.target.value) || 0;
                                setAlterDraft({...alterDraft, activeCrew: newCrew});
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: '#888' }}>
                            <span>
                              Míssil: {member.missileLockLevel || 0}/3 | Balístico: {member.ballisticLockLevel || 0}/3
                            </span>
                            <button 
                              onClick={() => handleClearLocks(member.id)}
                              style={{ background: 'transparent', border: '1px solid #888', color: '#888', padding: '2px 4px', cursor: 'pointer', fontSize: '0.6rem' }}
                            >
                              LIMPAR TRAVAS
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#888', fontSize: '0.7rem' }}>Sem tripulação ativa para alterar.</div>
                    )}

                    <button 
                      className="fleet-save-btn highlight-input" 
                      style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
                      onClick={handleSaveAlterations}
                    >
                      APLICAR ALTERAÇÕES À REDE
                    </button>
                  </div>
                  
                </div>
              )}
            </div>
          )}

        </div>

        <div className="datapad-right-spine"></div>
      </div>

      {/* Popup de Solicitações de Reparo */}
      {repairRequests.length > 0 && (
        <div className="repair-popup-overlay" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
          {repairRequests.map(req => (
            <div
              key={req.id}
              style={{
                background: '#1a1a1a',
                border: `1px solid ${req.isShield ? '#ffae00' : req.isEngines ? '#ff8c00' : '#b026ff'}`,
                padding: '15px',
                marginBottom: '10px',
                boxShadow: `0 0 15px ${req.isShield ? 'rgba(255,174,0,0.4)' : req.isEngines ? 'rgba(255,140,0,0.4)' : 'rgba(176, 38, 255, 0.4)'}`,
              }}
            >
              <h4 style={{ color: req.isShield ? '#ffae00' : req.isEngines ? '#ff8c00' : '#b026ff', margin: '0 0 5px 0', fontSize: '0.8rem' }}>
                {req.isShield ? '🛡 SOLICITAÇÃO DE REPARO DE ESCUDOS' : req.isEngines ? '⚙ SOLICITAÇÃO DE REPARO DE MOTORES' : 'SOLICITAÇÃO DE REPARO'}
              </h4>
              <p style={{ fontSize: '0.7rem', color: '#ccc' }}>
                A nave <b>{req.shipName}</b> solicita reparo imediato {req.isShield ? 'dos' : req.isEngines ? 'dos' : 'no módulo'} <b>{req.module}</b>.
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => handleAcceptRepair(req)}
                  style={{ background: '#2aff8c', color: '#000', border: 'none', padding: '5px 10px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ACEITAR
                </button>
                <button
                  onClick={() => handleRejectRepair(req.id)}
                  style={{ background: '#ff4a4a', color: '#fff', border: 'none', padding: '5px 10px', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  RECUSAR
                </button>
              </div>
            </div>
          ))}
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

export default AdminDashboard;