import { Request, Response } from "express";
import { modelTutorial } from "../models/tutorial.model";
import { notificarPublicacionAutomatica } from "../services/notificacion.service";

/*
 * Crear un tutorial
 * ENTRADA: nombre y url del tutorial a crear 
 * RESTRICCIONES: url es unico, url y nombre son obligatorios
 * SALIDA: si es exitoso una confirmacion, si no se manda mensaje de error
 * */
export const createTutorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, url, descripcion } = req.body;

    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre del tutorial es obligatorio" });
      return;
    }

    const nuevoTutorial = new modelTutorial({
      nombre: nombre.trim(),
      url: url?.trim() ?? "",
      descripcion: descripcion?.trim() ?? "",
    });

    const saved = await nuevoTutorial.save();

    try {
      await notificarPublicacionAutomatica({
        publicacionId: saved._id.toString(),
        titulo: saved.nombre,
        tagOrigen: "tutorial",
      });
    } catch (notiError) {
      console.warn("No se pudo notificar la creación del tutorial:", notiError);
    }

    res.status(201).json(saved);
  } catch (error: any) {
    console.error(error);
    
    if (error?.code == 11000) {
        res.status(409).json({ message: "Ya existe un tutorial con ese nombre" });
        return;
    }

    res.status(500).json({ message: "Error al crear el tutorial" });
  }
};

/*
 * ENTRADA: id mongo de un tutorial 
 * SALIDA: eliminado del tutorial en la BD
 */
export const deleteTutorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await modelTutorial.findByIdAndDelete(id);

    res.json({ message: "Tutorial eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el tutorial" });
  }
};

/*
 * ENTRADA: nada :)
 * SALIDA: todos los tutoriales
 * */
export const getTutoriales = async (req: Request, res: Response): Promise<void> => {
  try {
    const tutoriales = await modelTutorial.find();
    res.json({
      data: tutoriales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los tutoriales" });
  }
};

/*
 * ENTRADA: id de tutrial a editar y valores que se quieren escribir
 * SALIDA: tutorial respectivo actualizado
 * */
export const updateTutorial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, url, descripcion } = req.body;
 
    if (!nombre?.trim()) {
      res.status(400).json({ message: "El nombre del tutorial es obligatorio" });
      return;
    }
 
    const tutorialActualizado = await modelTutorial.findByIdAndUpdate(
      id,
      {
        nombre: nombre.trim(),
        url: url?.trim() ?? "",
        descripcion: descripcion?.trim() ?? "",
      },
      { new: true, runValidators: true }
    );
 
    if (!tutorialActualizado) {
      res.status(404).json({ message: "Tutorial no encontrado" });
      return;
    }
 
    res.status(200).json(tutorialActualizado);
  } catch (error: any) {
    console.error(error);
 
    if (error?.code === 11000) {
      res.status(409).json({ message: "Ya existe un tutorial con ese nombre" });
      return;
    }
    res.status(500).json({ message: "Error al actualizar el tutorial" });
  }
};