import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, BASE_URL, PROFESIONALES_API_URL } from '../utils/api'; // AGREGAR PROFESIONALES_API_URL
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  FaSearch, 
  FaUser, 
  FaBriefcase, 
  FaMapMarkerAlt, 
  FaEye, 
  FaSignInAlt, 
  FaSignOutAlt,
  FaTimes,
  FaSpinner,
  FaArrowLeft
} from 'react-icons/fa';
import '../CSS/bancoProfesionales.css';

const BancoProfesionales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profesionales, setProfesionales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoUsuario, setEstadoUsuario] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [cargandoToggle, setCargandoToggle] = useState(false);

  // Cargar profesionales - USAR PROFESIONALES_API_URL
  const cargarProfesionales = useCallback(async (search = '') => {
    try {
      setLoading(true);
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales${queryParams}`); 
      
      if (!response.ok) throw new Error('Error al cargar profesionales');
      
      const data = await response.json();
      setProfesionales(data.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los profesionales');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar estado del usuario actual - USAR PROFESIONALES_API_URL
  const cargarEstadoUsuario = useCallback(async () => {
    if (!user) return;
    
    try {
      setCargandoEstado(true);
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/estado`, { 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEstadoUsuario(data.data);
      }
    } catch (error) {
      console.error('Error al cargar estado:', error);
    } finally {
      setCargandoEstado(false);
    }
  }, [user]);

  // Toggle unirse/retirarse - USAR PROFESIONALES_API_URL
  const toggleUnirseBanco = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para esta acción');
      navigate('/iniciarSesion');
      return;
    }

    try {
      setCargandoToggle(true);
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/toggle`, { 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error al actualizar estado');

      const data = await response.json();
      setEstadoUsuario(data.data);
      toast.success(data.message);
      
      // Recargar lista si se unió o retiró
      cargarProfesionales(searchTerm);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar el estado');
    } finally {
      setCargandoToggle(false);
    }
  };

  // Quitar del banco (admin) - USAR PROFESIONALES_API_URL
const quitarDelBanco = async (perfilId) => {
  if (!window.confirm('¿Estás seguro de que quieres quitar a este profesional del banco?')) {
    return;
  }

  try {
    const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/${perfilId}/quitar`, { 
      method: 'PUT', 
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'Error al quitar del banco');
    }

    toast.success('Profesional retirado del banco exitosamente');
    
    // Recargar lista
    cargarProfesionales(searchTerm);
  } catch (error) {
    console.error('Error detallado:', error);
    toast.error(error.message || 'Error al retirar del banco');
  }
};

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      cargarProfesionales(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, cargarProfesionales]);

  // Cargar estado del usuario al montar
  useEffect(() => {
    cargarEstadoUsuario();
  }, [cargarEstadoUsuario]);

  const esAdmin = user && (user.tipoUsuario === 0 || user.tipoUsuario === 1);

  return (
    <div className="banco-profesionales-container">
      {/* Header */}
      <div className="banco-header">
        <button 
          onClick={() => navigate(-1)}
          className="btn-volver"
        >
          <FaArrowLeft /> Volver
        </button>
        
        <div className="banco-title-section">
          <h1>Banco de Profesionales</h1>
          <p>Encuentra profesionales calificados en nuestra comunidad</p>
        </div>

        {/* Toggle para unirse/retirarse */}
        {user && (
          <div className="banco-toggle-section">
            {cargandoEstado ? (
              <div className="estado-cargando">
                <FaSpinner className="spinner" /> Cargando...
              </div>
            ) : (
              <button
                onClick={toggleUnirseBanco}
                disabled={cargandoToggle}
                className={`btn-toggle ${estadoUsuario?.enBancoProfesionales ? 'unido' : 'no-unido'} ${cargandoToggle ? 'loading' : ''}`}
              >
                {cargandoToggle ? (
                  <FaSpinner className="spinner" />
                ) : estadoUsuario?.enBancoProfesionales ? (
                  <FaSignOutAlt />
                ) : (
                  <FaSignInAlt />
                )}
                {estadoUsuario?.enBancoProfesionales ? 'Retirarse del Banco' : 'Unirse al Banco'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="search-container">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar profesionales por nombre, especialidad, ocupación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="clear-search"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      {!loading && (
        <div className="results-info">
          <p>
            {profesionales.length} profesional{profesionales.length !== 1 ? 'es' : ''} encontrado{profesionales.length !== 1 ? 's' : ''}
            {searchTerm && ` para "${searchTerm}"`}
          </p>
        </div>
      )}

      {/* Grid de profesionales */}
      {loading ? (
        <div className="loading-container">
          <FaSpinner className="spinner large" />
          <p>Cargando profesionales...</p>
        </div>
      ) : profesionales.length > 0 ? (
        <div className="profesionales-grid">
          {profesionales.map((profesional) => (
            <div key={profesional._id} className="profesional-card">
              {/* Foto de perfil */}
              <div className="card-header">
                // En la parte del avatar, reemplaza con esto:
                <div className="avatar-container">
                {profesional.fotoPerfil ? (
                    <img 
                    src={`${BASE_URL}${profesional.fotoPerfil}`} 
                    alt={`${profesional.nombre} ${profesional.apellidos}`}
                    className="avatar"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        // Asegurarse de que el placeholder se muestre
                        const placeholder = e.target.nextSibling;
                        if (placeholder) {
                        placeholder.style.display = 'flex';
                        }
                    }}
                    onLoad={(e) => {
                        // Ocultar placeholder cuando la imagen carga correctamente
                        const placeholder = e.target.nextSibling;
                        if (placeholder) {
                        placeholder.style.display = 'none';
                        }
                    }}
                    />
                ) : null}
                <div className={`avatar-placeholder ${profesional.fotoPerfil ? 'hidden' : ''}`}>
                    <FaUser />
                </div>
                </div>

                {/* Botón de quitar (solo admin) */}
                {esAdmin && (
                  <button
                    onClick={() => quitarDelBanco(profesional._id)}
                    className="btn-quitar-admin"
                    title="Quitar del banco"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* Información principal */}
              <div className="card-body">
                <h3 className="profesional-name">
                  {profesional.nombre} {profesional.apellidos}
                </h3>

                {profesional.ocupacionPrincipal && (
                  <p className="profesional-ocupacion">
                    <FaBriefcase />
                    {profesional.ocupacionPrincipal}
                  </p>
                )}

                {profesional.especialidad && (
                  <p className="profesional-especialidad">
                    {profesional.especialidad}
                  </p>
                )}

                {(profesional.canton || profesional.provincia) && (
                  <p className="profesional-ubicacion">
                    <FaMapMarkerAlt />
                    {[profesional.canton, profesional.provincia].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="card-actions">
                <button
                  onClick={() => navigate(`/perfil/${profesional.usuarioId._id}`)}
                  className="btn-ver-perfil"
                >
                  <FaEye /> Ver Perfil Completo
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FaUser className="empty-icon" />
          <h3>No se encontraron profesionales</h3>
          <p>
            {searchTerm 
              ? 'No hay profesionales que coincidan con tu búsqueda.'
              : 'Aún no hay profesionales en el banco.'
            }
          </p>
          {user && !estadoUsuario?.enBancoProfesionales && (
            <button
              onClick={toggleUnirseBanco}
              className="btn-unirse-empty"
            >
              <FaSignInAlt /> Sé el primero en unirte
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BancoProfesionales;