import React, { useState, useEffect } from "react";
import { playersList } from "../utils/players";
import { shipsList } from "../data/ships";
import "../styles/AdminDashboard.css";
import { getAllShips, updateShipConfig } from "../utils/mockApi";

const applySorting = (data, config) => {
  const { key, direction } = config;
  return [...data].sort((a, b) => {
    if (key === "des") {
      if (a.des !== b.des) {
        return direction === "asc" ? a.des - b.des : b.des - a.des;
      }
      return direction === "asc" ? a.esq - b.esq : b.esq - a.esq;
    }
    const valA = (a[key] || "").toString().toLowerCase();
    const valB = (b[key] || "").toString().toLowerCase();
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });
};

const AdminDashboard = ({ onLogout }) => {
  // ESTADOS ANTIGOS (Monitoramento de Usuários)
  const [usersData, setUsersData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "label", direction: "asc" });

  // --- NOVOS ESTADOS PARA A ENGENHARIA DE FROTA (AGORA AQUI DENTRO!) ---
  const [activeTab, setActiveTab] = useState("crew"); 
  const [fleetData, setFleetData] = useState({});
  const [selectedShipId, setSelectedShipId] = useState("");
  const [editForm, setEditForm] = useState({ name: "", maxHP: 0, totalPoints: 0 });

  // Carrega as naves sempre que a aba "Frota" for aberta
  useEffect(() => {
    if (activeTab === "fleet") {
      const data = getAllShips();
      setFleetData(data);
      
      // Seleciona a primeira nave automaticamente se nenhuma estiver selecionada
      const firstShipId = Object.keys(data)[0];
      if (firstShipId && !selectedShipId) {
        handleSelectShip(firstShipId, data);
      }
    }
  }, [activeTab, selectedShipId]);

  // Função para quando o Admin clica em uma nave na lista da esquerda
  const handleSelectShip = (shipId, data = fleetData) => {
    setSelectedShipId(shipId);
    const ship = data[shipId];
    if (ship) {
      setEditForm({ name: ship.name, maxHP: ship.maxHP, totalPoints: ship.totalPoints });
    }
  };

  // Função do botão Salvar Especificações
  const handleSaveShip = () => {
    updateShipConfig(selectedShipId, {
      name: editForm.name,
      maxHP: parseInt(editForm.maxHP),
      currentHP: parseInt(editForm.maxHP), 
      totalPoints: parseInt(editForm.totalPoints)
    });
    
    setFleetData(getAllShips());
    alert(`Especificações da classe ${editForm.name} atualizadas na rede!`);
  };

  const refreshData = () => {
    // 1. Mapeia os dados brutos como já fazias
    const rawMappedData = playersList.map((player) => {
      const isOnline = localStorage.getItem(`status_${player.id}`) === "online";
      const rawRole = localStorage.getItem(`role_${player.id}`);
      const currentRole = (rawRole === "piloto" || rawRole === "copiloto") ? rawRole : "tripulante";
      
      const savedShipId = localStorage.getItem(`ship_${player.id}`);
      const currentShipId = savedShipId || "hawthorne_iii"; 
      const shipLabel = shipsList.find(s => s.id === currentShipId)?.label || "MS Hawthorne III";
      
      let assignedFunction = currentRole;
      try {
        const crew = JSON.parse(localStorage.getItem("crew_assignments") || "{}");
        if (crew.copiloto === player.id) {
          assignedFunction = "co-piloto";
        } else {
          const torretaEntry = Object.entries(crew.torretas || {}).find(([_, uid]) => uid === player.id);
          if (torretaEntry) {
            assignedFunction = `torreta ${torretaEntry[0]}`;
          } else if (currentRole === "piloto") {
            assignedFunction = "piloto";
          } else {
            assignedFunction = "tripulante";
          }
        }
      } catch (e) { assignedFunction = currentRole; }

      return {
        ...player,
        online: isOnline,
        role: currentRole,
        ship: shipLabel,
        function: assignedFunction
      };
    });

    // 2. APLICA A ORDENAÇÃO ANTES DE DEFINIR O ESTADO
    const sortedData = applySorting(rawMappedData, sortConfig);
    setUsersData(sortedData);
  };

  // O handleSort agora apenas altera a configuração, o refreshData cuida do resto
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleForceLogout = (playerId) => {
    // Remove apenas o status online do jogador selecionado
    localStorage.removeItem(`status_${playerId}`);
    
    // Opcional: Se quiser limpar o cargo salvo também para evitar conflitos no próximo login
    localStorage.removeItem(`role_${playerId}`);

    // Atualiza a lista visual imediatamente
    refreshData();
  };

  // O useEffect deve observar mudanças no sortConfig para atualizar a lista instantaneamente
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [sortConfig]);

  return (
    <div className="admin-dashboard-screen">
      <div className="hazard-sidebar">
        <div className="hazard-title">HEAVEN'S DOOR</div>
        <div className="hazard-stripes"></div>
      </div>

      {/* --- INÍCIO DA NOVA ESTRUTURA DATAPAD --- */}
      <div className="admin-datapad-wrapper">
        
        {/* A aba lateral de fechar (substitui o antigo botão de logout) */}
        <button className="datapad-close-btn" onClick={onLogout} title="Encerrar Sessão">
          ×
        </button>

        {/* A lombada esquerda com os tracinhos (régua) */}
        <div className="datapad-spine"></div>

        <div className="admin-dashboard-container">
          {/* Cabeçalho reestilizado para parecer um documento oficial */}
          <header className="admin-header">
            <div>
              <h1 className="datapad-title">Heaven's Systems Log</h1>
              <div className="datapad-metadata">
                Heaven's Door Internal Network<br/>
                Status: Live Monitoring<br/>
                Date: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}/2313
              </div>
            </div>
          </header>

          {/* --- MENU DE ABAS DO ADMIN --- */}
          <div className="admin-tabs">
            <button 
              className={`admin-tab-btn ${activeTab === "crew" ? "active" : ""}`}
              onClick={() => setActiveTab("crew")}
            >
              [ 01. TRIPULAÇÃO ]
            </button>
            <button 
              className={`admin-tab-btn ${activeTab === "fleet" ? "active" : ""}`}
              onClick={() => setActiveTab("fleet")}
            >
              [ 02. FROTA ]
            </button>
          </div>

          {/* ========================================= */}
          {/* ABA 01: TRIPULAÇÃO */}
          {/* ========================================= */}
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
                      <th>USUÁRIO</th>
                      <th>CARGO ATUAL</th>
                      <th>FUNÇÃO NA NAVE</th>
                      <th>NAVE</th>
                      <th>AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.map((user) => (
                      <tr key={user.id} className={user.online ? "row-online" : "row-offline"}>
                        <td>
                          <span className={`status-indicator ${user.online ? "online" : "offline"}`}>
                            {user.online ? "ONLINE" : "OFFLINE"}
                          </span>
                        </td>
                        <td className="user-name">{user.label}<span style={{ fontSize: '0.7rem', color: '#4a9eff', marginLeft: '10px' }}>
                              (D:{user.des} | E:{user.esq})
                              </span>
                         </td>
                        <td className="user-role">{user.role.toUpperCase()}</td>
                        <td className="user-func">{user.function.toUpperCase()}</td>
                        <td className="user-ship">{user.ship}</td>
                        <td>
                          {user.online && (
                            <button 
                              onClick={() => handleForceLogout(user.id)}
                              className="sort-btn"
                              style={{ 
                                padding: '2px 8px', 
                                fontSize: '0.6rem', 
                                borderColor: '#ff4a4a', 
                                color: '#ff4a4a' 
                              }}
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

          {/* ========================================= */}
          {/* ABA 02: ENGENHARIA DE FROTA */}
          {/* ========================================= */}
          {activeTab === "fleet" && (
            <div className="fleet-engineering-grid">
              
              <div className="fleet-list-panel">
                <h3 className="fleet-panel-title">CATÁLOGO DE CLASSES</h3>
                <div className="fleet-list">
                  {Object.entries(fleetData).map(([id, ship]) => (
                    <div 
                      key={id} 
                      className={`fleet-list-item ${selectedShipId === id ? "selected" : ""}`}
                      onClick={() => handleSelectShip(id)}
                    >
                      {ship.name.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="fleet-editor-panel">
                <h3 className="fleet-panel-title">ESPECIFICAÇÕES DO SISTEMA</h3>
                
                {selectedShipId && (
                  <div className="fleet-form">
                    <div className="fleet-form-group">
                      <label>ID DE REGISTRO</label>
                      <input type="text" value={selectedShipId} disabled className="fleet-input locked" />
                    </div>

                    <div className="fleet-form-group">
                      <label>NOME DA CLASSE</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="fleet-input" 
                      />
                    </div>

                    <div className="fleet-form-group">
                      <label>INTEGRIDADE ESTRUTURAL (HP)</label>
                      <input 
                        type="number" 
                        value={editForm.maxHP} 
                        onChange={(e) => setEditForm({...editForm, maxHP: e.target.value})}
                        className="fleet-input" 
                      />
                    </div>

                    <div className="fleet-form-group">
                      <label>PONTOS TOTAIS DE REATOR</label>
                      <input 
                        type="number" 
                        value={editForm.totalPoints} 
                        onChange={(e) => setEditForm({...editForm, totalPoints: e.target.value})}
                        className="fleet-input highlight-input" 
                      />
                    </div>

                    <button className="fleet-save-btn" onClick={handleSaveShip}>
                      SALVAR ESPECIFICAÇÕES
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
        
        {/* A lombada direita com os pontinhos */}
        <div className="datapad-right-spine"></div>
        
      </div>
    </div>
  );
};

export default AdminDashboard;