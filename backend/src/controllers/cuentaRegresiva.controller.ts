import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { modelCuentaRegresiva } from "../models/cuentaRegresiva.model";
import { modelPublicacion } from "../models/publicacion.model";
import { puedeGestionarCuentasRegresivas } from "../utils/cuentaRegresiva";
import { obtenerActivas, sincronizarCuentaRegresivaDeEvento } from "../services/cuentaRegresiva.service";

const TITULO_MAX = 120;

const usuarioDe = (req: Request): any => (req as any).user;
const esAdmin = (usuario: any) => [0, 1].includes(Number(usuario?.tipoUsuario));
const esDueno = (usuario: any, creadoPor: unknown) => String(creadoPor) === String(usuario?._id);

/** Middleware: corta con 403 si el usuario no puede gestionar cuentas regresivas. */
export const requierePermisoCuentaRegresiva = (req: Request, res: Response, next: NextFunction): void => {
    if (!puedeGestionarCuentasRegresivas(usuarioDe(req))) {
        res.status(403).json({ message: "No tienes permiso para gestionar cuentas regresivas" });
        return;
    }
    next();
};

const validarTitulo = (valor: unknown): string | null => {
    if (typeof valor !== "string") return null;
    const titulo = valor.trim();
    return titulo && titulo.length <= TITULO_MAX ? titulo : null;
};

const validarEnlace = (valor: unknown): string | null | undefined => {
    if (valor === undefined || valor === null || valor === "") return undefined; // sin enlace
    if (typeof valor !== "string") return null;
    try {
        const url = new URL(valor.trim());
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
};

const validarFechaFutura = (valor: unknown): Date | null => {
    if (typeof valor !== "string" && !(valor instanceof Date)) return null;
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) return null;
    return fecha;
};

const idsEventosDe = async (autorId: unknown) =>
    (await modelPublicacion.find({ autor: autorId, tag: "evento" }).select("_id").lean()).map((p: any) => p._id);

const esAutorDelEvento = async (usuario: any, publicacionId: unknown) => {
    if (!publicacionId) return false;
    const evento: any = await modelPublicacion.findById(publicacionId).select("autor").lean();
    return Boolean(evento) && esDueno(usuario, evento.autor);
};

/** GET /activas (pública) */
export const getCuentasActivas = async (_req: Request, res: Response): Promise<void> => {
    try {
        res.status(200).json({ data: await obtenerActivas() });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

/** GET / — admins ven todas; el resto, solo las suyas. Próximas primero, luego vencidas. */
export const getCuentas = async (req: Request, res: Response): Promise<void> => {
    try {
        const usuario = usuarioDe(req);
        // Además de los suyos, cada quien ve los contadores de sus propios eventos
        // (por ejemplo, si administración los activó por ellos).
        const filtro = esAdmin(usuario)
            ? {}
            : { $or: [{ creadoPor: usuario._id }, { publicacion: { $in: await idsEventosDe(usuario._id) } }] };
        const todas: any[] = await modelCuentaRegresiva
            .find(filtro)
            .populate("publicacion", "titulo tag")
            .populate("creadoPor", "nombre apellido")
            .lean();
        const ahora = Date.now();
        const proximas = todas
            .filter((c) => new Date(c.fechaObjetivo).getTime() >= ahora)
            .sort((a, b) => +new Date(a.fechaObjetivo) - +new Date(b.fechaObjetivo));
        const vencidas = todas
            .filter((c) => new Date(c.fechaObjetivo).getTime() < ahora)
            .sort((a, b) => +new Date(b.fechaObjetivo) - +new Date(a.fechaObjetivo));
        res.status(200).json({ data: [...proximas, ...vencidas] });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

/** POST / — contador libre */
export const createCuenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const titulo = validarTitulo(req.body?.titulo);
        if (!titulo) {
            res.status(400).json({ message: `El título es obligatorio (máximo ${TITULO_MAX} caracteres)` });
            return;
        }
        const fechaObjetivo = validarFechaFutura(req.body?.fechaObjetivo);
        if (!fechaObjetivo) {
            res.status(400).json({ message: "La fecha debe ser válida y futura" });
            return;
        }
        const enlace = validarEnlace(req.body?.enlace);
        if (enlace === null) {
            res.status(400).json({ message: "El enlace debe empezar con http:// o https://" });
            return;
        }
        const cuenta = await modelCuentaRegresiva.create({
            titulo,
            fechaObjetivo,
            ...(enlace ? { enlace } : {}),
            creadoPor: usuarioDe(req)._id,
        });
        res.status(201).json({ data: cuenta });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

/** POST /evento/:publicacionId — activar el contador de un evento existente */
export const createCuentaDeEvento = async (req: Request, res: Response): Promise<void> => {
    try {
        const { publicacionId } = req.params;
        const usuario = usuarioDe(req);
        if (!mongoose.isValidObjectId(publicacionId)) {
            res.status(404).json({ message: "Evento no encontrado" });
            return;
        }
        const publicacion: any = await modelPublicacion.findById(publicacionId).lean();
        if (!publicacion || publicacion.tag !== "evento" || publicacion.publicacionOrigenId) {
            res.status(404).json({ message: "Evento no encontrado" });
            return;
        }
        if (!esAdmin(usuario) && !esDueno(usuario, publicacion.autor)) {
            res.status(403).json({ message: "Solo el autor del evento o administración pueden hacerlo" });
            return;
        }
        const resultado = await sincronizarCuentaRegresivaDeEvento(publicacion, {
            crearSiNoExiste: true,
            creadoPor: String(usuario._id),
        });
        if (resultado === "omitida" || resultado === "eliminada") {
            res.status(400).json({ message: "El evento no tiene una fecha futura válida" });
            return;
        }
        const cuenta = await modelCuentaRegresiva.findOne({ publicacion: publicacionId });
        res.status(resultado === "creada" ? 201 : 200).json({ data: cuenta });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

/** Busca la cuenta y verifica que el usuario sea dueño o admin. Responde y devuelve null si no. */
const cargarCuentaPropia = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        res.status(404).json({ message: "Cuenta regresiva no encontrada" });
        return null;
    }
    const cuenta = await modelCuentaRegresiva.findById(id);
    if (!cuenta) {
        res.status(404).json({ message: "Cuenta regresiva no encontrada" });
        return null;
    }
    const usuario = usuarioDe(req);
    const permitido =
        esAdmin(usuario) || esDueno(usuario, cuenta.creadoPor) || (await esAutorDelEvento(usuario, cuenta.publicacion));
    if (!permitido) {
        res.status(403).json({ message: "No puedes modificar una cuenta regresiva de otra persona" });
        return null;
    }
    return cuenta;
};

/** PUT /:id — título, activo, enlace; la fecha solo en contadores libres */
export const updateCuenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const cuenta = await cargarCuentaPropia(req, res);
        if (!cuenta) return;
        const body = req.body || {};

        if (body.titulo !== undefined) {
            const titulo = validarTitulo(body.titulo);
            if (!titulo) {
                res.status(400).json({ message: `El título es obligatorio (máximo ${TITULO_MAX} caracteres)` });
                return;
            }
            cuenta.titulo = titulo;
        }
        if (body.activo !== undefined) {
            if (typeof body.activo !== "boolean") {
                res.status(400).json({ message: "activo debe ser true o false" });
                return;
            }
            cuenta.activo = body.activo;
        }
        if (body.fechaObjetivo !== undefined) {
            if (cuenta.publicacion) {
                res.status(400).json({ message: "La fecha de este contador la toma del evento" });
                return;
            }
            const fecha = validarFechaFutura(body.fechaObjetivo);
            if (!fecha) {
                res.status(400).json({ message: "La fecha debe ser válida y futura" });
                return;
            }
            cuenta.fechaObjetivo = fecha;
        }
        if (body.enlace !== undefined && !cuenta.publicacion) {
            const enlace = validarEnlace(body.enlace);
            if (enlace === null) {
                res.status(400).json({ message: "El enlace debe empezar con http:// o https://" });
                return;
            }
            cuenta.enlace = enlace;
        }
        await cuenta.save();
        res.status(200).json({ data: cuenta });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

/** DELETE /:id */
export const deleteCuenta = async (req: Request, res: Response): Promise<void> => {
    try {
        const cuenta = await cargarCuentaPropia(req, res);
        if (!cuenta) return;
        await cuenta.deleteOne();
        res.status(200).json({ message: "Cuenta regresiva eliminada" });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
