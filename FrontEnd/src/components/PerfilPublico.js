import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { API_URL, BASE_URL } from '../utils/api';
import '../CSS/perfilPublico.css';
import { 
  FaLinkedin, FaTwitter, 
  FaInstagram, FaFacebook, FaDownload, FaMoon, FaSun, FaCheck, 
  FaBriefcase, FaGraduationCap, FaUser,
  FaProjectDiagram, FaGlobe, FaCalendarAlt
} from 'react-icons/fa';
import { AiOutlinePhone, AiOutlineEnvironment, AiOutlineMail } from 'react-icons/ai';

const PerfilPublico = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const modo = searchParams.get('modo') || 'completo';
  
  const [perfil, setPerfil] = useState(null);
  const [etiquetas, setEtiquetas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true); 

  useEffect(() => {
    cargarPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, modo]);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/perfil/${id}?modo=${modo}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Perfil no encontrado');
        } else if (response.status === 403) {
          throw new Error('Este perfil no es público');
        }
        throw new Error('Error al cargar el perfil');
      }

      const data = await response.json();
      setPerfil(data.data);

      //Obtener etiquetas
      const responseTags = await fetch(
        `${API_URL}/usuario/${id}/etiquetas`
      );
      const dataTags = await responseTags.json();
      setEtiquetas(dataTags.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="perfil-loading">
        <div className="spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="perfil-error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/" className="btn-volver">Volver al inicio</Link>
      </div>
    );
  }

  if (!perfil) {
    return null;
  }

  return (
    <div className={`perfil-publico-wrapper ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      {/* Header Principal */}
      <header className="perfil-header">
        <div className="perfil-header-content">
          {/* Botón Dark Mode */}
          <div className="dark-mode-toggle">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="theme-toggle-btn"
              aria-label="Cambiar modo oscuro/claro"
            >
              {isDarkMode ? <FaSun className="theme-icon" /> : <FaMoon className="theme-icon" />}
            </button>
          </div>

          {/* Información Principal */}
          <div className="perfil-info-main">
            <div className="perfil-avatar-section">
              {perfil.fotoPerfil ? (
                <img 
                  src={`${BASE_URL}${perfil.fotoPerfil}`} 
                  alt={`${perfil.nombre} ${perfil.apellidos}`}
                  className="perfil-avatar"
                />
              ) : (
                <div className="perfil-avatar-placeholder">
                  <FaUser className="avatar-icon" />
                </div>
              )}
            </div>
            
            <div className="perfil-basic-info">
              <h1 className="perfil-name">
                {perfil.nombre} {perfil.apellidos}
                {perfil.perfilPublico && <FaCheck className="verified-badge" />}
              </h1>
              
              {(perfil.titulo || perfil.ocupacionPrincipal) && (
                <p className="perfil-title">
                  {perfil.titulo || perfil.ocupacionPrincipal}
                </p>
              )}
              
              {perfil.especialidad && (
                <div className="perfil-specialty">
                  <span>{perfil.especialidad}</span>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="perfil-actions">
                {perfil.correoSecundario && (
                  <a 
                    href={`mailto:${perfil.correoSecundario}`}
                    className="btn btn-primary"
                  >
                    <AiOutlineMail className="btn-icon" />
                    Contactar
                  </a>
                )}
                
                {perfil.cvUrl && (
                  <a
                    href={`${BASE_URL}${perfil.cvUrl}`}
                    download
                    className="btn btn-secondary"
                  >
                    <FaDownload className="btn-icon" />
                    Descargar CV
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Etiquetas */}
      
      {etiquetas && etiquetas.length > 0 && (
        <section className="skills-showcase">
          <div className="skills-container">
            {etiquetas.slice(0, 4).map((etiqueta, index) => (
              <div 
                key={index} 
                className={`skill-badge skill-${index + 1}`}
              >
                <span className="skill-name">{etiqueta.nombre}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contenido Principal */}
      <main className="perfil-main-content">
        <div className="content-grid">
          {/* Columna Izquierda - Información Personal */}
          <div className="left-column">
            {/* Información de Contacto */}
            {(perfil.telefono || perfil.correoSecundario || perfil.canton || perfil.provincia) && (
              <div className="info-card contact-info">
                <h2 className="card-title">
                  <FaUser className="card-icon" />
                  Información de Contacto
                </h2>
                
                <div className="contact-list">
                  {perfil.telefono && (
                    <div className="contact-item">
                      <AiOutlinePhone className="contact-icon" />
                      <span className="contact-text">{perfil.telefono}</span>
                    </div>
                  )}
                  
                  {perfil.correoSecundario && (
                    <div className="contact-item">
                      <AiOutlineMail className="contact-icon" />
                      <a href={`mailto:${perfil.correoSecundario}`} className="contact-text">
                        {perfil.correoSecundario}
                      </a>
                    </div>
                  )}
                  
                  {(perfil.canton || perfil.provincia) && (
                    <div className="contact-item">
                      <AiOutlineEnvironment className="contact-icon" />
                      <span className="contact-text">
                        {perfil.canton && perfil.provincia 
                          ? `${perfil.canton}, ${perfil.provincia}`
                          : perfil.canton || perfil.provincia
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Redes Sociales */}
            {perfil.redesSociales && Object.values(perfil.redesSociales).some(val => val) && (
              <div className="info-card social-info">
                <h2 className="card-title">Redes Sociales</h2>
                <div className="social-links">
                  {perfil.redesSociales.linkedin && (
                    <a href={perfil.redesSociales.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                      <FaLinkedin className="social-icon" />
                      <span className="social-text">LinkedIn</span>
                    </a>
                  )}
                  {perfil.redesSociales.twitter && (
                    <a href={perfil.redesSociales.twitter} target="_blank" rel="noopener noreferrer" className="social-link twitter">
                      <FaTwitter className="social-icon" />
                      <span className="social-text">Twitter</span>
                    </a>
                  )}
                  {perfil.redesSociales.instagram && (
                    <a href={perfil.redesSociales.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
                      <FaInstagram className="social-icon" />
                      <span className="social-text">Instagram</span>
                    </a>
                  )}
                  {perfil.redesSociales.facebook && (
                    <a href={perfil.redesSociales.facebook} target="_blank" rel="noopener noreferrer" className="social-link facebook">
                      <FaFacebook className="social-icon" />
                      <span className="social-text">Facebook</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Habilidades */}
            {perfil.habilidades && perfil.habilidades.length > 0 && (
              <div className="info-card skills-info">
                <h2 className="card-title">Habilidades</h2>
                <div className="skills-grid">
                  {perfil.habilidades.map((habilidad, index) => (
                    <span key={index} className="skill-tag">{habilidad}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha - Experiencia y Formación */}
          <div className="right-column">
            {/* Formación Académica */}
            {perfil.formacionAcademica && perfil.formacionAcademica.length > 0 && (
              <div className="info-card education-info">
                <h2 className="card-title">
                  <FaGraduationCap className="card-icon" />
                  Formación Académica
                </h2>
                <div className="timeline">
                  {perfil.formacionAcademica.map((formacion, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-period">
                        <FaCalendarAlt className="period-icon" />
                        {formacion.añoInicio} - {formacion.añoFin || 'Presente'}
                      </div>
                      <h3 className="timeline-title">{formacion.titulo}</h3>
                      <p className="timeline-institution">{formacion.institucion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experiencia Laboral */}
            {perfil.experienciaLaboral && perfil.experienciaLaboral.length > 0 && (
              <div className="info-card experience-info">
                <h2 className="card-title">
                  <FaBriefcase className="card-icon" />
                  Experiencia Laboral
                </h2>
                <div className="timeline">
                  {perfil.experienciaLaboral.map((experiencia, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-period">
                        <FaCalendarAlt className="period-icon" />
                        {experiencia.añoInicio} - {experiencia.añoFin || 'Presente'}
                      </div>
                      <h3 className="timeline-title">{experiencia.cargo}</h3>
                      <p className="timeline-institution">{experiencia.empresa}</p>
                      {experiencia.descripcion && (
                        <p className="timeline-description">{experiencia.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proyectos */}
            {perfil.proyectos && perfil.proyectos.length > 0 && (
              <div className="info-card projects-info">
                <h2 className="card-title">
                  <FaProjectDiagram className="card-icon" />
                  Proyectos Destacados
                </h2>
                <div className="projects-grid">
                  {perfil.proyectos.map((proyecto, index) => (
                    <div key={index} className="project-card">
                      <h3 className="project-name">
                        <a href={proyecto.url} target="_blank" rel="noopener noreferrer">
                          {proyecto.nombre}
                        </a>
                      </h3>
                      {proyecto.descripcion && (
                        <p className="project-description">{proyecto.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portafolio y CV */}
            <div className="info-card links-info">
              <h2 className="card-title">Enlaces</h2>
              <div className="links-grid">
                {perfil.urlPortafolio && (
                  <a 
                    href={perfil.urlPortafolio} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link-card portfolio-link"
                  >
                    <FaGlobe className="link-icon" />
                    <span className="link-text">Ver Portafolio</span>
                  </a>
                )}
                
                {perfil.cvUrl && (
                  <a 
                    href={`${BASE_URL}${perfil.cvUrl}`} 
                    download
                    className="link-card cv-link"
                  >
                    <FaDownload className="link-icon" />
                    <span className="link-text">Descargar CV</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PerfilPublico;