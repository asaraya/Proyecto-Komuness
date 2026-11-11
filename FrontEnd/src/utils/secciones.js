// Utilidades para mantener la sección (pestaña) actual al navegar a un detalle.

const TAG_A_SECCION = {
  evento: "/eventos",
  emprendimiento: "/emprendimientos",
  publicacion: "/publicaciones",
};

export const getSeccionPorTag = (tag) =>
  TAG_A_SECCION[tag] || "/publicaciones";

export const getRutaDetalle = (tag, id) =>
  `${getSeccionPorTag(tag)}/${id}`;

export const getTagPorPath = (path) => {
  if (path?.startsWith("/eventos")) return "evento";
  if (path?.startsWith("/emprendimientos")) return "emprendimiento";
  if (path?.startsWith("/publicaciones")) return "publicacion";
  return null;
};

export const getSeccionPorPath = (path) =>
  getSeccionPorTag(getTagPorPath(path));
