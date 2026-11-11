// src/components/buscadorPublicaciones.js - Versión temporal
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getRutaDetalle } from "../utils/secciones";

// Base de API robusta (evita /api/api)
const RAW = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const BASE = (RAW || "").replace(/\/+$/, "");
const API = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

export const BuscadorPublicaciones = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  // Obtener término de búsqueda actual de la URL
  // (también se limpia aquí si el término se quita desde afuera, ej. botón "Borrar filtros")
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    setSearchTerm(urlParams.get("q") || "");
  }, [location.search]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar sugerencias en tiempo real - USANDO RUTA EXISTENTE
  useEffect(() => {
    const searchPublicaciones = async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        // Usar la ruta existente /buscar en lugar de /search/quick
        const response = await fetch(
          `${API}/publicaciones/buscar?texto=${encodeURIComponent(searchTerm)}`,
        );

        if (response.ok) {
          const data = await response.json();
          // Limitar a 5 resultados para las sugerencias
          setSuggestions(Array.isArray(data) ? data.slice(0, 5) : []);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error en búsqueda:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(searchPublicaciones, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Manejar búsqueda desde el input
  const handleSearch = (e) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      performSearch();
    }
  };

  // Realizar búsqueda completa - USANDO FILTRO EXISTENTE
  // En buscadorPublicaciones.js - actualiza performSearch
  //

  // Objetivo: Actualiza la URL con los parametros de busqueda
  const performSearch = () => {
    if (!searchTerm.trim()) {
      handleClearSearch();
      return;
    }

    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    // Mantener filtros actuales
    const categoria = searchParams.get("categoria");
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const comunidad = searchParams.get("comunidad");

    const newSearchParams = new URLSearchParams();

    if (categoria) {
      newSearchParams.set("categoria", categoria);
    }

    if (fechaInicio) {
      newSearchParams.set("fechaInicio", fechaInicio);
    }

    if (fechaFin) {
      newSearchParams.set("fechaFin", fechaFin);
    }

    if (comunidad) {
      newSearchParams.set("comunidad", comunidad);
    }

    newSearchParams.set("q", searchTerm.trim());
    newSearchParams.set("search", "true");
    newSearchParams.set("offset", "0");

    navigate(`${currentPath}?${newSearchParams.toString()}`);

    setShowSuggestions(false);
  };

  // Seleccionar una sugerencia
  const handleSuggestionClick = (publicacion) => {
    navigate(getRutaDetalle(publicacion.tag, publicacion._id));
    setSearchTerm("");
    setShowSuggestions(false);
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);

    // Volver a la vista normal
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("q");
    searchParams.delete("search");
    navigate(`${currentPath}?${searchParams.toString()}`);
  };

  // Verificar si estamos en modo búsqueda
  const isSearchMode = location.search.includes("search=true");

  return (
    <div
      className="relative flex items-center gap-2 flex-1 min-w-0"
      ref={searchRef}
    >
      {/* Input de búsqueda */}
      <div className="relative flex-1 min-w-0 max-w-xl">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleSearch}
          placeholder="Buscar por título o comunidad..."
          className="w-full p-2 border border-gray-300 rounded bg-white text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ color: "black" }}
        />

        {/* Botón de limpiar */}
        {(searchTerm || isSearchMode) && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-lg"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}

        {/* Indicador de carga */}
        {loading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Lista de sugerencias */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((publicacion) => (
              <div
                key={publicacion._id}
                onClick={() => handleSuggestionClick(publicacion)}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-800 text-sm line-clamp-1">
                  {publicacion.titulo}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-600 capitalize">
                    {publicacion.tag}
                  </span>
                  <span className="text-xs text-gray-500">
                    {publicacion.autor?.nombre}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mensaje de no resultados */}
        {showSuggestions &&
          searchTerm.trim().length >= 2 &&
          suggestions.length === 0 &&
          !loading && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded shadow-lg z-50 p-3">
              <div className="text-gray-500 text-sm">
                No se encontraron publicaciones
              </div>
            </div>
          )}
      </div>

      {/* Botón de búsqueda */}
      <button
        onClick={performSearch}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
      >
        Buscar
      </button>
    </div>
  );
};

export default BuscadorPublicaciones;
