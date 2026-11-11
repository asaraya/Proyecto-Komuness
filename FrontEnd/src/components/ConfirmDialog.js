import "../CSS/confirmDialog.css";

const ConfirmDialog = ({ dialog, onConfirm, onCancel }) => {
  if (!dialog?.isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" role="dialog" aria-modal="true">
      <div className={`confirm-dialog-card confirm-dialog-card--${dialog.tone || "primary"}`}>
        <h3 className="confirm-dialog-title">{dialog.title}</h3>
        <p className="confirm-dialog-message">{dialog.message}</p>
        {dialog.hint ? (
          <p className="confirm-dialog-hint">{dialog.hint}</p>
        ) : null}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn--ghost"
            onClick={onCancel}
          >
            {dialog.cancelText || "Cancelar"}
          </button>
          <button
            type="button"
            className="confirm-dialog-btn confirm-dialog-btn--primary"
            onClick={onConfirm}
          >
            {dialog.confirmText || "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
