import { Request, Response } from "express";
import { modelProyectoDestacado } from "../models/ProyectoDestacado.model";

/*
 * Crear un proyecto destacado
 * ENTRADA: nombre y url del proyecto destacado a crear
 * RESTRICCIONES: url es unico, url y nombre son obligatorios
 * SALIDA: si es exitoso una confirmacion, si no se manda mensaje de error
 * */
export const createProyectoDestacado = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { nombre, url, descripcion } = req.body;

    if (!nombre?.trim()) {
      res
        .status(400)
        .json({ message: "El nombre del proyecto destacado es obligatorio" });
      return;
    }

    const nuevoProyectoDestacado = new modelProyectoDestacado({
      nombre: nombre.trim(),
      url: url?.trim() ?? "",
      descripcion: descripcion?.trim() ?? "",
    });

    const saved = await nuevoProyectoDestacado.save();
    res.status(201).json(saved);
  } catch (error: any) {
    console.error(error);

    if (error?.code == 11000) {
      res
        .status(409)
        .json({ message: "Ya existe un proyecto destacado con ese nombre" });
      return;
    }

    res.status(500).json({ message: "Error al crear el proyecto destacado" });
  }
};

/*
 * ENTRADA: id mongo de un proyecto destacado
 * SALIDA: eliminado del proyecto destacado en la BD
 */
export const deleteProyectoDestacado = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    await modelProyectoDestacado.findByIdAndDelete(id);

    res.json({ message: "Proyecto destacado eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al eliminar el proyecto destacado" });
  }
};

/*
 * ENTRADA: nada :)
 * SALIDA: todos los proyectos destacados
 * */
export const getProyectosDestacados = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const proyectosDestacados = await modelProyectoDestacado.find();
    res.json({
      data: proyectosDestacados,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener los proyectos destacados" });
  }
};

/*
 * ENTRADA: id de proyecto a editar y valores que se quieren escribir
 * SALIDA: proyecto respectivo actualizado
 * */
export const updateProyectoDestacado = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, url, descripcion } = req.body;

    if (!nombre?.trim()) {
      res
        .status(400)
        .json({ message: "El nombre del proyecto es obligatorio" });
      return;
    }

    const proyectoActualizado = await modelProyectoDestacado.findByIdAndUpdate(
      id,
      {
        nombre: nombre.trim(),
        url: url?.trim() ?? "",
        descripcion: descripcion?.trim() ?? "",
      },
      { new: true, runValidators: true },
    );

    if (!proyectoActualizado) {
      res.status(404).json({ message: "Proyecto no encontrado" });
      return;
    }

    res.status(200).json(proyectoActualizado);
  } catch (error: any) {
    console.error(error);

    if (error?.code === 11000) {
      res.status(409).json({ message: "Ya existe un proyecto con ese nombre" });
      return;
    }
    res
      .status(500)
      .json({ message: "Error al actualizar el proyecto destacado" });
  }
};
