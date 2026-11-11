import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL, API_URL, PROFESIONALES_API_URL } from '../utils/api'; // AGREGAR PROFESIONALES_API_URL
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';
import { AiOutlineUser } from "react-icons/ai";
import { 
  FaSearch, 
  FaListAlt,
  FaHistory,
  FaEdit,
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

const PROVINCIAS_CR = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
];

const BancoProfesionales = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profesionales, setProfesionales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [provinciaFilter, setProvinciaFilter] = useState('');
  const [cantonFilter, setCantonFilter] = useState('');
  const [estadoUsuario, setEstadoUsuario] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [cargandoToggle, setCargandoToggle] = useState(false);
  const [activeTab, setActiveTab] = useState("profesionales");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const usuariosFiltrados = usuarios.data?.filter((item) => {
    const texto = searchTerm.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(texto) ||
      item.apellido?.toLowerCase().includes(texto) ||
      item.email?.toLowerCase().includes(texto)
    );
  });

  // Cargar profesionales - USAR PROFESIONALES_API_URL
  const cargarProfesionales = useCallback(async (search = '', provincia = '', canton = '', pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (provincia) params.set('provincia', provincia);
      if (canton) params.set('canton', canton);
      params.set('page', String(pageNum));
      params.set('limit', '12');
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales?${params.toString()}`);

      if (!response.ok) throw new Error('Error al cargar profesionales');

      const data = await response.json();
      setProfesionales((prev) => {
        if (append && prev?.data) {
          return { ...data, data: [...prev.data, ...(data.data || [])] };
        }
        return data;
      });
      setPagination(data.pagination || { page: pageNum, pages: pageNum, total: data.data?.length || 0 });
      setPage(pageNum);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar los profesionales');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar la siguiente página de profesionales
  const cargarMas = () => {
    if (loading) return;
    cargarProfesionales(searchTerm, provinciaFilter, cantonFilter, page + 1, true);
  };

  // Cargar usuarios
  const cargarUsuarios = useCallback(async () => {
    if(!user) return;
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/usuario/public`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al cargar usuarios');

      const data = await response.json();
      setUsuarios(data);

    } catch (error) {
      console.error(error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [user]);

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

    //Verificar si puede unirse según el perfil público
    if (!estadoUsuario?.enBancoProfesionales && !esAdmin){
      const returnData = await cargarDatosUsuario();

      if(returnData === false){
        return;
      }
    }

    try {
      setCargandoToggle(true);
      const response = await fetch(`${PROFESIONALES_API_URL}/banco-profesionales/toggle`, { 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        // Si el servidor devuelve los campos faltantes, mostrarlos
        if (Array.isArray(data?.data)) {
          ImprimirErroresDePerfil(data.data);
          return;
        }
        throw new Error(data?.message || 'Error al actualizar estado');
      }

      setEstadoUsuario((prev) => ({ ...(prev || {}), ...data.data }));
      toast.success(data.message);
      
      // Recargar lista si se unió o retiró
      cargarProfesionales(searchTerm, provinciaFilter, cantonFilter, 1, false);

    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.message || 'Error al actualizar el estado');
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
    cargarProfesionales(searchTerm, provinciaFilter, cantonFilter);
  } catch (error) {
    console.error('Error detallado:', error);
    toast.error(error.message || 'Error al retirar del banco');
  }
};

  //Buscar la información del usuario para verificar que tiene información suficiente para unirse al banco
  const cargarDatosUsuario = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/perfil/usuario/elegibilidad-banco`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar el perfil');
      }

      //Revisa si puede unirse al banco e imprime el mensaje de faltantes
      if (!data.success){
        ImprimirErroresDePerfil(data?.data);
        return false;
      } 

      //Retorna verdadero si todo sale bien
      return true;

    } catch (error) {
      toast.error(error?.message);
      console.error(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  //Imprime lo que hace falta
  const ImprimirErroresDePerfil = async (data) => {
    toast(
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          ⚠️ Te falta en tu perfil:
        </div>

        <ul style={{paddingLeft: 18, listStyleType: 'disc' }}>
          {data?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>,
      {
        className: 'toast-warning'
      }
    );
  };

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    if(activeTab !== 'profesionales') return;

    const timeoutId = setTimeout(() => {
      cargarProfesionales(searchTerm, provinciaFilter, cantonFilter, 1, false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, provinciaFilter, cantonFilter, activeTab, cargarProfesionales]);

  // Cargar estado del usuario al montar
  useEffect(() => {
    cargarEstadoUsuario();
  }, [cargarEstadoUsuario]);

  // Cargar usuarios al montar
  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const esAdmin = user && (user.tipoUsuario === 0 || user.tipoUsuario === 1);

  return (
    <div className="banco-profesionales-container">
      {/* Header */}
      <div className="banco-header">
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

      {/* Barra de búsqueda y filtros de ubicación */}
      <div className="banco-filtros">
        <div className="banco-campo grande">
          <FaSearch />
          <input
            type="text"
            placeholder="Filtrar por nombre, especialidad, ocupación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="btn-limpiar" title="Limpiar">
              <FaTimes />
            </button>
          )}
        </div>

        <div className="banco-campo mediano">
          <FaMapMarkerAlt />
          <select
            value={provinciaFilter}
            onChange={(e) => setProvinciaFilter(e.target.value)}
            title="Filtrar por provincia"
          >
            <option value="">Todas las provincias</option>
            {PROVINCIAS_CR.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>

        <div className="banco-campo mediano">
          <input
            type="text"
            placeholder="Filtrar por cantón/zona..."
            value={cantonFilter}
            onChange={(e) => setCantonFilter(e.target.value)}
          />
          {cantonFilter && (
            <button onClick={() => setCantonFilter('')} className="btn-limpiar" title="Limpiar">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Pestañas para navegación */}
      <div className="banco-tabs-wrap">
        <div className="banco-tabs">
          <button
            onClick={() => setActiveTab("profesionales")}
            className={`banco-tab ${activeTab === "profesionales" ? "activo" : ""}`}
          >
            <AiOutlineUser />
            Profesionales
          </button>

          <button
            onClick={() => {
              if (!user) navigate('/iniciarSesion');
              setActiveTab("usuarios");
            }}
            className={`banco-tab ${activeTab === "usuarios" ? "activo" : ""}`}
          >
            <AiOutlineUser />
            Usuarios
          </button>
        </div>
      </div>

      {/* Grid de profesionales/usuarios */}
    {loading ? (
      <div className="loading-container">
        <FaSpinner className="spinner large" />
        <p>
          {activeTab === "profesionales"
            ? "Cargando profesionales..."
            : "Cargando usuarios..."}
        </p>
      </div>
    ) : activeTab === "profesionales" ? (

      // MAP PROFESIONALES 
      profesionales && profesionales.data?.length > 0 ? (
        <>
        <div className="profesionales-grid">

          {profesionales.data?.map((item) => (
            <div key={item._id} className="profesional-card">

              {/* HEADER */}
              <div className="card-header">
                <div className="avatar-container">

                  {item.fotoPerfil ? (
                    <img
                      src={`${BASE_URL}${item.fotoPerfil}`}
                      alt={`${item.nombre} ${item.apellidos}`}
                      className="avatar"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const placeholder = e.target.nextSibling;
                        if (placeholder) placeholder.style.display = "flex";
                      }}
                      onLoad={(e) => {
                        const placeholder = e.target.nextSibling;
                        if (placeholder) placeholder.style.display = "none";
                      }}
                    />
                  ) : null}

                  <div
                    className={`avatar-placeholder ${
                      item.fotoPerfil ? "hidden" : ""
                    }`}
                  >
                    <FaUser />
                  </div>

                </div>
                
                {esAdmin && (
                  <button
                    onClick={() => quitarDelBanco(item._id)}
                    className="btn-quitar-admin"
                    title="Quitar del banco"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* BODY */}
              <div className="card-body">
                <h3 className="profesional-name">
                  {item.nombre} {item.apellidos}
                </h3>

                {item.ocupacionPrincipal && (
                  <p className="profesional-ocupacion">
                    <FaBriefcase />
                    {item.ocupacionPrincipal}
                  </p>
                )}

                {item.especialidad && (
                  <p className="profesional-especialidad">
                    {item.especialidad}
                  </p>
                )}

                {(item.canton || item.provincia) && (
                  <p className="profesional-ubicacion">
                    <FaMapMarkerAlt />
                    {[item.canton, item.provincia]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="card-actions">
                {item.usuarioId?._id && (
                  <button
                    onClick={() =>
                      navigate(`/perfil/${item.usuarioId._id}`)
                    }
                    className="btn-ver-perfil"
                  >
                    <FaEye /> Ver Perfil Completo
                  </button>
                )}
              </div>

            </div>
          ))}

        </div>
        {pagination.page < pagination.pages && (
          <div className="banco-cargar-mas">
            <button
              onClick={cargarMas}
              disabled={loading}
              className="btn-toggle no-unido"
            >
              {loading ? <FaSpinner className="spinner" /> : 'Cargar más'}
            </button>
          </div>
        )}
        </>
      ) : (
        <div className="empty-state">
          <FaUser className="empty-icon mx-auto" />
          <h3>No se encontraron profesionales</h3>

          <p>
            {searchTerm || provinciaFilter || cantonFilter
              ? "No hay profesionales que coincidan con tu búsqueda o filtros de ubicación."
              : "Aún no hay profesionales en el banco."}
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
      )

    ) : (

      // MAP USUARIOS
      <div className="banco-tabla-wrapper">
        {usuariosFiltrados && usuariosFiltrados.length > 0 ? (
          <table className="banco-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellidos</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((item) => (
                <tr key={item._id}>
                  <td>{item.nombre || "Sin nombre"}</td>
                  <td>{item.apellido || "Sin apellido"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="banco-tabla-vacia">No se encontraron usuarios.</div>
        )}
      </div>
    )}
    </div>
  );
};

export default BancoProfesionales;
