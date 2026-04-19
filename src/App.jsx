import React, { useState } from "react";
import "./App.css";
import LoginScreen from "./components/LoginScreen";
import ShipDashboard from "./components/ShipDashboard";
// No topo
import TerminalCombate from "./components/TerminalCombate";

// No return, antes do resto:

// Componente principal da aplicação
const App = () => {
  // Estado para armazenar dados do jogador logado
  const [playerData, setPlayerData] = useState(null);

  // Função chamada quando o jogador faz login
  const handleLoginSuccess = (data) => {
    // Armazena os dados do jogador e navega para o painel
    setPlayerData(data);
  };

  // Função para fazer logout
  const handleLogout = () => {
    // Limpa os dados do jogador e volta para tela de login
    setPlayerData(null);
  };

  if (window.location.pathname === '/terminal-combate') {
  return <TerminalCombate onBack={() => window.close()} />;
}
  return (
    
    <div className="app">
      {/* Renderiza a tela de login ou o painel baseado no estado */}
      {playerData === null ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <ShipDashboard playerData={playerData} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;