import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaExpand,
  FaPause,
  FaPlay,
  FaTimes,
} from "react-icons/fa";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import "../CSS/carruselPortada.css";

// Galería de la portada (Home). Muestra las imágenes y videos que
// administración sube en "Acerca de" → imagenesProyectos.
//
// El deslizamiento usa scroll nativo con scroll-snap: en el celular el
// gesto se siente como el del sistema y no hay que reimplementar física.
// Los botones y los puntos solo mueven ese mismo scroll.
//
// Formas de avanzar: pasa sola cada INTERVALO_MS, deslizando con el dedo,
// tocando la mitad izquierda/derecha de la imagen, con las líneas de abajo
// o con las flechas del teclado.

const VIDEO_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;
export const esVideo = (src) => VIDEO_RE.test(src || "");

// Con más elementos que esto, los puntos dejan de caber y se muestra
// un contador "3 / 24" en su lugar.
const MAX_PUNTOS = 8;

// Cada cuánto pasa sola a la siguiente (igual que la publicidad).
const INTERVALO_MS = 8000;

const prefiereMenosMovimiento = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Medio = ({ src, indice, total, controles = false, className }) => {
  const [roto, setRoto] = useState(false);
  const etiqueta = `Proyecto de Komuness, ${indice + 1} de ${total}`;

  if (roto) {
    return <div className={`${className} hc-media--roto`} role="img" aria-label={etiqueta} />;
  }

  if (esVideo(src)) {
    return (
      <video
        className={className}
        src={src}
        muted={!controles}
        controls={controles}
        playsInline
        loop={!controles}
        preload="metadata"
        aria-label={etiqueta}
        onError={() => setRoto(true)}
      />
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={etiqueta}
      loading={indice === 0 ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setRoto(true)}
    />
  );
};

export const CarruselPortada = ({ medios = [], cargando = false }) => {
  const trackRef = useRef(null);
  const cerrarRef = useRef(null);
  const origenFocoRef = useRef(null);
  // Índice al que va un scroll suave en curso: permite tocar "siguiente"
  // varias veces seguidas sin que se pierdan clics a medio camino.
  const destinoRef = useRef(null);
  const limpiarDestinoRef = useRef(0);
  const [actual, setActual] = useState(0);
  const [ampliado, setAmpliado] = useState(null);
  // Pausa elegida por la persona con el botón (arranca en pausa si el
  // sistema pide menos movimiento).
  const [pausado, setPausado] = useState(prefiereMenosMovimiento);
  // Pausas automáticas: mouse encima, foco del teclado dentro o pestaña oculta.
  const [encima, setEncima] = useState(false);
  const [conFoco, setConFoco] = useState(false);
  const [oculta, setOculta] = useState(
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
  const total = medios.length;

  useLockBodyScroll(ampliado !== null);

  useEffect(() => () => clearTimeout(limpiarDestinoRef.current), []);

  // El índice visible sale de la posición del scroll, así coincide
  // tanto con el gesto como con los botones.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const ancho = track.clientWidth || 1;
        const i = Math.round(track.scrollLeft / ancho);
        setActual(Math.max(0, Math.min(total - 1, i)));
        if (
          destinoRef.current !== null &&
          Math.abs(track.scrollLeft - destinoRef.current * ancho) < 2
        ) {
          destinoRef.current = null;
        }
      });
    };
    // Si la persona desliza con el dedo o la rueda, manda su gesto.
    const onGesto = () => {
      destinoRef.current = null;
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("touchmove", onGesto, { passive: true });
    track.addEventListener("wheel", onGesto, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("touchmove", onGesto);
      track.removeEventListener("wheel", onGesto);
      cancelAnimationFrame(frame);
    };
  }, [total]);

  // Si la lista cambia (admin borra imágenes), no quedar en un índice que ya no existe.
  useEffect(() => {
    if (actual > total - 1) setActual(Math.max(0, total - 1));
  }, [actual, total]);

  // Solo el video visible se reproduce.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.querySelectorAll("video").forEach((video) => {
      const slide = video.closest("[data-indice]");
      const visible = Number(slide?.dataset.indice) === actual;
      if (visible && !prefiereMenosMovimiento()) {
        video.play?.().catch(() => {});
      } else {
        video.pause?.();
      }
    });
  }, [actual, total]);

  // circular: después de la última vuelve a la primera (y al revés).
  const irA = useCallback(
    (i, { circular = false } = {}) => {
      const track = trackRef.current;
      if (!track || total === 0) return;
      const destino = circular
        ? ((i % total) + total) % total
        : Math.max(0, Math.min(total - 1, i));
      destinoRef.current = destino;
      // Por si el scroll suave nunca llega (pestaña en segundo plano).
      clearTimeout(limpiarDestinoRef.current);
      limpiarDestinoRef.current = setTimeout(() => {
        destinoRef.current = null;
      }, 900);
      track.scrollTo({
        left: destino * track.clientWidth,
        behavior: prefiereMenosMovimiento() ? "auto" : "smooth",
      });
    },
    [total]
  );

  const abrir = (i, evento) => {
    origenFocoRef.current = evento?.currentTarget || document.activeElement;
    setAmpliado(i);
  };

  const cerrar = useCallback(() => {
    setAmpliado(null);
    // Devolver el foco a donde estaba antes de abrir.
    requestAnimationFrame(() => origenFocoRef.current?.focus?.());
  }, []);

  // Teclado en la vista ampliada: Esc cierra, flechas recorren.
  useEffect(() => {
    if (ampliado === null) return undefined;
    cerrarRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") cerrar();
      if (e.key === "ArrowRight") setAmpliado((i) => Math.min(total - 1, i + 1));
      if (e.key === "ArrowLeft") setAmpliado((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ampliado, total, cerrar]);

  // Al cerrar la vista ampliada, el carrusel queda en la misma imagen.
  useEffect(() => {
    if (ampliado !== null && ampliado !== actual) irA(ampliado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ampliado]);

  // Base para "anterior/siguiente": el destino pendiente, si lo hay.
  const base = () => destinoRef.current ?? actual;

  useEffect(() => {
    const onVisibilidad = () => setOculta(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibilidad);
    return () => document.removeEventListener("visibilitychange", onVisibilidad);
  }, []);

  // Pasa sola. El temporizador se reinicia cada vez que cambia la imagen,
  // así que si la persona avanza a mano, cuenta de nuevo desde ahí.
  const enPausa =
    pausado || encima || conFoco || oculta || ampliado !== null || total < 2;
  useEffect(() => {
    if (enPausa) return undefined;
    const t = setTimeout(() => irA(actual + 1, { circular: true }), INTERVALO_MS);
    return () => clearTimeout(t);
  }, [enPausa, actual, irA]);

  // Tocar o hacer clic en la mitad izquierda devuelve; en la derecha avanza.
  const onClickImagen = (e) => {
    if (total < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const izquierda = e.clientX - rect.left < rect.width / 2;
    irA(base() + (izquierda ? -1 : 1), { circular: true });
  };

  const onKeyDownCarrusel = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      irA(base() + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      irA(base() - 1);
    }
  };

  if (cargando && total === 0) {
    return <div className="hc hc--cargando" aria-busy="true" aria-label="Cargando galería" />;
  }

  if (total === 0) return null;

  const varios = total > 1;

  return (
    <section
      className={`hc${enPausa ? " hc--pausado" : ""}`}
      style={{ "--hc-intervalo": `${INTERVALO_MS}ms` }}
      aria-roledescription="carrusel"
      aria-label="Galería de proyectos de Komuness"
      onKeyDown={onKeyDownCarrusel}
      onPointerEnter={(e) => e.pointerType === "mouse" && setEncima(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setEncima(false)}
      // Solo el foco del teclado pausa: un clic del mouse en las líneas o en
      // "reanudar" también deja el foco ahí, y no debe frenar el carrusel.
      onFocus={(e) => setConFoco(e.target.matches?.(":focus-visible") ?? false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setConFoco(false);
      }}
    >
      <div
        className={`hc-track${varios ? " hc-track--tocable" : ""}`}
        ref={trackRef}
        tabIndex={-1}
        onClick={onClickImagen}
      >
        {medios.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="hc-slide"
            data-indice={i}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== actual}
          >
            <Medio src={src} indice={i} total={total} className="hc-media" />
          </div>
        ))}
      </div>

      {/* Sin flechas a los lados: se avanza deslizando, con el teclado o
          con las líneas de abajo, para que la foto quede limpia. */}
      <button
        type="button"
        className="hc-btn hc-expand"
        onClick={(e) => abrir(actual, e)}
        aria-label="Ver en grande"
      >
        <FaExpand aria-hidden="true" />
      </button>

      {varios && (
        <div className="hc-indicador">
          <button
            type="button"
            className="hc-pausa"
            onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? "Reanudar el carrusel" : "Pausar el carrusel"}
            aria-pressed={pausado}
          >
            {pausado ? <FaPlay aria-hidden="true" /> : <FaPause aria-hidden="true" />}
          </button>
          {total <= MAX_PUNTOS ? (
            medios.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`hc-dot ${i === actual ? "hc-dot--activo" : ""}`}
                onClick={() => irA(i)}
                aria-label={`Ir a la imagen ${i + 1}`}
                aria-current={i === actual ? "true" : undefined}
              >
                {/* Barra que se llena mientras corre el tiempo. El key la
                    reinicia en cada imagen y al reanudar, igual que el
                    temporizador, para que ambos vayan siempre juntos. */}
                {i === actual && !enPausa && (
                  <span key={actual} className="hc-progreso" aria-hidden="true" />
                )}
              </button>
            ))
          ) : (
            <span className="hc-contador">
              <button
                type="button"
                className="hc-contador-btn"
                onClick={() => irA(base() - 1)}
                disabled={actual === 0}
                aria-label="Imagen anterior"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>
              <span aria-live="polite">
                {actual + 1} / {total}
              </span>
              <button
                type="button"
                className="hc-contador-btn"
                onClick={() => irA(base() + 1)}
                disabled={actual === total - 1}
                aria-label="Imagen siguiente"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}

      {ampliado !== null && createPortal(
        <div
          className="hc-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ${ampliado + 1} de ${total}`}
          onClick={cerrar}
        >
          <button
            ref={cerrarRef}
            type="button"
            className="hc-btn hc-modal-cerrar"
            onClick={cerrar}
            aria-label="Cerrar"
          >
            <FaTimes aria-hidden="true" />
          </button>

          <div className="hc-modal-medio" onClick={(e) => e.stopPropagation()}>
            <Medio
              key={medios[ampliado]}
              src={medios[ampliado]}
              indice={ampliado}
              total={total}
              controles
              className="hc-modal-media"
            />
          </div>

          {varios && (
            <>
              <button
                type="button"
                className="hc-btn hc-nav hc-nav--prev hc-modal-nav"
                onClick={(e) => {
                  e.stopPropagation();
                  setAmpliado((i) => Math.max(0, i - 1));
                }}
                disabled={ampliado === 0}
                aria-label="Imagen anterior"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                className="hc-btn hc-nav hc-nav--next hc-modal-nav"
                onClick={(e) => {
                  e.stopPropagation();
                  setAmpliado((i) => Math.min(total - 1, i + 1));
                }}
                disabled={ampliado === total - 1}
                aria-label="Imagen siguiente"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
              <span className="hc-modal-contador">
                {ampliado + 1} / {total}
              </span>
            </>
          )}
        </div>,
        document.body
      )}
    </section>
  );
};

export default CarruselPortada;
