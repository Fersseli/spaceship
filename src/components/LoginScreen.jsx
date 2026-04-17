import React, { useState, useEffect } from "react";
import "../styles/LoginScreen.css";
import { rolesList } from "../utils/rolePermissions";
import { shipsList } from "../data/ships";
import { playersList } from "../utils/players";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

const LoginScreen = ({ onLoginSuccess }) => {
  // Estados para o sistema de Admin Oculto
  const [failCount, setFailCount] = useState(0);
  const [showAdminMode, setShowAdminMode] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    document.body.style.cursor = "url('/normal.cur'), auto";
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  const [nickname, setNickname] = useState(playersList[0].id);
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("piloto");
  const [selectedShip, setSelectedShip] = useState("hawthorne_iii");
  const [error, setError] = useState("");

  const handleEnter = (e) => {
    e.preventDefault();

    const player = playersList.find((p) => p.id === nickname);

    // Validação de Senha e Gatilho do Admin
    if (!player || password !== player.password) {
      setError("Senha incorreta.");
      
      const newCount = failCount + 1;
      setFailCount(newCount);
      
      // Se errar 5 vezes, libera o acesso ao terminal restrito
      if (newCount >= 5) {
        setShowAdminMode(true);
      }
      return;
    }

    // Validação de Co-piloto Único
    if (selectedRole === "copiloto") {
      const isCopilotTaken = playersList.some((p) => {
        if (p.id === nickname) return false;
        const isOnline = localStorage.getItem(`status_${p.id}`) === "online";
        const role = localStorage.getItem(`role_${p.id}`);
        return isOnline && role === "copiloto";
      });

      if (isCopilotTaken) {
        setError("Acesso Negado: Já existe um co-piloto online nesta nave.");
        return;
      }
    }

    setError("");

    // Persistência da Nave Escolhida (ou Hawthorne por padrão)
    localStorage.setItem(`ship_${nickname}`, selectedShip);

    onLoginSuccess({
      nickname: nickname,
      role: selectedRole,
      ship: selectedShip,
      des: player.des,
      esq: player.esq,
    });
  };

  // Renderização Condicional: Dashboard do Admin
  if (isAdminLoggedIn) {
    return (
      <AdminDashboard 
        onLogout={() => {
          // Apenas desloga o admin, mas mantém a tela de login do admin ativa
          setIsAdminLoggedIn(false);
          // GARANTE que o modo admin continue ativo para não voltar ao login civil
          setShowAdminMode(true); 
        }} 
      />
    );
  }

  // Renderização Condicional: Tela de Login do Admin
  if (showAdminMode) {
    return (
      <AdminLogin 
        onAdminSuccess={() => setIsAdminLoggedIn(true)}
        onBack={() => {
          setShowAdminMode(false);
          setFailCount(0);
        }} 
      />
    );
  }

  // Tela de Login Padrão
  return (
    <div className="login-screen">
      <div className="hazard-sidebar">
        <div className="hazard-title">HEAVEN'S DOOR</div>
        <div className="hazard-stripes"></div>
      </div>
      <div className="login-container">
        <h1 className="login-title">HEAVEN'S SYSTEMS</h1>
        <p className="login-subtitle">Aliste-se, comandante!</p>

        <form onSubmit={handleEnter} className="login-form">
          <div className="form-group">
            <label htmlFor="nickname">Codinome:</label>
            <select
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setPassword("");
                setError("");
              }}
              className="form-select"
            >
              {playersList.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">CARGO:</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="form-select"
            >
              {rolesList.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ship">NAVE:</label>
            <select
              id="ship"
              value={selectedShip}
              onChange={(e) => setSelectedShip(e.target.value)}
              className="form-select"
            >
              {shipsList.map((ship) => (
                <option key={ship.id} value={ship.id}>
                  {ship.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            Start
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;