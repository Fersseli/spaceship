// Sistema de permissões baseado no papel do jogador
export const rolePermissions = {
  piloto: {
    label: "Piloto",
    canEdit: true,
    canViewAttributes: true,
    description: "Can edit ship attributes"
  },
  copiloto: {
    label: "Copiloto",
    canEdit: true,
    canViewAttributes: true,
    description: "Can edit ship attributes"
  },
  tripulante: {
    label: "Tripulante",
    canEdit: false,
    canViewAttributes: true,
    description: "Read-only view, cannot edit"
  }
};

// Lista de papéis disponíveis para seleção
export const rolesList = [
  { id: "piloto", label: "Piloto" },
  { id: "copiloto", label: "Copiloto" },
  { id: "tripulante", label: "Tripulante" }
];

/**
 * Verifica se um papel tem permissão para editar
 * @param {string} role - ID do papel (piloto, copiloto, tripulante)
 * @returns {boolean} - True se pode editar, False caso contrário
 */
export const canEdit = (role) => {
  return rolePermissions[role]?.canEdit || false;
};