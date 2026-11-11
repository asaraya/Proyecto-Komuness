const MS_POR_DIA = 24 * 60 * 60 * 1000;

const parseFecha = (valor) => {
  if (!valor) return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  if (typeof valor !== "string") return null;

  const limpio = valor.trim();
  if (!limpio) return null;

  if (limpio.includes("/")) {
    const [dia, mes, anio] = limpio.split("/").map((parte) => Number(parte));
    if ([dia, mes, anio].every(Number.isFinite)) {
      const fecha = new Date(anio, mes - 1, dia);
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }
  }

  if (limpio.includes("-")) {
    const [anio, mes, dia] = limpio.split("T")[0].split("-").map((parte) => Number(parte));
    if ([dia, mes, anio].every(Number.isFinite)) {
      const fecha = new Date(anio, mes - 1, dia);
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }
  }

  const fecha = new Date(limpio);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const startOfDay = (fecha) => {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
};

export const obtenerDiasRestantes = (publicacion) => {
  if (!publicacion || publicacion.tag === "emprendimiento") return null;

  if (typeof publicacion.diasRestantes === "number") {
    return publicacion.diasRestantes;
  }

  const fechaExpiracion = parseFecha(publicacion.fechaExpiracion);
  if (!fechaExpiracion) return null;

  const diff =
    Math.floor(
      (startOfDay(fechaExpiracion).getTime() - startOfDay(new Date()).getTime()) / MS_POR_DIA
    ) + 1;

  return Math.max(diff, 0);
};

export const obtenerEtiquetaExpiracion = (publicacion) => {
  const diasRestantes = obtenerDiasRestantes(publicacion);
  if (diasRestantes === null) return null;

  if (diasRestantes === 1) {
    return "1 dia restante";
  }

  return `${diasRestantes} dias restantes`;
};
