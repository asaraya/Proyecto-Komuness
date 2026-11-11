import { Router } from "express";
import {
  createCategoriaPreferencia,
  deleteCategoriaPreferencia,
  getUsuariosByCategoria,
  getEstadoCategoriaUsuario
} from "../controllers/categoriaPreferencia.controller";

import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Saber si un usuario sigue una categoría
router.get("/estado/:categoriaId", authMiddleware, getEstadoCategoriaUsuario);

// Obtener todos los usuarios que siguen una categoría
router.get("/:categoriaId", authMiddleware, getUsuariosByCategoria);

// CRUD
router.post("/", authMiddleware, createCategoriaPreferencia);
router.delete("/", authMiddleware, deleteCategoriaPreferencia);

export default router;