// src/components/publicaciones.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-hot-toast";
import "../CSS/publicaciones.css";

import PublicacionCard from "./publicacionCard";
import EventoCard from "./eventoCard";
import FormularioPublicacion from "../pages/formulario";
import PublicacionModal from "./publicacionModal";
import { useAuth } from "./context/AuthContext";
import CategoriaFilter from "./generic/categoriaFilter";
import BuscadorPublicaciones from "./buscadorPublicaciones";
import AlertaLimitePublicaciones from "./AlertaLimitePublicaciones";
import { API_URL } from "../utils/api";
import LimitePublicaciones from "./limiteDePublicaciones";
import PublicidadModal from "./publicidadModal";
import DateFilter from "./generic/dateFilter";
import PriceFilter from "./generic/priceFilter";
import ComunidadFilter from "./generic/comunidadFilter";
import CarruselGenerico from "./CarruselGenerico";
import CalendarView from "./Calendar";
import PublicidadBanner from "./PublicidadBanner";

// Base de API robusta (evita /api/api)
const RAW = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const BASE = (RAW || "").replace(/\/+$/, "");
const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

export const Publicaciones = ({ tag: propTag }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [mostrar, setMostrar] = useState(0);
  const [cards, setCards] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tag, setTag] = useState(propTag);
  const limite = 12;
  const [formulario, setFormulario] = useState(false);
  const [showLimitAlert, setShowLimitAlert] = useState(false);

  const { user } = useAuth();
  const [publicaciones, setPublicaciones] = useState([]);

  const categoriaFilter = searchParams.get("categoria");
  const searchTerm = searchParams.get("q");
  const fechaInicioFilter = searchParams.get("fechaInicio");
  const fechaFinFilter = searchParams.get("fechaFin");
  const precioMin = searchParams.get("precioMin");
  const precioMax = searchParams.get("precioMax");
  const comunidadFilter = searchParams.get("comunidad");

  const isSearch = searchParams.get("search") === "true";
  const searchFilter = isSearch ? searchTerm : null;
  const [limiteData, setLimiteData] = useState(null);
  const [selectedPub, setSelectedPub] = useState(null);

  const hayFiltrosActivos = Boolean(
    categoriaFilter ||
      isSearch ||
      fechaInicioFilter ||
      fechaFinFilter ||
      precioMin ||
      precioMax ||
      comunidadFilter,
  );

  const limpiarFiltros = () => {
    navigate(location.pathname);
  };

  // El carrusel se muestra siempre que no haya una búsqueda activa
  // (los filtros de categoría/fecha/precio se aplican dentro del carrusel)
  const mostrarCarrusel =
    tag === "evento" || tag === "emprendimiento" || tag === "publicacion";

  // El botón de crear aplica a eventos y emprendimientos, para cualquier
  // usuario con sesión: lo que crea queda pendiente hasta que un admin lo aprueba.
  const puedeMostrarBotonCrear =
    (tag === "evento" || tag === "emprendimiento") && !!user;

  // para PUBLICIDAD
  const [mostrarModalPublicidad, setMostrarModalPublicidad] = useState(false);
  const [publicidadEditando, setPublicidadEditando] = useState(null); // null = crear desde cero, objeto = editar publicidad
  const [publicidad, setPublicidad] = useState([]);

  //Variables de Usuario
  const UserType = {
    SUPERADMIN: 0,
    ADMIN: 1,
    BASIC: 2,
  };

  const esAdmin = [UserType.SUPERADMIN, UserType.ADMIN].includes(
    Number(user?.tipoUsuario),
  );

  useEffect(() => {
    fetchPublicidad();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    let newTag = propTag;

    if (path === "/eventos") {
      setMostrar(0);
      newTag = "evento";
    } else if (path === "/emprendimientos") {
      setMostrar(1);
      newTag = "emprendimiento";
    } else if (path === "/publicaciones") {
      setMostrar(2);
      newTag = "publicacion";
    } else if (path === "/perfilUsuario") {
      setMostrar(3);
      newTag = null;
    }

    setTag(newTag);
  }, [location.pathname, propTag]);

  useEffect(() => {
    if (tag)
      obtenerPublicaciones(tag, 1, limite, searchFilter, {
        categoria: categoriaFilter,
        fechaInicio: fechaInicioFilter,
        fechaFin: fechaFinFilter,
        precioMin: precioMin,
        precioMax: precioMax,
        comunidad: comunidadFilter,
      });
  }, [
    tag,
    categoriaFilter,
    searchFilter,
    fechaInicioFilter,
    fechaFinFilter,
    precioMin,
    precioMax,
    comunidadFilter,
    user,
  ]);

  useEffect(() => {
    if (mostrar === 3) {
      setCards(publicaciones);
    } else {
      let newCards = publicaciones.filter((p) => {
        if (mostrar === 0) return p.tag === "evento";
        if (mostrar === 1) return p.tag === "emprendimiento";
        return p.tag === "publicacion";
      });

      setCards(newCards);
    }
  }, [mostrar, publicaciones]);

  const obtenerPublicaciones = async (
    tag,
    page = 1,
    limit = limite,
    searchTerm = null,
    filters = {
      categoria: null,
      fechaInicio: null,
      fechaFin: null,
      precioMin: null,
      precioMax: null,
      etiquetas: null,
      rol: null,
      queVende: null,
    },
  ) => {
    try {
      const offset = (page - 1) * limit;

      let url;
      let params;

      if (searchTerm) {
        //  Usar search/advanced en lugar de /buscar para que popule categorías
        url = `${API}/publicaciones/search/advanced`;
        params = new URLSearchParams({
          q: searchTerm,
          offset: String(offset),
          limit: String(limit),
        });
      } else {
        // Usar búsqueda normal por tag
        url = `${API}/publicaciones`;
        params = new URLSearchParams({
          tag: tag || "",
          offset: String(offset),
          limit: String(limit),
          publicado: "true",
        });
      }
      // Agregar filtros
      for (const filter in filters) {
        if (filters[filter]) {
          params.set(filter, filters[filter]);
        }
      }
      const resp = await fetch(`${url}?${params.toString()}`);
      if (resp.status === 404) {
        setPublicaciones([]);
        setPaginaActual(1);
        setTotalPaginas(1);
        return;
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }

      const data = await resp.json();

      // Para search/advanced, la estructura es { data: [], pagination: {} }
      setPublicaciones(data.data || []);
      setPaginaActual(page);
      setTotalPaginas(data.pagination?.pages ?? 1);
    } catch (error) {
      console.error("Error al obtener publicaciones:", error);
      setPublicaciones([]);
      setPaginaActual(1);
      setTotalPaginas(1);
    }
  };

  const fetchPublicidad = async () => {
    try {
      const response = await fetch(`${API_URL}/publicidad/get-publicidades`);
      if (!response.ok) {
        console.log(response);
        throw new Error("Error al cargar publicidad");
      }

      const data = await response.json();
      setPublicidad(data.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar publicidad");
    }
  };

  /////////////////// MODAL publicidad
  const abrirModalCrearPublicidad = () => {
    setPublicidadEditando(null);
    setMostrarModalPublicidad(true);
  };

  const abrirModalEditarPublicidad = (p) => {
    setPublicidadEditando(p);
    setMostrarModalPublicidad(true);
  };

  const cerrarModalPublicidad = () => {
    setPublicidadEditando(null);
    setMostrarModalPublicidad(false);
  };

  const handleSubmitPublicidad = async ({
    imagen,
    titulo,
    descripcion,
    fechaInicioEvento,
    fechaFinEvento,
    fechaCaducidad,
    autor,
    activa,
    publicacionRelacionada,
  }) => {
    try {
      const modoCrear = publicidadEditando == null;
      const petition_url = modoCrear
        ? `${API_URL}/publicidad/create-publicidad`
        : `${API_URL}/publicidad/update-publicidad/${publicidadEditando._id}`;
      const method = modoCrear ? "POST" : "PUT";

      const formData = new FormData();

      if (imagen instanceof File) {
        formData.append("imagen", imagen);
      }
      formData.append("titulo", titulo);
      formData.append("descripcion", descripcion);
      // Vacías se envían igual: el backend las guarda como null (así se pueden borrar al editar)
      formData.append("fechaInicioEvento", fechaInicioEvento || "");
      formData.append("fechaFinEvento", fechaFinEvento || "");
      formData.append("fechaCaducidad", fechaCaducidad);
      formData.append("autor", autor);
      formData.append("activa", activa);

      if (publicacionRelacionada) {
        formData.append("publicacionRelacionada", publicacionRelacionada);
      }

      const res = await fetch(petition_url, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (res.ok) {
        toast.success(
          modoCrear ? "Publicidad creada" : "Publicidad actualizada",
        );
        cerrarModalPublicidad();
        fetchPublicidad();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Error al guardar la publicidad");
      }
    } catch (e) {
      console.error("ERROR PUBLICIDAD: ", e);
      toast.error("Error al guardar la publicidad");
    }
  };

  const handleDeletePublicidad = async (pub) => {
    if (!window.confirm("¿Está seguro de que quiere eliminar esta publicidad?"))
      return;

    try {
      const response = await fetch(
        `${API_URL}/publicidad/delete-publicidad/${pub._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (response.ok) {
        toast.success("Publicidad eliminada");
        fetchPublicidad();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al eliminar la publicidad");
      }
    } catch (e) {
      toast.error("Error al eliminar la publicidad");
      console.error(e);
    }
  };

  const handlePagination = (newPage) => {
    obtenerPublicaciones(tag, newPage, limite, searchFilter, {
      categoria: categoriaFilter,
      fechaInicio: fechaInicioFilter,
      fechaFin: fechaFinFilter,
      precioMin: precioMin,
      precioMax: precioMax,
      comunidad: comunidadFilter,
    });
  };

  const verificarLimite = async () => {
    try {
      const response = await fetch(`${API_URL}/configuracion/mis-limites`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const limiteData = data.data;
        // Si está en el límite o lo superó, retornar true
        return limiteData.publicacionesActuales >= limiteData.limite;
      }
      return false;
    } catch (error) {
      console.error("Error al verificar límite:", error);
      return false;
    }
  };

  // Función para cargar datos del límite de publicaciones del usuario
  const cargarDatosLimite = async () => {
    try {
      const response = await fetch(`${API_URL}/configuracion/mis-limites`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLimiteData(data.data);
      }
    } catch (error) {
      console.error("Error al cargar datos de límite:", error);
    }
  };

  const handleCrearPublicacion = async () => {
    if (!user) {
      navigate("/iniciarSesion");
      return;
    }

    // Bypass inmediato para admin/superadmin
    const tipoUsuario = Number(user?.tipoUsuario);
    if (tipoUsuario === 0 || tipoUsuario === 1) {
      setFormulario(true);
      return;
    }

    const limiteAlcanzado = await verificarLimite();
    if (limiteAlcanzado) {
      setShowLimitAlert(true);
    } else {
      setFormulario(true);
    }
  };

  useEffect(() => {
    //Datos límite
    if (user) {
      cargarDatosLimite();
    }
  }, [user]);

  return (
    <div className="bg-gray-800/80 min-h-screen">
      <div className="relative">
        {/* Contenedor para filtros y buscador */}
        <div className="bg-blue-900">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Buscador */}
              <BuscadorPublicaciones />

              {/* Filtro de categorías */}
              <CategoriaFilter />

              {/* Filtro de fecha de evento/publicación */}
              <DateFilter />

              {/* Filtro por comunidad/ubicación */}
              <ComunidadFilter />

              {/* Filtro para precio regular */}
              {tag !== "publicacion" && <PriceFilter />}

              {/* Borrar todos los filtros a la vez */}
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="flex items-center gap-1 text-sm text-gray-200 hover:text-yellow-400 border border-gray-400 hover:border-yellow-400 rounded px-3 py-2 transition-colors whitespace-nowrap"
                  title="Borrar todos los filtros"
                >
                  <FaTimes size={12} />
                  Borrar filtros
                </button>
              )}
            </div>

            {limiteData && tag === "publicacion" && !esAdmin && (
              <div className="basis-full md:basis-auto w-full md:w-auto flex justify-center md:justify-end">
                <div className="w-full max-w-md">
                  <LimitePublicaciones limiteData={limiteData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*PUBLICIDAD*/}
      {(publicidad.length > 0 || esAdmin) && (
        <div className="w-full flex flex-col items-center gap-3 pt-4 px-3 sm:px-6 md:px-10 lg:px-16">
          <PublicidadBanner
            publicidades={publicidad}
            esAdmin={esAdmin}
            onEditar={abrirModalEditarPublicidad}
            onEliminar={handleDeletePublicidad}
          />

          {/*BOTON DE AGREGAR PUBLICIDAD SOLO PARA ADMINS*/}
          {esAdmin && (
            <button
              onClick={abrirModalCrearPublicidad}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow"
            >
              + Agregar publicidad
            </button>
          )}

          {mostrarModalPublicidad && (
            <PublicidadModal
              publicidad={publicidadEditando}
              onClose={cerrarModalPublicidad}
              onSubmit={handleSubmitPublicidad}
            />
          )}
        </div>
      )}

      {/* Mensaje de búsqueda */}
      {searchFilter && (
        <div className="px-4 pt-4">
          <div className="bg-blue-100 border border-blue-300 rounded p-3">
            <p className="text-blue-800 text-sm">
              Mostrando resultados para: <strong>"{searchFilter}"</strong>
              {publicaciones.length === 0 && " - No se encontraron resultados"}
            </p>
          </div>
        </div>
      )}

      {/* Carrusel: aplica los filtros de categoría/fecha/precio del encabezado */}
      {mostrarCarrusel && !searchFilter && (
        <CarruselGenerico
          tipo={tag}
          filtros={{
            categoria: categoriaFilter,
            fechaInicio: fechaInicioFilter,
            fechaFin: fechaFinFilter,
            precioMin: precioMin,
            precioMax: precioMax,
            comunidad: comunidadFilter,
          }}
        />
      )}
      {/* Calendario de eventos: solo en la cartelera y cuando no hay búsqueda activa */}
      {tag === "evento" && !searchFilter && (
  <section
    className="w-full max-w-7xl mx-auto px-2 md:px-4 py-6"
    style={{ overflowAnchor: "none", contain: "layout" }}
  >
    <CalendarView />
  </section>
)}

      {(!mostrarCarrusel || searchFilter) && (
        <div
          className={
            tag === "evento" ? "evento-card-container" : "card-container"
          }
        >
          {cards.length === 0 ? (
            <p className="text-white">
              {searchFilter
                ? "No hay publicaciones que coincidan con tu búsqueda."
                : "No hay publicaciones para mostrar."}
            </p>
          ) : (
            cards.map((publicacion) =>
              tag === "evento" ? (
                <EventoCard
                  key={publicacion._id}
                  publicacion={publicacion}
                  onDeleteClick={(pub) => setSelectedPub(pub)}
                />
              ) : (
                <PublicacionCard
                  key={publicacion._id}
                  publicacion={publicacion}
                  onDeleteClick={(pub) => setSelectedPub(pub)}
                />
              ),
            )
          )}
        </div>
      )}

      <PublicacionModal
        name={selectedPub?.titulo}
        date={selectedPub?.fecha}
        tag={selectedPub?.tag}
        id={selectedPub?._id}
        isOpen={!!selectedPub}
        onClose={() => setSelectedPub(null)}
      />

      {(!mostrarCarrusel || searchFilter) && (
        <div className="w-full flex justify-center mt-6 gap-2 flex-wrap pb-6">
          {paginaActual > 1 && (
            <button
              onClick={() => handlePagination(paginaActual - 1)}
              className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              « Anterior
            </button>
          )}

          {Array.from({ length: totalPaginas }, (_, i) => i + 1)
            .filter(
              (p) =>
                p === 1 ||
                p === totalPaginas ||
                (p >= paginaActual - 2 && p <= paginaActual + 2),
            )
            .map((p, i, arr) => (
              <React.Fragment key={p}>
                {i > 0 && p - arr[i - 1] > 1 && (
                  <span className="px-2 py-1 text-gray-500">...</span>
                )}
                <button
                  onClick={() => handlePagination(p)}
                  className={`px-3 py-1 rounded text-sm ${p === paginaActual ? "bg-[#5445FF] text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}

          {paginaActual < totalPaginas && (
            <button
              onClick={() => handlePagination(paginaActual + 1)}
              className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Siguiente »
            </button>
          )}
        </div>
      )}

      {puedeMostrarBotonCrear && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-3">
          <span className="hidden md:block bg-white px-4 py-2 rounded-full shadow-md text-sm font-medium text-gray-700">
            Inspira a otros con tu talento
          </span>

          <button
            onClick={handleCrearPublicacion}
            className="bg-yellow-500 text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:bg-yellow-700 transition-all duration-300 flex items-center justify-center text-2xl"
          >
            +
          </button>
        </div>
      )}

      <AlertaLimitePublicaciones
        show={showLimitAlert}
        onClose={() => setShowLimitAlert(false)}
      />

      <FormularioPublicacion
        isOpen={formulario}
        onClose={() => setFormulario(false)}
        openTag={tag}
      />
    </div>
  );
};

export default Publicaciones;
