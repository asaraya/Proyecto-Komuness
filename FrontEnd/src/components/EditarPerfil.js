import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, BASE_URL } from '../utils/api';
import { toast } from 'react-hot-toast';
import '../CSS/editarPerfil.css';
import SubidaArchivo from './SubidaArchivo';
import UserProfileAvatar from './UserProfileAvatar';
import { 
  FaUser, FaBriefcase, FaGraduationCap, FaLink, FaFile, FaChevronDown, FaChevronUp, FaPlus, FaTrash 
} from 'react-icons/fa';

const EditarPerfil = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  // Secciones expandibles
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    personal: true,
    profesional: true,
    formacion: false,
    experiencia: false,
    habilidades: false,
    enlaces: false,
    archivos: false
  });

  // Estado del formulario
  const [perfil, setPerfil] = useState({
    nombre: '',
    apellidos: '',
    correoSecundario: '',
    telefono: '',
    canton: '',
    provincia: '',
    ocupacionPrincipal: '',
    titulo: '',
    especialidad: '',
    formacionAcademica: [],
    experienciaLaboral: [],
    habilidades: [],
    proyectos: [],
    urlPortafolio: '',
    redesSociales: {
      facebook: '',
      instagram: '',
      linkedin: '',
      twitter: ''
    },
    fotoPerfil: '',
    cvUrl: '',
    perfilPublico: true,
    enBancoProfesionales: false
  });

  useEffect(() => {
    cargarPerfil();
  }, []);

  useEffect(() => {
    
  }, [perfil.fotoPerfil]);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/perfil/usuario/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar el perfil');
      }

      const data = await response.json();
      setPerfil({
        ...perfil,
        ...data.data,
        redesSociales: data.data.redesSociales || perfil.redesSociales
      });
    } catch (error) {
      toast.error('Error al cargar el perfil');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeccion = (seccion) => {
    setSeccionesAbiertas(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPerfil(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRedesSocialesChange = (e) => {
    const { name, value } = e.target;
    setPerfil(prev => ({
      ...prev,
      redesSociales: {
        ...prev.redesSociales,
        [name]: value
      }
    }));
  };

  // Formación académica
  const agregarFormacion = () => {
    setPerfil(prev => ({
      ...prev,
      formacionAcademica: [
        ...prev.formacionAcademica,
        { institucion: '', titulo: '', añoInicio: new Date().getFullYear(), añoFin: '' }
      ]
    }));
  };

  const eliminarFormacion = (index) => {
    setPerfil(prev => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.filter((_, i) => i !== index)
    }));
  };

  const handleFormacionChange = (index, field, value) => {
    setPerfil(prev => ({
      ...prev,
      formacionAcademica: prev.formacionAcademica.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Experiencia laboral
  const agregarExperiencia = () => {
    setPerfil(prev => ({
      ...prev,
      experienciaLaboral: [
        ...prev.experienciaLaboral,
        { empresa: '', cargo: '', descripcion: '', añoInicio: new Date().getFullYear(), añoFin: '' }
      ]
    }));
  };

  const eliminarExperiencia = (index) => {
    setPerfil(prev => ({
      ...prev,
      experienciaLaboral: prev.experienciaLaboral.filter((_, i) => i !== index)
    }));
  };

  const handleExperienciaChange = (index, field, value) => {
    setPerfil(prev => ({
      ...prev,
      experienciaLaboral: prev.experienciaLaboral.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Habilidades
  const [nuevaHabilidad, setNuevaHabilidad] = useState('');

  const agregarHabilidad = () => {
    if (nuevaHabilidad.trim()) {
      setPerfil(prev => ({
        ...prev,
        habilidades: [...prev.habilidades, nuevaHabilidad.trim()]
      }));
      setNuevaHabilidad('');
    }
  };

  const eliminarHabilidad = (index) => {
    setPerfil(prev => ({
      ...prev,
      habilidades: prev.habilidades.filter((_, i) => i !== index)
    }));
  };

  // Proyectos
  const agregarProyecto = () => {
    setPerfil(prev => ({
      ...prev,
      proyectos: [
        ...prev.proyectos,
        { nombre: '', url: '', descripcion: '' }
      ]
    }));
  };

  const eliminarProyecto = (index) => {
    setPerfil(prev => ({
      ...prev,
      proyectos: prev.proyectos.filter((_, i) => i !== index)
    }));
  };

  const handleProyectoChange = (index, field, value) => {
    setPerfil(prev => ({
      ...prev,
      proyectos: prev.proyectos.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleGuardarCambios = async () => {
    try {
      setGuardando(true);

      // Validaciones básicas
      if (!perfil.nombre || !perfil.apellidos) {
        toast.error('Nombre y apellidos son requeridos');
        return;
      }

      const response = await fetch(`${API_URL}/perfil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(perfil)
      });

      if (!response.ok) {
        throw new Error('Error al guardar el perfil');
      }

      toast.success('Perfil actualizado exitosamente');
      
      // Opcional: navegar al perfil público
      // navigate(`/perfil/${perfil.usuarioId}`);
    } catch (error) {
      toast.error('Error al guardar los cambios');
      console.error(error);
    } finally {
      setGuardando(false);
    }
  };

  const handleFotoSubida = async (file) => {
    try {
      
      
      const formData = new FormData();
      formData.append('foto', file);

     
      const response = await fetch(`${API_URL}/perfil/foto`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        throw new Error(errorData.message || 'Error al subir la foto');
      }

      const data = await response.json();
     
      
      // Actualizar el estado con la nueva foto
      setPerfil(prev => {
        const nuevoEstado = { ...prev, fotoPerfil: data.fotoPerfil };
       
        return nuevoEstado;
      });
      
      // Recargar el perfil completo para asegurar sincronización
    
      await cargarPerfil();
      
      toast.success('Foto de perfil actualizada');
      
    } catch (error) {
      console.error('=== ERROR EN SUBIDA ===');
      console.error('Error completo:', error);
      toast.error(error.message || 'Error al subir la foto');
      throw error;
    }
  };

  const handleFotoEliminada = async () => {
    try {
      
      
      // Actualizar estado localmente
      setPerfil(prev => {
        const nuevoEstado = { ...prev, fotoPerfil: '' };
       
        return nuevoEstado;
      });
      
      toast.success('Foto de perfil eliminada');
     
    } catch (error) {
      console.error('=== ERROR AL ELIMINAR ===');
      console.error('Error:', error);
      toast.error('Error al eliminar la foto');
      throw error;
    }
  };

  const handleCVSubido = (url) => {
    setPerfil(prev => ({ ...prev, cvUrl: url }));
  };

  if (loading) {
    return (
      <div className="editar-perfil-loading">
        <div className="spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="editar-perfil-container">
      <div className="editar-perfil-wrapper">
        <div className="editar-perfil-header">
          <h1>Editar Perfil Público</h1>
          <p>Completa tu información para crear un perfil profesional</p>
        </div>

        <div className="editar-perfil-grid">
          {/* Sidebar - Vista previa del perfil */}
          <div className="perfil-sidebar">
            <div className="profile-info-card">
              <h2>Información Personal</h2>
              <div className="profile-photo-section">
                <div className="profile-photo-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <UserProfileAvatar
                    currentImage={perfil.fotoPerfil ? `${BASE_URL}${perfil.fotoPerfil}` : null}
                    onImageChange={handleFotoSubida}
                    onImageDelete={handleFotoEliminada}
                    size="xlarge"
                  />
                </div>
                <h3 className="profile-name">
                  {perfil.nombre} {perfil.apellidos}
                </h3>
                <p className="profile-role">{perfil.ocupacionPrincipal || 'Sin ocupación'}</p>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  Haz hover sobre la foto para cambiarla
                </p>
              </div>

              <div className="profile-info-details">
                <div className="profile-info-item">
                  <label>Email</label>
                  <p>{perfil.correoSecundario || 'No especificado'}</p>
                </div>
                <div className="profile-info-item">
                  <label>Teléfono</label>
                  <p>{perfil.telefono || 'No especificado'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulario principal */}
          <div className="editar-perfil-form">
        {/* Datos Personales */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('personal')}
          >
            <h2><FaUser /> Datos Personales</h2>
            {seccionesAbiertas.personal ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.personal && (
            <div className="form-section-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    value={perfil.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellidos *</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={perfil.apellidos}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Correo Secundario</label>
                  <input
                    type="email"
                    name="correoSecundario"
                    value={perfil.correoSecundario}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={perfil.telefono}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Cantón</label>
                  <input
                    type="text"
                    name="canton"
                    value={perfil.canton}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Provincia</label>
                  <input
                    type="text"
                    name="provincia"
                    value={perfil.provincia}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Información Profesional */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('profesional')}
          >
            <h2><FaBriefcase /> Información Profesional</h2>
            {seccionesAbiertas.profesional ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.profesional && (
            <div className="form-section-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>Ocupación Principal</label>
                  <input
                    type="text"
                    name="ocupacionPrincipal"
                    value={perfil.ocupacionPrincipal}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Título</label>
                  <input
                    type="text"
                    name="titulo"
                    value={perfil.titulo}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Especialidad</label>
                  <input
                    type="text"
                    name="especialidad"
                    value={perfil.especialidad}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formación Académica */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('formacion')}
          >
            <h2><FaGraduationCap /> Formación Académica</h2>
            {seccionesAbiertas.formacion ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.formacion && (
            <div className="form-section-content">
              {perfil.formacionAcademica.map((formacion, index) => (
                <div key={index} className="array-item">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Institución</label>
                      <input
                        type="text"
                        value={formacion.institucion}
                        onChange={(e) => handleFormacionChange(index, 'institucion', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Título</label>
                      <input
                        type="text"
                        value={formacion.titulo}
                        onChange={(e) => handleFormacionChange(index, 'titulo', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Año Inicio</label>
                      <input
                        type="number"
                        value={formacion.añoInicio}
                        onChange={(e) => handleFormacionChange(index, 'añoInicio', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Año Fin</label>
                      <input
                        type="number"
                        value={formacion.añoFin}
                        onChange={(e) => handleFormacionChange(index, 'añoFin', e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="Dejar vacío si continúa"
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => eliminarFormacion(index)}
                    className="btn-eliminar-item"
                  >
                    <FaTrash /> Eliminar
                  </button>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={agregarFormacion}
                className="btn-agregar"
              >
                <FaPlus /> Agregar Formación
              </button>
            </div>
          )}
        </div>

        {/* Experiencia Laboral */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('experiencia')}
          >
            <h2><FaBriefcase /> Experiencia Laboral</h2>
            {seccionesAbiertas.experiencia ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.experiencia && (
            <div className="form-section-content">
              {perfil.experienciaLaboral.map((experiencia, index) => (
                <div key={index} className="array-item">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Empresa</label>
                      <input
                        type="text"
                        value={experiencia.empresa}
                        onChange={(e) => handleExperienciaChange(index, 'empresa', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Cargo</label>
                      <input
                        type="text"
                        value={experiencia.cargo}
                        onChange={(e) => handleExperienciaChange(index, 'cargo', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Año Inicio</label>
                      <input
                        type="number"
                        value={experiencia.añoInicio}
                        onChange={(e) => handleExperienciaChange(index, 'añoInicio', parseInt(e.target.value))}
                      />
                    </div>

                    <div className="form-group">
                      <label>Año Fin</label>
                      <input
                        type="number"
                        value={experiencia.añoFin}
                        onChange={(e) => handleExperienciaChange(index, 'añoFin', e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="Dejar vacío si continúa"
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Descripción</label>
                      <textarea
                        value={experiencia.descripcion}
                        onChange={(e) => handleExperienciaChange(index, 'descripcion', e.target.value)}
                        rows="3"
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => eliminarExperiencia(index)}
                    className="btn-eliminar-item"
                  >
                    <FaTrash /> Eliminar
                  </button>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={agregarExperiencia}
                className="btn-agregar"
              >
                <FaPlus /> Agregar Experiencia
              </button>
            </div>
          )}
        </div>

        {/* Habilidades */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('habilidades')}
          >
            <h2>Habilidades</h2>
            {seccionesAbiertas.habilidades ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.habilidades && (
            <div className="form-section-content">
              <div className="habilidades-input-group">
                <input
                  type="text"
                  value={nuevaHabilidad}
                  onChange={(e) => setNuevaHabilidad(e.target.value)}
                  placeholder="Escribe una habilidad"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarHabilidad())}
                />
                <button 
                  type="button"
                  onClick={agregarHabilidad}
                  className="btn-agregar-habilidad"
                >
                  <FaPlus /> Agregar
                </button>
              </div>

              <div className="habilidades-lista">
                {perfil.habilidades.map((habilidad, index) => (
                  <div key={index} className="habilidad-tag">
                    {habilidad}
                    <button 
                      type="button"
                      onClick={() => eliminarHabilidad(index)}
                      className="btn-eliminar-habilidad"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enlaces */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('enlaces')}
          >
            <h2><FaLink /> Enlaces y Redes Sociales</h2>
            {seccionesAbiertas.enlaces ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.enlaces && (
            <div className="form-section-content">
              <div className="form-group form-group-full">
                <label>URL del Portafolio</label>
                <input
                  type="url"
                  name="urlPortafolio"
                  value={perfil.urlPortafolio}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
              </div>

              <h3 className="subsection-title">Redes Sociales</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>LinkedIn</label>
                  <input
                    type="url"
                    name="linkedin"
                    value={perfil.redesSociales.linkedin}
                    onChange={handleRedesSocialesChange}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="form-group">
                  <label>Facebook</label>
                  <input
                    type="url"
                    name="facebook"
                    value={perfil.redesSociales.facebook}
                    onChange={handleRedesSocialesChange}
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div className="form-group">
                  <label>Instagram</label>
                  <input
                    type="url"
                    name="instagram"
                    value={perfil.redesSociales.instagram}
                    onChange={handleRedesSocialesChange}
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div className="form-group">
                  <label>Twitter</label>
                  <input
                    type="url"
                    name="twitter"
                    value={perfil.redesSociales.twitter}
                    onChange={handleRedesSocialesChange}
                    placeholder="https://twitter.com/..."
                  />
                </div>
              </div>

              <h3 className="subsection-title">Proyectos</h3>
              {perfil.proyectos.map((proyecto, index) => (
                <div key={index} className="array-item">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Nombre del Proyecto</label>
                      <input
                        type="text"
                        value={proyecto.nombre}
                        onChange={(e) => handleProyectoChange(index, 'nombre', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>URL</label>
                      <input
                        type="url"
                        value={proyecto.url}
                        onChange={(e) => handleProyectoChange(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="form-group form-group-full">
                      <label>Descripción</label>
                      <textarea
                        value={proyecto.descripcion}
                        onChange={(e) => handleProyectoChange(index, 'descripcion', e.target.value)}
                        rows="2"
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => eliminarProyecto(index)}
                    className="btn-eliminar-item"
                  >
                    <FaTrash /> Eliminar
                  </button>
                </div>
              ))}
              
              <button 
                type="button"
                onClick={agregarProyecto}
                className="btn-agregar"
              >
                <FaPlus /> Agregar Proyecto
              </button>
            </div>
          )}
        </div>

        {/* Archivos */}
        <div className="form-section">
          <div 
            className="form-section-header"
            onClick={() => toggleSeccion('archivos')}
          >
            <h2><FaFile /> Currículum Vitae</h2>
            {seccionesAbiertas.archivos ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          
          {seccionesAbiertas.archivos && (
            <div className="form-section-content">
              <div>
                <h3 className="subsection-title">Currículum Vitae (PDF)</h3>
                <SubidaArchivo 
                  tipo="cv"
                  archivoActual={perfil.cvUrl}
                  onSubida={handleCVSubido}
                />
                <p className="text-sm text-gray-600 mt-2">
                  La foto de perfil se gestiona en el panel lateral izquierdo
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Configuración de Visibilidad */}
        <div className="form-section">
          <div className="form-section-content">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="perfilPublico"
                  checked={perfil.perfilPublico}
                  onChange={handleInputChange}
                />
                <span>Hacer mi perfil público (visible para todos)</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enBancoProfesionales"
                  checked={perfil.enBancoProfesionales}
                  onChange={handleInputChange}
                />
                <span>Aparecer en el banco de profesionales</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="form-actions">
          <button 
            type="button"
            onClick={() => navigate('/perfilUsuario')}
            className="btn-cancelar"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            onClick={handleGuardarCambios}
            className="btn-guardar"
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarPerfil;
