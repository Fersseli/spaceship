import React, { useState } from "react";
import "../styles/AdminLogin.css";

const AdminLogin = ({ onAdminSuccess, onBack }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [message, setMessage] = useState("");

  const handleAdminSubmit = (e) => {
    e.preventDefault();

    // Validação das credenciais de Administrador
if ((user === "ZERO" && pass === "fernando") || (user === "zero" && pass === "fernando")) {
        setMessage("LOGIN BEM SUCEDIDO. REDIRECIONANDO...");
      
      // Aciona a função de sucesso que vem do LoginScreen após 1 segundo
      setTimeout(() => {
        onAdminSuccess(); 
      }, 1000);
    } else {
      setMessage("ACESSO NEGADO: CREDENCIAIS INVÁLIDAS.");
      setPass(""); // Limpa o campo da senha para nova tentativa
    }
  };

  return (
    <div className="admin-login-screen">
      <div className="hazard-sidebar">
        <div className="hazard-title">HEAVEN'S DOOR</div>
        <div className="hazard-stripes"></div>
      </div>

      <div className="admin-container">
        <h1 className="login-title">HEAVEN'S SYSTEMS</h1>
        <p className="admin-subtitle">RESTRICTED TERMINAL</p>

        <form onSubmit={handleAdminSubmit} className="login-form">
          <div className="form-group">
            <label>USUÁRIO:</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="form-input"
              placeholder="IDENTIFICACAO"
            />
          </div>

          <div className="form-group">
            <label>CHAVE DE ACESSO:</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </div>

          {message && <div className="admin-message">{message}</div>}

          <button type="submit" className="login-button">
            START
          </button>
          
          <button type="button" onClick={onBack} className="admin-back-btn">
            VOLTAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;