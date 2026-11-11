import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import CategoriaBadge from "./generic/categoriaBadge";
import ProfileErrorModal from "./ProfileErrorModal";
import { API_URL } from "../utils/api";

import { obtenerEtiquetaExpiracion } from "../utils/publicacionExpiracion";
import { getRutaDetalle } from "../utils/secciones";

export const EventoCard = ({ publicacion, onDeleteClick }) => {
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
      const partes = fechaStr.split("T")[0]; // CAMBIO: Quitar la parte de hora si existe
      const [año, mes, dia] = partes.split("-").map((num) => parseInt(num));
      // CAMBIO: Crear fecha usando componentes directamente para evitar problemas de zona horaria
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
  // ========== FIN DE MODIFICACIÓN ==========

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Estados para controlar el modal de error de perfil
  const [showProfileError, setShowProfileError] = useState(false);
  const [errorType, setErrorType] = useState("private");

  const getCurrencyMeta = (pub) => {
    const moneda = pub?.moneda === "USD" ? "USD" : "CRC";
    if (moneda === "USD") {
      return { symbol: "$", locale: "en-US" };
    }
    return { symbol: "₡", locale: "es-CR" };
  };

  const formatPrecioCard = (precio, pub) => {
    if (precio === 0 || precio === "0") return "Gratis";
    if (Number.isFinite(Number(precio))) {
      const currency = getCurrencyMeta(pub);
      return `${currency.symbol} ${Number(precio).toLocaleString(currency.locale)}`;
    }
    return "No especificado";
  };

  const handleClick = () => {
    navigate(getRutaDetalle(publicacion.tag, publicacion._id), {
      state: { from: location.pathname + location.search },
    });
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Evita que se active el navigate
    onDeleteClick(publicacion);
  };

  // ========== FUNCIÓN PARA MANEJAR CLIC EN PERFIL ==========
  // MODIFICACIÓN: Se agregó función para verificar si el perfil es público
  const handleProfileClick = async (e, userId) => {
    e.stopPropagation(); // Evita que se active el navigate de la card

    if (!userId) return; // Si no hay ID, no hacer nada

    try {
      // Verificar si el perfil es público antes de navegar
      const response = await fetch(`${API_URL}/perfil/${userId}?modo=basico`);

      if (!response.ok) {
        if (response.status === 403) {
          // Perfil no es público - mostrar modal de error
          setErrorType("private");
          setShowProfileError(true);
          return;
        } else if (response.status === 404) {
          // Perfil no encontrado - mostrar modal de error
          setErrorType("notFound");
          setShowProfileError(true);
          return;
        }
        throw new Error("Error al cargar el perfil");
      }

      // Si el perfil es público, navegar normalmente
      navigate(`/perfil/${userId}`);
    } catch (error) {
      console.error("Error al verificar perfil:", error);
      setErrorType("private");
      setShowProfileError(true);
    }
  };
  // ========== FIN DE MODIFICACIÓN ==========

  const tieneImagenes = publicacion.adjunto && publicacion.adjunto.length > 0;

  // Obtener la inicial del autor
  const getInicialAutor = () => {
    if (publicacion.autor?.nombre) {
      return publicacion.autor.nombre.charAt(0).toUpperCase();
    }
    return "X"; //  de Usuario si no hay nombre
  };

  // Color basado en la inicial para consistencia
  const getColorFromInitial = (initial) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
    ];
    const charCode = initial.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  const colorAutor = getColorFromInitial(getInicialAutor());

  // === PRECIO (normalizado) ===
  const rawPrecio = publicacion?.precio ?? publicacion?.Precio;
  const precio = Number(rawPrecio);
  const precioNegociable =
    publicacion.tag === "emprendimiento" &&
    publicacion?.precioNegociable === true;
  const mostrarPrecio =
    (publicacion.tag === "evento" || publicacion.tag === "emprendimiento") &&
    !precioNegociable &&
    Number.isFinite(precio);
  const etiquetaExpiracion = obtenerEtiquetaExpiracion(publicacion);

  return (
    <>
      {/* ========== MODAL DE ERROR DE PERFIL ========== */}
      {/* MODIFICACIÓN: El modal se renderiza fuera de la card, directamente en el body */}
      <ProfileErrorModal
        isOpen={showProfileError}
        onClose={() => setShowProfileError(false)}
        type={errorType}
      />
      <div className="relative card max-w-2xl mx-auto rounded-lg shadow-md hover:shadow-ld transition-all duration-300 overflow-hidden">
        <div className="flex flex-col md:flex-row" onClick={handleClick}>
          {/* Badge de categoría - MÁS PEQUEÑO EN MÓVIL */}
          <div className="absolute top-2 right-2 z-10">
            <CategoriaBadge categoria={publicacion.categoria} mobile />
          </div>

          {/* Chip de precio - MÁS PEQUEÑO EN MÓVIL */}
          {mostrarPrecio && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold shadow md:px-2 md:py-1 md:text-xs">
                {formatPrecioCard(precio, publicacion)}
              </span>
            </div>
          )}

          {/* Chip de precio negociable */}
          {precioNegociable && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-1.5 py-0.5 rounded bg-amber-600 text-white text-[10px] font-semibold shadow md:px-2 md:py-1 md:text-xs">
                Precio negociable
              </span>
            </div>
          )}

          {/* IMAGEN */}
          <div className="h-72 w-72 flex-shrink-0">
            {tieneImagenes ? (
              <img
                src={publicacion.adjunto[0]?.url}
                alt={publicacion.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-500 text-center p-4">
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm">{publicacion.titulo}</p>
              </div>
            )}
          </div>

          {/* Detalles */}
          <div className="flex-1 min-w-0 p-4">
            <div className="card-details">
              <h3 className="font-bold text-2xl">{publicacion.titulo}</h3>

              <p className="font-semibold text-xl">
                {formatFecha(publicacion.fechaEvento || publicacion.fecha)}
                {publicacion.horaEvento
                  ? ` a las ${publicacion.horaEvento}`
                  : ``}
              </p>

              <div className="mb-2">
                <p className="text-white">{publicacion.contenidoBreve}</p>
              </div>

              <hr className="my-3 w-full border-gray-300" />

              <div className="mb-2">
                <p className="text-white text-sm">{publicacion.contenido}</p>
              </div>

              <hr className="my-3 w-full border-gray-300" />
              <p className="fecha">
                Publicado por:{" "}
                <span
                  className="text-white hover:text-blue-100 cursor-pointer hover:underline"
                  onClick={(e) => handleProfileClick(e, publicacion.autor?._id)}
                >
                  {publicacion.autor?.nombre || "Desconocido"}
                </span>
              </p>
              {publicacion.comunidad && (
                <p className="fecha">Comunidad: {publicacion.comunidad}</p>
              )}
            </div>

            {etiquetaExpiracion && (
              <div className="mb-3">
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  {etiquetaExpiracion}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botón de eliminar (solo para admins) - MÁS PEQUEÑO EN MÓVIL */}
        {user && (user.tipoUsuario === 0 || user.tipoUsuario === 1) && (
          <div className="p-3 border-t md:p-4 flex justify-center">
            {" "}
            {/* Padding reducido en móvil */}
            <button
              className="w-full max-w-4xl bg-red-600 text-white py-1.5 px-3 rounded hover:bg-red-700 transition-colors text-sm md:py-2 md:px-4 md:text-base" /* Tamaño reducido en móvil */
              onClick={handleDeleteClick}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default EventoCard;
