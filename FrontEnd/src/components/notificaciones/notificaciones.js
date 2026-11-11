import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AiOutlineClose } from "react-icons/ai";
import { AiOutlineClockCircle } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";

const Notificaciones = ({
  open = true,
  setOpen = () => {},
  standalone = false,
  onCountChange,
}) => {
  const navigate = useNavigate();
  const [ntfs, setNtfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    fechaCaducidad: "",
    tipo: "general",
    formularioUrl: "",
  });

  const usuarioLogueado = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (_e) {
      return null;
    }
  }, [open]);

  const token = localStorage.getItem("token");
  const userId = usuarioLogueado?._id;
  const esAdmin = Boolean(
    usuarioLogueado && (usuarioLogueado.tipoUsuario === 0 || usuarioLogueado.tipoUsuario === 1)
  );

  const syncCount = useCallback(
    (list) => {
      const count = Array.isArray(list)
        ? list.filter((ntf) => !ntf?.visto).length
        : 0;
      if (typeof onCountChange === "function") {
        onCountChange(count);
      }
      window.dispatchEvent(
        new CustomEvent("notifications-count-changed", { detail: count })
      );
    },
    [onCountChange]
  );

  const cargarNotificaciones = useCallback(async () => {
    if (!token) {
      setNtfs([]);
      syncCount([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/notificaciones`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(
          payload?.message || "No se pudieron cargar las notificaciones"
        );
      }

      const lista = Array.isArray(payload?.data) ? payload.data : [];
      setNtfs(lista);
      syncCount(lista);
    } catch (err) {
      setError(err?.message || "Error al cargar notificaciones");
      setNtfs([]);
      syncCount([]);
    } finally {
      setLoading(false);
    }
  }, [token, userId, syncCount]);

  const marcarComoVista = useCallback(
    async (id) => {
      if (!token || !id) return false;

      const prev = ntfs;
      const next = prev.map((ntf) =>
        ntf._id === id ? { ...ntf, visto: true } : ntf
      );

      setNtfs(next);
      syncCount(next);

      try {
        const res = await fetch(`${API_URL}/notificaciones/${id}/visto`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("No se pudo marcar la notificación como vista");
        }
        return true;
      } catch (_err) {
        setNtfs(prev);
        syncCount(prev);
        return false;
      }
    },
    [ntfs, token, syncCount]
  );

  useEffect(() => {
    if (standalone || open) {
      cargarNotificaciones();
    }
  }, [open, standalone, cargarNotificaciones]);

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleString("es-CR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getTipoConfig = (tipo) => {
    switch (tipo) {
      case "recordatorio":
        return {
          borderClass: "border-amber-400",
          icon: AiOutlineClockCircle,
          iconClass: "text-amber-300",
          label: "Recordatorio",
        };
      case "formulario":
        return {
          borderClass: "border-green-500",
          icon: null,
          iconClass: "",
          label: "Formulario",
        };
      default:
        return {
          borderClass: "border-slate-500",
          icon: null,
          iconClass: "",
          label: null,
        };
    }
  };

  const eliminarNotificacion = async (id, options = {}) => {
    const { silent = false } = options;
    if (!token || !id) return false;

    const prev = ntfs;
    const next = prev.filter((ntf) => ntf._id !== id);
    setNtfs(next);
    syncCount(next);

    try {
      const res = await fetch(`${API_URL}/notificaciones/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("No se pudo eliminar la notificación");
      }
      return true;
    } catch (_err) {
      setNtfs(prev);
      syncCount(prev);
      if (!silent) {
        setError("No se pudo eliminar la notificación");
      }
      return false;
    }
  };

  const handleNotificacionClick = async (ntf) => {
    await marcarComoVista(ntf._id);

    const publicacionId =
      typeof ntf.publicacionId === "object"
        ? ntf.publicacionId?._id
        : ntf.publicacionId;

    if (!standalone) {
      setOpen(false);
    }

    if (publicacionId) {
      navigate(`/publicaciones/${publicacionId}`);
    }
  };

  const handleEnviarNotificacion = async (event) => {
    event.preventDefault();
    if (!token || !esAdmin) {
      setError("No tienes permisos para enviar notificaciones.");
      return;
    }

    if (!formData.nombre.trim() || !formData.descripcion.trim()) {
      setError("Nombre y descripción son obligatorios.");
      return;
    }

    if (formData.tipo === "formulario" && !formData.formularioUrl.trim()) {
      setError("La URL del formulario es obligatoria para notificaciones de tipo formulario.");
      return;
    }

    setEnviando(true);
    setError("");

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        tipo: formData.tipo,
      };

      if (formData.formularioUrl) {
        payload.formularioUrl = formData.formularioUrl.trim();
      }

      if (formData.fechaCaducidad) {
        payload.fechaCaducidad = new Date(formData.fechaCaducidad).toISOString();
      }

      const res = await fetch(`${API_URL}/notificaciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo enviar la notificación");
      }

      setFormData({ nombre: "", descripcion: "", fechaCaducidad: "", tipo: "general", formularioUrl: "" });
      await cargarNotificaciones();
    } catch (err) {
      setError(err?.message || "Error al enviar notificación");
    } finally {
      setEnviando(false);
    }
  };

  const closePanel = () => {
    setOpen(false);
  };

  if (!standalone && !open) return null;

  const containerClass = standalone
    ? "w-full max-w-3xl mx-auto mt-4 p-4"
    : "absolute inset-0 z-[9999] flex justify-end h-full items-start pt-4 sm:pt-6 md:pt-20 shadow-xl transition-transform duration-300";

  const panelClass = standalone
    ? "bg-blue-900 border-2 border-slate-600 w-full shadow-xl max-h-[75vh] overflow-y-auto p-4 rounded-xl"
    : "bg-blue-900 border-2 border-slate-600 w-full sm:w-[380px] max-w-[95vw] mr-2 sm:mr-4 shadow-xl max-h-[90vh] overflow-y-auto p-4 rounded-xl";

  return (
    <div
      className={containerClass}
      onClick={!standalone ? closePanel : undefined}
    >
      <div className={panelClass} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Notificaciones</h2>

          {!standalone && (
            <button onClick={closePanel}>
              <AiOutlineClose className="w-5 h-5" />
            </button>
          )}
        </div>

        {esAdmin && (
          <form
            onSubmit={handleEnviarNotificacion}
            className="mb-4 p-3 rounded-lg border border-blue-500 bg-slate-800"
          >
            <h3 className="text-sm font-semibold mb-2">
              Enviar notificación general
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-300">Tipo:</label>
                  <select
                    className="w-full px-3 py-2 rounded text-black text-sm"
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tipo: e.target.value }))
                    }
                  >
                    <option value="general">General</option>
                    <option value="formulario">Google Forms</option>
                  </select>
                </div>
              </div>
              <input
                className="px-3 py-2 rounded text-black text-sm"
                placeholder="Título"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
              />
              <textarea
                className="px-3 py-2 rounded text-black text-sm"
                rows={3}
                placeholder="Mensaje para todos los usuarios"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descripcion: e.target.value }))
                }
              />
              {formData.tipo === "formulario" && (
                <input
                  className="px-3 py-2 rounded text-black text-sm"
                  type="url"
                  placeholder="URL del Google Forms"
                  value={formData.formularioUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, formularioUrl: e.target.value }))
                  }
                />
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="px-3 py-2 rounded text-black text-sm flex-1"
                  type="date"
                  value={formData.fechaCaducidad}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fechaCaducidad: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {enviando ? "Enviando..." : "Enviar"}
                </button>
              </div>
              <p className="text-xs text-slate-200">
                Si no eliges fecha, la notificación caduca automáticamente en 3 días.
              </p>
            </div>
          </form>
        )}

        {!token || !userId ? (
          <p className="text-sm text-slate-200">
            Inicia sesión para ver tus notificaciones.
          </p>
        ) : loading ? (
          <p className="text-sm text-slate-200">Cargando notificaciones...</p>
        ) : error ? (
          <p className="text-sm text-red-200">{error}</p>
        ) : ntfs.length === 0 ? (
          <p className="text-sm text-slate-200">No tienes notificaciones.</p>
        ) : (
          <div className="flex flex-col gap-2">

            {ntfs.map((ntf) => {
              const tipoConfig = getTipoConfig(ntf.tipo);
              const TipoIcon = tipoConfig.icon;

              return (
              <div
                className={`p-3 rounded-lg cursor-pointer border bg-slate-700 transition-colors ${tipoConfig.borderClass}`}
                  key={ntf._id}
                  onClick={() => handleNotificacionClick(ntf)}
                >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {TipoIcon && (
                        <div className="flex items-center gap-1 mb-1">
                          <TipoIcon className={`w-4 h-4 ${tipoConfig.iconClass}`} />
                          <span className={`text-xs font-semibold ${tipoConfig.iconClass}`}>
                            {tipoConfig.label}
                          </span>
                        </div>
                      )}
                      <p className={ntf?.visto ? "text-slate-400" : "text-white"}>
                        <span className="font-bold">{ntf.nombre}:</span>{" "}
                        {ntf.descripcion}
                      </p>
                      {ntf.tipo === "formulario" && ntf.formularioUrl && (
                        <a
                          href={ntf.formularioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir Formulario
                        </a>
                      )}
                    <p className={`text-sm mt-2 ${ntf?.visto ? "text-slate-400" : "text-slate-200"}`}>
                        Fecha: {formatFecha(ntf.createdAt)}
                    </p>

                  </div>
                  <div className="flex items-center gap-2">
                    {!ntf?.visto && (
                      <span
                        className="inline-block w-3 h-3 rounded-full bg-blue-500"
                        aria-label="Notificacion no vista"
                        title="Notificacion no vista"
                      />
                    )}
                    {esAdmin && (
                      <button
                        className="text-slate-100 hover:text-red-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarNotificacion(ntf._id);
                        }}
                        aria-label="Eliminar notificación"
                        title="Eliminar notificación"
                      >
                        <AiOutlineClose className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notificaciones;
