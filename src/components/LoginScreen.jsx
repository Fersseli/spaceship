import React, { useState, useEffect } from "react";
import "../styles/LoginScreen.css";
import { rolesList } from "../utils/rolePermissions";
import { shipsList } from "../data/ships";
import { playersList } from "../utils/players";
// O import novo que fizemos para a limpeza:
import { removePlayerFromAllCrews } from "../utils/mockApi"; 

// Estes dois são componentes que o LoginScreen usa. 
// Se eles não estiverem a ser importados corretamente, causam esse erro!
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import { auth } from "../utils/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";


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

  const handleEnter = async (e) => {
  e.preventDefault();
  setError("");

  // Encontrar o e-mail associado ao codinome no seu playersList
  const playerInfo = playersList.find((p) => p.id === nickname);
  
  try {
    // Autenticação Real no Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      `${nickname}@heavens.com`, // Simulando um e-mail pelo nickname
      password
    );

    const user = userCredential.user;

    // Limpezas e validações de cargo (mantendo sua lógica original)
    removePlayerFromAllCrews(nickname); 

    onLoginSuccess({
      uid: user.uid, // Agora você tem um ID único real
      nickname: nickname,
      role: selectedRole,
      ship: selectedShip,
      des: playerInfo.des,
      esq: playerInfo.esq,
    });

  } catch (err) {
    setError("Credenciais Inválidas");
    setFailCount(prev => prev + 1);
    if (failCount + 1 >= 5) setShowAdminMode(true);
  }
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