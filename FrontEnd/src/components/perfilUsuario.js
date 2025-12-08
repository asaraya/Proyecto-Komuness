import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineUser } from "react-icons/ai";
import { toast } from "react-hot-toast";
import { API_URL } from "../utils/api";
import "../CSS/perfilUsuario.css";
import { useAuth } from "./context/AuthContext";
import ModalCambioContrasena from "./modalCambioContra";
import { Link } from "react-router-dom";
import { FaListAlt, FaEdit, FaHistory } from "react-icons/fa";
import { FiSettings, FiCreditCard, FiDollarSign } from "react-icons/fi";
import ModalLimitesPublicaciones from "./modalLimitesPublicaciones";
import ModalConfiguracionPagos from "./ModalConfiguracionPagos";
import AlertaLimitePublicaciones from "./AlertaLimitePublicaciones";

export const PerfilUsuario = () => {
  const navigate = useNavigate();
  const [publicaciones, setPublicaciones] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const { user, logout, updateUser } = useAuth(); 
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalLimitesAbierto, setModalLimitesAbierto] = useState(false);
  const [modalPagosAbierto, setModalPagosAbierto] = useState(false);
  const [modalPremiumAbierto, setModalPremiumAbierto] = useState(false);
  const [activeTab, setActiveTab] = useState("publicaciones");
  const [limiteData, setLimiteData] = useState(null);
  const [perfilExistente, setPerfilExistente] = useState(false); 
  const [perfilPublico, setPerfilPublico] = useState(false);

  
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

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
        }
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
        }
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
        console.error("Error al obtener los archivos pendientes: ", error)
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
      if (user && (user.tipoUsuario === 0 || user.tipoUsuario === 1)) {
        try {
          const response = await fetch(`${API_URL}/perfil/usuario/me`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setPerfilExistente(true);
            setPerfilPublico(data.data.perfilPublico || false);
          } else if (response.status === 404) {
            setPerfilExistente(false);
            setPerfilPublico(false);
          }
        } catch (error) {
          console.error('Error al verificar perfil admin:', error);
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
      }
    };
    loader();
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
  }, [activeTab, user]);

  const aceptarPost = async (id) => {
    const promesa = fetch(`${API_URL}/publicaciones/${id}`, {
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
      setPublicaciones((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Error al aceptar publicación:", error);
    }
  };

  const rechazarPost = async (id) => {
    const promesa = fetch(`${API_URL}/publicaciones/${id}`, {
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
      setPublicaciones((prev) => prev.filter((item) => item._id !== id));
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
        }
      );

      

      const data = await response.json();
     

      if (response.ok) {
        toast.success("Actualización aprobada exitosamente");
       
        setPendingUpdates((prev) =>
          prev.filter((item) => item._id !== publicacionId)
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
            "Error interno del servidor. Contacte al administrador."
          );
        } else {
          throw new Error(
            data.message || `Error ${response.status} al aprobar actualización`
          );
        }
      }
    } catch (error) {
      console.error("❌ Error al aprobar actualización:", error);

      if (error.message.includes("Contacte al administrador")) {
        toast.error("Error del servidor. Por favor, contacte al administrador.");
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
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Actualización rechazada");
        setPendingUpdates((prev) =>
          prev.filter((item) => item._id !== publicacionId)
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
    // ✅ ADMIN: usar el endpoint que ya sabes que funciona (versión vieja)
    if (opcion === "admin") {
      const res = await fetch(`${API_URL}/usuario/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipoUsuario: 1 }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.message || `Error ${res.status}`);
      
      const usuarioActualizado = payload?.data ?? payload;
      
      //  ACTUALIZAR EL CONTEXTO SI ES EL USUARIO ACTUAL
      if (user?._id === id && updateUser) {
        updateUser({
          ...usuarioActualizado,
          plan: usuarioActualizado.plan || null
        });
      }
      
      return {
        ...usuarioActualizado,
        plan: usuarioActualizado.plan || null
      };
    }

    // ✅ BÁSICO / PREMIUM: usar /membresia
    let tipoUsuario = 2;
    let plan;

    if (opcion === "basico") {
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
        plan: usuarioActualizado.plan || null
      });
    }
    
    return {
      ...usuarioActualizado,
      plan: usuarioActualizado.plan || null
    };
  })();

  toast.promise(promesa, {
    loading: "Actualizando tipo de usuario...",
    success: "Tipo de usuario actualizado",
    error: (e) => e.message || "Error al actualizar tipo de usuario",
  });

  try {
    const usuarioActualizado = await promesa;
    setUsuarios((prev) => prev.map((u) => (u._id === id ? usuarioActualizado : u)));
    
    //  REFRESCAR DATOS DE LÍMITE SI ES EL USUARIO ACTUAL
    if (user?._id === id) {
      await cargarDatosLimite();
    }
  } catch (e) {
    console.error(e);
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
    if (u?.tipoUsuario === 3) return u?.plan === "anual" ? "premium_anual" : "premium_mensual";
    return "basico";
  };

  // Función para mostrar cambios propuestos
  const renderCambiosPropuestos = (publicacion) => {
    if (!publicacion.pendingUpdate) return null;

    const cambios = [];
    const update = publicacion.pendingUpdate;

    // Título
    if (update.titulo && update.titulo !== publicacion.titulo) {
      cambios.push(
        <div key="titulo" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Título:
          </strong>
          <div className="space-y-2">
            <div className="line-through text-red-600 text-sm break-words bg-red-50 p-2 rounded">
              {publicacion.titulo || "Sin título"}
            </div>
            <div className="text-green-600 text-sm break-words bg-green-50 p-2 rounded">
              {update.titulo}
            </div>
          </div>
        </div>
      );
    }

    // Contenido/Descripción
    if (update.contenido && update.contenido !== publicacion.contenido) {
      cambios.push(
        <div key="contenido" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Descripción:
          </strong>
          <div className="space-y-2">
            <div className="text-red-600 line-through text-sm break-words bg-red-50 p-2 rounded whitespace-pre-wrap">
              {publicacion.contenido || "Sin descripción"}
            </div>
            <div className="text-green-600 text-sm break-words bg-green-50 p-2 rounded whitespace-pre-wrap">
              {update.contenido}
            </div>
          </div>
        </div>
      );
    }

    // Precio
    if (update.precio !== undefined && update.precio !== publicacion.precio) {
      cambios.push(
        <div key="precio" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Precio Regular:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.precio !== undefined && publicacion.precio !== null
                ? `₡${publicacion.precio}`
                : "No especificado"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              ₡{update.precio}
            </span>
          </div>
        </div>
      );
    }

    // Precio Estudiante
    if (
      update.precioEstudiante !== undefined &&
      update.precioEstudiante !== publicacion.precioEstudiante
    ) {
      cambios.push(
        <div key="precioEstudiante" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Precio Estudiante:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.precioEstudiante !== undefined &&
              publicacion.precioEstudiante !== null
                ? `₡${publicacion.precioEstudiante}`
                : "No especificado"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {update.precioEstudiante !== null
                ? `₡${update.precioEstudiante}`
                : "Eliminado"}
            </span>
          </div>
        </div>
      );
    }

    // Precio Ciudadano de Oro
    if (
      update.precioCiudadanoOro !== undefined &&
      update.precioCiudadanoOro !== publicacion.precioCiudadanoOro
    ) {
      cambios.push(
        <div
          key="precioCiudadanoOro"
          className="mb-3 p-3 bg-white rounded border"
        >
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Precio Ciudadano de Oro:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.precioCiudadanoOro !== undefined &&
              publicacion.precioCiudadanoOro !== null
                ? `₡${publicacion.precioCiudadanoOro}`
                : "No especificado"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {update.precioCiudadanoOro !== null
                ? `₡${update.precioCiudadanoOro}`
                : "Eliminado"}
            </span>
          </div>
        </div>
      );
    }

    // Fecha Evento
    if (update.fechaEvento && update.fechaEvento !== publicacion.fechaEvento) {
      cambios.push(
        <div key="fechaEvento" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Fecha del Evento:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.fechaEvento || "No especificado"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {update.fechaEvento}
            </span>
          </div>
        </div>
      );
    }

    // Hora Evento
    if (update.horaEvento && update.horaEvento !== publicacion.horaEvento) {
      cambios.push(
        <div key="horaEvento" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Hora del Evento:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.horaEvento || "No especificado"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {update.horaEvento}
            </span>
          </div>
        </div>
      );
    }

    // Teléfono
    if (update.telefono && update.telefono !== publicacion.telefono) {
      cambios.push(
        <div key="telefono" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Teléfono:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.telefono || "No especificado"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {update.telefono}
            </span>
          </div>
        </div>
      );
    }

    // Categoría
    if (
      update.categoria &&
      update.categoria !== publicacion.categoria?._id &&
      update.categoria !== publicacion.categoria
    ) {
      cambios.push(
        <div key="categoria" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Categoría:
          </strong>
          <div className="flex items-center gap-2 text-sm">
            <span className="line-through text-red-600 bg-red-50 px-2 py-1 rounded">
              {publicacion.categoria?.nombre || "Sin categoría"}
            </span>
            <span className="text-gray-500">→</span>
            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
              {update.categoria?.nombre || "Categoría actualizada"}
            </span>
          </div>
        </div>
      );
    }

    // Enlaces Externos
    if (
      update.enlacesExternos &&
      JSON.stringify(update.enlacesExternos) !==
        JSON.stringify(publicacion.enlacesExternos)
    ) {
      cambios.push(
        <div
          key="enlacesExternos"
          className="mb-3 p-3 bg-white rounded border"
        >
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Enlaces Externos:
          </strong>

          {/* Enlaces actuales (eliminados/modificados) */}
          {publicacion.enlacesExternos &&
            publicacion.enlacesExternos.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-gray-600 font-medium">
                  Enlaces actuales:
                </span>
                {publicacion.enlacesExternos.map((enlace, index) => (
                  <div
                    key={`old-${index}`}
                    className="line-through text-red-600 text-sm break-words bg-red-50 p-2 rounded mt-1"
                  >
                    <strong>{enlace.nombre}:</strong> {enlace.url}
                  </div>
                ))}
              </div>
            )}

          {/* Enlaces nuevos */}
          {update.enlacesExternos && update.enlacesExternos.length > 0 && (
            <div>
              <span className="text-xs text-gray-600 font-medium">
                Enlaces propuestos:
              </span>
              {update.enlacesExternos.map((enlace, index) => (
                <div
                  key={`new-${index}`}
                  className="text-green-600 text-sm break-words bg-green-50 p-2 rounded mt-1"
                >
                  <strong>{enlace.nombre}:</strong> {enlace.url}
                </div>
              ))}
            </div>
          )}

          {/* Caso especial: eliminación de todos los enlaces */}
          {(!update.enlacesExternos || update.enlacesExternos.length === 0) &&
            publicacion.enlacesExternos &&
            publicacion.enlacesExternos.length > 0 && (
              <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                Todos los enlaces serán eliminados
              </div>
            )}
        </div>
      );
    }

    // Adjuntos/Imágenes
    if (
      update.adjunto &&
      JSON.stringify(update.adjunto) !== JSON.stringify(publicacion.adjunto)
    ) {
      cambios.push(
        <div key="adjunto" className="mb-3 p-3 bg-white rounded border">
          <strong className="text-gray-800 block mb-2 text-sm font-semibold">
            Imágenes:
          </strong>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Imágenes eliminadas */}
            {publicacion.adjunto &&
              publicacion.adjunto.map((img, index) => {
                const stillExists = update.adjunto.some(
                  (newImg) => newImg.url === img.url || newImg.key === img.key
                );
                if (!stillExists) {
                  return (
                    <div
                      key={`removed-${index}`}
                      className="relative border-2 border-red-300 rounded p-2"
                    >
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                        ✕
                      </div>
                      <img
                        src={img.url}
                        alt={`Imagen eliminada ${index + 1}`}
                        className="w-full h-24 object-cover rounded opacity-60"
                      />
                      <p className="text-xs text-red-600 text-center mt-1">
                        Eliminada
                      </p>
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
                  (oldImg) => oldImg.url === img.url || oldImg.key === img.key
                );
              if (isNew) {
                return (
                  <div
                    key={`new-${index}`}
                    className="relative border-2 border-green-300 rounded p-2"
                  >
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      +
                    </div>
                    <img
                      src={img.url}
                      alt={`Nueva imagen ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <p className="text-xs text-green-600 text-center mt-1">
                      Nueva
                    </p>
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
                  (oldImg) => oldImg.url === img.url || oldImg.key === img.key
                );
              if (wasInOriginal) {
                return (
                  <div
                    key={`kept-${index}`}
                    className="relative border border-gray-300 rounded p-2"
                  >
                    <img
                      src={img.url}
                      alt={`Imagen mantenida ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <p className="text-xs text-gray-600 text-center mt-1">
                      Mantenida
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    }

    return cambios.length > 0 ? (
      cambios
    ) : (
      <p className="text-gray-500 text-sm">
        No se detectaron cambios visibles en los campos principales.
      </p>
    );
  };

  return (
    <div
      className={`flex flex-col md:flex-row gap-6 w-full min-h-screen bg-gray-800/80 p-4 md:p-6
      ${user?.tipoUsuario === 2 || user?.tipoUsuario === 3 ? "justify-center" : ""}`}
    >
      {/* Sección de perfil del usuario */}
      <div
        className={`paginaUsuario flex flex-col items-center gap-4 w-full 
          ${
            user?.tipoUsuario === 2
              ? "items-center w-full max-w-md"
              : "items-center w-full md:w-1/3"
          }`}
      >
        <AiOutlineUser size={150} className="text-white" />
        <div className="text-white text-center md:text-left w-full">
          <div>
            <span className="text-xl font-semibold">
              {user?.nombre} {user?.apellido}
            </span>
          </div>
          <div>
            <a
              href={`mailto:${user?.email}`}
              className="text-blue-400 hover:underline"
            >
              {user?.email}
            </a>
          </div>

          {/* Sección de membresía para usuario básico */}
          {user?.tipoUsuario === 2 && limiteData && (
            <div className="mt-6 w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Tu Membresía</h3>
                <span className="px-3 py-1 bg-gray-600 text-white text-xs font-semibold rounded-full">
                  {limiteData.tipoUsuario || "Básico"}
                </span>
              </div>

              {/* Barra de progreso de publicaciones */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-200">Publicaciones</span>
                  <span className="font-semibold text-white">
                    {limiteData.publicacionesActuales} / {limiteData.limite}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (limiteData.publicacionesActuales / limiteData.limite) * 100 >= 100
                        ? "bg-red-500"
                        : (limiteData.publicacionesActuales / limiteData.limite) * 100 >= 80
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        (limiteData.publicacionesActuales / limiteData.limite) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  {limiteData.publicacionesActuales >= limiteData.limite
                    ? "¡Has alcanzado tu límite!"
                    : `${
                        limiteData.limite - limiteData.publicacionesActuales
                      } publicaciones disponibles`}
                </p>
              </div>

              {/* Botón para actualizar a Premium */}
              <button
                onClick={() => setModalPremiumAbierto(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Actualizar a Premium
              </button>

              <p className="text-xs text-gray-300 mt-3 text-center">
                Obtén publicaciones adicionales y más beneficios
              </p>
            </div>
          )}

          {/* SECCIÓN PARA USUARIOS PREMIUM */}
          {user?.tipoUsuario === 3 && limiteData && (
            <div className="mt-6 w-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Tu Membresía Premium</h3>
                <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-semibold rounded-full">
                  Premium {user?.plan === 'anual' ? 'Anual' : 'Mensual'}
                </span>
              </div>

              {/* Barra de progreso de publicaciones */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-200">Publicaciones</span>
                  <span className="font-semibold text-white">
                    {limiteData.publicacionesActuales} / {limiteData.limite}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (limiteData.publicacionesActuales / limiteData.limite) * 100 >= 100
                        ? "bg-red-500"
                        : (limiteData.publicacionesActuales / limiteData.limite) * 100 >= 80
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        (limiteData.publicacionesActuales / limiteData.limite) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-300 mt-1">
                  {limiteData.publicacionesActuales >= limiteData.limite
                    ? "¡Has alcanzado tu límite!"
                    : `${
                        limiteData.limite - limiteData.publicacionesActuales
                      } publicaciones disponibles`}
                </p>
              </div>

              {/* Información de vencimiento */}
              {limiteData.fechaVencimientoPremium && (
                <div className="mb-3 p-3 bg-white/10 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2 text-white mb-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold">Vencimiento del Plan</span>
                  </div>
                  <p className="text-white text-sm">
                    Tu plan {limiteData.plan === 'anual' ? 'anual' : 'mensual'} se vence el{" "}
                    <span className="font-bold text-yellow-300">
                      {new Date(limiteData.fechaVencimientoPremium).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </p>
                  {limiteData.premiumVencido && (
                    <p className="text-red-300 text-xs mt-2">
                      ⚠️ Tu plan premium ha vencido. Por favor, renueva tu suscripción.
                    </p>
                  )}
                </div>
              )}

              {/* Botón para renovar */}
              <button
                onClick={() => setModalPremiumAbierto(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Renovar Plan Premium
              </button>
            </div>
          )}

          {/* Botones de Perfil Público */}
          <div className="mt-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => navigate("/mi-perfil/editar")}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 font-medium text-sm flex items-center justify-center gap-2"
              >
                <FaEdit />
                Modificar Perfil Público
              </button>

              <button
                onClick={() => navigate(`/perfil/${user?._id}`)}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 font-medium text-sm flex items-center justify-center gap-2"
              >
                <AiOutlineUser />
                Ver Perfil Público
              </button>
            </div>

            <button
            onClick={() => setModalAbierto(true)}
            className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Cambiar contraseña
          </button>
          </div>
          <div>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
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

      {user && (user.tipoUsuario === 0 || user.tipoUsuario === 1) && (
        <div className="w-full md:w-2/3 flex flex-col gap-6 bg-gray-50 rounded-xl p-4 md:p-6 dashboard-scroll-container">
          <h1 className="text-2xl font-bold text-black mb-4">
            Dashboard Administrativo
          </h1>

          {/* Botones de configuración */}
          {(user.tipoUsuario === 0 || user.tipoUsuario === 1) && (
            <div className="config-buttons flex flex-wrap gap-2 mb-4">
              <Link
                to="/admin/categorias"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm"
              >
                <FaListAlt className="w-4 h-4 mr-2" />
                Gestionar Categorías
              </Link>

              <button
                onClick={() => setModalLimitesAbierto(true)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium text-sm"
              >
                <FiSettings className="w-4 h-4 mr-2" />
                Configurar Límites
              </button>
              
              {/*  BOTÓN PARA CONFIGURAR PAGOS */}
              <button
                onClick={() => setModalPagosAbierto(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium text-sm"
              >
                <FiCreditCard className="w-4 h-4 mr-2" />
                Configurar Pagos
              </button>
            </div>
          )}

          <ModalLimitesPublicaciones
            isOpen={modalLimitesAbierto}
            onClose={() => setModalLimitesAbierto(false)}
          />

          {/* Pestañas para navegación */}
          <div className="dashboard-tabs flex flex-wrap gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("publicaciones")}
              className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "publicaciones"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaListAlt className="inline w-4 h-4 mr-2" />
              Publicaciones Nuevas ({publicaciones.length})
            </button>

            <button
              onClick={() => setActiveTab("actualizaciones")}
              className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "actualizaciones"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaEdit className="inline w-4 h-4 mr-2" />
              Actualizaciones Pendientes ({pendingUpdates.length})
            </button>

            <button
              onClick={() => setActiveTab("archivos")}
              className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "archivos"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <FaHistory className="inline w-4 h-4 mr-2" />
              Archivos Nuevos ({archivos.length})
            </button>

            <button
              onClick={() => setActiveTab("usuarios")}
              className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === "usuarios"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <AiOutlineUser className="inline w-4 h-4 mr-2" />
              Gestión de Usuarios
            </button>
          </div>

          {/* Contenido de las pestañas */}
          <div className="flex-1 overflow-hidden min-h-0 ">
            {/* Pestaña: Publicaciones Nuevas */}
            {activeTab === "publicaciones" && (
              <div className="tab-table-container h-full overflow-auto">
                <h2 className="text-lg font-semibold text-black mb-4">
                  Publicaciones nuevas por aprobar
                </h2>
                {publicaciones && publicaciones.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="responsive-table min-w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left px-3 py-2 text-sm">Autor</th>
                          <th className="text-left px-3 py-2 text-sm">Título</th>
                          <th className="text-left px-3 py-2 text-sm">Tipo</th>
                          <th className="text-left px-3 py-2 text-sm">Fecha</th>
                          <th className="text-left px-3 py-2 text-sm">
                            Vista Previa
                          </th>
                          <th className="text-left px-3 py-2 text-sm">
                            Decisión
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {publicaciones.map((item) => (
                          <tr
                            key={item._id}
                            className="border-t hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 text-sm">
                              {item.autor ? item.autor.nombre : "Sin autor"}
                            </td>
                            <td
                              className="px-3 py-2 text-sm break-words max-w-[150px]"
                              title={item.titulo}
                            >
                              {item.titulo}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  item.tag === "evento"
                                    ? "bg-blue-100 text-blue-800"
                                    : item.tag === "emprendimiento"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.tag}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">{item.fecha}</td>
                            <td className="px-3 py-2 text-sm">
                              <a
                                href={`/publicaciones/${item._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline text-sm"
                              >
                                Ver publicación
                              </a>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="table-actions flex flex-col sm:flex-row gap-1">
                                <button
                                  onClick={() => aceptarPost(item._id)}
                                  className="bg-green-500 hover:bg-green-600 text-white font-medium px-2 py-1 rounded text-xs sm:text-sm"
                                >
                                  Aceptar
                                </button>
                                <button
                                  onClick={() => rechazarPost(item._id)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-medium px-2 py-1 rounded text-xs sm:text-sm"
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
                  <div className="text-center py-8 text-gray-500">
                    No hay publicaciones pendientes de aprobación.
                  </div>
                )}
              </div>
            )}

            {/* Actualizaciones Pendientes */}
            {activeTab === "actualizaciones" && (
              <div className="tab-table-container h-full flex flex-col">
                <h2 className="text-lg font-semibold text-black mb-4">
                  Actualizaciones pendientes de revisión
                </h2>
                {pendingUpdates && pendingUpdates.length > 0 ? (
                  <div
                    className="flex-1 overflow-y-auto"
                    style={{ maxHeight: "400px" }}
                  >
                    <div className="space-y-4 p-1">
                      {pendingUpdates.map((publicacion) => (
                        <div
                          key={publicacion._id}
                          className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-2">
                                <h3 className="font-semibold text-lg text-black break-words w-full">
                                  {publicacion.titulo}
                                </h3>
                                <span
                                  className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 ${
                                    publicacion.tag === "evento"
                                      ? "bg-blue-100 text-blue-800"
                                      : publicacion.tag === "emprendimiento"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {publicacion.tag}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 break-words">
                                <strong>Autor:</strong>{" "}
                                {publicacion.autor?.nombre} •{" "}
                                <strong> Solicitado:</strong>{" "}
                                {new Date(
                                  publicacion.lastEditRequest
                                ).toLocaleDateString()}{" "}
                                • <strong> Ediciones:</strong>{" "}
                                {publicacion.editCount || 0}/3
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                              <button
                                onClick={() =>
                                  aprobarActualizacion(publicacion._id)
                                }
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap transition-colors flex-1 min-w-[100px]"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt(
                                    "Razón del rechazo (opcional):"
                                  );
                                  rechazarActualizacion(publicacion._id, reason);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm whitespace-nowrap transition-colors flex-1 min-w-[100px]"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-medium text-black mb-3 text-lg">
                              Cambios propuestos:
                            </h4>
                            <div className="space-y-3">
                              {renderCambiosPropuestos(publicacion)}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t">
                            <a
                              href={`/publicaciones/${publicacion._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-sm break-words inline-block font-medium"
                            >
                              Ver publicación actual
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay actualizaciones pendientes de revisión.
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: Archivos Nuevos (RF023) */}
            {activeTab === "archivos" && (
              <div className="tab-table-container h-full overflow-auto">
                <h2 className="text-lg font-semibold text-black mb-4">
                  Archivos pendientes de aprobación
                </h2>
                {archivos && archivos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-black text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left px-3 py-2">Subido por</th>
                          <th className="text-left px-3 py-2">
                            Nombre del archivo
                          </th>
                          <th className="text-left px-3 py-2">Tipo</th>
                          <th className="text-left px-3 py-2">Tamaño</th>
                          <th className="text-left px-3 py-2">Fecha</th>
                          <th className="text-left px-3 py-2">Vista previa</th>
                          <th className="text-left px-3 py-2">Decisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivos.map((item) => (
                          <tr
                            key={item._id}
                            className="border-t hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 min-w-[220px]">
                              <div className="text-sm font-medium text-gray-900 break-words">
                                {(
                                  item.subidoPor?.nombre
                                    ? `${item.subidoPor.nombre} ${item.subidoPor.apellido || ""}`
                                    : item.usuario?.nombre
                                    ? `${item.usuario.nombre} ${item.usuario.apellido || ""}`
                                    : item.autor?.nombre
                                    ? `${item.autor.nombre} ${item.autor.apellido || ""}`
                                    : "Desconocido"
                                ).trim()}
                              </div>
                              <div className="text-xs text-gray-600 break-words">
                                {item.subidoPor?.email ||
                                  item.usuario?.email ||
                                  item.autor?.email ||
                                  ""}
                              </div>
                            </td>

                            <td
                              className="px-3 py-2 break-words max-w-[200px]"
                              title={item.nombre}
                            >
                              {item.nombre}
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                                {item.tipoArchivo?.split("/").pop() || "Archivo"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {formatearTamano(item.tamano)}
                            </td>
                            <td className="px-3 py-2">
                              {item.fechaSubida
                                ? new Date(item.fechaSubida).toLocaleDateString(
                                    "es-ES"
                                  )
                                : "Fecha no disponible"}
                            </td>
                            <td className="px-3 py-2">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline text-sm"
                              >
                                Ver archivo
                              </a>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => aceptarArchivo(item._id)}
                                  className="bg-green-500 hover:bg-green-600 text-white font-medium px-2 py-1 rounded text-xs sm:text-sm"
                                >
                                  ✓ Aprobar
                                </button>
                                <button
                                  onClick={() => rechazarArchivo(item._id)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-medium px-2 py-1 rounded text-xs sm:text-sm"
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
                  <div className="text-center py-8 text-gray-500">
                    No hay archivos pendientes de aprobación.
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: Gestión de Usuarios */}
            {activeTab === "usuarios" && (
              <div className="tab-table-container h-full flex flex-col">
                <h2 className="text-lg font-semibold text-black mb-4">
                  Gestión de permisos de usuarios
                </h2>

                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-black"
                />

                {usuariosFiltrados && usuariosFiltrados.length > 0 ? (
                  <div
                    className="flex-1 overflow-y-auto"
                    style={{ maxHeight: "400px" }}
                  >
                    <div className="min-w-full">
                      <table className="responsive-table min-w-full">
                        <thead className="sticky top-0 bg-gray-100">
                          <tr>
                            <th className="text-left px-3 py-2 min-w-[120px]">
                              Nombre
                            </th>
                            <th className="text-left px-3 py-2 min-w-[120px]">
                              Apellidos
                            </th>
                            <th className="text-left px-3 py-2 min-w-[200px]">
                              Email
                            </th>
                            <th className="text-left px-3 py-2 min-w-[220px]">
                              Tipo de Usuario
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuariosFiltrados.map((item) => (
                            <tr
                              key={item._id}
                              className="border-t hover:bg-gray-50"
                            >
                              <td className="px-3 py-2 break-words min-w-[120px]">
                                {item.nombre || "Sin nombre"}
                              </td>
                              <td className="px-3 py-2 break-words min-w-[120px]">
                                {item.apellido || "Sin apellido"}
                              </td>
                              <td className="px-3 py-2 break-words min-w-[200px]">
                                {item.email}
                              </td>

                              {/* ✅ CAMBIO: Dropdown real para Admin / Básico / Premium */}
                              <td className="px-3 py-2 min-w-[220px]">
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                  value={getTipoUsuarioSelectValue(item)}
                                  onChange={(e) =>
                                    actualizarMembresia(item._id, e.target.value)
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

                                <div className="text-xs text-gray-600 mt-1">
                                  {item.tipoUsuario === 3 &&
                                  item.fechaVencimientoPremium ? (
                                    <>
                                      Vence:{" "}
                                      {new Date(
                                        item.fechaVencimientoPremium
                                      ).toLocaleDateString("es-CR")}
                                    </>
                                  ) : item.tipoUsuario === 1 ? (
                                    "Acceso administrativo"
                                  ) : (
                                    "Sin vencimiento premium"
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron usuarios.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilUsuario;
