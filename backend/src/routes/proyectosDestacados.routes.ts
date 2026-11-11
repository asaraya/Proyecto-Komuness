import { Router } from "express";
import {
  createProyectoDestacado,
  deleteProyectoDestacado,
  getProyectosDestacados,
  updateProyectoDestacado,
} from "../controllers/proyectosDestacados.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Consultar tutoriales, libre para todos
router.get("/get-proyectos", getProyectosDestacados);

// Crear y eliminar, solo admin (tipoUsuario 1 o 0)
router.post(
  "/create-proyecto",
  authMiddleware,
  verificarRoles([0, 1]),
  createProyectoDestacado,
);
router.delete(
  "/delete-proyecto/:id",
  authMiddleware,
  verificarRoles([0, 1]),
  deleteProyectoDestacado,
);
router.put(
  "/update-proyecto/:id",
  authMiddleware,
  verificarRoles([0, 1]),
  updateProyectoDestacado,
);

export default router;
