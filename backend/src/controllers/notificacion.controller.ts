import { Request, Response } from "express";
import mongoose from "mongoose";
import { modelNotificacion } from "../models/notificacion.model";
import { ObjectId } from "mongoose";
import { createNotificacion as createNotificacionService } from "../services/notificacion.service";

const DEFAULT_CADUCIDAD_DIAS = 3;

function getRequestUserId(req: Request): string | null {
  const userId =
    req.user?._id?.toString?.() ||
    (req as any).user?._id?.toString?.() ||
    (req as any).userId?.toString?.();

  return userId || null;
}

function agregarDias(fecha: Date, dias: number): Date {
  const base = new Date(fecha);
  base.setDate(base.getDate() + dias);
  return base;
}

function parseFechaCaducidad(value: unknown): Date | null {
  if (!value) return null;
  const parsed =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const getNotificaciones = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = getRequestUserId(req);

    const queryUserId = req.query.userId as string | undefined;
    const finalUserId = userId || queryUserId;

    const { onlyUnread } = req.query;
    const now = new Date();

    // Eliminar caducadas (limpieza inmediata)
    await modelNotificacion.deleteMany({
      fechaCaducidad: { $ne: null, $lte: now },
    });

    let filtro: any = {
      $or: [{ fechaCaducidad: null }, { fechaCaducidad: { $gte: now } }],
    };

    // Notificaciones específicas y generales
    if (finalUserId) {
      filtro.$or = [
        { recipientes: finalUserId },
        { recipientes: [] }
      ];
      filtro.$and = [
        {
          $or: [
            { fechaCaducidad: null },
            { fechaCaducidad: { $gte: now } },
          ],
        },
      ];
      // Solo no leídas
      if (String(onlyUnread).toLowerCase() === "true") {
        filtro.vistoPor = { $ne: finalUserId };
      }
    }

    const notificaciones = await modelNotificacion.find(filtro).sort({ createdAt: -1 }).lean();

    if (notificaciones.length === 0) {
      res.status(200).json({ data: [], message: "Este usuario no posee notificaciones" });
      return;
    }

    // Si no tiene filtro, solo devuelve
    if (!finalUserId) {
      res.status(200).json({ data: notificaciones, message: "Notificaciones obtenidas correctamente" });
      return;
    }

    // Si tiene filtro, revisar por usuario el visto
    const notificacionesConVisto = notificaciones.map((notificacion) => {
      const visto = notificacion.vistoPor?.some(
        (id) => id.toString() === finalUserId
      );

      const {
        vistoPor,
        recipientes,
        ...notificacionLimpia
      } = notificacion;

      return {
        ...notificacionLimpia,
        visto
      };
    });

    res.status(200).json({ data: notificacionesConVisto, message: "Notificaciones obtenidas correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener notificaciones" });
  };
};

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export const createNotificacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      nombre,
      descripcion,
      destinatario,
      recipientes,
      publicacionId,
      fechaCaducidad,
      tipo = "general",
      formularioUrl,
    } = req.body || {};

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre es obligatorio" });
      return;
    }
    if (!descripcion?.trim()) {
      res.status(400).json({ message: "La descripción es obligatoria" });
      return;
    }

    // Validar que solo admins creen notificaciones
    const userTipo = Number((req as any).user?.tipoUsuario);
    const isAdmin = userTipo === 0 || userTipo === 1;
    if (!isAdmin) {
      res.status(403).json({ message: "Solo administradores pueden crear notificaciones" });
      return;
    }

    // Validar tipo de notificación
    if (tipo !== "general" && tipo !== "formulario") {
      res.status(400).json({ message: "Tipo de notificación inválido (general o formulario)" });
      return;
    }

    // Si es formulario, validar URL
    if (tipo === "formulario") {
      if (!formularioUrl?.trim()) {
        res.status(400).json({ message: "La URL del formulario es obligatoria para notificaciones de tipo formulario" });
        return;
      }
      if (!isValidUrl(formularioUrl)) {
        res.status(400).json({ message: "La URL del formulario es inválida" });
        return;
      }
    }

    if (destinatario && !mongoose.Types.ObjectId.isValid(destinatario)) {
      res.status(400).json({ message: "Destinatario inválido" });
      return;
    }
    if (recipientes && (!Array.isArray(recipientes) || recipientes.some(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    ))) {
      res.status(400).json({ message: "Recipientes inválidos" });
      return;
    }

    if (publicacionId && !mongoose.Types.ObjectId.isValid(publicacionId)) {
      res.status(400).json({ message: "ID de publicación inválido" });
      return;
    }

    const recipientesFinales = recipientes || (destinatario ? [destinatario] : []);

    const parsedCaducidad = parseFechaCaducidad(fechaCaducidad);
    if (fechaCaducidad && !parsedCaducidad) {
      res.status(400).json({ message: "Fecha de caducidad inválida" });
      return;
    }

    const esGeneral = recipientesFinales.length === 0;

    const fechaCaducidadFinal =
      parsedCaducidad ??
      (isAdmin && esGeneral ? agregarDias(new Date(), DEFAULT_CADUCIDAD_DIAS) : null);

    const saved = await createNotificacionService({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      recipientes: recipientesFinales,
      publicacionId: publicacionId || null,
      fechaCaducidad: fechaCaducidadFinal,
      tipo,
      formularioUrl: tipo === "formulario" ? formularioUrl.trim() : null,
    });

    // para el destinatario en el frontend (cambiar luego el front)
    const responseData = {
      ...saved.toObject?.() || saved,
      destinatario:
        recipientesFinales.length === 1
          ? recipientesFinales[0]
          : null,
    };
    res.status(201).json(responseData);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la notificación" });
  }
};

export const deleteNotificacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getRequestUserId(req);

    if (!userId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: "No se encontró la notificación" });
      return;
    }

    const userTipo = Number((req as any).user?.tipoUsuario);
    const isAdmin = userTipo === 0 || userTipo === 1;

    const filtro: any = { _id: id };
    if (!isAdmin) {
      filtro.destinatario = userId;
    }

    const notificacionAEliminar = await modelNotificacion.findOneAndDelete(filtro);

    if (!notificacionAEliminar) {
      res.status(404).json({ message: "No se encontró la notificación" });
      return;
    }

    res.status(200).json({ message: "Notificación eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la notificación" });
  }
};

export const updateNotificacion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fechaCaducidad, vistoPor, destinatario, recipientes, publicacionId, tipo, formularioUrl } = req.body || {};

    const data: any = {};

    if (nombre !== undefined) {
      if (!nombre?.trim()) {
        res.status(400).json({ message: "El nombre no puede ir vacío" });
        return;
      }
      data.nombre = nombre.trim();
    }

    if (descripcion !== undefined) {
      if (!descripcion?.trim()) {
        res.status(400).json({ message: "La descripción no puede ir vacía" });
        return;
      }
      data.descripcion = descripcion.trim();
    }

    if (tipo !== undefined) {
      if (tipo !== "general" && tipo !== "formulario") {
        res.status(400).json({ message: "Tipo de notificación inválido (general o formulario)" });
        return;
      }
      data.tipo = tipo;
    }

    if (formularioUrl !== undefined) {
      if (formularioUrl !== null && !isValidUrl(formularioUrl)) {
        res.status(400).json({ message: "La URL del formulario es inválida" });
        return;
      }
      data.formularioUrl = formularioUrl;
    }

    if (fechaCaducidad !== undefined) data.fechaCaducidad = fechaCaducidad;

    if (recipientes !== undefined) {
      if (
        !Array.isArray(recipientes) ||
        recipientes.some(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        )
      ) {
        res.status(400).json({
          message: "Recipientes inválidos",
        });
        return;
      }

      data.$addToSet = {
        ...(data.$addToSet || {}),
        recipientes: { $each: recipientes },
      };
    }

    if (publicacionId !== undefined) {
      if (publicacionId !== null && !mongoose.Types.ObjectId.isValid(publicacionId)) {
        res.status(400).json({ message: "ID de publicación inválido" });
        return;
      }
      data.publicacionId = publicacionId;
    }

    if (vistoPor !== undefined) {
      const vistos = Array.isArray(vistoPor)
        ? vistoPor
        : [vistoPor];

      if (
        vistos.some(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        )
      ) {
        res.status(400).json({
          message: "Usuarios vistos inválidos",
        });
        return;
      }

      data.$addToSet = {
        ...(data.$addToSet || {}),
        vistoPor: { $each: vistos },
      };
    }

    const notificacionActualizada = await modelNotificacion.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );

    if (!notificacionActualizada) {
      res.status(404).json({ message: "Notificación no encontrada" });
      return;
    }

    res.status(200).json({
      data: {
        ...notificacionActualizada.toObject(),
        // de forma temporal hasta que se cambie
        destinatario:
          notificacionActualizada.recipientes?.length === 1
            ? notificacionActualizada.recipientes[0]
            : null,
      },
      message: "Notificación actualizada correctamente",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la notificación" });
  }
};

export const notificacionSeenBy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const viewerId = getRequestUserId(req);

    if (!viewerId) {
      res.status(401).json({ message: "No autorizado" });
      return;
    }

    const notificacionActualizada = await modelNotificacion.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { recipientes: viewerId },
          { recipientes: { $size: 0 } },
        ],
      },
      {
        $addToSet: { vistoPor: viewerId },
      },
      { new: true }
    );

    if (!notificacionActualizada) {
      res.status(404).json({ message: "Notificación no encontrada" });
      return;
    }

    res.status(200).json({
      data: notificacionActualizada,
      message: "Notificación marcada como vista",
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la notificación" });
  }
};