import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCoins,
  FaMapMarkerAlt,
  FaPause,
  FaPlay,
  FaRegCalendarAlt,
} from "react-icons/fa";
import { API_URL, BASE_URL } from "../utils/api";
import { CategoriaBadge } from "./generic/categoriaBadge";
import { getRutaDetalle } from "../utils/secciones";
import "../CSS/carruselGenerico.css";

const MESES = [
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

const CONFIG_TIPOS = {
  evento: {
    titulo: "Eventos",
    subtitulo: "Conoce los próximos eventos de la comunidad",
    placeholder: "🎭",
    ver: "Ver evento",
    singular: "evento",
    plural: "eventos",
    aria: "Evento",
  },
  emprendimiento: {
    titulo: "Emprendimientos Destacados",
    subtitulo: "Conoce los emprendimientos que impulsan a nuestra comunidad",
    placeholder: "🛍️",
    ver: "Ver emprendimiento",
    singular: "emprendimiento",
    plural: "emprendimientos",
    aria: "Emprendimiento",
  },
  publicacion: {
    titulo: "Publicaciones Recientes",
    subtitulo: "Las noticias e información más recientes de la comunidad",
    placeholder: "📢",
    ver: "Ver publicación",
    singular: "publicación",
    plural: "publicaciones",
    aria: "Publicación",
  },
};

const formatFecha = (item) => {
  const fechaEvento = item?.fechaEvento || item?.fecha;
  if (!fechaEvento) {
    return "Fecha por confirmar";
  }
  const fechaSinHora = fechaEvento.split("T")[0] || "";
  const partes = fechaSinHora.split("-");
  if (partes.length !== 3) {
    return fechaEvento;
  }
  const [anio, mes, dia] = partes.map((numero) => parseInt(numero, 10));
  const fecha = new Date(anio, mes - 1, dia);
  if (Number.isNaN(fecha.getTime())) {
    return fechaEvento;
  }
  let texto =
    `${fecha.getDate()} de ` +
    `${MESES[fecha.getMonth()]} de ` +
    `${fecha.getFullYear()}`;
  if (item.horaEvento) {
    texto += ` · ${item.horaEvento}`;
  }
  return texto;
};

const formatPrecio = (item) => {
  if (item?.precioNegociable === true) {
    return "Precio negociable";
  }
  const rawPrecio = item?.precio ?? item?.Precio;
  const precio =
    typeof rawPrecio === "number" ? rawPrecio : parseFloat(rawPrecio);
  if (!Number.isFinite(precio)) {
    return null;
  }
  const moneda = item?.moneda === "USD" ? { simbolo: "$", locale: "en-US" } : { simbolo: "₡", locale: "es-CR" };
  return `${moneda.simbolo} ${precio.toLocaleString(moneda.locale)}`;
};

const getImagen = (item) => {
  const url = item?.adjunto?.[0]?.url;
  if (!url) {
    return null;
  }
  if (url.startsWith("http")) {
    return url;
  }
  return `${BASE_URL}${url}`;
};

export const CarruselGenerico = ({ tipo, filtros }) => {
  const navigate = useNavigate();
  const swiperRef = useRef(null);

  const config = CONFIG_TIPOS[tipo] || CONFIG_TIPOS.publicacion;
  const hayFiltros = Boolean(
    filtros &&
      (filtros.categoria ||
        filtros.fechaInicio ||
        filtros.fechaFin ||
        filtros.precioMin ||
        filtros.precioMax ||
        filtros.comunidad)
  );

  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [autoplayActivo, setAutoplayActivo] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        const params = new URLSearchParams({
          tag: tipo,
          publicado: "true",
          limit: "100",
        });

        if (filtros?.categoria) {
          params.set("categoria", filtros.categoria);
        }
        if (filtros?.fechaInicio) {
          params.set("fechaInicio", filtros.fechaInicio);
        }
        if (filtros?.fechaFin) {
          params.set("fechaFin", filtros.fechaFin);
        }
        if (filtros?.precioMin) {
          params.set("precioMin", String(filtros.precioMin));
        }
        if (filtros?.precioMax) {
          params.set("precioMax", String(filtros.precioMax));
        }
        if (filtros?.comunidad) {
          params.set("comunidad", filtros.comunidad);
        }

        const itemsRes = await fetch(
          `${API_URL}/publicaciones?${params.toString()}`
        );

        let itemsData = null;
        if (itemsRes.ok) {
          itemsData = await itemsRes.json().catch(() => null);
        } else {
          console.error(
            `Error cargando ${config.plural}:`,
            itemsRes.status
          );
        }

        setItems(itemsData?.data || []);
      } catch (error) {
        console.error(
          `Error al cargar el carrusel de ${config.plural}:`,
          error
        );
        setItems([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [tipo, filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemsVisibles = items;
  const tieneVarios = itemsVisibles.length > 1;

  const calcularSlides = useCallback(
    (maximo) => {
      const cantidad = itemsVisibles.length;
      if (cantidad <= 1) {
        return 1;
      }
      const limite = cantidad - 0.4;
      return Math.min(maximo, limite);
    },
    [itemsVisibles.length]
  );

  const irAnterior = useCallback(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) {
      return;
    }
    swiper.slidePrev(750);
  }, []);

  const irSiguiente = useCallback(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) {
      return;
    }
    swiper.slideNext(750);
  }, []);

  useEffect(() => {
    if (!autoplayActivo || !tieneVarios) {
      return undefined;
    }

    const intervalo = setInterval(() => {
      const swiper = swiperRef.current;
      if (!swiper || swiper.destroyed) {
        return;
      }
      swiper.slideNext(750);
    }, 3500);

    return () => {
      clearInterval(intervalo);
    };
  }, [autoplayActivo, tieneVarios]);

  const toggleAutoplay = () => {
    setAutoplayActivo((estadoActual) => !estadoActual);
  };

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiper.destroyed) {
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!swiper.destroyed) {
        swiper.update();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [itemsVisibles.length]);

  const esEvento = tipo === "evento";
  const mostrarMetaFecha =
    tipo === "evento" || tipo === "publicacion";
  const mostrarMetaPrecio =
    tipo === "emprendimiento" || tipo === "evento";

  return (
    <section
      className="
        carrusel-eventos-section
        py-8
        px-3
        sm:px-6
        md:px-10
      "
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h2
            className="
              carrusel-eventos-titulo
              text-2xl
              sm:text-3xl
              md:text-4xl
            "
          >
            {config.titulo}
          </h2>

          <p
            className="
              carrusel-eventos-subtitulo
              mt-2
              text-sm
              sm:text-base
            "
          >
            {config.subtitulo}
          </p>
        </div>

        {cargando ? (
          <div className="flex justify-center items-center h-64">
            <div
              className="
                animate-spin
                rounded-full
                h-12
                w-12
                border-b-2
                border-yellow-400
              "
            />
          </div>
        ) : itemsVisibles.length === 0 ? (
          <p className="carrusel-vacio text-base sm:text-lg">
            {
              hayFiltros
                ? `No hay ${config.plural} que coincidan con los filtros aplicados.`
                : `Aún no hay ${config.plural} publicados.`
            }
          </p>
        ) : (
          <div className="carrusel-eventos-swiper">
            <Swiper
              key={tipo}
              modules={[Pagination]}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                setTimeout(() => {
                  if (!swiper.destroyed) {
                    swiper.update();
                  }
                }, 100);
              }}
              speed={750}
              grabCursor={true}
              centeredSlides={true}
              watchSlidesProgress={true}
              rewind={tieneVarios}
              spaceBetween={22}
              slidesPerView={calcularSlides(1.08)}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}

              breakpoints={{
                0: {
                  slidesPerView: calcularSlides(1.08),
                  spaceBetween: 14,
                },
                500: {
                  slidesPerView: calcularSlides(1.35),
                  spaceBetween: 16,
                },
                640: {
                  slidesPerView: calcularSlides(1.75),
                  spaceBetween: 18,
                },
                900: {
                  slidesPerView: calcularSlides(2.1),
                  spaceBetween: 20,
                },
                1100: {
                  slidesPerView: calcularSlides(2.4),
                  spaceBetween: 22,
                },
                1440: {
                  slidesPerView: calcularSlides(2.6),
                  spaceBetween: 24,
                },
              }}
            >
              {itemsVisibles.map((item) => {
                const imagen = getImagen(item);
                const metaPrecio = mostrarMetaPrecio
                  ? formatPrecio(item)
                  : null;

                return (
                  <SwiperSlide key={item._id}>
                    <div
                      className="carrusel-card"
                      onClick={() =>
                        navigate(getRutaDetalle(tipo, item._id))
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(getRutaDetalle(tipo, item._id));
                        }
                      }}
                    >
                      <div className="carrusel-card-imagen">
                        {imagen ? (
                          <img
                            src={imagen}
                            alt={item.titulo || config.singular}
                            loading="lazy"
                          />
                        ) : (
                          <div className="carrusel-card-imagen-placeholder">
                            {config.placeholder}
                          </div>
                        )}

                        <div className="carrusel-card-gradiente" />

                        {item.categoria && (
                          <div className="carrusel-card-badge">
                            <CategoriaBadge
                              categoria={item.categoria}
                              mobile
                            />
                          </div>
                        )}

                        {esEvento && item.ubicacion?.direccion && (
                          <div
                            className="
                              absolute
                              bottom-2
                              right-2
                              z-10
                              flex
                              items-center
                              gap-1
                              rounded-full
                              bg-black/60
                              px-2
                              py-1
                              text-[11px]
                              text-white
                            "
                          >
                            <FaMapMarkerAlt className="text-yellow-400" />
                            <span className="max-w-[140px] truncate">
                              {item.ubicacion.direccion}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="carrusel-card-body">
                        <h3 className="carrusel-card-titulo">
                          {item.titulo}
                        </h3>

                        {mostrarMetaFecha && (
                          <span className="carrusel-card-fecha">
                            <FaRegCalendarAlt />
                            {formatFecha(item)}
                          </span>
                        )}

                        {metaPrecio && (
                          <span className="carrusel-card-fecha">
                            <FaCoins />
                            {metaPrecio}
                          </span>
                        )}

                        {item.comunidad && (
                          <span className="carrusel-card-fecha">
                            <FaMapMarkerAlt />
                            {item.comunidad}
                          </span>
                        )}

                        <p className="carrusel-card-contenido">
                          {item.contenidoBreve ||
                            item.contenido ||
                            "Sin descripción disponible."}
                        </p>

                        <span className="carrusel-card-ver">
                          {config.ver}
                          <span
                            aria-hidden="true"
                            className="carrusel-flecha-texto"
                          >
                            →
                          </span>
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>

            {tieneVarios && (
              <button
                type="button"
                className="carrusel-btn-nav carrusel-btn-prev"
                onClick={irAnterior}
                aria-label={`${config.aria} anterior`}
                title={`${config.aria} anterior`}
              >
                <FaChevronLeft />
              </button>
            )}

            {tieneVarios && (
              <button
                type="button"
                className="carrusel-btn-nav carrusel-btn-next"
                onClick={irSiguiente}
                aria-label={`Siguiente ${config.aria.toLowerCase()}`}
                title={`Siguiente ${config.aria.toLowerCase()}`}
              >
                <FaChevronRight />
              </button>
            )}

            {tieneVarios && (
              <button
                type="button"
                className={`
                  carrusel-btn-control
                  ${
                    !autoplayActivo
                      ? "carrusel-pausado"
                      : ""
                  }
                `}
                onClick={toggleAutoplay}
                aria-label={
                  autoplayActivo
                    ? "Pausar carrusel"
                    : "Reproducir carrusel"
                }
                title={
                  autoplayActivo
                    ? "Pausar carrusel"
                    : "Reproducir carrusel"
                }
              >
                {autoplayActivo ? (
                  <FaPause size={13} />
                ) : (
                  <FaPlay size={13} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default CarruselGenerico;