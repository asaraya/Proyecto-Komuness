import { useState } from "react";
import {
  FaFacebook,
  FaInstagram,
  FaGraduationCap,
  FaBriefcase,
  FaTrophy,
  FaLink,
  FaHandsHelping,
  FaHandHoldingHeart,
  FaHistory,
  FaBullseye,
  FaEye,
} from "react-icons/fa";
import "../CSS/quienesSomosSection.css";

// Los seis campos de "Acerca de" se muestran como tarjetas, cada uno
// completo (sin recortar), con un ícono propio pero un único color
// de acento para que la cuadrícula se sienta unificada.
const CAPITULOS = [
  { key: "queHacemos", label: "Qué hacemos", icon: FaHandsHelping },
  { key: "motivacion", label: "Nuestra motivación", icon: FaHandHoldingHeart },
  { key: "historia", label: "Nuestra historia", icon: FaHistory },
  { key: "mision", label: "Misión", icon: FaBullseye },
  { key: "vision", label: "Visión", icon: FaEye },
  { key: "impacto", label: "El impacto que construimos", icon: FaBullseye },
];

export const QuienesSomosSection = ({ data }) => {
  const [expandedMember, setExpandedMember] = useState(null);

  if (!data) return null;

  const equipo = data.equipo || [];
  const donaciones = data.informacionDonaciones || {};
  const contactos = data.contactos || {};
  const capitulos = CAPITULOS.filter((c) => data[c.key]);

  const toggleMember = (index) =>
    setExpandedMember((current) => (current === index ? null : index));

  return (
    <div className="qs-root" id="quienes-somos">
      {/* Banda sólida: continúa el color de la banda de presentación del hero */}
      <section className="qs-block qs-intro">
        <div className="qs-intro-inner">
          <h2 className="qs-eyebrow-free">{data.titulo || "Quiénes somos"}</h2>
          <p className="qs-lede">{data.contenido}</p>
        </div>
      </section>

      {/* Banda con patrón: aquí vuelve el fondo del hero, con capa oscura
          encima para que el texto blanco siempre tenga contraste */}
      {capitulos.length > 0 && (
        <section className="qs-chapters-band">
          <div className="qs-chapters-band-overlay" />
          <div className="qs-chapters-grid">
            {capitulos.map(({ key, label, icon: Icon }) => (
              <article key={key} className="qs-chapter-card">
                <span className="qs-chapter-icon">
                  <Icon />
                </span>
                <h3 className="qs-chapter-label">{label}</h3>
                <p className="qs-chapter-text">{data[key]}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Equipo */}
      {equipo.length > 0 && (
        <section className="qs-block qs-equipo">
          <h3 className="qs-block-title">Nuestro equipo</h3>
          <div className="qs-equipo-grid">
            {equipo.map((miembro, index) => (
              <div key={index} className="qs-member">
                <button
                  type="button"
                  className="qs-member-header"
                  onClick={() => toggleMember(index)}
                >
                  {miembro.imagen ? (
                    <img
                      src={miembro.imagen}
                      alt={miembro.nombre}
                      className="qs-member-photo"
                    />
                  ) : (
                    <div className="qs-member-photo qs-member-photo--fallback">
                      {miembro.nombre
                        ? miembro.nombre.split(" ").map((n) => n[0]).join("")
                        : "?"}
                    </div>
                  )}
                  <div className="qs-member-heading">
                    <span className="qs-member-name">{miembro.nombre}</span>
                    <span className="qs-member-role">{miembro.puesto}</span>
                  </div>
                </button>

                <p className="qs-member-bio">{miembro.descripcion}</p>

                {expandedMember === index && (
                  <div className="qs-member-details">
                    {miembro.formacion?.length > 0 && (
                      <div className="qs-member-detail-group">
                        <span className="qs-member-detail-label">
                          <FaGraduationCap /> Formación
                        </span>
                        <ul>
                          {miembro.formacion.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {miembro.experiencia?.length > 0 && (
                      <div className="qs-member-detail-group">
                        <span className="qs-member-detail-label">
                          <FaBriefcase /> Experiencia
                        </span>
                        <ul>
                          {miembro.experiencia.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {miembro.proyectosDestacados?.length > 0 && (
                      <div className="qs-member-detail-group">
                        <span className="qs-member-detail-label">
                          <FaTrophy /> Proyectos destacados
                        </span>
                        <ul>
                          {miembro.proyectosDestacados.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {miembro.enlaces?.length > 0 && (
                      <div className="qs-member-detail-group">
                        <span className="qs-member-detail-label">
                          <FaLink /> Enlaces
                        </span>
                        <div className="qs-member-links">
                          {miembro.enlaces.map((enlace, i) => (
                            <a
                              key={i}
                              href={enlace.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {enlace.nombre}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cómo colaborar (incluye ya redes sociales del pie, así que no se
          repite aquí una sección de contacto aparte) */}
      <section className="qs-block qs-colaborar">
        <h3 className="qs-block-title">Formas de colaborar</h3>
        <div className="qs-colaborar-grid">
          <div className="qs-colaborar-card">
            <span className="qs-colaborar-heading">Donación monetaria</span>
            <dl className="qs-bank-list">
              <div>
                <dt>Cooperativa</dt>
                <dd>Cooperativa Autogestionaria Y De Servicios R.L.</dd>
              </div>
              <div>
                <dt>Cédula jurídica</dt>
                <dd>{donaciones.cedulaJuridica}</dd>
              </div>
              <div>
                <dt>Banco</dt>
                <dd>BANCOPOPULAR</dd>
              </div>
              <div>
                <dt>IBAN</dt>
                <dd>{donaciones.iban}</dd>
              </div>
              <div>
                <dt>Cuenta</dt>
                <dd>{donaciones.cuentaBancaria}</dd>
              </div>
              <div>
                <dt>Nombre de cuenta</dt>
                <dd>{donaciones.nombreCuenta}</dd>
              </div>
            </dl>
          </div>

          {donaciones.donacionesEspecie?.length > 0 && (
            <div className="qs-colaborar-card">
              <span className="qs-colaborar-heading">Donación en especie</span>
              <ul className="qs-especie-list">
                {donaciones.donacionesEspecie.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {(contactos.telefono || contactos.email) && (
            <div className="qs-colaborar-card">
              <span className="qs-colaborar-heading">Contacto directo</span>
              <dl className="qs-bank-list">
                {contactos.telefono && (
                  <div>
                    <dt>Teléfono</dt>
                    <dd>{contactos.telefono}</dd>
                  </div>
                )}
                {contactos.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>{contactos.email}</dd>
                  </div>
                )}
              </dl>
              {(contactos.facebook || contactos.instagram) && (
                <div className="qs-colaborar-social">
                  {contactos.facebook && (
                    <a
                      href={contactos.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                    >
                      <FaFacebook />
                    </a>
                  )}
                  {contactos.instagram && (
                    <a
                      href={contactos.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                    >
                      <FaInstagram />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default QuienesSomosSection;