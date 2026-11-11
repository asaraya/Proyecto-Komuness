// UI65: utilidades de la cuenta regresiva. Todo en hora de Costa Rica
// (UTC-06:00, sin horario de verano), sin importar la zona del navegador.

const OFFSET_CR_MS = 6 * 60 * 60 * 1000;
const MINUTO = 60 * 1000;

/** "YYYY-MM-DD" del día en Costa Rica para un instante (ms). */
const fechaCR = (ms) => new Date(ms - OFFSET_CR_MS).toISOString().slice(0, 10);

const finDelDiaCR = (ms) => Date.parse(`${fechaCR(ms)}T23:59:59.999-06:00`);

/**
 * Tiempo restante hasta `fechaObjetivoISO` visto en `ahoraMs`.
 * Función pura: se recalcula siempre desde la hora actual.
 */
export function calcularRestante(fechaObjetivoISO, ahoraMs) {
  const objetivo = Date.parse(fechaObjetivoISO);
  const diff = objetivo - ahoraMs;

  if (diff <= 0) {
    const terminado = ahoraMs > finDelDiaCR(objetivo);
    return { dias: 0, horas: 0, minutos: 0, esHoy: !terminado, terminado };
  }

  // Redondear hacia arriba: con 30 s restantes se muestra "1 min", no "0".
  const totalMin = Math.ceil(diff / MINUTO);
  return {
    dias: Math.floor(totalMin / 1440),
    horas: Math.floor((totalMin % 1440) / 60),
    minutos: totalMin % 60,
    esHoy: false,
    terminado: false,
  };
}

const formatoFecha = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

const formatoCorto = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  day: "numeric",
  month: "short",
});

/** "Sábado 14 de diciembre · 7:00 p. m." */
export function formatearFechaCR(iso) {
  const partes = formatoFecha.formatToParts(new Date(iso));
  const valor = (tipo) => partes.find((p) => p.type === tipo)?.value || "";
  const diaSemana = valor("weekday");
  // Espacios no separables: "7:00 p. m." nunca se corta en dos líneas.
  const hora = `${valor("hour")}:${valor("minute")} ${valor("dayPeriod")}`.trim().replace(/\s+/g, " ");
  const texto = `${diaSemana} ${valor("day")} de ${valor("month")} · ${hora}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "14 dic" */
export function formatearFechaCortaCR(iso) {
  return formatoCorto.format(new Date(iso)).replace(".", "");
}

/** "en 12 días" / "en 1 día" / "en 5 h" / "en 30 min" / "Hoy" */
export function textoCorto(restante) {
  if (restante.esHoy) return "Hoy";
  if (restante.dias > 0) return `en ${restante.dias} ${restante.dias === 1 ? "día" : "días"}`;
  if (restante.horas > 0) return `en ${restante.horas} h`;
  return `en ${restante.minutos} min`;
}

/** Texto para lectores de pantalla: "Faltan 12 días, 4 horas y 30 minutos". */
export function textoAccesible(restante) {
  if (restante.esHoy) return "¡Hoy es el día!";
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  return `Faltan ${plural(restante.dias, "día", "días")}, ${plural(restante.horas, "hora", "horas")} y ${plural(
    restante.minutos,
    "minuto",
    "minutos",
  )}`;
}

/** Fecha ("YYYY-MM-DD") y hora ("HH:mm", opcional) del formulario → ISO, en hora CR. */
export function fechaHoraCRaISO(fecha, hora) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) return null;
  const h = /^\d{2}:\d{2}$/.test(hora || "") ? hora : "00:00";
  const ms = Date.parse(`${fecha}T${h}:00-06:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** ISO → { fecha: "YYYY-MM-DD", hora: "HH:mm" } en hora CR (para rellenar formularios). */
export function isoAFechaHoraCR(iso) {
  const local = new Date(Date.parse(iso) - OFFSET_CR_MS).toISOString();
  return { fecha: local.slice(0, 10), hora: local.slice(11, 16) };
}

/** Milisegundos hasta el inicio del próximo minuto. */
export function msHastaProximoMinuto(ahoraMs = Date.now()) {
  return MINUTO - (ahoraMs % MINUTO);
}
