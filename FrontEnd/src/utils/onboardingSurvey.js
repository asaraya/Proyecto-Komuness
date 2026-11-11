export const SURVEY_ROLES = [
  { value: "comprador", label: "Quiero descubrir" },
  { value: "vendedor", label: "Quiero vender" },
  { value: "ambos", label: "Ambas opciones" },
];

export const createEmptySurvey = () => ({
  rol: "comprador",
  ubicacion: null,
  queVende: "",
  etiquetas: [],
});

export const normalizeSurveyPayload = (survey) => ({
  rol: survey?.rol || "comprador",
  ubicacion: survey?.ubicacion || null,
  queVende: (survey?.queVende || "").trim(),
  etiquetas: Array.isArray(survey?.etiquetas) ? survey.etiquetas : [],
});

export const buildPreferenceFilters = (
  user,
  { hasManualFilters = false } = {},
) => {
  if (hasManualFilters || !user?.encuestaInicio?.completada) return {};

  const encuesta = user.encuestaInicio;
  const filters = {};

  if (encuesta.rol) filters.rol = encuesta.rol;
  if (encuesta.queVende) filters.queVende = encuesta.queVende;
  if (Array.isArray(encuesta.etiquetas) && encuesta.etiquetas.length) {
    filters.etiquetas = encuesta.etiquetas.join(",");
  }

  return filters;
};
