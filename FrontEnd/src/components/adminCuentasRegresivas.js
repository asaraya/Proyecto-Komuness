// components/adminCuentasRegresivas.js — UI65
// Gestión de las cuentas regresivas de la principal: las de eventos y las libres.
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { IoMdArrowRoundBack } from "react-icons/io";
import { API_URL } from "../utils/api";
import { useAuth } from "./context/AuthContext";
import { puedeGestionarCuentasRegresivas } from "../utils/permisos";
import { formatearFechaCR, fechaHoraCRaISO, isoAFechaHoraCR } from "../utils/cuentaRegresiva";
import ConfirmDialog from "./ConfirmDialog";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import "../CSS/adminCuentasRegresivas.css";

const TITULO_MAX = 120;
const FORM_VACIO = { titulo: "", fecha: "", hora: "", enlace: "" };

const peticion = async (url, opciones = {}) => {
  const res = await fetch(url, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      ...(opciones.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || "Ocurrió un error, intenta de nuevo");
  return json;
};

const estadoDe = (c) => {
  if (Date.parse(c.fechaObjetivo) < Date.now()) return { texto: "Vencido", clase: "vencido" };
  return c.activo ? { texto: "Activo", clase: "activo" } : { texto: "Inactivo", clase: "inactivo" };
};

export const AdminCuentasRegresivas = () => {
  const { user, cargando } = useAuth();
  const navigate = useNavigate();
  const { dialog, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [cuentas, setCuentas] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null); // cuenta en edición o null
  const [form, setForm] = useState(FORM_VACIO);

  const permitido = puedeGestionarCuentasRegresivas(user);
  const deEvento = Boolean(editando?.publicacion);

  const cargar = useCallback(async () => {
    setCargandoLista(true);
    try {
      const json = await peticion(`${API_URL}/cuentas-regresivas`);
      setCuentas(Array.isArray(json.data) ? json.data : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    if (!cargando && permitido) cargar();
  }, [cargando, permitido, cargar]);

  if (cargando) {
    return <div className="acr-cargando">Cargando…</div>;
  }
  if (!user) return <Navigate to="/iniciarSesion" replace />;
  if (!permitido) return <Navigate to="/" replace />;

  const reiniciar = () => {
    setEditando(null);
    setForm(FORM_VACIO);
  };

  const empezarEdicion = (c) => {
    const { fecha, hora } = isoAFechaHoraCR(c.fechaObjetivo);
    setEditando(c);
    setForm({ titulo: c.titulo, fecha, hora, enlace: c.enlace || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const alCambiar = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const alEnviar = async (e) => {
    e.preventDefault();
    const titulo = form.titulo.trim();
    if (!titulo) {
      toast.error("Escribe un título");
      return;
    }
    const body = { titulo };
    if (!deEvento) {
      const fechaObjetivo = fechaHoraCRaISO(form.fecha, form.hora);
      if (!fechaObjetivo || Date.parse(fechaObjetivo) <= Date.now()) {
        toast.error("La fecha y hora deben ser futuras");
        return;
      }
      body.fechaObjetivo = fechaObjetivo;
      body.enlace = form.enlace.trim();
    }

    setGuardando(true);
    try {
      if (editando) {
        await peticion(`${API_URL}/cuentas-regresivas/${editando._id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Cuenta regresiva actualizada");
      } else {
        await peticion(`${API_URL}/cuentas-regresivas`, { method: "POST", body: JSON.stringify(body) });
        toast.success("Cuenta regresiva creada");
      }
      reiniciar();
      await cargar();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (c) => {
    try {
      await peticion(`${API_URL}/cuentas-regresivas/${c._id}`, {
        method: "PUT",
        body: JSON.stringify({ activo: !c.activo }),
      });
      setCuentas((prev) => prev.map((x) => (x._id === c._id ? { ...x, activo: !c.activo } : x)));
      toast.success(c.activo ? "Se ocultó de la principal" : "Se muestra en la principal");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const eliminar = async (c) => {
    const ok = await confirm({
      title: "Eliminar cuenta regresiva",
      message: `¿Eliminar "${c.titulo}"?`,
      hint: c.publicacion ? "El evento no se elimina, solo su contador." : "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await peticion(`${API_URL}/cuentas-regresivas/${c._id}`, { method: "DELETE" });
      if (editando?._id === c._id) reiniciar();
      setCuentas((prev) => prev.filter((x) => x._id !== c._id));
      toast.success("Cuenta regresiva eliminada");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="acr-container">
      <div className="acr-content">
        <header className="acr-panel acr-header">
          <button
            type="button"
            onClick={() => navigate("/perfilUsuario")}
            className="acr-back"
            aria-label="Volver al perfil"
            title="Volver al perfil"
          >
            <IoMdArrowRoundBack size={22} />
          </button>
          <h1 className="acr-title">Cuentas regresivas</h1>
        </header>

        <section className="acr-panel acr-form-panel">
          <h2 className="acr-subtitle">{editando ? "Editar cuenta regresiva" : "Nueva cuenta regresiva libre"}</h2>
          {!editando && (
            <p className="acr-help">
              Para un evento, marca "Mostrar cuenta regresiva en la principal" al crearlo o editarlo.
            </p>
          )}

          <form onSubmit={alEnviar} className="acr-form">
            <label className="acr-campo acr-campo-ancho">
              <span className="acr-label">Título</span>
              <input
                name="titulo"
                value={form.titulo}
                onChange={alCambiar}
                maxLength={TITULO_MAX}
                className="acr-input"
                placeholder="Concierto en nuestra sede"
                required
                disabled={guardando}
              />
              <span className="acr-contador-caracteres">
                {form.titulo.length}/{TITULO_MAX}
              </span>
            </label>

            <label className="acr-campo">
              <span className="acr-label">Fecha</span>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={alCambiar}
                className="acr-input"
                required={!deEvento}
                disabled={guardando || deEvento}
              />
            </label>

            <label className="acr-campo">
              <span className="acr-label">Hora</span>
              <input
                type="time"
                name="hora"
                value={form.hora}
                onChange={alCambiar}
                className="acr-input"
                disabled={guardando || deEvento}
              />
            </label>

            {deEvento ? (
              <p className="acr-help acr-campo-ancho">La fecha la toma del evento.</p>
            ) : (
              <label className="acr-campo acr-campo-ancho">
                <span className="acr-label">Enlace (opcional)</span>
                <input
                  type="url"
                  name="enlace"
                  value={form.enlace}
                  onChange={alCambiar}
                  className="acr-input"
                  placeholder="https://"
                  disabled={guardando}
                />
              </label>
            )}

            <div className="acr-form-botones acr-campo-ancho">
              <button type="submit" className="acr-btn primario" disabled={guardando}>
                {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear cuenta regresiva"}
              </button>
              {editando && (
                <button type="button" className="acr-btn secundario" onClick={reiniciar} disabled={guardando}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="acr-panel acr-lista-panel">
          {cargandoLista ? (
            <p className="acr-vacio">Cargando…</p>
          ) : cuentas.length === 0 ? (
            <p className="acr-vacio">Todavía no hay cuentas regresivas.</p>
          ) : (
            <ul className="acr-lista">
              {cuentas.map((c) => {
                const estado = estadoDe(c);
                return (
                  <li key={c._id} className="acr-item">
                    <div className="acr-item-info">
                      <p className="acr-item-titulo">{c.titulo}</p>
                      <p className="acr-item-meta">
                        {formatearFechaCR(c.fechaObjetivo)} ·{" "}
                        {c.publicacion ? (
                          <Link to={`/eventos/${c.publicacion._id}`} className="acr-item-link">
                            Evento: {c.publicacion.titulo || "ver evento"}
                          </Link>
                        ) : (
                          "Libre"
                        )}
                        {c.creadoPor?.nombre && ` · ${c.creadoPor.nombre} ${c.creadoPor.apellido || ""}`}
                      </p>
                    </div>
                    <span className={`acr-estado ${estado.clase}`}>{estado.texto}</span>
                    <div className="acr-item-acciones">
                      <button type="button" className="acr-btn secundario" onClick={() => empezarEdicion(c)}>
                        Editar
                      </button>
                      <button type="button" className="acr-btn secundario" onClick={() => alternarActivo(c)}>
                        {c.activo ? "Desactivar" : "Activar"}
                      </button>
                      <button type="button" className="acr-btn peligro" onClick={() => eliminar(c)}>
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog dialog={dialog} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
};

export default AdminCuentasRegresivas;
