// UI65: lógica de cuentas regresivas compartida por su API y por los
// controladores de publicaciones (sincronización con eventos).
import { Types } from "mongoose";
import { modelCuentaRegresiva } from "../models/cuentaRegresiva.model";
import { construirFechaObjetivo, finDelDiaCR, inicioDelDiaCR } from "../utils/cuentaRegresiva";

export const MAX_CUENTAS_ACTIVAS = 4;

export interface CuentaRegresivaPublica {
    _id: string;
    titulo: string;
    fechaObjetivo: Date;
    enlace?: string;
    publicacion?: { _id: string; tag: string };
}

/**
 * Contadores que se muestran en la principal: activos, que no hayan pasado
 * del fin del día (hora CR) y, si siguen a un evento, que ese evento exista
 * y esté publicado. Ordenados por fecha, máximo 4.
 */
export async function obtenerActivas(ahora: Date = new Date()): Promise<CuentaRegresivaPublica[]> {
    const candidatos: any[] = await modelCuentaRegresiva
        .find({ activo: true, fechaObjetivo: { $gte: inicioDelDiaCR(ahora) } })
        .sort({ fechaObjetivo: 1 })
        .populate("publicacion", "tag publicado")
        .lean();

    const visibles: CuentaRegresivaPublica[] = [];
    for (const c of candidatos) {
        if (finDelDiaCR(c.fechaObjetivo) < ahora) continue;
        // Ligado a evento: si el evento no existe (populate → null) o no está publicado, se oculta.
        const teniaEvento = "publicacion" in c;
        const ligado = c.publicacion != null;
        if (teniaEvento && (!ligado || c.publicacion.publicado !== true)) continue;

        visibles.push({
            _id: String(c._id),
            titulo: c.titulo,
            fechaObjetivo: c.fechaObjetivo,
            ...(c.enlace ? { enlace: c.enlace } : {}),
            ...(ligado ? { publicacion: { _id: String(c.publicacion._id), tag: c.publicacion.tag } } : {}),
        });
        if (visibles.length === MAX_CUENTAS_ACTIVAS) break;
    }
    return visibles;
}

interface PublicacionEvento {
    _id: Types.ObjectId | string;
    tag?: string;
    titulo?: string;
    fechaEvento?: string;
    horaEvento?: string;
    publicacionOrigenId?: unknown;
}

/**
 * Mantiene el contador de un evento al día con su fecha y título.
 * - Solo eventos originales (`tag === "evento"`, sin `publicacionOrigenId`).
 * - Si ya existe, actualiza título y fecha; si la publicación dejó de ser un
 *   evento o su fecha ya no es válida, elimina el contador.
 * - Si no existe y `crearSiNoExiste`, lo crea solo con fecha futura.
 */
export async function sincronizarCuentaRegresivaDeEvento(
    publicacion: PublicacionEvento,
    opciones: { crearSiNoExiste: boolean; creadoPor?: string }
): Promise<"creada" | "actualizada" | "eliminada" | "omitida"> {
    if (!publicacion?._id) return "omitida";

    const esEvento = publicacion.tag === "evento" && !publicacion.publicacionOrigenId;
    const fechaObjetivo = esEvento ? construirFechaObjetivo(publicacion.fechaEvento, publicacion.horaEvento) : null;
    const titulo = (publicacion.titulo || "").trim().slice(0, 120);
    const existente = await modelCuentaRegresiva.findOne({ publicacion: publicacion._id });

    if (existente) {
        // Dejó de ser un evento o ya no tiene fecha válida: el contador no tiene a qué contar.
        if (!fechaObjetivo) {
            await existente.deleteOne();
            return "eliminada";
        }
        existente.fechaObjetivo = fechaObjetivo;
        if (titulo) existente.titulo = titulo;
        await existente.save();
        return "actualizada";
    }

    if (!opciones.crearSiNoExiste || !opciones.creadoPor) return "omitida";
    if (!fechaObjetivo || fechaObjetivo.getTime() <= Date.now() || !titulo) return "omitida";

    await modelCuentaRegresiva.create({
        titulo,
        fechaObjetivo,
        publicacion: publicacion._id,
        creadoPor: opciones.creadoPor,
    });
    return "creada";
}

export async function eliminarCuentaRegresivaDeEvento(publicacionId: string | Types.ObjectId): Promise<void> {
    await modelCuentaRegresiva.deleteOne({ publicacion: publicacionId });
}
