import { useNavigate } from "react-router-dom";
import { FaTimes, FaClock, FaTag } from "react-icons/fa";
import moment from "moment";
import "moment/locale/es";
import { BASE_URL } from "../utils/api";
import { getRutaDetalle } from "../utils/secciones";

moment.locale("es");

const getCurrencyMeta = (evento) => {
  const moneda = evento?.moneda === "USD" ? "USD" : "CRC";
  if (moneda === "USD") {
    return { symbol: evento?.monedaSimbolo || "$", locale: "en-US" };
  }
  return { symbol: evento?.monedaSimbolo || "₡", locale: "es-CR" };
};

const formatPrecio = (evento) => {
  if (evento?.precio === 0 || evento?.precio === "0") return "Gratis";
  const precio = Number(evento?.precio);
  if (!Number.isFinite(precio)) return null;
  const currency = getCurrencyMeta(evento);
  return `${currency.symbol} ${precio.toLocaleString(currency.locale)}`;
};

const getCategoriaNombre = (categoria) => {
  if (!categoria) return null;
  if (typeof categoria === "string") return categoria;
  return categoria.nombre || null;
};

export const EventoDetalleModal = ({ evento, isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen || !evento) return null;

  const imagenUrl = evento.adjunto?.[0]?.url
    ? `${evento.adjunto[0].url.startsWith("http") ? "" : BASE_URL}${evento.adjunto[0].url}`
    : null;

  const fechaHora = evento.fechaEvento
    ? moment(
        `${evento.fechaEvento} ${evento.horaEvento || "00:00"}`,
        "YYYY-MM-DD HH:mm",
      )
    : null;

  const precioTexto = formatPrecio(evento);
  const categoriaNombre = getCategoriaNombre(evento.categoria);

  const handleVerCompleta = () => {
    onClose();
    navigate(getRutaDetalle(evento.tag, evento._id));
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {imagenUrl && (
          <div className="w-full h-40 sm:h-56 bg-gray-100 flex-shrink-0">
            <img
              src={imagenUrl}
              alt={evento.titulo}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">
              {evento.titulo}
            </h3>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"
            >
              <FaTimes />
            </button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-600">
            {fechaHora && fechaHora.isValid() && (
              <span className="flex items-center gap-1">
                <FaClock className="text-gray-400" />
                {fechaHora.format("dddd D [de] MMMM, h:mm A")}
              </span>
            )}
            {categoriaNombre && (
              <span className="flex items-center gap-1">
                <FaTag className="text-gray-400" />
                {categoriaNombre}
              </span>
            )}
          </div>

          {precioTexto && (
            <div className="mt-3">
              <span className="inline-block px-2 py-1 rounded bg-emerald-600 text-white text-xs font-semibold">
                {precioTexto}
              </span>
            </div>
          )}

          {evento.contenido && (
            <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">
              {evento.contenido}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
            >
              Cerrar
            </button>
            <button
              onClick={handleVerCompleta}
              className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Ver publicación completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventoDetalleModal;
