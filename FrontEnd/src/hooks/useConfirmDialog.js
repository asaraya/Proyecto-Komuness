import { useCallback, useRef, useState } from "react";

const DEFAULT_DIALOG = {
  isOpen: false,
  title: "",
  message: "",
  hint: "",
  confirmText: "Aceptar",
  cancelText: "Cancelar",
  tone: "primary",
};

export const useConfirmDialog = () => {
  const [dialog, setDialog] = useState(DEFAULT_DIALOG);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    setDialog({
      ...DEFAULT_DIALOG,
      ...options,
      isOpen: true,
    });

    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    closeDialog();
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(true);
  }, [closeDialog]);

  const handleCancel = useCallback(() => {
    closeDialog();
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(false);
  }, [closeDialog]);

  return {
    dialog,
    confirm,
    handleConfirm,
    handleCancel,
  };
};
