import { Request, Response } from "express";
import { modelCategoria } from "../models/categoria.model";
import { modelEtiqueta } from "../models/etiqueta.model";

export type TipoElemento = "categoria" | "etiqueta";

export const models = {
  categoria: modelCategoria,
  etiqueta: modelEtiqueta,
} as const;

export function isTipoElemento(tipo: string): tipo is TipoElemento {
  return tipo === "categoria" || tipo === "etiqueta";
}

/**
 * Crear elemento
 */
export const createElement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tipo } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      res.status(400).json({ message: "El nombre es obligatorio" });
      return;
    }

    if (!tipo) {
      res.status(400).json({ message: "El tipo es obligatorio" });
      return;
    }

    if (!isTipoElemento(tipo)) {
      res.status(400).json({
        message: "El tipo debe ser 'categoria' o 'etiqueta'",
      });
      return;
    }
    const model = models[tipo];

    if (!model) {
      res.status(500).json({ message: "Tipo no válido" });
      return;
    }
    const existe = await model.findOne({
      nombre: nombre.trim().toLowerCase(),
    });

    if (existe) {
      if (!existe.estado) {
        existe.estado = true;
        await existe.save();

        res.status(200).json({
          message: "Etiqueta reactivada correctamente",
          data: existe,
        });
        return;
      }

      res.status(400).json({
        message: "Ya existe una etiqueta con ese nombre",
      });
      return;
    }

    const nuevoElemento = new model({
      nombre: nombre.trim().toLowerCase(),
      estado: true,
    });

    const saved = await nuevoElemento.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear la etiqueta" });
  }
};

/**
 * Listar categorías (con paginación)
 */
export const getElements = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tipo } = req.params;

    if (!isTipoElemento(tipo)) {
      res.status(400).json({
        message: "El tipo debe ser 'categoria' o 'etiqueta'",
      });
      return;
    }

    const model = models[tipo];

    const elementos = await model.find();

    res.json({
      data: elementos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener los elementos" });
  }
};

/**
 * Obtener categoría por ID
 */
export const getElementById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tipo, id } = req.params;

    if (!isTipoElemento(tipo)) {
      res.status(400).json({
        message: "El tipo debe ser 'categoria' o 'etiqueta'",
      });
      return;
    }

    const model = models[tipo];
    const elemento = await model.findById(id);

    if (!elemento || !elemento.estado) {
      res.status(404).json({ message: "Elemento no encontrado" });
      return;
    }

    res.json(elemento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el elemento" });
  }
};

/**
 * Actualizar elemento
 */
export const updateElement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tipo, id } = req.params;
    const { nombre } = req.body;
    if (!isTipoElemento(tipo)) {
      res.status(400).json({
        message: "El tipo debe ser 'categoria' o 'etiqueta'",
      });
      return;
    }
    const model = models[tipo];
    const elemento = await model.findById(id);
    if (!elemento || !elemento.estado) {
      res.status(404).json({ message: "Elemento no encontrado" });
      return;
    }
    if (nombre) {
      const existe = await model.findOne({
        nombre: nombre.trim().toLowerCase(),
        _id: { $ne: id },
      });
      if (existe) {
        res
          .status(400)
          .json({ message: "Ya existe una categoría con ese nombre" });
        return;
      }
      elemento.nombre = nombre.trim().toLowerCase();
    }

    const updated = await elemento.save();
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar el elemento" });
  }
};

/**
 * Eliminar elemento (soft delete → estado: false)
 */
export const deleteElement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tipo, id } = req.params;
    if (!isTipoElemento(tipo)) {
      res.status(400).json({
        message: "El tipo debe ser 'categoria' o 'etiqueta'",
      });
      return;
    }

    const model = models[tipo];
    const elemento = await model.findById(id);
    if (!elemento || !elemento.estado) {
      res.status(404).json({ message: "Elemento no encontrado" });
      return;
    }

    elemento.estado = false;
    await elemento.save();

    res.json({ message: "Elemento desactivado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el elemento" });
  }
};

export const toggleElementEstado = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tipo, id } = req.params;
    if (!isTipoElemento(tipo)) {
      res.status(400).json({
        message: "El tipo debe ser 'categoria' o 'etiqueta'",
      });
      return;
    }

    const model = models[tipo];
    const elemento = await model.findById(id);

    if (!elemento) {
      res.status(404).json({
        message: "Elemento no encontrado",
      });
      return;
    }

    elemento.estado = !elemento.estado;

    await elemento.save();

    res.json({
      message: elemento.estado ? "Elemento activado" : "Elemento desactivado",
      data: elemento,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al cambiar estado",
    });
  }
};
