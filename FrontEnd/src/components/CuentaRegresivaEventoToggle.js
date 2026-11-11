import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/api";
import { useAuth } from "./context/AuthContext";
import { puedeGestionarCuentasRegresivas } from "../utils/permisos";

// UI65: casilla de cuenta regresiva para un evento ya creado. Actúa al
// momento (no espera la aprobación de la edición del evento).

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export function CuentaRegresivaEventoToggle({ publicacion }) {
  const { user } = useAuth();
  const habilitado =
    publicacion?.tag === "evento" && !publicacion?.publicacionOrigenId && puedeGestionarCuentasRegresivas(user);

  const [cuentaId, setCuentaId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!habilitado) return;
    let activo = true;
    setCargando(true);
    fetch(`${API_URL}/cuentas-regresivas`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        if (!activo) return;
        const propia = (json.data || []).find(
          (c) => String(c.publicacion?._id || c.publicacion || "") === String(publicacion._id),
        );
        setCuentaId(propia?._id || null);
      })
      .catch(() => activo && setCuentaId(null))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [habilitado, publicacion?._id]);

  if (!habilitado) return null;

  const alCambiar = async (e) => {
    const marcar = e.target.checked;
    setGuardando(true);
    try {
      const res = marcar
        ? await fetch(`${API_URL}/cuentas-regresivas/evento/${publicacion._id}`, {
            method: "POST",
            headers: authHeaders(),
          })
        : await fetch(`${API_URL}/cuentas-regresivas/${cuentaId}`, {
            method: "DELETE",
            headers: authHeaders(),
          });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "No se pudo actualizar la cuenta regresiva");
      setCuentaId(marcar ? json.data?._id || null : null);
      toast.success(marcar ? "Cuenta regresiva activada" : "Cuenta regresiva quitada");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="precio-negociable-box" style={{ gridColumn: "1 / -1" }}>
      <div className="precio-negociable-header">
        <input
          id="mostrarCuentaRegresivaEditar"
          type="checkbox"
          checked={Boolean(cuentaId)}
          onChange={alCambiar}
          disabled={cargando || guardando}
          className="precio-negociable-checkbox"
        />
        <label htmlFor="mostrarCuentaRegresivaEditar" className="precio-negociable-label">
          Mostrar cuenta regresiva en la principal
        </label>
      </div>
      <p className="precio-negociable-help">
        Se aplica al momento. La fecha del contador sigue la del evento.
      </p>
    </div>
  );
}

export default CuentaRegresivaEventoToggle;
