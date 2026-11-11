import { filterValidFiles, acceptAttr } from '../utils/fileValidation';
import {
  IoMdArrowRoundBack,
  IoMdCall,
  IoMdLink,
  IoMdPerson,
  IoMdSchool,
  IoMdStar,
  IoMdMail,
  IoLogoFacebook,
  IoLogoInstagram,
  IoMdTrash,
  IoLogoWhatsapp,
  IoMdCreate,
} from "react-icons/io";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { API_URL, getCategoriaById } from "../utils/api";
import { EditarPublicacionModal } from "./EditarPublicacionModal";
import Slider from "./generic/slider";
import ComentariosPub from "./comentariosPub";
import PublicacionModal from "./publicacionModal";
import { useAuth } from "./context/AuthContext";
import CategoriaBadge from "./generic/categoriaBadge";
import ProfileErrorModal from "./ProfileErrorModal";
import "../CSS/publicacionDetalle.css";
import { obtenerEtiquetaExpiracion } from "../utils/publicacionExpiracion";
import { getSeccionPorPath } from "../utils/secciones";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const PublicacionDetalle = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuth();

  // ========== FUNCIÓN FORMATFECHA CORREGIDA ==========
  // MODIFICACIÓN: Se corrigió el problema de zona horaria
  // que causaba que las fechas se mostraran un día después
  const formatFecha = (fechaStr) => {
    if (!fechaStr) return "Sin fecha";

    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    let fecha;

    // Si la fecha viene en formato dd/mm/yyyy
    if (fechaStr.includes("/")) {
      const partes = fechaStr.split("/");
      if (partes.length === 3) {
        // CAMBIO: Crear fecha usando componentes directamente para evitar zona horaria
        fecha = new Date(
          parseInt(partes[2]),
          parseInt(partes[1]) - 1,
          parseInt(partes[0]),
        );
      }
    }
    // Si la fecha viene en formato ISO (yyyy-mm-dd) o similar
    else if (fechaStr.includes("-")) {
      const partes = fechaStr.split("T")[0];
      const [año, mes, dia] = partes.split("-").map((num) => parseInt(num));
      fecha = new Date(año, mes - 1, dia);
    }
    // Fallback: intentar parsear directamente
    else {
      fecha = new Date(fechaStr);
    }

    // Verificar si la fecha es válida
    if (isNaN(fecha)) return fechaStr;

    return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  };

  const [selectedPub, setSelectedPub] = useState(false);
  const [comentarios, setComentarios] = useState([]);
  const { id } = useParams();
  const [publicacion, setPublicacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [categoriaCompleta, setCategoriaCompleta] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);
  const [fotosError, setFotosError] = useState(null);
  const fotosInputRef = useRef(null);

  // Estados para el modal de error de perfil
  const [showProfileError, setShowProfileError] = useState(false);
  const [errorType, setErrorType] = useState("private");
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
  useEffect(() => {
    const obtenerPublicacion = async () => {
      try {
        setCargando(true);
        setError(null);

        const response = await fetch(`${API_URL}/publicaciones/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.mensaje || "No se encontró la publicación");
        }

        // Popular categoría si viene como id
        if (data.categoria && typeof data.categoria === "string") {
          const categoriaData = await getCategoriaById(data.categoria);
          if (categoriaData) {
            setCategoriaCompleta(categoriaData);
          }
        } else if (data.categoria && data.categoria.nombre) {
          setCategoriaCompleta(data.categoria);
        }

        setPublicacion(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    if (id) obtenerPublicacion();
  }, [id]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  const handleSubirFotos = async (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    const { valid: files } = await filterValidFiles(selected, "images");
    if (files.length === 0) return;
    setFotosError(null);
    setSubiendoFotos(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("imagenes", f));
      const res = await fetch(`${API_URL}/publicaciones/${publicacion._id}/fotos`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudieron subir las fotos");
      setPublicacion((prev) => ({ ...prev, adjunto: data.adjunto }));
    } catch (err) {
      setFotosError(err.message);
    } finally {
      setSubiendoFotos(false);
    }
  };

  const handleEliminarFoto = async (fotoId) => {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    setFotosError(null);
    try {
      const res = await fetch(
        `${API_URL}/publicaciones/${publicacion._id}/fotos/${fotoId}`,
        { method: "DELETE", headers: authHeaders() },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo eliminar la foto");
      setPublicacion((prev) => ({ ...prev, adjunto: data.adjunto }));
    } catch (err) {
      setFotosError(err.message);
    }
  };

  useEffect(() => {
    if (publicacion?.comentarios) {
      setComentarios(publicacion.comentarios);
    }
  }, [publicacion]);

  // Función para manejar clic en perfil de usuario
  const handleProfileClick = async (e, userId) => {
    e.stopPropagation();

    if (!userId) return;

    try {
      const response = await fetch(`${API_URL}/perfil/${userId}?modo=basico`);

      if (!response.ok) {
        if (response.status === 403) {
          setErrorType("private");
          setShowProfileError(true);
          return;
        } else if (response.status === 404) {
          setErrorType("notFound");
          setShowProfileError(true);
          return;
        }
        throw new Error("Error al cargar el perfil");
      }

      navigate(`/perfil/${userId}`);
    } catch (error) {
      console.error("Error al verificar perfil:", error);
      setErrorType("private");
      setShowProfileError(true);
    }
  };

  const getCurrencyMeta = () => {
    const moneda = publicacion?.moneda === "USD" ? "USD" : "CRC";
    if (moneda === "USD") {
      return { symbol: "$", locale: "en-US" };
    }
    return { symbol: "₡", locale: "es-CR" };
  };

  const formatPrecio = (precio) => {
    if (precio === 0 || precio === "0") return "Gratis";
    if (Number.isFinite(Number(precio))) {
      const currency = getCurrencyMeta();
      return `${currency.symbol} ${Number(precio).toLocaleString(currency.locale)}`;
    }
    return "No especificado";
  };

  const precioRegular = publicacion?.precio;
  const precioEstudiante = publicacion?.precioEstudiante;
  const precioCiudadanoOro = publicacion?.precioCiudadanoOro;
  const precioNegociable = publicacion?.precioNegociable === true;

  const mostrarPrecios =
    publicacion &&
    (publicacion.tag === "evento" ||
      (publicacion.tag === "emprendimiento" && !precioNegociable));

  // === HORA DEL EVENTO (simple, ya viene "HH:mm") ===
  const mostrarHora =
    publicacion?.tag === "evento" &&
    typeof publicacion?.horaEvento === "string" &&
    publicacion.horaEvento.trim() !== "";

  // === TELÉFONO ===
  const telefono = publicacion?.telefono;

  // === ENLACES EXTERNOS ===
  const enlacesExternos = publicacion?.enlacesExternos || [];
  const etiquetaExpiracion = obtenerEtiquetaExpiracion(publicacion);

  // Función para formatear correctamente los enlaces
  const formatearEnlace = (url) => {
    // Si es un correo sin mailto:, agregar el prefijo
    if (url.includes("@") && !url.startsWith("mailto:")) {
      return `mailto:${url}`;
    }
    if (
      /^[\d\s\-+()]+$/.test(url.replace(/\s/g, "")) &&
      !url.startsWith("tel:")
    ) {
      return `tel:${url}`;
    }
    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://") &&
      !url.startsWith("mailto:") &&
      !url.startsWith("tel:") &&
      url.includes(".") &&
      !url.includes(" ")
    ) {
      return `https://${url}`;
    }
    return url;
  };

  const obtenerIconoEnlace = (url) => {
    if (url.includes("@") || url.startsWith("mailto:")) {
      return <IoMdMail className="publicacion-icon" size={14} />;
    }
    if (url.includes("tel:") || /^[\d\s\-+()]+$/.test(url.replace(/\s/g, ""))) {
      return <IoMdCall className="publicacion-icon" size={14} />;
    }
    if (url.includes("facebook.com")) {
      return <IoLogoFacebook className="publicacion-icon" size={14} />;
    }
    if (url.includes("instagram.com")) {
      return <IoLogoInstagram className="publicacion-icon" size={14} />;
    }
    if (url.includes("whatsapp.com") || url.includes("wa.me")) {
      return <IoLogoWhatsapp className="publicacion-icon" size={14} />;
    }
    return <IoMdLink className="publicacion-icon" size={14} />;
  };

  if (cargando) {
    return (
      <div className="publicacion-loading">
        <div className="publicacion-spinner"></div>
        <h2 className="text-white">Cargando publicación...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicacion-error-container">
        <div className="publicacion-error-card">
          <p className="text-lg mb-4">{error}</p>
          <button
            onClick={() =>
              (window.location.href = getSeccionPorPath(location.pathname))
            }
            className="publicacion-error-btn"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!publicacion) return null;

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="publicacion-detalle-container">
      {/* Modal de error de perfil */}
      <ProfileErrorModal
        isOpen={showProfileError}
        onClose={() => setShowProfileError(false)}
        type={errorType}
      />

      <div className="publicacion-content-wrapper">
        {/* Header con botón de regreso y acciones - ÚNICO PARA TODOS LOS DISPOSITIVOS */}
        <div className="publicacion-header-bar">
          {/* Botón de regreso - Izquierda */}
          <button
            type="button"
            onClick={handleBack}
            className="publicacion-back-btn"
          >
            <IoMdArrowRoundBack color="black" size={21} />
          </button>

          {/* Clasificación - Centro */}
          <div className="publicacion-category-display">
            <strong className="text-white text-sm md:text-base">
              Clasificación:
            </strong>
            <CategoriaBadge categoria={categoriaCompleta} mobile />
          </div>

          {/* BOTONES DE ACCIÓN - Derecha */}
          <div className="publicacion-actions">
            {/* Botón Editar - para el autor */}
            {user && user._id === publicacion.autor?._id && (
              <button
                onClick={() => setShowEditModal(true)}
                className="publicacion-action-btn publicacion-edit-btn"
              >
                <IoMdCreate size={16} />
                <span className="hidden md:inline">Editar</span>
              </button>
            )}

            {/* Botón Eliminar - solo para administradores */}
            {user && (user.tipoUsuario === 0 || user.tipoUsuario === 1) && (
              <button
                className="publicacion-action-btn publicacion-delete-btn"
                onClick={() => setSelectedPub(true)}
              >
                <IoMdTrash className="md:hidden" size={16} />
                <span className="hidden md:inline">Eliminar</span>
              </button>
            )}
          </div>
        </div>

        {publicacion && (
          <>
            {/* TÍTULO CENTRADO */}
            <div className="publicacion-title-wrapper">
              <div className="publicacion-title-content">
                <h1 className="publicacion-title">{publicacion.titulo}</h1>
                {etiquetaExpiracion && (
                  <div className="mt-3">
                    <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 md:text-sm">
                      {etiquetaExpiracion}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* MODALES */}
            {showEditModal && (
              <EditarPublicacionModal
                publicacion={publicacion}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onUpdate={() => {
                  window.location.reload();
                }}
              />
            )}

            <PublicacionModal
              name={publicacion.titulo}
              date={publicacion.fecha}
              tag={publicacion.tag}
              id={publicacion._id}
              isOpen={selectedPub}
              onClose={() => setSelectedPub(false)}
            />

            {/* SLIDER */}
            <div className="publicacion-slider-container">
              <Slider key={publicacion._id} publicacion={publicacion} />
            </div>

            {/* GESTIÓN DE FOTOS DEL EMPRENDIMIENTO (autor o admin) */}
            {publicacion.tag === "emprendimiento" &&
              user &&
              (user._id === publicacion.autor?._id ||
                user.tipoUsuario === 0 ||
                user.tipoUsuario === 1) && (
                <div className="publicacion-details-panel" data-testid="gestion-fotos">
                  <h3 className="text-white font-semibold mb-3">
                    Fotos del emprendimiento ({publicacion.adjunto?.length || 0}/20)
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                    {(publicacion.adjunto || []).map((foto) => (
                      <div key={foto._id || foto.key} style={{ position: "relative" }}>
                        <img
                          src={foto.url}
                          alt="Foto del emprendimiento"
                          style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 8 }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEliminarFoto(foto._id)}
                          aria-label="Eliminar foto"
                          style={{
                            position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.7)",
                            color: "white", borderRadius: "50%", width: 24, height: 24, lineHeight: "24px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    ref={fotosInputRef}
                    type="file"
                    accept={acceptAttr('images')}
                    multiple
                    hidden
                    onChange={handleSubirFotos}
                  />
                  <button
                    type="button"
                    disabled={subiendoFotos}
                    onClick={() => fotosInputRef.current?.click()}
                    className="publicacion-action-btn publicacion-edit-btn"
                  >
                    {subiendoFotos ? "Subiendo..." : "+ Agregar fotos"}
                  </button>
                  {fotosError && <p className="text-red-400 mt-2 text-sm">{fotosError}</p>}
                </div>
              )}

            {/* DETALLES PRINCIPALES */}
            <div className="publicacion-details-panel">
              <div className="publicacion-author-info">
                <h2 className="text-white text-sm md:text-base mb-2">
                  <IoMdPerson className="inline mr-2 publicacion-icon" />
                  <strong>Autor:</strong>{" "}
                  <span
                    className="publicacion-author-link"
                    onClick={(e) =>
                      handleProfileClick(e, publicacion.autor?._id)
                    }
                  >
                    {publicacion.autor?.nombre || "Autor desconocido"}
                  </span>
                </h2>
              </div>

              {/* Descripción */}
              <div className="publicacion-description">
                <p className="text-white text-sm md:text-base mb-3">
                  <strong>Descripción:</strong>
                </p>
                <div className="publicacion-description-content">
                  {publicacion.contenido}
                </div>
              </div>

              {/* INFORMACIÓN ADICIONAL */}
              <div className="space-y-4">
                {/* PRECIOS */}
                {mostrarPrecios && (
                  <div className="publicacion-price-panel">
                    <h3 className="text-white font-semibold mb-3">Precios:</h3>
                    <div className="publicacion-price-grid">
                      <div className="publicacion-price-item">
                        <IoMdPerson
                          className="mr-3 text-blue-400 publicacion-icon"
                          size={18}
                        />
                        <div>
                          <span className="font-medium text-white block">
                            Precio regular:
                          </span>
                          <span className="text-blue-300">
                            {formatPrecio(precioRegular)}
                          </span>
                        </div>
                      </div>

                      {precioEstudiante !== undefined &&
                        precioEstudiante !== null && (
                          <div className="publicacion-price-item">
                            <IoMdSchool
                              className="mr-3 text-green-400 publicacion-icon"
                              size={18}
                            />
                            <div>
                              <span className="font-medium text-white block">
                                Estudiante:
                              </span>
                              <span className="text-green-300">
                                {formatPrecio(precioEstudiante)}
                              </span>
                            </div>
                          </div>
                        )}

                      {precioCiudadanoOro !== undefined &&
                        precioCiudadanoOro !== null && (
                          <div className="publicacion-price-item">
                            <IoMdStar
                              className="mr-3 text-yellow-400 publicacion-icon"
                              size={18}
                            />
                            <div>
                              <span className="font-medium text-white block">
                                Ciudadano de oro:
                              </span>
                              <span className="text-yellow-300">
                                {formatPrecio(precioCiudadanoOro)}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {publicacion.tag === "emprendimiento" && precioNegociable && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">Precio:</span>
                    <span className="publicacion-info-value">Negociable</span>
                  </div>
                )}

                {/* Fecha de evento */}
                {publicacion.fechaEvento && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">
                      Fecha del evento:
                    </span>
                    <span className="publicacion-info-value">
                      {formatFecha(publicacion.fechaEvento)}
                    </span>
                  </div>
                )}

                {/* Hora de evento */}
                {mostrarHora && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">
                      Hora del evento:
                    </span>
                    <span className="publicacion-info-value">
                      {publicacion.horaEvento}
                    </span>
                  </div>
                )}

                {/* Ubicación del evento */}
                  {publicacion?.ubicacion?.latitude &&
                    publicacion?.ubicacion?.longitude && (
                      <div className="publicacion-info-item">

                        <span className="publicacion-info-label">
                          Ubicación:
                        </span>

                        <div className="publicacion-info-value">

                          <div>
                            {publicacion.ubicacion.direccion}
                          </div>

                          {/* MAPA */}
                          <div
                            style={{
                              width: "100%",
                              height: "300px",
                              marginTop: "10px",
                              borderRadius: "12px",
                              overflow: "hidden",
                            }}
                          >
                            <MapContainer
                              center={[
                                publicacion.ubicacion.latitude,
                                publicacion.ubicacion.longitude,
                              ]}
                              zoom={16}
                              scrollWheelZoom={false}
                              style={{
                                width: "100%",
                                height: "100%",
                              }}
                            >

                              <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />

                              <Marker
                                position={[
                                  publicacion.ubicacion.latitude,
                                  publicacion.ubicacion.longitude,
                                ]}
                              >

                                <Popup>

                                  <strong>
                                    {publicacion.ubicacion.direccion}
                                  </strong>

                                  <br />

                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${publicacion.ubicacion.latitude},${publicacion.ubicacion.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Abrir en Google Maps
                                  </a>

                                </Popup>

                              </Marker>

                            </MapContainer>
                          </div>

                          {/* Botón Google Maps */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${publicacion.ubicacion.latitude},${publicacion.ubicacion.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:text-blue-200 underline"
                          >
                            Ver en Google Maps
                          </a>

                        </div>
                      </div>
                    )}

                {/* Fecha de publicación */}
                {publicacion.fecha && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">
                      Fecha de publicación:
                    </span>
                    <span className="publicacion-info-value">
                      {formatFecha(publicacion.fecha)}
                    </span>
                  </div>
                )}

                {etiquetaExpiracion && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">
                      Tiempo restante:
                    </span>
                    <span className="publicacion-info-value">
                      {etiquetaExpiracion}
                    </span>
                  </div>
                )}

                {/* TIPO */}
                <div className="publicacion-info-item">
                  <span className="publicacion-info-label">Tipo:</span>
                  <span className="publicacion-info-value">
                    {publicacion.tag || "Sin tag"}
                  </span>
                </div>

                {/* COMUNIDAD */}
                {publicacion.comunidad && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">Comunidad:</span>
                    <span className="publicacion-info-value">
                      {publicacion.comunidad}
                    </span>
                  </div>
                )}

                {/* TELÉFONO */}
                {telefono && (
                  <div className="publicacion-info-item">
                    <span className="publicacion-info-label">Teléfono:</span>
                    <a
                      href={`tel:${telefono}`}
                      className="publicacion-info-value text-blue-300 hover:text-blue-200 underline"
                    >
                      {telefono}
                    </a>
                  </div>
                )}

                {/* ENLACES EXTERNOS */}
                {enlacesExternos.length > 0 && (
                  <div className="publicacion-links-section">
                    <h3 className="text-white font-semibold mb-3 flex items-center">
                      <IoMdLink className="mr-2 text-purple-400 publicacion-icon" />
                      Enlaces externos:
                    </h3>
                    <div className="publicacion-links-grid">
                      {enlacesExternos.map((enlace, index) => {
                        const enlaceFormateado = formatearEnlace(enlace.url);
                        const icono = obtenerIconoEnlace(enlace.url);

                        return (
                          <div key={index} className="publicacion-link-item">
                            <a
                              href={enlaceFormateado}
                              target={
                                enlaceFormateado.startsWith("http")
                                  ? "_blank"
                                  : "_self"
                              }
                              rel={
                                enlaceFormateado.startsWith("http")
                                  ? "noopener noreferrer"
                                  : ""
                              }
                              className="publicacion-link-content"
                            >
                              {icono}
                              <span>{enlace.nombre}</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COMENTARIOS */}
            <div className="publicacion-comments-section">
              <ComentariosPub
                comentarios={comentarios}
                setComentarios={setComentarios}
                publicacionId={publicacion._id}
                usuario={user}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicacionDetalle;
