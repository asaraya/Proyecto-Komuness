import { Request, Response } from "express";
import { modelCategoriaPreferencia } from "../models/categoriaPreferencia.model"; 
import { obtenerUsuariosPorCategoria } from "../services/notificacion.service"

/**
 * Crear una preferencia para un usuario específico
 * @route POST /api/preferencias/
 */
export const createCategoriaPreferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = (req as any).user._id;
    const { categoriaId } = req.body;

    if (!usuarioId || !categoriaId) {
      res.status(400).json({
        message: "usuarioId y categoriaId son obligatorios"
      });
      return;
    }

    const existe = await modelCategoriaPreferencia.findOne({
      usuarioId,
      categoriaId
    });

    if (existe) {
      res.status(400).json({
        message: "La preferencia ya existe"
      });
      return;
    }

    const preferencia = new modelCategoriaPreferencia({
      usuarioId,
      categoriaId
    });

    const saved = await preferencia.save();

    res.status(201).json({following: true, data: saved});
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al crear la preferencia"
    });
  }
};

/**
 * Eliminar una preferencia para un usuario específico
 * @route DELETE /api/preferencias/
 */
export const deleteCategoriaPreferencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = (req as any).user._id;
    const { categoriaId } = req.body;

    const deleted = await modelCategoriaPreferencia.findOneAndDelete({
      usuarioId,
      categoriaId
    });

    if (!deleted) {
      res.status(404).json({
        message: "Preferencia no encontrada"
      });
      return;
    }

    res.status(200).json({
      following: false,
      message: "Preferencia eliminada"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al eliminar la preferencia"
    });
  }
};

/**
 * Obtener todos los usuarios que tengan una categoría preferencia
 * @route GET /api/preferencias/:categoriaId
 */
export const getUsuariosByCategoria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoriaId } = req.params;

    const usuarios = await obtenerUsuariosPorCategoria(categoriaId);

    res.status(200).json({
      total: usuarios.length,
      data: usuarios
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al obtener usuarios"
    });
  }
};

/**
 * Obtener el estado de una categoria para un usuario específico
 * @route GET /api/preferencias/
 */
export const getEstadoCategoriaUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioId = (req as any).user._id;
    const { categoriaId } = req.params;

    const existe = await modelCategoriaPreferencia.findOne({
      usuarioId,
      categoriaId
    });

    res.status(200).json({
      following: !!existe
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al consultar la preferencia"
    });
  }
};
