import { Request, Response } from "express";
import mongoose from "mongoose";
import { modelPublicidad } from "../models/publicidad.model";
import {
  saveMulterFileToGridFS,
  safeDeleteGridFS,
  gridIdFromUrl,
} from "../utils/gridfs";
import { assertRealImages, ImageValidationError } from "../utils/imageUpload";

const buildImageUrl = (fileId: string) => {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) throw new Error("PUBLIC_BASE_URL no está definida en el .env");
  return `${base}/api/files/${fileId}`;
};

const TITULO_MAX = 80;

/** "" o ausente → null. Si viene algo, se convierte a Date (puede quedar inválida) */
function parseFechaOpcional(v: any): Date | null {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  return new Date(v);
}

const esFechaInvalida = (d: Date | null) =>
  d !== null && Number.isNaN(d.getTime());

/** Valida los campos de texto comunes a crear y actualizar. Devuelve el mensaje de error o null. */
function validarCampos(body: any): string | null {
  const {
    titulo,
    descripcion,
    fechaCaducidad,
    fechaInicioEvento,
    fechaFinEvento,
    autor,
    publicacionRelacionada,
  } = body;

  if (!titulo?.trim()) return "El título de la publicidad es obligatorio";
  if (titulo.trim().length > TITULO_MAX)
    return `El título no puede superar los ${TITULO_MAX} caracteres`;
  if (!descripcion?.trim())
    return "La descripción de la publicidad es obligatoria";
  if (!fechaCaducidad)
    return "La fecha de caducidad de la publicidad es obligatoria";
  if (Number.isNaN(new Date(fechaCaducidad).getTime()))
    return "La fecha de caducidad no es válida";

  const inicio = parseFechaOpcional(fechaInicioEvento);
  const fin = parseFechaOpcional(fechaFinEvento);
  if (esFechaInvalida(inicio)) return "La fecha de inicio no es válida";
  if (esFechaInvalida(fin)) return "La fecha de fin no es válida";
  if (fin && !inicio)
    return "Si indica una fecha de fin, también debe indicar la de inicio";
  if (inicio && fin && fin < inicio)
    return "La fecha de fin no puede ser anterior a la de inicio";

  if (!autor) return "El autor de la publicidad es obligatorio";
  if (!mongoose.Types.ObjectId.isValid(autor)) return "El autor no es válido";
  if (
    publicacionRelacionada &&
    !mongoose.Types.ObjectId.isValid(publicacionRelacionada)
  )
    return "La publicación relacionada no es válida";

  return null;
}

/** "true"/"false" llegan como string desde FormData */
function parseActiva(v: any): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (typeof v === "boolean") return v;
  return String(v).trim().toLowerCase() !== "false" && String(v) !== "0";
}

export const createPublicidad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Fuera del try para poder revertir en el catch
  let nuevoFileId: string | undefined;

  try {
    const errorCampos = validarCampos(req.body);
    if (errorCampos) {
      res.status(400).json({ message: errorCampos });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "La imagen es obligatoria" });
      return;
    }

    // Validar que sea una imagen real (bytes, no solo el MIME)
    await assertRealImages([file]);

    const {
      titulo,
      descripcion,
      fechaCaducidad,
      fechaInicioEvento,
      fechaFinEvento,
      autor,
      activa,
      publicacionRelacionada,
    } = req.body;

    const result = await saveMulterFileToGridFS(file, "publicidad");
    const fileId: string = result.id.toString(); 
    nuevoFileId = fileId; 

    const nuevaPublicidad = new modelPublicidad({
      titulo: titulo.trim(),
      imagen: buildImageUrl(fileId), 
      descripcion: descripcion.trim(),
      fechaInicioEvento: parseFechaOpcional(fechaInicioEvento),
      fechaFinEvento: parseFechaOpcional(fechaFinEvento),
      fechaCaducidad,
      autor,
      activa: parseActiva(activa),
      publicacionRelacionada: publicacionRelacionada || null,
    });
    
    const saved = await nuevaPublicidad.save();
    res.status(201).json(saved);
  } catch (error: any) {
    // Si la imagen ya se subió pero algo falló después, no dejarla huérfana
    await safeDeleteGridFS(nuevoFileId);

    if (error instanceof ImageValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Error al crear la publicidad" });
  }
};

export const deletePublicidad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID de publicidad inválido" });
      return;
    }

    const eliminada = await modelPublicidad.findByIdAndDelete(id);
    if (!eliminada) {
      res.status(404).json({ message: "Publicidad no encontrada" });
      return;
    }

    // Borrar también la imagen de GridFS
    await safeDeleteGridFS(gridIdFromUrl(eliminada.imagen));

    res.json({ message: "Publicidad eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la publicidad" });
  }
};

export const getPublicidades = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Solo las activas que todavía no llegan a su fecha de caducidad
    const publicidades = await modelPublicidad
      .find({ activa: true, fechaCaducidad: { $gt: new Date() } })
      .sort({ createdAt: -1 });
    res.json({
      data: publicidades,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las publicidades" });
  }
};

export const updatePublicidad = async (
  req: Request,
  res: Response,
): Promise<void> => {
  let nuevoFileId: string | undefined;

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID de publicidad inválido" });
      return;
    }

    const errorCampos = validarCampos(req.body);
    if (errorCampos) {
      res.status(400).json({ message: errorCampos });
      return;
    }

    const publicidad = await modelPublicidad.findById(id);
    if (!publicidad) {
      res.status(404).json({ message: "Publicidad no encontrada" });
      return;
    }

    const {
      titulo,
      descripcion,
      fechaCaducidad,
      fechaInicioEvento,
      fechaFinEvento,
      autor,
      activa,
      publicacionRelacionada,
    } = req.body;

    const imagenAnterior = publicidad.imagen;
    let imagen = imagenAnterior;

    if (req.file) {
      await assertRealImages([req.file]);

      const result = await saveMulterFileToGridFS(req.file, "publicidad");
      const fileId: string = result.id.toString();
      nuevoFileId = fileId;
      imagen = buildImageUrl(fileId);
    }

    publicidad.titulo = titulo.trim();
    publicidad.imagen = imagen;
    publicidad.descripcion = descripcion.trim();
    publicidad.fechaInicioEvento = parseFechaOpcional(fechaInicioEvento);
    publicidad.fechaFinEvento = parseFechaOpcional(fechaFinEvento);
    publicidad.fechaCaducidad = fechaCaducidad;
    publicidad.autor = autor;
    publicidad.activa = parseActiva(activa);
    publicidad.publicacionRelacionada = publicacionRelacionada || null;

    await publicidad.save();

    // Solo después de guardar con éxito se borra la imagen vieja
    if (nuevoFileId) {
      await safeDeleteGridFS(gridIdFromUrl(imagenAnterior));
    }

    res.status(200).json(publicidad);
  } catch (error: any) {
    // Si se subió la nueva imagen pero falló algo, se revierte
    await safeDeleteGridFS(nuevoFileId);

    if (error instanceof ImageValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la publicidad" });
  }
};
