import React, { useState, useEffect } from "react";
import "./App.css";
import LoginScreen from "./components/LoginScreen";
import ShipDashboard from "./components/ShipDashboard";
import TerminalCombate from "./components/TerminalCombate";

// Importações do Firebase (Adicionamos o db, doc e setDoc aqui)
import { auth, db } from "./utils/firebase"; 
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const App = () => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Monitora o estado de autenticação do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const savedData = localStorage.getItem(`session_${user.uid}`);
        if (savedData) {
          setPlayerData(JSON.parse(savedData));
        }
      } else {
        setPlayerData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. ATUALIZADO: Agora é async e avisa o Firebase que o jogador entrou
  const handleLoginSuccess = async (data) => {
    if (auth.currentUser) {
      localStorage.setItem(`session_${auth.currentUser.uid}`, JSON.stringify(data));
    }
    
    // REGISTRA STATUS ONLINE
    try {
      await setDoc(doc(db, "gameData", "playersStatus"), {
        [data.nickname]: { 
          status: "online", 
          role: data.role, 
          ship: data.ship 
        }
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao registrar status online:", error);
    }

    setPlayerData(data);
  };

  // 2. ATUALIZADO: Avisa o Firebase que o jogador saiu antes de deslogar
  const handleLogout = async () => {
    try {
      // REGISTRA STATUS OFFLINE
      if (playerData && playerData.nickname) {
        await setDoc(doc(db, "gameData", "playersStatus"), {
          [playerData.nickname]: { status: "offline" }
        }, { merge: true });
      }

      await signOut(auth);
      if (playerData) {
        localStorage.removeItem(`session_${auth.currentUser?.uid}`);
      }
      setPlayerData(null);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

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