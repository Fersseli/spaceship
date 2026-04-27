import React, { useState, useEffect } from "react"; // Adicionado useEffect
import "./App.css";
import LoginScreen from "./components/LoginScreen";
import ShipDashboard from "./components/ShipDashboard";
import TerminalCombate from "./components/TerminalCombate";

// Importações do Firebase
import { auth } from "./utils/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";

const App = () => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true); // Estado para evitar flash da tela de login

  // Monitora o estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Se o usuário está logado, tentamos recuperar os dados da sessão
        // Você pode buscar dados adicionais do Firestore aqui se desejar
        const savedData = localStorage.getItem(`session_${user.uid}`);
        if (savedData) {
          setPlayerData(JSON.parse(savedData));
        }
      } else {
        setPlayerData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Limpa o listener ao desmontar
  }, []);

  const handleLoginSuccess = (data) => {
    // Agora salvamos os dados vinculados ao UID do Firebase para persistência
    if (auth.currentUser) {
      localStorage.setItem(`session_${auth.currentUser.uid}`, JSON.stringify(data));
    }
    setPlayerData(data);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); // Desloga do Firebase de verdade
      if (playerData) {
        localStorage.removeItem(`session_${auth.currentUser?.uid}`);
      }
      setPlayerData(null);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  // Se estiver carregando o estado do Firebase, exibe uma tela vazia ou loader
  if (loading) return <div className="loading-screen">Iniciando Sistemas...</div>;

  if (window.location.pathname === '/terminal-combate') {
    return <TerminalCombate onBack={() => window.close()} />;
  }

  return (
    <div className="app">
      {playerData === null ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <ShipDashboard playerData={playerData} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;