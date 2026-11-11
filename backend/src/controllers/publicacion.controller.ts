// src/controllers/publicacion.controller.ts

import { Request, Response } from "express";
import { IPublicacionNotification,
  IAdjunto,
  IComentario,
  IEnlaceExterno,
  IPublicacion,
} from "../interfaces/publicacion.interface";
import { modelPublicacion } from "../models/publicacion.model";
import mongoose from "mongoose";
import {
  saveMulterFileToGridFS,
  saveBufferToGridFS,
  deleteGridFSFile,
} from "../utils/gridfs";
import {
  buildActivePublicationQuery,
  calculatePublicationExpirationDate,
} from "../utils/publicacionExpiration";
import { validarUbicacion } from "../utils/ubicacion";
import { sendEmail } from "../utils/mail"; // usa el mismo transporter que recuperación
import { modelUsuario } from "../models/usuario.model"; // ← Modelo de usuarios
import { puedeGestionarCuentasRegresivas } from "../utils/cuentaRegresiva";
import {
  sincronizarCuentaRegresivaDeEvento,
  eliminarCuentaRegresivaDeEvento,
} from "../services/cuentaRegresiva.service";
import {
  createComentarioPublicacionNotificacion,
  createRespuestaComentarioNotificacion,
  notificarNuevaPublicacion,
  notificarPublicacionAutomatica,
} from "../services/notificacion.service";

const LOG_ON = process.env.LOG_PUBLICACION === "1";

const TAGS_CONTEO = ["publicacion", "evento", "emprendimiento"];

// Utilidad: normaliza precio (string → number | undefined)
function parsePrecio(input: any): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return undefined;
    const cleaned = trimmed.replace(/[₡$,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseBoolean(input: any): boolean | undefined {
  if (input === undefined || input === null || input === "") return undefined;
  if (typeof input === "boolean") return input;
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}

// Construye el filtro de fecha para publicaciones/eventos/emprendimientos.
// Si solo se da fechaInicio, filtra ese día puntual. Si se dan ambas, filtra el rango (inclusivo).
// Eventos usan fechaEvento (string "YYYY-MM-DD", comparable lexicográficamente);
// publicaciones/emprendimientos usan el rango de createdAt.
function buildFechaFilter(
  fechaInicio: string | undefined,
  fechaFin: string | undefined,
  tag: string | undefined,
): { field: Record<string, any> } | { or: Record<string, any>[] } | null {
  if (!fechaInicio && !fechaFin) return null;

  const inicioStr = fechaInicio || (fechaFin as string);
  const finStr = fechaFin || (fechaInicio as string);

  const inicioDate = new Date(inicioStr);
  const finDate = new Date(finStr);
  finDate.setDate(finDate.getDate() + 1);

  const filtroEvento = { fechaEvento: { $gte: inicioStr, $lte: finStr } };
  const filtroNoEvento = { createdAt: { $gte: inicioDate, $lt: finDate } };

  if (tag === "evento") return { field: filtroEvento };
  if (tag) return { field: filtroNoEvento };

  return {
    or: [
      { tag: "evento", ...filtroEvento },
      { tag: { $ne: "evento" }, ...filtroNoEvento },
    ],
  };
}

function parseMoneda(input: any): "CRC" | "USD" | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "string") return undefined;
  const normalized = input.trim().toUpperCase();
  if (normalized === "CRC" || normalized === "USD") return normalized;
  return undefined;
}

function getMonedaData(
  inputMoneda: any,
  inputMonedaSimbolo: any,
): { moneda: "CRC" | "USD"; monedaSimbolo: "₡" | "$" } {
  const moneda =
    parseMoneda(inputMoneda) ?? (inputMonedaSimbolo === "$" ? "USD" : "CRC");

  return {
    moneda,
    monedaSimbolo: moneda === "USD" ? "$" : "₡",
  };
}

// función para validar teléfono
function parseTelefono(input: any): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed || undefined;
}

// función para validar comunidad
function parseComunidad(input: any): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim().slice(0, 100);
  return trimmed || undefined;
}

// función para validar enlaces externos
function parseEnlacesExternos(input: any): IEnlaceExterno[] | undefined {
  if (!input) return undefined;
  try {
    if (typeof input === "string") {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (enlace: any) =>
              enlace &&
              typeof enlace.nombre === "string" &&
              typeof enlace.url === "string" &&
              enlace.nombre.trim() !== "" &&
              enlace.url.trim() !== "",
          )
          .map((enlace: any) => ({
            ...enlace,
            url: formatearUrlEnlace(enlace.url),
          }));
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function formatearUrlEnlace(url: string): string {
  const urlLimpia = url.trim();

  // Si es un correo sin mailto:
  if (urlLimpia.includes("@") && !urlLimpia.startsWith("mailto:")) {
    return `mailto:${urlLimpia}`;
  }

  // Si es un teléfono sin tel:
  const soloNumeros = urlLimpia.replace(/[\s\-\+\(\)]/g, "");
  if (/^\d+$/.test(soloNumeros) && !urlLimpia.startsWith("tel:")) {
    return `tel:${urlLimpia}`;
  }

  return urlLimpia;
}

function mustRequirePrecio(tag?: string): boolean {
  return tag === "evento";
}

function validateAndNormalizePricing(
  tag: string | undefined,
  precio: number | undefined,
  precioNegociable: boolean,
  precioEstudiante: number | undefined,
  precioCiudadanoOro: number | undefined,
): {
  error?: string;
  precio: number | undefined;
  precioNegociable: boolean;
  precioEstudiante: number | undefined;
  precioCiudadanoOro: number | undefined;
} {
  if (tag === "evento") {
    if (precio === undefined) {
      return {
        error:
          "El campo precio regular es obligatorio y debe ser numérico para eventos.",
        precio,
        precioNegociable: false,
        precioEstudiante,
        precioCiudadanoOro,
      };
    }

    return {
      precio,
      precioNegociable: false,
      precioEstudiante,
      precioCiudadanoOro,
    };
  }

  if (tag === "emprendimiento") {
    if (precioNegociable) {
      return {
        precio: undefined,
        precioNegociable: true,
        precioEstudiante: undefined,
        precioCiudadanoOro: undefined,
      };
    }

    if (precio === undefined) {
      return {
        error:
          "Para emprendimientos debes indicar un precio regular o marcarlo como precio negociable.",
        precio,
        precioNegociable,
        precioEstudiante,
        precioCiudadanoOro,
      };
    }
  }

  return {
    precio,
    precioNegociable,
    precioEstudiante,
    precioCiudadanoOro,
  };
}

// UI65: crea el contador de la principal si quien crea el evento marcó la
// casilla y tiene permiso. Un fallo aquí nunca debe romper la publicación.
async function crearCuentaRegresivaSiCorresponde(req: Request, savePost: any) {
  try {
    const usuario = (req as any).user;
    if (parseBoolean((req.body as any)?.mostrarCuentaRegresiva) !== true) return;
    if (!puedeGestionarCuentasRegresivas(usuario)) return;
    await sincronizarCuentaRegresivaDeEvento(savePost, {
      crearSiNoExiste: true,
      creadoPor: String(usuario._id),
    });
  } catch (error) {
    console.warn("No se pudo crear la cuenta regresiva del evento", error);
  }
}

async function sincronizarCuentaRegresiva(publicacion: any) {
  try {
    await sincronizarCuentaRegresivaDeEvento(publicacion, { crearSiNoExiste: false });
  } catch (error) {
    console.warn("No se pudo sincronizar la cuenta regresiva del evento", error);
  }
}

// Normaliza hora del evento en formato HH:mm (24h). Si no cumple, se ignora.
function parseHoraEvento(input: any): string | undefined {
  if (typeof input !== "string") return undefined;
  const t = input.trim();
  return /^\d{2}:\d{2}$/.test(t) ? t : undefined;
}

// ───────────────────────────────────────────────────────────────────────────────
// Helper: correos de admins (tipoUsuario = 1) con email válido
// ───────────────────────────────────────────────────────────────────────────────
async function getAdminEmails(): Promise<string[]> {
  const users = await modelUsuario
    .find({
      tipoUsuario: 1, // 0=super-admin, 1=admin, 2=básico, 3=premium
      email: { $exists: true, $ne: "" },
    })
    .select("email")
    .lean();

  const emails = users.map((u: any) => u.email).filter(Boolean) as string[];
  return Array.from(new Set(emails)); // dedup
}

// Crear una publicación (sin adjuntos)
export const createPublicacion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body as IPublicacion & Record<string, any>;

    // 🔴 Autor siempre desde el token
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ message: "Usuario no autenticado" });
      return;
    }

    const precio = parsePrecio(body.precio);
    const precioEstudiante = parsePrecio(body.precioEstudiante);
    const precioCiudadanoOro = parsePrecio(body.precioCiudadanoOro);
    const precioNegociable = parseBoolean(body.precioNegociable) === true;
    const tag = body.tag;
    const horaEvento = parseHoraEvento(body.horaEvento);
    const telefono = parseTelefono(body.telefono);
    const enlacesExternos = parseEnlacesExternos(body.enlacesExternos);
    const ubicacionResult = validarUbicacion(body.ubicacion);
    if (!ubicacionResult.ok) {
      res.status(400).json({ message: ubicacionResult.error });
      return;
    }
    const ubicacion = ubicacionResult.ubicacion;
    const comunidad = parseComunidad(body.comunidad);
    const monedaData = getMonedaData(body.moneda, body.monedaSimbolo);

    const pricing = validateAndNormalizePricing(
      tag,
      precio,
      precioNegociable,
      precioEstudiante,
      precioCiudadanoOro,
    );
    if (pricing.error) {
      res.status(400).json({ message: pricing.error });
      return;
    }

    const publicacion: IPublicacion = {
      ...body,
      autor: userId, // 🔴 forzamos autor desde el token
      publicado: `${(body as any).publicado}` === "true",
      precio: pricing.precio,
      moneda: monedaData.moneda,
      monedaSimbolo: monedaData.monedaSimbolo,
      precioNegociable: pricing.precioNegociable,
      precioEstudiante: pricing.precioEstudiante,
      precioCiudadanoOro: pricing.precioCiudadanoOro,
      horaEvento,
      telefono,
      enlacesExternos,
      ubicacion,
      comunidad,
    } as IPublicacion;

    const nuevaPublicacion = new modelPublicacion(publicacion);

    const savePost = await nuevaPublicacion.save();
    await crearCuentaRegresivaSiCorresponde(req, savePost);

    // Notificación por correo a admins (aprobación)
    try {
      const asunto = "Nueva publicación para aprobar";
      const texto =
        `Se ha creado una nueva publicación que requiere aprobación.\n` +
        `Título: ${savePost.titulo ?? "(sin título)"}\n` +
        `Fecha: ${new Date(savePost.createdAt ?? Date.now()).toISOString()}`;

      const emails = await getAdminEmails();
      if (emails.length === 0) {
        if (LOG_ON)
          console.warn(
            "[Publicaciones][createPublicacion] No hay admins con email para notificar",
          );
      } else {
        await Promise.allSettled(
          emails.map((e) => sendEmail(e, asunto, texto)),
        );
      }
    } catch (e) {
      console.warn(
        "[Publicaciones][createPublicacion] No se pudo enviar la notificación:",
        e,
      );
    }

    res.status(201).json(savePost);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Crear publicación con adjuntos v2 (GridFS)
export const createPublicacionA = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const publicacion = req.body as IPublicacion & Record<string, any>;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    // 🔴 Autor siempre desde el token
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ ok: false, message: "Usuario no autenticado" });
      return;
    }

    // --- Recolectar archivos desde Multer (array o fields) ---
    let files: Express.Multer.File[] = [];
    if (Array.isArray(req.files)) {
      files = req.files as Express.Multer.File[];
    } else if (req.files && typeof req.files === "object") {
      const map = req.files as Record<
        string,
        Express.Multer.File[] | undefined
      >;
      files = [...(map["archivos"] ?? []), ...(map["imagenes"] ?? [])];
    }

    // --- Validar/establecer categoria ---
    let categoria: any = (publicacion as any).categoria;
    if (!categoria) {
      const defId = process.env.DEFAULT_CATEGORIA_ID;
      if (defId && mongoose.Types.ObjectId.isValid(defId)) {
        categoria = defId;
      } else {
        res.status(400).json({
          ok: false,
          message:
            'categoria es requerida (envía "categoria" o configura DEFAULT_CATEGORIA_ID en .env)',
        });
        return;
      }
    }

    // --- Precio / otros campos ---
    const precio = parsePrecio((publicacion as any).precio);
    const precioEstudiante = parsePrecio((publicacion as any).precioEstudiante);
    const precioCiudadanoOro = parsePrecio(
      (publicacion as any).precioCiudadanoOro,
    );
    const precioNegociable =
      parseBoolean((publicacion as any).precioNegociable) === true;
    const tag = (publicacion as any).tag;
    const horaEvento = parseHoraEvento((publicacion as any).horaEvento);
    const telefono = parseTelefono((publicacion as any).telefono);
    const enlacesExternos = parseEnlacesExternos(
      (publicacion as any).enlacesExternos,
    );
    const ubicacionResult = validarUbicacion((publicacion as any).ubicacion);
    if (!ubicacionResult.ok) {
      res.status(400).json({ ok: false, message: ubicacionResult.error });
      return;
    }
    const ubicacion = ubicacionResult.ubicacion;
    const comunidad = parseComunidad((publicacion as any).comunidad);
    const monedaData = getMonedaData(
      (publicacion as any).moneda,
      (publicacion as any).monedaSimbolo,
    );

    const pricing = validateAndNormalizePricing(
      tag,
      precio,
      precioNegociable,
      precioEstudiante,
      precioCiudadanoOro,
    );
    if (pricing.error) {
      res.status(400).json({ ok: false, message: pricing.error });
      return;
    }

    // --- Subir adjuntos (0..N) ---
    const adjuntos: IAdjunto[] = [];
    for (const file of files) {
      const result = await saveMulterFileToGridFS(file, "publicaciones");
      adjuntos.push({
        url: `${process.env.PUBLIC_BASE_URL || "http://159.54.148.238"}/api/files/${result.id.toString()}`,
        key: result.id.toString(),
      });
    }

    // --- Crear documento y guardar ---
    const nuevaPublicacion = new modelPublicacion({
      ...publicacion,
      autor: userId, // 🔴 forzamos autor desde el token
      categoria,
      adjunto: adjuntos,
      publicado: `${(publicacion as any).publicado}` === "true",
      precio: pricing.precio,
      moneda: monedaData.moneda,
      monedaSimbolo: monedaData.monedaSimbolo,
      precioNegociable: pricing.precioNegociable,
      precioEstudiante: pricing.precioEstudiante,
      precioCiudadanoOro: pricing.precioCiudadanoOro,
      horaEvento,
      telefono,
      enlacesExternos,
      ubicacion,
      comunidad,
    });

    const savePost = await nuevaPublicacion.save();
    await crearCuentaRegresivaSiCorresponde(req, savePost);

    // BKD38: al crear un evento o emprendimiento, generar automáticamente
    // una publicación independiente en el feed general. Solo ocurre al
    // crear (no hay sincronización si luego se edita o borra el original).
    if (tag === "evento" || tag === "emprendimiento") {
      try {
        // Copia independiente de los adjuntos: no reusar el mismo key de
        // GridFS que el evento/emprendimiento original, porque
        // deletePublicacion() borra los adjuntos en GridFS al eliminar
        // cualquiera de los dos documentos, y eso rompería las imágenes
        // del otro.
        const adjuntosPublicacion: IAdjunto[] = [];
        for (const file of files) {
          const result = await saveMulterFileToGridFS(file, "publicaciones");
          adjuntosPublicacion.push({
            url: `${process.env.PUBLIC_BASE_URL || "http://159.54.148.238"}/api/files/${result.id.toString()}`,
            key: result.id.toString(),
          });
        }

        const publicacionAutomatica = new modelPublicacion({
          titulo: savePost.titulo,
          contenido: savePost.contenido,
          contenidoBreve: savePost.contenidoBreve,
          autor: userId,
          fecha: savePost.fecha,
          tag: "publicacion",
          publicado: savePost.publicado,
          categoria: savePost.categoria,
          comunidad: savePost.comunidad,
          fechaEvento: savePost.fechaEvento,
          horaEvento: savePost.horaEvento,
          telefono: savePost.telefono,
          enlacesExternos: savePost.enlacesExternos,
          ubicacion: savePost.ubicacion,
          adjunto: adjuntosPublicacion,
          publicacionOrigenId: savePost._id,
        });

        const autoGuardada = await publicacionAutomatica.save();

        // BKD68: si la automática ya nace publicada (la creó un admin),
        // notificar a todos los usuarios. Si nace pendiente, la notificación
        // se envía cuando se aprueba el evento/emprendimiento (updatePublicacion).
        if (autoGuardada.publicado) {
          try {
            await notificarPublicacionAutomatica({
              publicacionId: autoGuardada._id.toString(),
              titulo: autoGuardada.titulo,
              tagOrigen: tag,
            });
          } catch (notiError) {
            console.warn(
              "[Publicaciones][createPublicacionA] No se pudo notificar la publicación automática:",
              notiError,
            );
          }
        }
      } catch (e) {
        console.warn(
          "[Publicaciones][createPublicacionA] No se pudo crear la publicación automática:",
          e,
        );
      }
    }

    // Notificación por correo a admins (aprobación)
    try {
      const asunto = "Nueva publicación para aprobar";
      const texto =
        `Se ha creado una nueva publicación que requiere aprobación.\n` +
        `Título: ${savePost.titulo ?? "(sin título)"}\n` +
        `Fecha: ${new Date(savePost.createdAt ?? Date.now()).toISOString()}`;

      const emails = await getAdminEmails();
      if (emails.length === 0) {
        if (LOG_ON)
          console.warn(
            "[Publicaciones][createPublicacionA] No hay admins con email para notificar",
          );
      } else {
        await Promise.allSettled(
          emails.map((e) => sendEmail(e, asunto, texto)),
        );
      }
    } catch (e) {
      console.warn(
        "[Publicaciones][createPublicacionA] No se pudo enviar la notificación:",
        e,
      );
    }

    res.status(201).json(savePost);
  } catch (error) {
    console.error("createPublicacionA error:", error);
    const err = error as Error;
    res.status(500).json({ ok: false, message: err.message });
  }
};

// obtener publicaciones por tag
export const getPublicacionesByTag = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const { tag, publicado, categoria, comunidad, fechaInicio, fechaFin, precioMin, precioMax } =
      req.query as {
        tag?: string;
        publicado?: string;
        categoria?: string;
        comunidad?: string;
        fechaInicio?: string;
        fechaFin?: string;
        precioMin?: number;
        precioMax?: number;
      };

    const query: any = { $and: [buildActivePublicationQuery()] };
    if (tag) query.tag = tag;
    if (publicado !== undefined) query.publicado = publicado === "true";
    // BKD38: las publicaciones automáticas pendientes se aprueban/rechazan
    // junto con su evento/emprendimiento, no deben salir como solicitud aparte.
    if (publicado === "false") query.publicacionOrigenId = { $exists: false };
    if (categoria) query.categoria = categoria;
    if (comunidad) query.comunidad = { $regex: comunidad as string, $options: "i" };

    const fechaFiltro = buildFechaFilter(fechaInicio, fechaFin, tag);
    if (fechaFiltro) {
      if ("field" in fechaFiltro) {
        Object.assign(query, fechaFiltro.field);
      } else {
        query.$and.push({ $or: fechaFiltro.or });
      }
    }

    if (precioMin || precioMax) {
      query.precio = {};

      if (precioMin) query.precio.$gte = Number(precioMin);

      if (precioMax) query.precio.$lte = Number(precioMax);
    }

    const [publicaciones, totalPublicaciones] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate("autor", "nombre")
        .populate("categoria", "nombre estado")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      modelPublicacion.countDocuments(query),
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset,
        limit,
        total: totalPublicaciones,
        pages: Math.ceil(totalPublicaciones / Math.max(limit, 1)),
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Obtener una publicación por su ID
export const getPublicacionById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const publicacion: IPublicacion | null = await modelPublicacion
      .findById(id)
      .populate("autor", "nombre")
      .populate("categoria", "nombre estado");

    if (!publicacion || publicacion.estaCaducada) {
      res.status(404).json({ message: "Publicación no encontrada" });
      return;
    }
    res.status(200).json(publicacion);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Obtener publicaciones por categoría
export const getPublicacionesByCategoria = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { categoriaId } = req.params;
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;

    const query: any = {
      categoria: categoriaId,
      publicado: true,
      ...buildActivePublicationQuery(),
    };

    const [publicaciones, total] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate("autor", "nombre")
        .populate("categoria", "nombre estado")
        .skip(offset)
        .limit(limit),
      modelPublicacion.countDocuments(query),
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Actualizar una publicación
export const updatePublicacion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedData: Partial<IPublicacion> & Record<string, any> = {
      ...req.body,
    };
    const publicacionActual = await modelPublicacion
      .findById(id)
      .populate("autor", "nombre apellido");

    if (!publicacionActual) {
      res.status(404).json({ message: "Publicacion no encontrada" });
      return;
    }

    if (updatedData.hasOwnProperty("precio")) {
      const parsed = parsePrecio(updatedData.precio);
      updatedData.precio = parsed;
    }

    if (updatedData.hasOwnProperty("precioEstudiante")) {
      updatedData.precioEstudiante = parsePrecio(updatedData.precioEstudiante);
    }

    if (updatedData.hasOwnProperty("precioCiudadanoOro")) {
      updatedData.precioCiudadanoOro = parsePrecio(
        updatedData.precioCiudadanoOro,
      );
    }

    if (updatedData.hasOwnProperty("precioNegociable")) {
      updatedData.precioNegociable =
        parseBoolean(updatedData.precioNegociable) === true;
    }

    if (
      updatedData.hasOwnProperty("moneda") ||
      updatedData.hasOwnProperty("monedaSimbolo")
    ) {
      const monedaData = getMonedaData(
        updatedData.moneda,
        updatedData.monedaSimbolo,
      );
      updatedData.moneda = monedaData.moneda;
      updatedData.monedaSimbolo = monedaData.monedaSimbolo;
    }

    // Si viene horaEvento, normalizar a HH:mm (si no es válida, no pisa)
    if (updatedData.hasOwnProperty("horaEvento")) {
      const parsedHora = parseHoraEvento(updatedData.horaEvento);

      if (parsedHora !== undefined) updatedData.horaEvento = parsedHora;
      else delete updatedData.horaEvento;
    }

    // Si viene ubicacion, validarla (si viene vacía, no pisa)
    if (updatedData.hasOwnProperty("ubicacion")) {
      const ubicacionResult = validarUbicacion(updatedData.ubicacion);
      if (!ubicacionResult.ok) {
        res.status(400).json({ message: ubicacionResult.error });
        return;
      }

      if (ubicacionResult.ubicacion !== undefined)
        updatedData.ubicacion = ubicacionResult.ubicacion;
      else delete updatedData.ubicacion;
    }

    const nextTag =
      (updatedData.tag as string | undefined) ?? publicacionActual.tag;
    const nextPrecio = updatedData.hasOwnProperty("precio")
      ? updatedData.precio
      : publicacionActual.precio;
    const nextPrecioEstudiante = updatedData.hasOwnProperty("precioEstudiante")
      ? updatedData.precioEstudiante
      : publicacionActual.precioEstudiante;
    const nextPrecioCiudadanoOro = updatedData.hasOwnProperty(
      "precioCiudadanoOro",
    )
      ? updatedData.precioCiudadanoOro
      : publicacionActual.precioCiudadanoOro;
    const nextPrecioNegociable = updatedData.hasOwnProperty("precioNegociable")
      ? updatedData.precioNegociable === true
      : publicacionActual.precioNegociable === true;

    const pricing = validateAndNormalizePricing(
      nextTag,
      nextPrecio,
      nextPrecioNegociable,
      nextPrecioEstudiante,
      nextPrecioCiudadanoOro,
    );
    if (pricing.error) {
      res.status(400).json({ message: pricing.error });
      return;
    }
    updatedData.fechaExpiracion =
      calculatePublicationExpirationDate({
        ...(publicacionActual.toObject() as IPublicacion),
        ...updatedData,
      }) ?? null;

    updatedData.precio = pricing.precio;
    updatedData.precioNegociable = pricing.precioNegociable;
    updatedData.precioEstudiante = pricing.precioEstudiante;
    updatedData.precioCiudadanoOro = pricing.precioCiudadanoOro;

    const publicacion = await modelPublicacion.findByIdAndUpdate(
      id,
      updatedData,
      { new: true },
    );
    if (!publicacion) {
      res.status(404).json({ message: "Publicación no encontrada" });
      return;
    }

    await sincronizarCuentaRegresiva(publicacion);

    // BKD68: parseBoolean para soportar "true" (string) que llega por
    // multipart/form-data; antes `=== true` nunca se cumplía en ese caso.
    const seAprobo =
      !publicacionActual.publicado &&
      parseBoolean(updatedData.publicado) === true;

    const esEventoOEmprendimiento =
      publicacion.tag === "evento" || publicacion.tag === "emprendimiento";

    // BKD38 + BKD68: al aprobar un evento/emprendimiento, aprobar también la
    // publicación automática que se generó con él (si sigue pendiente) y
    // notificar a todos los usuarios por cada una.
    if (seAprobo && esEventoOEmprendimiento) {
      const pendientes = await modelPublicacion
        .find({ publicacionOrigenId: publicacion._id, publicado: false })
        .select("_id titulo");

      if (pendientes.length) {
        await modelPublicacion.updateMany(
          { _id: { $in: pendientes.map((p) => p._id) } },
          { $set: { publicado: true } },
        );

        for (const auto of pendientes) {
          try {
            await notificarPublicacionAutomatica({
              publicacionId: auto._id.toString(),
              titulo: auto.titulo,
              tagOrigen: publicacion.tag,
            });
          } catch (notiError) {
            console.warn(
              "No se pudo notificar la publicación automática",
              notiError,
            );
          }
        }
      }
    }

    // Notificación a usuarios suscritos a categoría.
    // BKD68: para evento/emprendimiento ya se notifica a todos mediante la
    // publicación automática, así que se omite para no duplicar el aviso.
    const autor = publicacionActual.autor as any;
    if (seAprobo && !esEventoOEmprendimiento) {
      const nombreAutor = [autor.nombre, autor.apellido]
        .filter(Boolean)
        .join(" ")
        .trim();
      try {
        await notificarNuevaPublicacion({
          autor: nombreAutor,
          contenidoBreve: publicacionActual.contenidoBreve,
          publicacionId: id,
          categoriaId: publicacionActual.categoria.toString(),
        });
      } catch (notificacionError) {
        console.warn(
          "No se pudo crear notificación de publicación",
          notificacionError,
        );
      }
    }

    res.status(200).json(publicacion);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Eliminar una publicación (y sus adjuntos en GridFS)
export const deletePublicacion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedPost = await modelPublicacion.findByIdAndDelete(id);

    if (!deletedPost) {
      res.status(404).json({ message: "Publicación no encontrada" });
      return;
    }

    try {
      await eliminarCuentaRegresivaDeEvento(deletedPost._id);
    } catch (error) {
      console.warn("No se pudo eliminar la cuenta regresiva del evento", error);
    }

    // BKD38: si se rechaza (borra) un evento/emprendimiento que todavía no
    // estaba aprobado, borrar también su publicación automática pendiente.
    // Las que ya están publicadas no se tocan (no hay sincronización).
    const documentosBorrados: any[] = [deletedPost];
    if (
      !deletedPost.publicado &&
      (deletedPost.tag === "evento" || deletedPost.tag === "emprendimiento")
    ) {
      const copias = await modelPublicacion.find({
        publicacionOrigenId: deletedPost._id,
        publicado: false,
      });
      if (copias.length) {
        await modelPublicacion.deleteMany({
          _id: { $in: copias.map((c) => c._id) },
        });
        documentosBorrados.push(...copias);
      }
    }

    for (const doc of documentosBorrados) {
      const adjuntos = (doc as any).adjunto as IAdjunto[] | undefined;
      if (adjuntos?.length) {
        for (const a of adjuntos) {
          if (a.key) {
            try {
              await deleteGridFSFile(a.key);
            } catch {}
          }
        }
      }
    }

    res.status(200).json({ message: "Publicación eliminada correctamente" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Agregar comentario
export const addComentario = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { contenido } = req.body;

  const user = req.user;

  if (!user) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }

  if (!contenido?.trim()) {
    res
      .status(400)
      .json({ message: "El contenido del comentario es obligatorio" });
    return;
  }

  const nuevoComentario = {
    autor: {
      _id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      avatar: user.avatar,
    },
    contenido: contenido.trim(),
    fecha: new Date().toISOString(),
  };

  try {
    const publicacionActualizada = await modelPublicacion.findByIdAndUpdate(
      id,
      { $push: { comentarios: nuevoComentario } },
      { new: true },
    );

    if (!publicacionActualizada) {
      res.status(404).json({ message: "Publicación no encontrada" });
      return;
    }

    const autorPublicacionId = publicacionActualizada.autor?.toString?.();
    const autorComentarioId = user._id?.toString?.();

    if (
      autorPublicacionId &&
      autorComentarioId &&
      autorPublicacionId !== autorComentarioId
    ) {
      const nombreComentarista = [user.nombre, user.apellido]
        .filter(Boolean)
        .join(" ")
        .trim();
      const tituloPublicacion =
        publicacionActualizada.titulo || "tu publicación";

      try {
        await createComentarioPublicacionNotificacion({
          destinatarioId: autorPublicacionId, //temporalmente
          recipientes: [autorPublicacionId],
          publicacionId: id,
          tituloPublicacion,
          nombreComentarista,
        });
      } catch (notificacionError) {
        console.warn(
          "No se pudo crear notificación de comentario:",
          notificacionError,
        );
      }
    }

    res.status(201).json(publicacionActualizada.comentarios);
  } catch (error) {
    console.warn("Error al agregar comentario:", error);
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};
// Agregar Respuesta
export const addRespuesta = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id, comentarioId } = req.params;
  const { contenido, replyTo } = req.body;

  const user = req.user;

  if (!user) {
    res.status(401).json({ message: "No autorizado" });
    return;
  }
  const nuevaRespuesta = {
    autor: {
      _id: user._id,
      nombre: user.nombre,
      apellido: user.apellido,
      avatar: user.avatar,
    },
    contenido,
    fecha: new Date().toISOString(),
    replyTo,
  };

  try {
    const publicacionActualizada = await modelPublicacion.findOneAndUpdate(
      {
        _id: id,
        "comentarios._id": new mongoose.Types.ObjectId(comentarioId),
      },
      {
        $push: {
          "comentarios.$.respuestas": nuevaRespuesta,
        },
      },
      { new: true },
    );

    if (!publicacionActualizada) {
      res.status(404).json({ message: "Publicación no encontrada" });
      return;
    }
    const comentarios = publicacionActualizada.comentarios || [];
    const comentarioPrincipal = comentarios.find(
      (comentario) => comentario._id?.toString() === comentarioId,
    );

    let usuarioObjetivoId: string | null = null;

    if (comentarioPrincipal) {
      // comentario principal
      if (comentarioPrincipal._id?.toString() === replyTo?._id) {
        usuarioObjetivoId =
          comentarioPrincipal.autor?._id?.toString?.() || null;
      } else {
        // respuesta específica
        const respuestas = Array.isArray(comentarioPrincipal.respuestas)
          ? comentarioPrincipal.respuestas
          : [];
        const respuestaObjetivo = respuestas.find(
          (respuesta: any) => respuesta._id?.toString() === replyTo?._id,
        );

        usuarioObjetivoId = respuestaObjetivo?.autor?._id?.toString?.() || null;
      }
    }
    const usuarioActualId = user._id?.toString?.();

    // no notificarse a sí mismo
    if (
      usuarioObjetivoId &&
      usuarioActualId &&
      usuarioObjetivoId !== usuarioActualId
    ) {
      const nombreRespondedor = [user.nombre, user.apellido]
        .filter(Boolean)
        .join(" ")
        .trim();

      const tituloPublicacion =
        publicacionActualizada.titulo || "tu publicación";

      try {
        await createRespuestaComentarioNotificacion({
          destinatarioId: usuarioObjetivoId, // temporal
          recipientes: [usuarioObjetivoId],

          publicacionId: id,
          tituloPublicacion,

          nombreRespondedor: nombreRespondedor,
        });
      } catch (notificacionError) {
        console.warn("No se pudo crear notificación:", notificacionError);
      }
    }

    res.status(201).json(publicacionActualizada.comentarios);
  } catch (error) {
    console.warn("Error al agregar respuesta:", error);
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// filtros de búsqueda
export const filterPublicaciones = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { texto, tag, autor } = req.query;
    const filtro: any = { $and: [buildActivePublicationQuery()] };
    let hasSearchCriteria = false;

    if (texto) {
      filtro.$and.push({
        $or: [
          { titulo: { $regex: texto as string, $options: "i" } },
          { contenido: { $regex: texto as string, $options: "i" } },
          { comunidad: { $regex: texto as string, $options: "i" } },
        ],
      });
      hasSearchCriteria = true;
    }
    if (tag) {
      filtro.$and.push({
        tag: {
          $regex: tag as string,
          $options: "i",
        },
      });

      hasSearchCriteria = true;
    }

    if (autor) {
      if (!mongoose.Types.ObjectId.isValid(autor as string)) {
        res.status(400).json({
          message: "ID de autor inválido",
        });

        return;
      }

      filtro.$and.push({
        autor,
      });

      hasSearchCriteria = true;
    }

    if (!hasSearchCriteria) {
      res.status(400).json({
        message:
          "Debe proporcionar al menos un parámetro de búsqueda (texto, tag o autor)",
      });
      return;
    }

    const publicaciones: IPublicacion[] = await modelPublicacion.find(filtro);

    if (publicaciones.length === 0) {
      res.status(404).json({
        message: "No se encontraron publicaciones con esos criterios",
      });
      return;
    }

    res.status(200).json(publicaciones);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Obtener eventos por rango de fechas
export const getEventosPorFecha = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ message: "Se requieren startDate y endDate" });
      return;
    }

    const eventos = await modelPublicacion
      .find({
        ...buildActivePublicationQuery(),
        tag: "evento",
        publicado: true,
        fechaEvento: {
          $gte: startDate as string,
          $lte: endDate as string,
        },
      })
      .populate("autor", "nombre")
      .populate("categoria", "nombre")
      .select(
        "titulo fechaEvento horaEvento contenido adjunto _id precio moneda monedaSimbolo",
      )
      .sort({ fechaEvento: 1 });

    res.status(200).json(eventos);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ message: err.message });
  }
};

// Conteo de publicaciones por lugar (comunidad), p. ej. cuántos emprendimientos hay en cada una
export const contarPublicacionesPorUbicacion = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tag, comunidad } = req.query;

    if (tag !== undefined && !TAGS_CONTEO.includes(tag as string)) {
      res.status(400).json({
        message: `El tag debe ser uno de: ${TAGS_CONTEO.join(", ")}`,
      });
      return;
    }
    if (comunidad !== undefined && typeof comunidad !== "string") {
      res.status(400).json({ message: "El parámetro comunidad debe ser texto" });
      return;
    }

    const match: any = {
      publicado: true,
      $and: [buildActivePublicationQuery()],
    };
    if (tag) match.tag = tag;
    if (comunidad && comunidad.trim() !== "") {
      match.comunidad = {
        $regex: comunidad.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    // Agrupa sin distinguir mayúsculas ni espacios sobrantes ("San Ramón" = "san ramón ")
    const grupos = await modelPublicacion.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $toLower: { $trim: { input: { $ifNull: ["$comunidad", ""] } } },
          },
          comunidad: { $first: "$comunidad" },
          total: { $sum: 1 },
          conUbicacion: {
            $sum: { $cond: [{ $gt: ["$ubicacion", null] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1, _id: 1 } },
    ]);

    const porComunidad = grupos.map((g: any) => ({
      comunidad: g._id ? String(g.comunidad).trim() : null,
      total: g.total as number,
      conUbicacion: g.conUbicacion as number,
    }));

    res.status(200).json({
      total: porComunidad.reduce((acc, g) => acc + g.total, 0),
      conUbicacion: porComunidad.reduce((acc, g) => acc + g.conUbicacion, 0),
      porComunidad,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error en conteo por ubicación:", err);
    res.status(500).json({ message: "Error al realizar el conteo" });
  }
};

// Búsqueda rápida por título (para sugerencias)
export const searchPublicacionesByTitulo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      res
        .status(400)
        .json({ message: "El parámetro de búsqueda (q) es requerido" });
      return;
    }

    const searchTerm = q.trim();
    const searchLimit = Math.min(Number(limit), 50); // Máximo 50 resultados

    const publicaciones = await modelPublicacion
      .find({
        ...buildActivePublicationQuery(),
        publicado: true,
        titulo: { $regex: searchTerm, $options: "i" },
      })
      .populate("autor", "nombre")
      .populate("categoria", "nombre estado")
      .select(
        "titulo tag autor categoria fecha fechaEvento precio moneda monedaSimbolo adjunto",
      )
      .limit(searchLimit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: publicaciones,
      searchTerm,
      total: publicaciones.length,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error en búsqueda rápida:", err);
    res.status(500).json({ message: "Error al realizar la búsqueda" });
  }
};

// Búsqueda avanzada con filtros
export const searchPublicacionesAvanzada = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { q, tag, categoria, comunidad, fechaInicio, fechaFin, offset = 0, limit = 12 } =
      req.query as {
        q?: string;
        tag?: string;
        categoria?: string;
        comunidad?: string;
        fechaInicio?: string;
        fechaFin?: string;
        offset?: string | number;
        limit?: string | number;
      };

    const query: any = {
      publicado: true,
      $and: [buildActivePublicationQuery()],
    };

    // Búsqueda por texto en título, contenido o comunidad
    if (q && typeof q === "string" && q.trim() !== "") {
      query.$and.push({
        $or: [
          { titulo: { $regex: q.trim(), $options: "i" } },
          { contenido: { $regex: q.trim(), $options: "i" } },
          { comunidad: { $regex: q.trim(), $options: "i" } },
        ],
      });
    }

    // Filtros adicionales
    if (tag) query.tag = tag;
    if (categoria) query.categoria = categoria;
    // Búsqueda por ubicación/comunidad, independiente del texto general
    if (comunidad && comunidad.trim() !== "") {
      query.comunidad = { $regex: comunidad.trim(), $options: "i" };
    }

    const fechaFiltro = buildFechaFilter(fechaInicio, fechaFin, tag);
    if (fechaFiltro) {
      if ("field" in fechaFiltro) {
        Object.assign(query, fechaFiltro.field);
      } else {
        query.$and.push({ $or: fechaFiltro.or });
      }
    }

    const numericOffset = Number(offset);
    const numericLimit = Number(limit);

    const [publicaciones, totalPublicaciones] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate("autor", "nombre")
        .populate("categoria", "nombre estado")
        .sort({ createdAt: -1 })
        .skip(numericOffset)
        .limit(numericLimit),
      modelPublicacion.countDocuments(query),
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset: numericOffset,
        limit: numericLimit,
        total: totalPublicaciones,
        pages: Math.ceil(totalPublicaciones / Math.max(numericLimit, 1)),
      },
      searchTerm: q,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error en búsqueda avanzada:", err);
    res.status(500).json({ message: "Error al realizar la búsqueda" });
  }
};

// Búsqueda específica por título
export const searchByTitulo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { q, offset = 0, limit = 12 } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      res
        .status(400)
        .json({ message: "El parámetro de búsqueda (q) es requerido" });
      return;
    }

    const searchTerm = q.trim();
    const queryOffset = Number(offset);
    const queryLimit = Math.min(Number(limit), 50);

    const query = {
      ...buildActivePublicationQuery(),
      publicado: true,
      titulo: { $regex: searchTerm, $options: "i" },
    };

    const [publicaciones, total] = await Promise.all([
      modelPublicacion
        .find(query)
        .populate("autor", "nombre")
        .populate("categoria", "nombre estado")
        .sort({ createdAt: -1 })
        .skip(queryOffset)
        .limit(queryLimit),
      modelPublicacion.countDocuments(query),
    ]);

    res.status(200).json({
      data: publicaciones,
      pagination: {
        offset: queryOffset,
        limit: queryLimit,
        total,
        pages: Math.ceil(total / Math.max(queryLimit, 1)),
      },
      searchTerm,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error en búsqueda por título:", err);
    res.status(500).json({ message: "Error al realizar la búsqueda" });
  }
};

const MAX_FOTOS_EMPRENDIMIENTO = 20;

/**
 * Agrega fotos a un emprendimiento en cualquier momento (sin pasar por el
 * flujo de aprobación de ediciones). Solo el autor o un administrador.
 */
export const addFotosEmprendimiento = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user;
    const pub = await modelPublicacion.findById(req.params.id);
    if (!pub) {
      res.status(404).json({ ok: false, message: "Publicación no encontrada" });
      return;
    }
    if (pub.tag !== "emprendimiento") {
      res.status(400).json({ ok: false, message: "Solo los emprendimientos admiten fotos adicionales" });
      return;
    }
    const esAutor = String(pub.autor) === String(user._id);
    const esAdmin = user.tipoUsuario === 0 || user.tipoUsuario === 1;
    if (!esAutor && !esAdmin) {
      res.status(403).json({ ok: false, message: "No tienes permiso para modificar este emprendimiento" });
      return;
    }

    const map = (req.files ?? {}) as Record<string, Express.Multer.File[] | undefined>;
    const files = Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : [...(map["imagenes"] ?? []), ...(map["archivos"] ?? [])];

    if (files.length === 0) {
      res.status(400).json({ ok: false, message: "Debes enviar al menos una imagen" });
      return;
    }
    if (files.some((f) => !f.mimetype?.startsWith("image/"))) {
      res.status(400).json({ ok: false, message: "Solo se permiten archivos de imagen" });
      return;
    }
    const actuales = pub.adjunto?.length ?? 0;
    if (actuales + files.length > MAX_FOTOS_EMPRENDIMIENTO) {
      res.status(400).json({
        ok: false,
        message: `Máximo ${MAX_FOTOS_EMPRENDIMIENTO} fotos por emprendimiento (tienes ${actuales})`,
      });
      return;
    }

    for (const file of files) {
      const result = await saveMulterFileToGridFS(file, "publicaciones");
      pub.adjunto!.push({
        url: `${process.env.PUBLIC_BASE_URL || "http://159.54.148.238"}/api/files/${result.id.toString()}`,
        key: result.id.toString(),
      });
    }
    await pub.save();
    res.status(200).json({ ok: true, adjunto: pub.adjunto });
  } catch (error) {
    console.error("addFotosEmprendimiento error:", error);
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
};

/** Elimina una foto de un emprendimiento (autor o administrador). */
export const deleteFotoEmprendimiento = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user;
    const pub = await modelPublicacion.findById(req.params.id);
    if (!pub) {
      res.status(404).json({ ok: false, message: "Publicación no encontrada" });
      return;
    }
    const esAutor = String(pub.autor) === String(user._id);
    const esAdmin = user.tipoUsuario === 0 || user.tipoUsuario === 1;
    if (!esAutor && !esAdmin) {
      res.status(403).json({ ok: false, message: "No tienes permiso para modificar este emprendimiento" });
      return;
    }
    const foto: any = (pub.adjunto as any[] | undefined)?.find(
      (a) => String(a._id) === req.params.fotoId,
    );
    if (!foto) {
      res.status(404).json({ ok: false, message: "Foto no encontrada" });
      return;
    }
    if ((pub.adjunto?.length ?? 0) <= 1) {
      res.status(400).json({ ok: false, message: "El emprendimiento debe conservar al menos una foto" });
      return;
    }
    pub.adjunto = (pub.adjunto as any[]).filter((a) => String(a._id) !== req.params.fotoId) as any;
    await pub.save();
    try {
      await deleteGridFSFile(foto.key);
    } catch {}
    res.status(200).json({ ok: true, adjunto: pub.adjunto });
  } catch (error) {
    console.error("deleteFotoEmprendimiento error:", error);
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
};