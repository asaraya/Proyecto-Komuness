// components/categoriaFilter.js
import { useRef, useEffect, useState } from "react";
import { FaHeart, FaStar } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/api";
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const CategoriaFilter = () => {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [selectedCategoria, setSelectedCategoria] = useState("");
  const [cargandoToggle, setCargandoToggle] = useState(false);
  const [following, setFollowing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  //Cache
  const cacheRef = useRef({});

  const Spinner = () => (
    <div className="w-5 h-5 border-2 border-gray-300 border-t-yellow-400 rounded-full animate-spin" />
  );

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await fetch(`${API_URL}/elements/categoria`);
        const data = await response.json();
        setCategorias(data.data || []);
      } catch (error) {
        console.error("Error al cargar categorÃ­as:", error);
      }
    };

    fetchCategorias();
  }, []);

  // Resincroniza si la URL cambia desde afuera (ej. botón "Borrar filtros")
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setSelectedCategoria(searchParams.get("categoria") || "");
  }, [location.search]);

  useEffect(() => {
    const checkEstado = async () => {
      if (!selectedCategoria) return;
      if (!user) return;

      const cached = cacheRef.current[selectedCategoria];

      if (cached !== undefined) {
        setFollowing(cached);
        return;
      }
      
      try {
        const response = await fetch(
          `${API_URL}/categoria-preferencias/estado/${selectedCategoria}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        setFollowing(data.following);
        cacheRef.current[selectedCategoria] = data.following;

      } catch (error) {
        console.error(error);
      }
    };

    checkEstado();
  }, [location.search, user]);

  const handleFollowCategoria = async () => {
    if (!selectedCategoria) return;

    if (!user) {
      toast.error('Debes iniciar sesión para esta acción');
      navigate('/iniciarSesion');
      return;
    }

    try {
      setCargandoToggle(true);

      const url = `${API_URL}/categoria-preferencias`;
      const method = following ? "DELETE" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          categoriaId: selectedCategoria
        })
      });

      const data = await response.json();
      console.log(data);

      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar preferencia");
      }

      setFollowing(data.following);
      cacheRef.current[selectedCategoria] = data.following;

      //toast.success(data.message || "Preferencia seleccionada");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar preferencia");
    } finally {
      setCargandoToggle(false);
    }
  };

  const handleCategoriaChange = (e) => {
    const categoriaId = e.target.value;
    setSelectedCategoria(categoriaId);

    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    if (categoriaId) {
      searchParams.set("categoria", categoriaId);
    } else {
      searchParams.delete("categoria");
    }

    navigate(`${currentPath}?${searchParams.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="hidden sm:inline text-yellow-400 font-bold text-sm whitespace-nowrap">
        Categorías
      </label>
      <select
        value={selectedCategoria}
        onChange={handleCategoriaChange}
        aria-label="Categorías"
        className="w-[170px] max-w-full bg-blue-900 text-gray-50 text-sm border border-gray-300 rounded p-2 pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      >
        <option value="">Todas</option>
        {categorias.map((categoria) => (
          <option key={categoria._id} value={categoria._id}>
            {categoria.nombre.toUpperCase()}
          </option>
        ))}
      </select>

      {selectedCategoria != "" && (
        cargandoToggle ? <Spinner /> :
        <button
          type="button"
          onClick={handleFollowCategoria}
          disabled={!selectedCategoria}
          className={`transition-colors focus:outline-none ${
            following
              ? "text-yellow-400"
              : "text-gray-400 hover:text-yellow-400"
          }`}
          title={following ? "Dejar de seguir" : "Seguir categoría"}
        >
          <FaStar size={20} />
        </button>)}
    </div>
  );
};

export default CategoriaFilter;
