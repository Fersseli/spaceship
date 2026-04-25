import React, {memo} from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const ShipRadarChart = ({ attributes }) => {
  // Mapeia as chaves do seu estado para os rótulos curtos do gráfico
  const nameMap = {
    weapons: "ARM",
    missiles: "MSL",
    controls: "CON",
    shields: "ESC",
    engines: "MOT",
  };

  // Transforma o objeto de atributos em array para o Recharts
  const data = Object.entries(attributes).map(([key, value]) => ({
    subject: nameMap[key] || key.toUpperCase(),
    value: value,
    fullMark: 6,
  }));

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "220px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          {/* A malha do gráfico - Cor suave para não poluir */}
          <PolarGrid stroke="#333" />

          {/* Os eixos angulares (os nomes ARM, MSL, etc) */}
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#ea683f", fontSize: 11, fontWeight: "bold" }}
          />

          {/* O eixo radial (escala de 0 a 6) */}
          <PolarRadiusAxis
            angle={90}
            domain={[0, 6]}
            tickCount={7}
            tick={false} // Esconde os números 1, 2, 3...
            axisLine={false}
          />

          {/* A área preenchida */}
          <Radar
            name="Ship Stats"
            dataKey="value"
            stroke="#ea683f"     // Linha externa
            fill="#ea683f"       // Cor de preenchimento
            fillOpacity={0.4}    // Transparência estilo HUD
            isAnimationActive={true}
            animationDuration={400}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(ShipRadarChart);