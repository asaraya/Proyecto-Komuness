import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineUser } from "react-icons/ai";
import { toast } from "react-hot-toast";
import { API_URL, BASE_URL } from "../utils/api";
import "../CSS/perfilUsuario.css";
import { useAuth } from "./context/AuthContext";
import ModalCambioContrasena from "./modalCambioContra";
import { Link } from "react-router-dom";
import { FaListAlt, FaEdit, FaHistory } from "react-icons/fa";
import {
  FiSettings,
  FiCreditCard,
  FiMail,
  FiDroplet,
  FiLock,
  FiLogOut,
  FiStar,
  FiClock,
  FiRefreshCw,
  FiHome,
  FiSearch,
  FiX,
} from "react-icons/fi";
import ModalLimitesPublicaciones from "./modalLimitesPublicaciones";
import ModalConfiguracionPagos from "./ModalConfiguracionPagos";
import ModalConfiguracionTematica from "./ModalConfiguracionTematica";
import AlertaLimitePublicaciones from "./AlertaLimitePublicaciones";
import LimitePublicaciones from "./limiteDePublicaciones";
import { puedeGestionarCuentasRegresivas } from "../utils/permisos";

export const PerfilUsuario = () => {
  const navigate = useNavigate();
  const [publicaciones, setPublicaciones] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const { user, logout, updateUser, cargando } = useAuth();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalLimitesAbierto, setModalLimitesAbierto] = useState(false);
  const [modalPagosAbierto, setModalPagosAbierto] = useState(false);
  const [modalTematicaAbierto, setModalTematicaAbierto] = useState(false);
  const [modalPremiumAbierto, setModalPremiumAbierto] = useState(false);
  const [activeTab, setActiveTab] = useState("publicaciones");
  const [limiteData, setLimiteData] = useState(null);
  const [inicioContenido, setInicioContenido] = useState({
    eslogan: "",
    frase: "",
  });
  const [cargandoInicioContenido, setCargandoInicioContenido] = useState(false);
  const [guardandoInicioContenido, setGuardandoInicioContenido] =
    useState(false);
  const [, setPerfilExistente] = useState(false);
  const [, setPerfilPublico] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState(null);

  useEffect(() => {
    // Esperar a que AuthContext termine de validar la sesión; si no, al
    // recargar la página user todavía es null y se expulsa al usuario.
    if (!cargando && !user) {
      navigate("/");
    }
  }, [user, cargando, navigate]);

  // Función para cargar datos del límite de publicaciones del usuario
  const cargarDatosLimite = async () => {
    try {
      const response = await fetch(`${API_URL}/configuracion/mis-limites`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLimiteData(data.data);
      }
    } catch (error) {
      console.error("Error al cargar datos de límite:", error);
    }
  };

  const cargarContenidoInicio = async () => {
    try {
      setCargandoInicioContenido(true);
      const response = await fetch(`${API_URL}/configuracion/inicio-contenido`);
      const data = await response.json();

      if (response.ok) {
        setInicioContenido({
          eslogan: data?.data?.eslogan || "",
          frase: data?.data?.frase || "",
        });
      }
    } catch (error) {
      console.error("Error al cargar contenido de inicio:", error);
    } finally {
      setCargandoInicioContenido(false);
    }
  };

  const guardarContenidoInicio = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error(
          "Debes iniciar sesión para actualizar el contenido de inicio.",
        );
        return;
      }

      setGuardandoInicioContenido(true);
      const response = await fetch(
        `${API_URL}/configuracion/inicio-contenido`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            eslogan: inicioContenido.eslogan || "",
            frase: inicioContenido.frase || "",
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "No se pudo actualizar el contenido de inicio.",
        );
      }

      setInicioContenido({
        eslogan: data?.data?.eslogan || "",
        frase: data?.data?.frase || "",
      });
      toast.success("Contenido de inicio actualizado correctamente.");
    } catch (error) {
      console.error("Error al guardar contenido de inicio:", error);
      toast.error(error.message || "Error al guardar el contenido de inicio.");
    } finally {
      setGuardandoInicioContenido(false);
    }
  };

  // Cargar datos de límite al montar el componente
  useEffect(() => {
    if (user) {
      cargarDatosLimite();
    }
  }, [user]);

  // Función para cargar publicaciones pendientes
  const cargarPublicaciones = async () => {
    try {
      const responseapi = await fetch(
        `${API_URL}/publicaciones/?publicado=false`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (!responseapi.ok) {
        if (responseapi.status === 401 || responseapi.status === 403) {
          logout();
          navigate("/iniciarSesion");
        }
      }
      const data = await responseapi.json();
      setPublicaciones(data.data);
    } catch (error) {
      console.error("Error: ", error);
    }
  };

  // Función para cargar actualizaciones pendientes
  const cargarActualizacionesPendientes = async () => {
    try {
      const response = await fetch(
        `${API_URL}/publicaciones/admin/pending-updates`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 404) {
        setPendingUpdates([]);
        return;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate("/iniciarSesion");
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setPendingUpdates(data.data || []);
    } catch (error) {
      console.error("Error al cargar actualizaciones pendientes:", error);

      if (error.message.includes("404")) {
        setPendingUpdates([]);
      } else {
        toast.error("Error al cargar actualizaciones pendientes");
      }
    }
  };

  // Función para cargar archivos pendientes (RF023)
  const cargarArchivos = () => {
    fetch(`${API_URL}/biblioteca/pending`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setArchivos(data.archivos || []);
      })
      .catch((error) =>
        console.error("Error al obtener los archivos pendientes: ", error),
      );
  };

  // Función para cargar usuarios
  const cargarUsuarios = async () => {
    try {
      const apires = await fetch(`${API_URL}/usuario?tipoUsuario=1,2,3`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!apires.ok) {
        if (apires.status === 401 || apires.status === 403) {
          logout();
          navigate("/iniciarSesion");
          return;
        }
      }

      const data = await apires.json();
      const lista = data?.data ?? data;
      setUsuarios(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error("Error: ", error);
    }
  };

  useEffect(() => {
    const verificarPerfilAdmin = async () => {
      // Se consulta para cualquier usuario: así se muestra su foto de perfil
      if (user) {
        try {
          const response = await fetch(`${API_URL}/perfil/usuario/me`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setPerfilExistente(true);
            setPerfilPublico(data.data.perfilPublico || false);
            setFotoPerfil(data.data.fotoPerfil || null);
          } else if (response.status === 404) {
            setPerfilExistente(false);
            setPerfilPublico(false);
          }
        } catch (error) {
          console.error("Error al verificar perfil admin:", error);
          setPerfilExistente(false);
          setPerfilPublico(false);
        }
      }
    };

    verificarPerfilAdmin();
  }, [user]);

  // useEffect que controla la carga de datos administrativos
  useEffect(() => {
    const loader = async () => {
      if (user && (user.tipoUsuario === 0 || user.tipoUsuario === 1)) {
        await cargarPublicaciones();
        await cargarArchivos();
        await cargarUsuarios();
        await cargarActualizacionesPendientes();
        await cargarContenidoInicio();
      }
    };
    loader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Función para recargar datos cuando se cambia de pestaña
  useEffect(() => {
    if (user && (user.tipoUsuario === 0 || user.tipoUsuario === 1)) {
      if (activeTab === "publicaciones") {
        cargarPublicaciones();
      } else if (activeTab === "actualizaciones") {
        cargarActualizacionesPendientes();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  // fetch no rechaza ante 4xx/5xx: convertirlos en error para que el toast
  // no diga "éxito" cuando el servidor falló.
  const fetchOk = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Error ${response.status}`);
    }
    return response;
  };

  const aceptarPost = async (id) => {
    const promesa = fetchOk(`${API_URL}/publicaciones/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ publicado: true }),
    });

    toast.promise(promesa, {
      loading: "Aceptando publicación...",
      success: "¡Publicación aceptada!",
      error: "Error al aceptar publicación",
    });

    try {
      await promesa;
      // Recargar: al aprobar un evento/emprendimiento el backend también
      // aprueba su publicación automática, que debe salir de la lista.
      await cargarPublicaciones();
    } catch (error) {
      console.error("Error al aceptar publicación:", error);
    }
  };

  const rechazarPost = async (id) => {
    const promesa = fetchOk(`${API_URL}/publicaciones/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.promise(promesa, {
      loading: "Eliminando publicación...",
      success: "¡Publicación eliminada!",
      error: "Error al eliminar publicación",
    });

    try {
      await promesa;
      // Recargar: al rechazar un evento/emprendimiento el backend también
      // borra su publicación automática pendiente.
      await cargarPublicaciones();
    } catch (error) {
      console.error("Error al eliminar publicación:", error);
    }
  };

  //  Funciones para manejar actualizaciones pendientes
  const aprobarActualizacion = async (publicacionId) => {
    try {
      const response = await fetch(
        `${API_URL}/publicaciones/admin/${publicacionId}/approve-update`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Actualización aprobada exitosamente");

        setPendingUpdates((prev) =>
          prev.filter((item) => item._id !== publicacionId),
        );

        setTimeout(() => {
          cargarActualizacionesPendientes();
        }, 500);
      } else {
        console.error("❌ Error del servidor:", data);

        if (response.status === 400) {
          throw new Error(data.message || "Datos inválidos");
        } else if (response.status === 404) {
          throw new Error("Publicación no encontrada");
        } else if (response.status === 500) {
          throw new Error(
            "Error interno del servidor. Contacte al administrador.",
          );
        } else {
          throw new Error(
            data.message || `Error ${response.status} al aprobar actualización`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Error al aprobar actualización:", error);

      if (error.message.includes("Contacte al administrador")) {
        toast.error(
          "Error del servidor. Por favor, contacte al administrador.",
        );
      } else {
        toast.error(error.message);
      }
    }
  };

  const rechazarActualizacion = async (publicacionId, reason = "") => {
    try {
      const response = await fetch(
        `${API_URL}/publicaciones/admin/${publicacionId}/reject-update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ reason }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Actualización rechazada");
        setPendingUpdates((prev) =>
          prev.filter((item) => item._id !== publicacionId),
        );
      } else {
        throw new Error(data.message || "Error al rechazar actualización");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  function formatearTamano(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  const aceptarArchivo = async (id) => {
    const promesa = fetch(`${API_URL}/biblioteca/approve/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.promise(promesa, {
      loading: "Aprobando archivo...",
      success: "¡Archivo aprobado y publicado!",
      error: "Error al aprobar el archivo",
    });

    try {
      await promesa;
      setArchivos((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Error al aprobar el archivo:", error);
    }
  };

  const rechazarArchivo = async (id) => {
    const promesa = fetch(`${API_URL}/biblioteca/reject/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    toast.promise(promesa, {
      loading: "Rechazando archivo...",
      success: "¡Archivo rechazado!",
      error: "Error al rechazar el archivo",
    });

    try {
      await promesa;
      setArchivos((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Error al rechazar archivo:", error);
    }
  };

  // ✅ CAMBIO: ahora soporta Admin (1), Básico (2) y Premium (3)
  const actualizarMembresia = async (id, opcion) => {
    const token = localStorage.getItem("token");

    const promesa = (async () => {
      // ADMIN / BÁSICO / PREMIUM: todo cambio de rol va por /membresia
      // (PUT /usuario/:id ya no acepta tipoUsuario).
      let tipoUsuario = 2;
      let plan;

      if (opcion === "admin") {
        tipoUsuario = 1;
      } else if (opcion === "basico") {
        tipoUsuario = 2;
      } else if (opcion === "premium_mensual") {
        tipoUsuario = 3;
        plan = "mensual";
      } else if (opcion === "premium_anual") {
        tipoUsuario = 3;
        plan = "anual";
      }

      const body = tipoUsuario === 3 ? { tipoUsuario, plan } : { tipoUsuario };

      const res = await fetch(`${API_URL}/usuario/${id}/membresia`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || `Error ${res.status}`);

      const usuarioActualizado = payload?.data ?? payload;

      //  ACTUALIZAR EL CONTEXTO SI ES EL USUARIO ACTUAL
      if (user?._id === id && updateUser) {
        updateUser({
          ...usuarioActualizado,
          plan: usuarioActualizado.plan || null,
        });
      }

      return {
        ...usuarioActualizado,
        plan: usuarioActualizado.plan || null,
      };
    })();

    toast.promise(promesa, {
      loading: "Actualizando tipo de usuario...",
      success: "Tipo de usuario actualizado",
      error: (e) => e.message || "Error al actualizar tipo de usuario",
    });

    try {
      const usuarioActualizado = await promesa;
      setUsuarios((prev) =>
        prev.map((u) => (u._id === id ? usuarioActualizado : u)),
      );

      //  REFRESCAR DATOS DE LÍMITE SI ES EL USUARIO ACTUAL
      if (user?._id === id) {
        await cargarDatosLimite();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // UI65: dar o quitar el permiso de crear cuentas regresivas
  const actualizarPermisoCuentaRegresiva = async (id, valor) => {
    const anterior = usuarios.find((u) => u._id === id)?.puedeCrearCuentaRegresiva === true;
    setUsuarios((prev) =>
      prev.map((u) => (u._id === id ? { ...u, puedeCrearCuentaRegresiva: valor } : u)),
    );
    try {
      const res = await fetch(`${API_URL}/usuario/${id}/cuenta-regresiva`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ puedeCrearCuentaRegresiva: valor }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "No se pudo actualizar el permiso");
      toast.success(valor ? "Permiso de cuenta regresiva activado" : "Permiso de cuenta regresiva quitado");
    } catch (error) {
      setUsuarios((prev) =>
        prev.map((u) => (u._id === id ? { ...u, puedeCrearCuentaRegresiva: anterior } : u)),
      );
      toast.error(error.message);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");

  const usuariosFiltrados = usuarios.filter((item) => {
    const texto = searchTerm.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(texto) ||
      item.apellido?.toLowerCase().includes(texto) ||
      item.email?.toLowerCase().includes(texto)
    );
  });

  // ✅ Helper para que el select muestre el valor correcto
  const getTipoUsuarioSelectValue = (u) => {
    if (u?.tipoUsuario === 1) return "admin";
    if (u?.tipoUsuario === 2) return "basico";
    if (u?.tipoUsuario === 3)
      return u?.plan === "anual" ? "premium_anual" : "premium_mensual";
    return "basico";
  };

  // Fila de cambio "antes → después" en una sola línea
  const renderCambioSimple = (key, etiqueta, antes, despues) => (
    <div key={key} className="pu-cambio">
      <strong className="pu-cambio-label">{etiqueta}:</strong>
      <div className="pu-cambio-inline">
        <span className="pu-old">{antes}</span>
        <span className="pu-arrow">→</span>
        <span className="pu-new">{despues}</span>
      </div>
    </div>
  );

  // Fila de cambio con textos largos (uno debajo del otro)
  const renderCambioBloque = (key, etiqueta, antes, despues) => (
    <div key={key} className="pu-cambio">
      <strong className="pu-cambio-label">{etiqueta}:</strong>
      <div className="pu-cambio-stack">
        <div className="pu-old pu-bloque">{antes}</div>
        <div className="pu-new pu-bloque">{despues}</div>
      </div>
    </div>
  );

  // Función para mostrar cambios propuestos
  const renderCambiosPropuestos = (publicacion) => {
    if (!publicacion.pendingUpdate) return null;

    const cambios = [];
    const update = publicacion.pendingUpdate;

    // Título
    if (update.titulo && update.titulo !== publicacion.titulo) {
      cambios.push(
        renderCambioBloque(
          "titulo",
          "Título",
          publicacion.titulo || "Sin título",
          update.titulo,
        ),
      );
    }

    // Contenido/Descripción
    if (update.contenido && update.contenido !== publicacion.contenido) {
      cambios.push(
        renderCambioBloque(
          "contenido",
          "Descripción",
          publicacion.contenido || "Sin descripción",
          update.contenido,
        ),
      );
    }

    // Precio
    if (update.precio !== undefined && update.precio !== publicacion.precio) {
      cambios.push(
        renderCambioSimple(
          "precio",
          "Precio Regular",
          publicacion.precio !== undefined && publicacion.precio !== null
            ? `₡${publicacion.precio}`
            : "No especificado",
          `₡${update.precio}`,
        ),
      );
    }

    // Precio Estudiante
    if (
      update.precioEstudiante !== undefined &&
      update.precioEstudiante !== publicacion.precioEstudiante
    ) {
      cambios.push(
        renderCambioSimple(
          "precioEstudiante",
          "Precio Estudiante",
          publicacion.precioEstudiante !== undefined &&
            publicacion.precioEstudiante !== null
            ? `₡${publicacion.precioEstudiante}`
            : "No especificado",
          update.precioEstudiante !== null
            ? `₡${update.precioEstudiante}`
            : "Eliminado",
        ),
      );
    }

    // Precio Ciudadano de Oro
    if (
      update.precioCiudadanoOro !== undefined &&
      update.precioCiudadanoOro !== publicacion.precioCiudadanoOro
    ) {
      cambios.push(
        renderCambioSimple(
          "precioCiudadanoOro",
          "Precio Ciudadano de Oro",
          publicacion.precioCiudadanoOro !== undefined &&
            publicacion.precioCiudadanoOro !== null
            ? `₡${publicacion.precioCiudadanoOro}`
            : "No especificado",
          update.precioCiudadanoOro !== null
            ? `₡${update.precioCiudadanoOro}`
            : "Eliminado",
        ),
      );
    }

    // Fecha Evento
    if (update.fechaEvento && update.fechaEvento !== publicacion.fechaEvento) {
      cambios.push(
        renderCambioSimple(
          "fechaEvento",
          "Fecha del Evento",
          publicacion.fechaEvento || "No especificado",
          update.fechaEvento,
        ),
      );
    }

    // Hora Evento
    if (update.horaEvento && update.horaEvento !== publicacion.horaEvento) {
      cambios.push(
        renderCambioSimple(
          "horaEvento",
          "Hora del Evento",
          publicacion.horaEvento || "No especificado",
          update.horaEvento,
        ),
      );
    }

    // Teléfono
    if (update.telefono && update.telefono !== publicacion.telefono) {
      cambios.push(
        renderCambioSimple(
          "telefono",
          "Teléfono",
          publicacion.telefono || "No especificado",
          update.telefono,
        ),
      );
    }

    // Categoría
    if (
      update.categoria &&
      update.categoria !== publicacion.categoria?._id &&
      update.categoria !== publicacion.categoria
    ) {
      cambios.push(
        renderCambioSimple(
          "categoria",
          "Categoría",
          publicacion.categoria?.nombre || "Sin categoría",
          update.categoria?.nombre || "Categoría actualizada",
        ),
      );
    }

    // Enlaces Externos
    if (
      update.enlacesExternos &&
      JSON.stringify(update.enlacesExternos) !==
        JSON.stringify(publicacion.enlacesExternos)
    ) {
      cambios.push(
        <div key="enlacesExternos" className="pu-cambio">
          <strong className="pu-cambio-label">Enlaces Externos:</strong>

          {/* Enlaces actuales (eliminados/modificados) */}
          {publicacion.enlacesExternos &&
            publicacion.enlacesExternos.length > 0 && (
              <div className="pu-cambio-stack">
                <span className="pu-cambio-sub">Enlaces actuales:</span>
                {publicacion.enlacesExternos.map((enlace, index) => (
                  <div key={`old-${index}`} className="pu-old pu-bloque">
                    <strong>{enlace.nombre}:</strong> {enlace.url}
                  </div>
                ))}
              </div>
            )}

          {/* Enlaces nuevos */}
          {update.enlacesExternos && update.enlacesExternos.length > 0 && (
            <div className="pu-cambio-stack">
              <span className="pu-cambio-sub">Enlaces propuestos:</span>
              {update.enlacesExternos.map((enlace, index) => (
                <div key={`new-${index}`} className="pu-new pu-bloque">
                  <strong>{enlace.nombre}:</strong> {enlace.url}
                </div>
              ))}
            </div>
          )}

          {/* Caso especial: eliminación de todos los enlaces */}
          {(!update.enlacesExternos || update.enlacesExternos.length === 0) &&
            publicacion.enlacesExternos &&
            publicacion.enlacesExternos.length > 0 && (
              <div className="pu-new pu-bloque">
                Todos los enlaces serán eliminados
              </div>
            )}
        </div>,
      );
    }

    // Adjuntos/Imágenes
    if (
      update.adjunto &&
      JSON.stringify(update.adjunto) !== JSON.stringify(publicacion.adjunto)
    ) {
      cambios.push(
        <div key="adjunto" className="pu-cambio">
          <strong className="pu-cambio-label">Imágenes:</strong>

          <div className="pu-imagenes-grid">
            {/* Imágenes eliminadas */}
            {publicacion.adjunto &&
              publicacion.adjunto.map((img, index) => {
                const stillExists = update.adjunto.some(
                  (newImg) => newImg.url === img.url || newImg.key === img.key,
                );
                if (!stillExists) {
                  return (
                    <div
                      key={`removed-${index}`}
                      className="pu-imagen eliminada"
                    >
                      <span className="pu-imagen-badge">✕</span>
                      <img
                        src={img.url}
                        alt={`Imagen eliminada ${index + 1}`}
                      />
                      <p>Eliminada</p>
                    </div>
                  );
                }
                return null;
              })}

            {/* Imágenes nuevas */}
            {update.adjunto.map((img, index) => {
              const isNew =
                !publicacion.adjunto ||
                !publicacion.adjunto.some(
                  (oldImg) => oldImg.url === img.url || oldImg.key === img.key,
                );
              if (isNew) {
                return (
                  <div key={`new-${index}`} className="pu-imagen nueva">
                    <span className="pu-imagen-badge">+</span>
                    <img src={img.url} alt={`Nueva imagen ${index + 1}`} />
                    <p>Nueva</p>
                  </div>
                );
              }
              return null;
            })}

            {/* Imágenes mantenidas */}
            {update.adjunto.map((img, index) => {
              const wasInOriginal =
                publicacion.adjunto &&
                publicacion.adjunto.some(
                  (oldImg) => oldImg.url === img.url || oldImg.key === img.key,
                );
              if (wasInOriginal) {
                return (
                  <div key={`kept-${index}`} className="pu-imagen">
                    <img
                      src={img.url}
                      alt={`Imagen mantenida ${index + 1}`}
                    />
                    <p>Mantenida</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>,
      );
    }

    return cambios.length > 0 ? (
      cambios
    ) : (
      <p className="pu-muted">
        No se detectaron cambios visibles en los campos principales.
      </p>
    );
  };

  const esAdmin = user && (user.tipoUsuario === 0 || user.tipoUsuario === 1);

  const etiquetaRol =
    user?.tipoUsuario === 0 || user?.tipoUsuario === 1
      ? "Administrador"
      : user?.tipoUsuario === 3
        ? "Premium"
        : "Básico";

  const claseTag = (tag) =>
    tag === "evento"
      ? "pu-tag evento"
      : tag === "emprendimiento"
        ? "pu-tag emprendimiento"
        : "pu-tag";

  const pestanas = [
    {
      id: "publicaciones",
      label: "Publicaciones Nuevas",
      icon: <FaListAlt />,
      count: publicaciones.length,
    },
    {
      id: "actualizaciones",
      label: "Actualizaciones Pendientes",
      icon: <FaEdit />,
      count: pendingUpdates.length,
    },
    {
      id: "archivos",
      label: "Archivos Nuevos",
      icon: <FaHistory />,
      count: archivos.length,
    },
    {
      id: "usuarios",
      label: "Gestión de Usuarios",
      icon: <AiOutlineUser />,
    },
  ];

  return (
    <div className="perfil-usuario-container">
      <div className={`pu-layout ${esAdmin ? "admin" : "solo"}`}>
        {/* Sección de perfil del usuario */}
        <aside className="pu-sidebar">
          <div className="pu-panel pu-perfil-card">
            <div className="pu-avatar">
              {fotoPerfil ? (
                <img
                  src={`${BASE_URL}${fotoPerfil}`}
                  alt={`${user?.nombre || ""} ${user?.apellido || ""}`}
                />
              ) : (
                <AiOutlineUser className="pu-avatar-icon" />
              )}
            </div>

            <h1 className="pu-nombre">
              {user?.nombre} {user?.apellido}
            </h1>
            <a href={`mailto:${user?.email}`} className="pu-email">
              {user?.email}
            </a>
            <span className="pu-rol">{etiquetaRol}</span>

            <div className="pu-acciones">
              <button
                onClick={() => navigate("/mi-perfil/editar")}
                className="pu-btn primario"
              >
                <FaEdit />
                Modificar Perfil
              </button>
              <button
                onClick={() => navigate(`/perfil/${user?._id}`)}
                className="pu-btn secundario"
              >
                <AiOutlineUser />
                Ver Perfil Público
              </button>
              {puedeGestionarCuentasRegresivas(user) && (
                <button
                  onClick={() => navigate("/cuentas-regresivas")}
                  className="pu-btn secundario"
                >
                  <FiClock />
                  Cuentas regresivas
                </button>
              )}
              <button
                onClick={() => setModalAbierto(true)}
                className="pu-btn secundario"
              >
                <FiLock />
                Cambiar contraseña
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="pu-btn peligro"
              >
                <FiLogOut />
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Sección de membresía para usuario básico */}
          {user?.tipoUsuario === 2 && limiteData && (
            <div className="pu-panel pu-membresia">
              <div className="pu-membresia-header">
                <h3>Tu Membresía</h3>
                <span className="pu-chip">
                  {limiteData.tipoUsuario || "Básico"}
                </span>
              </div>

              {/* Barra de progreso de publicaciones */}
              <div className="pu-membresia-limite">
                <LimitePublicaciones limiteData={limiteData} navBar={false} />
              </div>

              {/* Botón para actualizar a Premium */}
              <button
                onClick={() => setModalPremiumAbierto(true)}
                className="pu-btn primario ancho"
              >
                <FiStar />
                Actualizar a Premium
              </button>

              <p className="pu-muted pu-centro">
                Obtén publicaciones adicionales y más beneficios
              </p>
            </div>
          )}

          {/* SECCIÓN PARA USUARIOS PREMIUM */}
          {user?.tipoUsuario === 3 && limiteData && (
            <div className="pu-panel pu-membresia premium">
              <div className="pu-membresia-header">
                <h3>Tu Membresía Premium</h3>
                <span className="pu-chip acento">
                  Premium {user?.plan === "anual" ? "Anual" : "Mensual"}
                </span>
              </div>

              {/* Información de vencimiento */}
              {limiteData.fechaVencimientoPremium && (
                <div className="pu-vencimiento">
                  <div className="pu-vencimiento-titulo">
                    <FiClock />
                    <span>Vencimiento del Plan</span>
                  </div>
                  <p>
                    Tu plan {limiteData.plan === "anual" ? "anual" : "mensual"}{" "}
                    se vence el{" "}
                    <strong>
                      {new Date(
                        limiteData.fechaVencimientoPremium,
                      ).toLocaleDateString("es-ES", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </strong>
                  </p>
                  {limiteData.premiumVencido && (
                    <p className="pu-alerta">
                      ⚠️ Tu plan premium ha vencido. Por favor, renueva tu
                      suscripción.
                    </p>
                  )}
                </div>
              )}

              {/* Botón para renovar */}
              <button
                onClick={() => setModalPremiumAbierto(true)}
                className="pu-btn primario ancho"
              >
                <FiRefreshCw />
                Renovar Plan Premium
              </button>
            </div>
          )}
        </aside>

        {/* Modal de cambio de contraseña */}
        {modalAbierto && (
          <ModalCambioContrasena
            userId={user?._id}
            onClose={() => setModalAbierto(false)}
            API_URL={API_URL}
          />
        )}

        {/* Modal de alerta Premium */}
        <AlertaLimitePublicaciones
          show={modalPremiumAbierto}
          onClose={() => setModalPremiumAbierto(false)}
        />

        {/* Modal de configuración de pagos */}
        <ModalConfiguracionPagos
          isOpen={modalPagosAbierto}
          onClose={() => setModalPagosAbierto(false)}
        />
        <ModalConfiguracionTematica
          isOpen={modalTematicaAbierto}
          onClose={() => setModalTematicaAbierto(false)}
        />

        {esAdmin && (
          <section className="pu-dashboard">
            {/* Encabezado */}
            <div className="pu-panel pu-header">
              <div>
                <h1>Dashboard Administrativo</h1>
                <p>
                  Revisa contenido pendiente, gestiona usuarios y configura el
                  sitio.
                </p>
              </div>
            </div>

            {/* Botones de configuración */}
            <div className="pu-panel pu-config">
              <h2 className="pu-seccion-titulo">
                <FiSettings />
                Configuración del sitio
              </h2>
              <div className="pu-config-grid">
                <Link to="/admin/categorias" className="pu-config-btn">
                  <FaListAlt />
                  Gestionar Clasificaciones
                </Link>
                <Link to="/admin/boletines" className="pu-config-btn">
                  <FiMail />
                  Gestionar Boletines
                </Link>
                <button
                  onClick={() => setModalLimitesAbierto(true)}
                  className="pu-config-btn"
                >
                  <FiSettings />
                  Configurar Límites
                </button>
                <button
                  onClick={() => setModalPagosAbierto(true)}
                  className="pu-config-btn"
                >
                  <FiCreditCard />
                  Configurar Pagos
                </button>
                <button
                  onClick={() => setModalTematicaAbierto(true)}
                  className="pu-config-btn"
                >
                  <FiDroplet />
                  Configurar Temática
                </button>
              </div>
            </div>

            {/* Contenido de la página de inicio */}
            <div className="pu-panel pu-inicio">
              <h2 className="pu-seccion-titulo">
                <FiHome />
                Contenido de la Página de Inicio
              </h2>
              <p className="pu-muted">
                Configura aquí el eslogan y la frase motivacional que se
                muestran en la portada.
              </p>

              {cargandoInicioContenido ? (
                <p className="pu-muted">Cargando contenido actual...</p>
              ) : (
                <div className="pu-form">
                  <label className="pu-label">
                    Eslogan
                    <input
                      type="text"
                      maxLength={180}
                      value={inicioContenido.eslogan}
                      onChange={(e) =>
                        setInicioContenido((prev) => ({
                          ...prev,
                          eslogan: e.target.value,
                        }))
                      }
                      placeholder="Ej: Conectamos ideas, creamos comunidad."
                      className="pu-input"
                    />
                  </label>

                  <label className="pu-label">
                    Frase motivacional
                    <textarea
                      rows={3}
                      maxLength={280}
                      value={inicioContenido.frase}
                      onChange={(e) =>
                        setInicioContenido((prev) => ({
                          ...prev,
                          frase: e.target.value,
                        }))
                      }
                      placeholder="Ej: Cada publicación es una oportunidad de aprender y crecer juntos."
                      className="pu-input"
                    />
                  </label>

                  <div>
                    <button
                      type="button"
                      onClick={guardarContenidoInicio}
                      disabled={guardandoInicioContenido}
                      className="pu-btn primario"
                    >
                      {guardandoInicioContenido
                        ? "Guardando..."
                        : "Guardar contenido de inicio"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ModalLimitesPublicaciones
              isOpen={modalLimitesAbierto}
              onClose={() => setModalLimitesAbierto(false)}
            />

            {/* Pestañas para navegación */}
            <div className="pu-tabs-wrap">
              <div className="pu-tabs" role="tablist">
                {pestanas.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pu-tab ${activeTab === tab.id ? "activo" : ""}`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="pu-tab-count">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido de las pestañas */}
            <div className="pu-panel pu-tab-panel">
              {/* Pestaña: Publicaciones Nuevas */}
              {activeTab === "publicaciones" && (
                <>
                  <h2 className="pu-seccion-titulo">
                    Publicaciones nuevas por aprobar
                  </h2>
                  {publicaciones && publicaciones.length > 0 ? (
                    <div className="pu-tabla-wrapper">
                      <table className="pu-tabla">
                        <thead>
                          <tr>
                            <th>Autor</th>
                            <th>Título</th>
                            <th>Tipo</th>
                            <th>Fecha</th>
                            <th>Vista Previa</th>
                            <th>Decisión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {publicaciones.map((item) => (
                            <tr key={item._id}>
                              <td>
                                {item.autor ? item.autor.nombre : "Sin autor"}
                              </td>
                              <td className="pu-celda-titulo" title={item.titulo}>
                                {item.titulo}
                              </td>
                              <td>
                                <span className={claseTag(item.tag)}>
                                  {item.tag}
                                </span>
                              </td>
                              <td>{item.fecha}</td>
                              <td>
                                <a
                                  href={`/publicaciones/${item._id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pu-link"
                                >
                                  Ver publicación
                                </a>
                              </td>
                              <td>
                                <div className="pu-decision">
                                  <button
                                    onClick={() => aceptarPost(item._id)}
                                    className="pu-btn-mini aprobar"
                                  >
                                    Aceptar
                                  </button>
                                  <button
                                    onClick={() => rechazarPost(item._id)}
                                    className="pu-btn-mini rechazar"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="pu-vacio">
                      No hay publicaciones pendientes de aprobación.
                    </div>
                  )}
                </>
              )}

              {/* Actualizaciones Pendientes */}
              {activeTab === "actualizaciones" && (
                <>
                  <h2 className="pu-seccion-titulo">
                    Actualizaciones pendientes de revisión
                  </h2>
                  {pendingUpdates && pendingUpdates.length > 0 ? (
                    <div className="pu-lista-scroll">
                      {pendingUpdates.map((publicacion) => (
                        <div key={publicacion._id} className="pu-update-card">
                          <div className="pu-update-top">
                            <div className="pu-update-info">
                              <div className="pu-update-titulo">
                                <h3>{publicacion.titulo}</h3>
                                <span className={claseTag(publicacion.tag)}>
                                  {publicacion.tag}
                                </span>
                              </div>
                              <p className="pu-muted">
                                <strong>Autor:</strong>{" "}
                                {publicacion.autor?.nombre} •{" "}
                                <strong> Solicitado:</strong>{" "}
                                {new Date(
                                  publicacion.lastEditRequest,
                                ).toLocaleDateString()}{" "}
                                • <strong> Ediciones:</strong>{" "}
                                {publicacion.editCount || 0}/3
                              </p>
                            </div>
                            <div className="pu-decision fila">
                              <button
                                onClick={() =>
                                  aprobarActualizacion(publicacion._id)
                                }
                                className="pu-btn-mini aprobar"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt(
                                    "Razón del rechazo (opcional):",
                                  );
                                  rechazarActualizacion(
                                    publicacion._id,
                                    reason,
                                  );
                                }}
                                className="pu-btn-mini rechazar"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>

                          <div className="pu-cambios">
                            <h4>Cambios propuestos:</h4>
                            {renderCambiosPropuestos(publicacion)}
                          </div>

                          <div className="pu-update-footer">
                            <a
                              href={`/publicaciones/${publicacion._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pu-link"
                            >
                              Ver publicación actual
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pu-vacio">
                      No hay actualizaciones pendientes de revisión.
                    </div>
                  )}
                </>
              )}

              {/* Pestaña: Archivos Nuevos (RF023) */}
              {activeTab === "archivos" && (
                <>
                  <h2 className="pu-seccion-titulo">
                    Archivos pendientes de aprobación
                  </h2>
                  {archivos && archivos.length > 0 ? (
                    <div className="pu-tabla-wrapper">
                      <table className="pu-tabla">
                        <thead>
                          <tr>
                            <th>Subido por</th>
                            <th>Nombre del archivo</th>
                            <th>Tipo</th>
                            <th>Tamaño</th>
                            <th>Fecha</th>
                            <th>Vista previa</th>
                            <th>Decisión</th>
                          </tr>
                        </thead>
                        <tbody>
                          {archivos.map((item) => (
                            <tr key={item._id}>
                              <td className="pu-celda-autor">
                                <div className="pu-autor-nombre">
                                  {(item.subidoPor?.nombre
                                    ? `${item.subidoPor.nombre} ${item.subidoPor.apellido || ""}`
                                    : item.usuario?.nombre
                                      ? `${item.usuario.nombre} ${item.usuario.apellido || ""}`
                                      : item.autor?.nombre
                                        ? `${item.autor.nombre} ${item.autor.apellido || ""}`
                                        : "Desconocido"
                                  ).trim()}
                                </div>
                                <div className="pu-autor-email">
                                  {item.subidoPor?.email ||
                                    item.usuario?.email ||
                                    item.autor?.email ||
                                    ""}
                                </div>
                              </td>
                              <td className="pu-celda-titulo" title={item.nombre}>
                                {item.nombre}
                              </td>
                              <td>
                                <span className="pu-tag">
                                  {item.tipoArchivo?.split("/").pop() ||
                                    "Archivo"}
                                </span>
                              </td>
                              <td>{formatearTamano(item.tamano)}</td>
                              <td>
                                {item.fechaSubida
                                  ? new Date(
                                      item.fechaSubida,
                                    ).toLocaleDateString("es-ES")
                                  : "Fecha no disponible"}
                              </td>
                              <td>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pu-link"
                                >
                                  Ver archivo
                                </a>
                              </td>
                              <td>
                                <div className="pu-decision">
                                  <button
                                    onClick={() => aceptarArchivo(item._id)}
                                    className="pu-btn-mini aprobar"
                                  >
                                    ✓ Aprobar
                                  </button>
                                  <button
                                    onClick={() => rechazarArchivo(item._id)}
                                    className="pu-btn-mini rechazar"
                                  >
                                    ✗ Rechazar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="pu-vacio">
                      No hay archivos pendientes de aprobación.
                    </div>
                  )}
                </>
              )}

              {/* Pestaña: Gestión de Usuarios */}
              {activeTab === "usuarios" && (
                <>
                  <h2 className="pu-seccion-titulo">
                    Gestión de permisos de usuarios
                  </h2>

                  <div className="pu-buscador">
                    <FiSearch />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, apellido o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="pu-limpiar"
                        title="Limpiar"
                      >
                        <FiX />
                      </button>
                    )}
                  </div>

                  {usuariosFiltrados && usuariosFiltrados.length > 0 ? (
                    <div className="pu-tabla-wrapper">
                      <table className="pu-tabla">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Apellidos</th>
                            <th>Email</th>
                            <th>Tipo de Usuario</th>
                            <th>Cuenta regresiva</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuariosFiltrados.map((item) => (
                            <tr key={item._id}>
                              <td>{item.nombre || "Sin nombre"}</td>
                              <td>{item.apellido || "Sin apellido"}</td>
                              <td className="pu-celda-email">{item.email}</td>
                              <td className="pu-celda-select">
                                <select
                                  className="pu-select"
                                  value={getTipoUsuarioSelectValue(item)}
                                  onChange={(e) =>
                                    actualizarMembresia(
                                      item._id,
                                      e.target.value,
                                    )
                                  }
                                >
                                  <option value="admin">Administrador</option>
                                  <option value="basico">Básico</option>
                                  <option value="premium_mensual">
                                    Premium Mensual
                                  </option>
                                  <option value="premium_anual">
                                    Premium Anual
                                  </option>
                                </select>

                                <div className="pu-select-nota">
                                  {item.tipoUsuario === 3 &&
                                  item.fechaVencimientoPremium ? (
                                    <>
                                      Vence:{" "}
                                      {new Date(
                                        item.fechaVencimientoPremium,
                                      ).toLocaleDateString("es-CR")}
                                    </>
                                  ) : item.tipoUsuario === 1 ? (
                                    "Acceso administrativo"
                                  ) : (
                                    "Sin vencimiento premium"
                                  )}
                                </div>
                              </td>
                              <td className="pu-celda-switch">
                                {(() => {
                                  const esAdminFila = item.tipoUsuario === 0 || item.tipoUsuario === 1;
                                  const activo = esAdminFila || item.puedeCrearCuentaRegresiva === true;
                                  return (
                                    <label
                                      className="pu-switch"
                                      title={
                                        esAdminFila
                                          ? "Los administradores siempre tienen este permiso"
                                          : undefined
                                      }
                                    >
                                      <input
                                        type="checkbox"
                                        role="switch"
                                        aria-label={`Cuenta regresiva para ${item.nombre || item.email}`}
                                        checked={activo}
                                        disabled={esAdminFila}
                                        onChange={(e) =>
                                          actualizarPermisoCuentaRegresiva(item._id, e.target.checked)
                                        }
                                      />
                                      <span className="pu-switch-pista" aria-hidden="true" />
                                    </label>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="pu-vacio">No se encontraron usuarios.</div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PerfilUsuario;
