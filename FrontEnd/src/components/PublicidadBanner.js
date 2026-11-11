// src/components/PublicidadBanner.js
import React, { useEffect, useState } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaArrowRight,
  FaTimes,
  FaEdit,
  FaTrash,
  FaRegCalendarAlt,
} from "react-icons/fa";
import "../CSS/publicaciones.css";

const INTERVALO_MS = 8000;
const COLOR_RESPALDO = "rgb(31, 41, 55)"; // gray-800

// Las fechas vienen de un <input type="date"> y se guardan como medianoche UTC,
// por eso se formatean en UTC (si no, en Costa Rica se mostraría el día anterior)
const formatearDia = (fecha) =>
  new Date(fecha).toLocaleDateString("es-CR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  });

/** "13 de noviembre" · "13 al 15 de noviembre" · "30 de octubre al 2 de noviembre" */
export const formatearRangoFechas = (inicio, fin) => {
  if (!inicio) return "";
  const a = new Date(inicio);
  const b = fin ? new Date(fin) : null;
  if (!b || a.getTime() === b.getTime()) return formatearDia(inicio);
  if (
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCFullYear() === b.getUTCFullYear()
  ) {
    return `${a.getUTCDate()} al ${formatearDia(fin)}`;
  }
  return `${formatearDia(inicio)} al ${formatearDia(fin)}`;
};

/** Convierte el color promedio a un tono oscuro y no muy saturado, para que el texto blanco siempre se lea */
const tonoDeFondo = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const sat = Math.round(Math.min(s, 0.6) * 100);
  const luz = Math.round(Math.min(Math.max(l, 0.18), 0.28) * 100);
  return `hsl(${Math.round(h)} ${sat}% ${luz}%)`;
};

// Para no recalcular el color cada vez que el carrusel vuelve a la misma imagen
const cacheColores = new Map();

/** Color predominante de la imagen (promedio ponderado por saturación) */
const useColorDeImagen = (src) => {
  const [color, setColor] = useState(
    () => cacheColores.get(src) ?? COLOR_RESPALDO,
  );

  useEffect(() => {
    if (!src) return;
    if (cacheColores.has(src)) {
      setColor(cacheColores.get(src));
      return;
    }

    let cancelado = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const lado = 24;
        const canvas = document.createElement("canvas");
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, lado, lado);
        const { data } = ctx.getImageData(0, 0, lado, lado);

        let r = 0;
        let g = 0;
        let b = 0;
        let peso = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue; // ignorar transparentes
          // Los píxeles más saturados pesan más, para no terminar siempre en gris
          const max = Math.max(data[i], data[i + 1], data[i + 2]);
          const min = Math.min(data[i], data[i + 1], data[i + 2]);
          const w = 1 + (max - min) / 32;
          r += data[i] * w;
          g += data[i + 1] * w;
          b += data[i + 2] * w;
          peso += w;
        }
        if (!peso) return;

        const resultado = tonoDeFondo(r / peso, g / peso, b / peso);
        cacheColores.set(src, resultado);
        if (!cancelado) setColor(resultado);
      } catch {
        // Si el servidor no envía CORS, el canvas queda bloqueado: se usa el color de respaldo
      }
    };
    img.src = src;

    return () => {
      cancelado = true;
    };
  }, [src]);

  return color;
};

const EtiquetaPublicidad = () => (
  <span className="inline-block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-white/15 text-white/90">
    Publicidad
  </span>
);

/** Tira compacta. Se exporta para usarla también como vista previa en el formulario */
export const TiraPublicidad = ({ publicidad, onClick, children }) => {
  const color = useColorDeImagen(publicidad.imagen);
  // Las publicidades viejas no tienen título: se usa la descripción
  const titulo = publicidad.titulo || publicidad.descripcion;
  const fechas = formatearRangoFechas(
    publicidad.fechaInicioEvento,
    publicidad.fechaFinEvento,
  );
  const subtitulo = [fechas, publicidad.titulo ? publicidad.descripcion : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ backgroundColor: color }}
      className="group relative flex items-stretch h-28 sm:h-32 md:h-36 rounded-2xl overflow-hidden cursor-pointer shadow-lg ring-1 ring-white/10 hover:ring-white/30 transition-colors duration-500"
    >
      {/* Imagen a todo el alto, pegada al borde */}
      <div className="h-full aspect-square flex-shrink-0 overflow-hidden bg-black/20">
        {publicidad.imagen && (
          <img
            src={publicidad.imagen}
            alt={titulo}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center px-4 sm:px-6">
        <div>
          <EtiquetaPublicidad />
        </div>
        <p className="mt-1.5 text-white font-semibold text-base sm:text-xl md:text-2xl leading-tight truncate">
          {titulo}
        </p>
        {subtitulo && (
          <p className="mt-1 text-white/80 text-xs sm:text-sm truncate">
            {fechas && (
              <FaRegCalendarAlt className="inline mr-1.5 -mt-0.5" />
            )}
            {subtitulo}
          </p>
        )}
      </div>

      <span className="hidden sm:flex items-center gap-2 self-center flex-shrink-0 mr-6 bg-white text-gray-900 text-sm font-semibold px-5 py-2.5 rounded-full transition-all group-hover:gap-3">
        Ver más <FaArrowRight size={12} />
      </span>
      <span className="sm:hidden self-center flex-shrink-0 mr-3 text-white/80">
        <FaChevronRight />
      </span>

      {children}
    </div>
  );
};

/** Vista ampliada: oscurece el fondo y muestra la imagen completa + descripción */
const LightboxPublicidad = ({ publicidad, onClose }) => {
  const color = useColorDeImagen(publicidad.imagen);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [onClose]);

  const fechas = formatearRangoFechas(
    publicidad.fechaInicioEvento,
    publicidad.fechaFinEvento,
  );

  return (
    <div
      className="publicidad-aparecer fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={publicidad.titulo || "Publicidad"}
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: color }}
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 flex flex-col md:flex-row"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <FaTimes />
        </button>

        <div className="md:w-3/5 bg-black/40 flex items-center justify-center">
          <img
            src={publicidad.imagen}
            alt={publicidad.titulo || "Publicidad"}
            className="w-full max-h-[50vh] md:max-h-[90vh] object-contain"
          />
        </div>

        <div className="md:w-2/5 p-5 sm:p-7 overflow-y-auto">
          <EtiquetaPublicidad />
          {publicidad.titulo && (
            <h3 className="mt-3 pr-8 text-xl sm:text-2xl font-semibold leading-tight text-white">
              {publicidad.titulo}
            </h3>
          )}
          {fechas && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-white">
              <FaRegCalendarAlt /> {fechas}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-white/85 whitespace-pre-line">
            {publicidad.descripcion}
          </p>
        </div>
      </div>
    </div>
  );
};

const PublicidadBanner = ({ publicidades, esAdmin, onEditar, onEliminar }) => {
  const [indice, setIndice] = useState(0);
  const [abierta, setAbierta] = useState(false);
  const total = publicidades.length;

  // Si se elimina una publicidad y el índice queda fuera de rango
  useEffect(() => {
    if (indice >= total) setIndice(Math.max(0, total - 1));
  }, [total, indice]);

  if (total === 0) return null;

  const actual = publicidades[Math.min(indice, total - 1)];
  const ir = (paso) => setIndice((i) => (i + paso + total) % total);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div key={actual._id} className="publicidad-aparecer">
        <TiraPublicidad publicidad={actual} onClick={() => setAbierta(true)}>
          {/* Barra de avance: al terminar su animación pasa a la siguiente.
              Se pausa con el detalle abierto. */}
          {total > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/15">
              <div
                key={indice}
                className="publicidad-progreso h-full bg-white/70"
                style={{
                  "--duracion": `${INTERVALO_MS}ms`,
                  animationPlayState: abierta ? "paused" : "running",
                }}
                onAnimationEnd={() => ir(1)}
              />
            </div>
          )}
        </TiraPublicidad>
      </div>

      {(total > 1 || esAdmin) && (
        <div className="mt-2 grid grid-cols-3 items-center">
          <div className="col-start-2 flex items-center justify-center gap-2">
            {total > 1 && (
              <>
                <button
                  onClick={() => ir(-1)}
                  aria-label="Publicidad anterior"
                  className="p-1.5 text-gray-400 hover:text-white"
                >
                  <FaChevronLeft size={12} />
                </button>
                {publicidades.map((p, i) => (
                  <button
                    key={p._id}
                    onClick={() => setIndice(i)}
                    aria-label={`Ir a la publicidad ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === indice
                        ? "w-5 bg-white"
                        : "w-1.5 bg-gray-500 hover:bg-gray-400"
                    }`}
                  />
                ))}
                <button
                  onClick={() => ir(1)}
                  aria-label="Publicidad siguiente"
                  className="p-1.5 text-gray-400 hover:text-white"
                >
                  <FaChevronRight size={12} />
                </button>
              </>
            )}
          </div>

          {/* EDITAR Y BORRAR SOLO PARA ADMINS */}
          {esAdmin && (
            <div className="col-start-3 flex justify-end gap-1">
              <button
                onClick={() => onEditar(actual)}
                aria-label="Editar publicidad"
                title="Editar"
                className="p-2 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-white/10"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => onEliminar(actual)}
                aria-label="Eliminar publicidad"
                title="Eliminar"
                className="p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-white/10"
              >
                <FaTrash />
              </button>
            </div>
          )}
        </div>
      )}

      {abierta && (
        <LightboxPublicidad
          publicidad={actual}
          onClose={() => setAbierta(false)}
        />
      )}
    </div>
  );
};

export default PublicidadBanner;