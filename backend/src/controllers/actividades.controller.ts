import { Request, Response } from "express";
import { modelActividad } from "../models/actividad.model";
import { notificarNuevaActividad } from "../services/notificacion.service";

// Crea la actividad — cualquier usuario logueado
export const createActividad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { nombre, descripcion, fecha, hora, ubicacionEscrita, ubicacion } =
      req.body;

    if (!nombre?.trim()) {
      res
        .status(400)
        .json({ message: "El nombre de la actividad es obligatorio" });
      return;
    }
    if (!descripcion?.trim()) {
      res
        .status(400)
        .json({ message: "La descripción de la actividad es obligatoria" });
      return;
    }
    if (!fecha) {
      res
        .status(400)
        .json({ message: "La fecha de la actividad es obligatoria" });
      return;
    }
    if (!hora) {
      res
        .status(400)
        .json({ message: "La hora de la actividad es obligatoria" });
      return;
    }
    if (!ubicacionEscrita?.trim()) {
      res.status(400).json({ message: "La ubicación escrita es obligatoria" });
      return;
    }
    if (
      !ubicacion ||
      !Array.isArray(ubicacion.coordinates) ||
      ubicacion.coordinates.length !== 2
    ) {
      res
        .status(400)
        .json({ message: "La ubicación geográfica es obligatoria" });
      return;
    }

    // El usuario NO viene del body, viene del token verificado en authMiddleware
    const usuarioId = (req as any).userId;

    const nuevaActividad = new modelActividad({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fecha,
      hora,
      ubicacionEscrita: ubicacionEscrita.trim(),
      ubicacion: {
        type: "Point",
        coordinates: ubicacion.coordinates,
      },
      usuario: usuarioId,
    });

    const saved = await nuevaActividad.save();

    try {
      await notificarNuevaActividad({
        actividadId: (saved._id as any ).toString(),
        nombreActividad: saved.nombre,
        descripcionActividad: saved.descripcion,
        ubicacionEscrita: saved.ubicacionEscrita,
      });
    } catch (notifError) {
      console.error("Error al notificar nueva actividad:", notifError);
    }

    res.status(201).json(saved);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la actividad" });
  }
};

// Lista todas las actividades existentes — libre para todos
export const getActividades = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const actividades = await modelActividad
      .find()
      .populate("usuario", "nombre apellido");

    res.json({ data: actividades });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las actividades" });
  }
};

// Busca las actividades cercanas a una coordenada — libre para todos
export const getActividadesCerca = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { lng, lat, maxDistancia } = req.query;

    if (!lng || !lat) {
      res.status(400).json({ message: "Se requiere longitud y latitud" });
      return;
    }

    const actividades = await modelActividad
      .find({
        ubicacion: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [
                parseFloat(lng as string),
                parseFloat(lat as string),
              ],
            },
            $maxDistance: maxDistancia
              ? parseInt(maxDistancia as string)
              : 5000,
          },
        },
      })
      .populate("usuario", "nombre apellido");

    res.json({ data: actividades });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al buscar actividades cercanas" });
  }
};

// Edita la actividad — dueño o admin
export const updateActividad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fecha, hora, ubicacionEscrita, ubicacion } =
      req.body;

    const actividad = await modelActividad.findById(id);

    if (!actividad) {
      res.status(404).json({ message: "Actividad no encontrada" });
      return;
    }

    const usuarioId = (req as any).userId;
    const tipoUsuario = (req as any).user?.tipoUsuario;

    const esDueño = actividad.usuario.toString() === usuarioId;
    const esAdmin = tipoUsuario === 0 || tipoUsuario === 1;

    if (!esDueño && !esAdmin) {
      res
        .status(403)
        .json({ message: "No tenés permiso para editar esta actividad" });
      return;
    }

    if (!nombre?.trim()) {
      res
        .status(400)
        .json({ message: "El nombre de la actividad es obligatorio" });
      return;
    }
    if (!descripcion?.trim()) {
      res
        .status(400)
        .json({ message: "La descripción de la actividad es obligatoria" });
      return;
    }
    if (!fecha) {
      res
        .status(400)
        .json({ message: "La fecha de la actividad es obligatoria" });
      return;
    }
    if (!hora) {
      res
        .status(400)
        .json({ message: "La hora de la actividad es obligatoria" });
      return;
    }
    if (!ubicacionEscrita?.trim()) {
      res.status(400).json({ message: "La ubicación escrita es obligatoria" });
      return;
    }

    actividad.nombre = nombre.trim();
    actividad.descripcion = descripcion.trim();
    actividad.fecha = fecha;
    actividad.hora = hora;
    actividad.ubicacionEscrita = ubicacionEscrita.trim();

    if (ubicacion?.coordinates) {
      actividad.ubicacion = {
        type: "Point",
        coordinates: ubicacion.coordinates,
      };
    }

    actividad.updatedAt = new Date().toISOString();

    await actividad.save();
    res.status(200).json(actividad);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la actividad" });
  }
};

// Elimina la actividad — dueño o admin
export const deleteActividad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const actividad = await modelActividad.findById(id);

    if (!actividad) {
      res.status(404).json({ message: "Actividad no encontrada" });
      return;
    }

    const usuarioId = (req as any).userId;
    const tipoUsuario = (req as any).user?.tipoUsuario;

    const esDueño = actividad.usuario.toString() === usuarioId;
    const esAdmin = tipoUsuario === 0 || tipoUsuario === 1;

    if (!esDueño && !esAdmin) {
      res
        .status(403)
        .json({ message: "No tenés permiso para eliminar esta actividad" });
      return;
    }

    await modelActividad.findByIdAndDelete(id);
    res.json({ message: "Actividad eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la actividad" });
  }
};
