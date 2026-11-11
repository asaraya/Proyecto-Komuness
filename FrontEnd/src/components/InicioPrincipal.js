import React from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { CarruselPortada } from "./CarruselPortada";
import { CuentasRegresivas } from "./CuentasRegresivas";
import "../CSS/inicioPrincipal.css";

export const InicioPrincipal = ({ inicioData, acercaData, cargando, heroImage, cuentasRegresivas }) => {
  // Imágenes y videos de proyectos (los administra "Acerca de").
  const medios = (acercaData?.imagenesProyectos || []).filter(Boolean);
  // Mientras carga se reserva el espacio de la galería para que la
  // portada no salte; si no hay nada que mostrar, queda una franja
  // con el patrón y la marca.
  const conGaleria = cargando || medios.length > 0;
  const eslogan = inicioData?.eslogan || "";
  const frase = inicioData?.frase || "";
  const redes = {
    facebook: acercaData?.contactos?.facebook || "https://www.facebook.com/komuness",
    instagram: acercaData?.contactos?.instagram || "https://www.instagram.com/komunesscr/",
  };

  return (
    <main className="hero-wrapper">
      {/* Portada: la galería ocupa la primera pantalla y la marca va
          encima, abajo a la izquierda. El patrón del sitio queda atenuado
          detrás para no competir con las fotos. */}
      <div className="hero-portada">
        <div className="hero-portada-stage">
          {conGaleria ? (
            <div className="hero-portada-media">
              <CarruselPortada medios={medios} cargando={cargando} />
            </div>
          ) : (
            <div
              className="hero-portada-solo"
              style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
            />
          )}
          <span className="hero-portada-word">
            Komuness<span className="hero-portada-dot" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Banda sólida: presentación (título + descripción breve) */}
      <section className="hero-copy-band">
        <div className="hero-copy">
          <h1 className="hero-copy-title">
            {eslogan || "Comunidad, arte y cooperación en un mismo espacio"}
          </h1>
          {/* La frase la escribe administración; si no hay, no se
              muestra ningún texto de relleno al público. */}
          {(cargando || frase) && (
            <p className="hero-copy-text">{cargando ? "Cargando..." : frase}</p>
          )}

          <div className="hero-copy-acciones">
            <Link to="/publicaciones" className="hero-copy-btn">
              Ir a publicaciones
            </Link>

            <div className="hero-copy-redes" aria-label="Redes sociales de Komuness">
              {redes.facebook && (
                <a
                  href={redes.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook de Komuness"
                >
                  <FaFacebookF />
                </a>
              )}
              {redes.instagram && (
                <a
                  href={redes.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram de Komuness"
                >
                  <FaInstagram />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* UI65: cuentas regresivas (se oculta sola si no hay ninguna) */}
      <CuentasRegresivas cuentas={cuentasRegresivas} />
    </main>
  );
};

export default InicioPrincipal;