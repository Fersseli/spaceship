import React from 'react';
import '../styles/ShipLoading.css'; // Certifique-se de importar o CSS

const ShipLoading = () => {
  return (
    <div className="space-loading-wrapper">
      {/* Elemento que cria a órbita do planeta e o brilho */}
      <div className="planet-horizon-glow"></div>
      
      {/* Indicador de carregamento dinâmico no centro */}
      <div className="dynamic-loader">
        <div className="loader-bar color-red"></div>
        <div className="loader-bar color-gold"></div>
        <div className="loader-bar color-orange"></div>
      </div>
    </div>
  );
};

export default ShipLoading;