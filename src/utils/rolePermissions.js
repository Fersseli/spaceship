// Sistema de permissões baseado no papel do jogador
export const rolePermissions = {
  pilot: {
    label: "Pilot",
    canEdit: true,
    canViewAttributes: true,
    description: "Can edit ship attributes"
  },
  copilot: {
    label: "Copilot",
    canEdit: true,
    canViewAttributes: true,
    description: "Can edit ship attributes"
  },
  gunner: {
    label: "Gunner",
    canEdit: false,
    canViewAttributes: true,
    description: "Read-only view, cannot edit"
  }
};

// Lista de papéis disponíveis para seleção
export const rolesList = [
  { id: "pilot", label: "Pilot" },
  { id: "copilot", label: "Copilot" },
  { id: "gunner", label: "Gunner" }
];

/**
 * Verifica se um papel tem permissão para editar
 * @param {string} role - ID do papel (pilot, copilot, gunner)
 * @returns {boolean} - True se pode editar, False caso contrário
 */
export const canEdit = (role) => {
  return rolePermissions[role]?.canEdit || false;
};