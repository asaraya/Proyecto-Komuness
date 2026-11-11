import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const ComunidadFilter = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const comunidadParam = new URLSearchParams(location.search).get("comunidad") || "";
  const [comunidad, setComunidad] = useState(comunidadParam);

  // Mantener el input sincronizado si la URL cambia desde fuera (ej. limpiar filtros)
  useEffect(() => {
    setComunidad(comunidadParam);
  }, [comunidadParam]);

  // Debounce para no navegar en cada tecla
  useEffect(() => {
    const timeout = setTimeout(() => {
      const searchParams = new URLSearchParams(location.search);
      const valorActual = searchParams.get("comunidad") || "";
      const valorNuevo = comunidad.trim();

      if (valorNuevo === valorActual) return;

      if (valorNuevo) {
        searchParams.set("comunidad", valorNuevo);
      } else {
        searchParams.delete("comunidad");
      }

      navigate(`${location.pathname}?${searchParams.toString()}`);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comunidad]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="hidden sm:inline text-yellow-400 font-bold text-sm whitespace-nowrap">
        Ubicación
      </label>
      <input
        type="text"
        value={comunidad}
        onChange={(e) => setComunidad(e.target.value)}
        placeholder="Comunidad o localidad..."
        title="Filtrar por comunidad/ubicación"
        className="w-[160px] max-w-full bg-blue-900 text-gray-50 text-sm border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-300"
      />
    </div>
  );
};

export default ComunidadFilter;
