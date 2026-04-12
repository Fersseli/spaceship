import React, { useState } from "react";
import "../styles/LoginScreen.css";
import { rolesList } from "../utils/rolePermissions";
import { shipsList } from "../data/ships";

// Tela de login inicial onde o jogador define seu apelido, papel e nave
const LoginScreen = ({ onLoginSuccess }) => {
  // Estado para armazenar o apelido do jogador
  const [nickname, setNickname] = useState("");

  // Estado para armazenar o papel selecionado (pilot, copilot, gunner)
  const [selectedRole, setSelectedRole] = useState("pilot");

  // Estado para armazenar a nave selecionada
  const [selectedShip, setSelectedShip] = useState("hawthorne_iii");

  // Estado para controlar mensagens de erro
  const [error, setError] = useState("");

  // Função para validar e processar o login
  const handleEnter = (e) => {
    e.preventDefault();

    // Valida se o apelido não está vazio
    if (nickname.trim() === "") {
      setError("Please enter a nickname");
      return;
    }

    // Limpa mensagens de erro
    setError("");

    // Chama o callback com os dados do jogador
    onLoginSuccess({
      nickname: nickname.trim(),
      role: selectedRole,
      ship: selectedShip
    });
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1 className="login-title">Space Combat System</h1>
        <p className="login-subtitle">Enter the battlefield commander</p>

        <form onSubmit={handleEnter} className="login-form">
          {/* Campo de entrada para o apelido do jogador */}
          <div className="form-group">
            <label htmlFor="nickname">Nickname:</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              className="form-input"
              maxLength="30"
            />
          </div>

          {/* Seletor de papel do jogador */}
          <div className="form-group">
            <label htmlFor="role">Role:</label>
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

          {/* Seletor de nave */}
          <div className="form-group">
            <label htmlFor="ship">Ship:</label>
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

          {/* Exibe mensagens de erro se houver */}
          {error && <div className="error-message">{error}</div>}

          {/* Botão para entrar no jogo */}
          <button type="submit" className="login-button">
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;