import { useEffect, useState } from "react";
import { API_URL } from "../utils/api";
import { SURVEY_ROLES } from "../utils/onboardingSurvey";
import MapaUbicacion from "./MapaUbicacion";

const EncuestaInicioFields = ({ value, onChange }) => {
  const [etiquetas, setEtiquetas] = useState([]);

  useEffect(() => {
    const fetchEtiquetas = async () => {
      try {
        const response = await fetch(`${API_URL}/elements/etiqueta?limit=100`);
        const data = await response.json();
        setEtiquetas(data.data || []);
      } catch (error) {
        console.error("Error al cargar etiquetas:", error);
      }
    };

    fetchEtiquetas();
  }, []);

  const updateSurvey = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const toggleEtiqueta = (id) => {
    const selected = value.etiquetas || [];
    const nextEtiquetas = selected.includes(id)
      ? selected.filter((etiquetaId) => etiquetaId !== id)
      : [...selected, id];

    updateSurvey("etiquetas", nextEtiquetas);
  };

  return (
    <section className="rounded-2xl border border-[#ffbf30]/40 bg-white/5 p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-[#ffbf30]">
          Encuesta de inicio
        </h3>
        <p className="text-xs sm:text-sm text-gray-200">
          Usaremos esto para mostrarte publicaciones más alineadas a tus intereses.
        </p>
      </div>

      <div>
        <label className="block text-sm sm:text-base mb-1">Rol principal</label>
        <select
          value={value.rol}
          onChange={(event) => updateSurvey("rol", event.target.value)}
          className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
        >
          {SURVEY_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm sm:text-base mb-1">Ubicación</label>
        <MapaUbicacion
          onLocationSelect={(ubicacion) => updateSurvey("ubicacion", ubicacion)}
          initialLocation={value.ubicacion}
          className="encuesta-mapa"
        />
      </div>

      <div>
        <label className="block text-sm sm:text-base mb-1">¿Qué vendes?</label>
        <input
          type="text"
          value={value.queVende}
          onChange={(event) => updateSurvey("queVende", event.target.value)}
          placeholder="Ej. comida, artesanías, clases, servicios..."
          className="w-full px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#404270] text-[#f0f0f0] text-sm sm:text-base"
        />
      </div>

      <div>
        <label className="block text-sm sm:text-base mb-2">
          Etiquetas de interés
        </label>
        <div className="flex flex-wrap gap-2">
          {etiquetas.map((etiqueta) => {
            const active = value.etiquetas?.includes(etiqueta._id);
            return (
              <button
                key={etiqueta._id}
                type="button"
                onClick={() => toggleEtiqueta(etiqueta._id)}
                className={`rounded-full px-3 py-1 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? "bg-[#ffbf30] text-[#12141a]"
                    : "bg-[#404270] text-[#f0f0f0] hover:bg-[#54568f]"
                }`}
              >
                {etiqueta.nombre}
              </button>
            );
          })}
          {etiquetas.length === 0 && (
            <span className="text-xs text-gray-300">
              No hay etiquetas configuradas todavía.
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default EncuestaInicioFields;
