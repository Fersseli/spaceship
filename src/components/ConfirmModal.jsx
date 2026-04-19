import React from "react";
import "../styles/ConfirmModal.css";

const ConfirmModal = ({ 
  isOpen, title, message, subtext, onConfirm, onCancel, 
  confirmLabel = "CONFIRMAR", cancelLabel = "CANCELAR", 
  variant = "danger", hideCancel = false // <-- NOVO: Permite esconder o Cancelar
}) => {
  if (!isOpen) return null;

  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className={`cm-modal cm-modal--${variant}`} onClick={e => e.stopPropagation()}>
        
        <div className="cm-scanline" />

        <div className="cm-header">
          <div className="cm-header-dot" />
          <span className="cm-header-label">HEAVEN'S SYSTEMS // CONFIRMAÇÃO NECESSÁRIA</span>
        </div>

        <div className="cm-body">
          <h2 className="cm-title">{title}</h2>
          {message && <p className="cm-message" style={{ whiteSpace: "pre-line" }}>{message}</p>}
          {subtext && <p className="cm-subtext">{subtext}</p>}
        </div>

        <div className="cm-footer">
          {/* NOVO: Só exibe o Cancelar se hideCancel for falso */}
          {!hideCancel && (
            <button className="cm-btn cm-btn--cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button className={`cm-btn cm-btn--confirm cm-btn--${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>

        <div className="cm-corner cm-corner--tl" />
        <div className="cm-corner cm-corner--tr" />
        <div className="cm-corner cm-corner--bl" />
        <div className="cm-corner cm-corner--br" />
      </div>
    </div>
  );
};

export default ConfirmModal;