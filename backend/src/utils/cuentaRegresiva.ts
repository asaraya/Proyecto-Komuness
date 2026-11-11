// UI65: utilidades de la cuenta regresiva de la página principal.
// Todo se calcula en hora de Costa Rica (UTC-06:00, sin horario de verano).

const OFFSET_CR = "-06:00";
const OFFSET_CR_MS = 6 * 60 * 60 * 1000;

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "YYYY-MM-DD" del día en Costa Rica para un instante dado. */
const fechaCR = (fecha: Date): string =>
    new Date(fecha.getTime() - OFFSET_CR_MS).toISOString().slice(0, 10);

/**
 * Convierte la fecha ("YYYY-MM-DD") y hora ("HH:mm", opcional) de un evento,
 * entendidas como hora de Costa Rica, en el instante real. Sin hora → 00:00.
 * Devuelve null si la fecha o la hora no son válidas.
 */
export function construirFechaObjetivo(fechaEvento: unknown, horaEvento?: unknown): Date | null {
    if (typeof fechaEvento !== "string") return null;
    const fecha = fechaEvento.trim();
    if (!RE_FECHA.test(fecha)) return null;

    let hora = "00:00";
    if (horaEvento !== undefined && horaEvento !== null && horaEvento !== "") {
        if (typeof horaEvento !== "string" || !RE_HORA.test(horaEvento.trim())) return null;
        hora = horaEvento.trim();
    }

    const resultado = new Date(`${fecha}T${hora}:00${OFFSET_CR}`);
    if (Number.isNaN(resultado.getTime())) return null;
    // Caza fechas que el motor "corrige" (p. ej. 2026-02-30 → 2 de marzo).
    if (fechaCR(resultado) !== fecha) return null;
    return resultado;
}

/** Último milisegundo del mismo día, en hora de Costa Rica. */
export function finDelDiaCR(fecha: Date): Date {
    return new Date(`${fechaCR(fecha)}T23:59:59.999${OFFSET_CR}`);
}

/** Primer milisegundo del mismo día, en hora de Costa Rica. */
export function inicioDelDiaCR(fecha: Date): Date {
    return new Date(`${fechaCR(fecha)}T00:00:00.000${OFFSET_CR}`);
}

/**
 * Quién puede crear y gestionar cuentas regresivas: admins (0 y 1) siempre;
 * el resto solo si administración le dio el permiso. Usar siempre el usuario
 * leído de la BD (req.user), nunca lo que trae el token.
 */
export function puedeGestionarCuentasRegresivas(
    usuario: { tipoUsuario: number; puedeCrearCuentaRegresiva?: boolean } | null | undefined
): boolean {
    if (!usuario) return false;
    const rol = Number(usuario.tipoUsuario);
    return rol === 0 || rol === 1 || usuario.puedeCrearCuentaRegresiva === true;
}
