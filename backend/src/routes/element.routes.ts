import { Router } from "express";
import {
  createElement,
  getElements,
  getElementById,
  updateElement,
  deleteElement,
  toggleElementEstado,
} from "../controllers/element.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Consultar categorías → libre para todos
router.get("/:tipo", getElements);
router.get("/:tipo/:id", getElementById);

// Crear, actualizar y eliminar → solo admin (tipoUsuario = 1)
router.post("/:tipo", authMiddleware, verificarRoles([1]), createElement);
router.put("/:tipo/:id", authMiddleware, verificarRoles([1]), updateElement);
router.delete("/:tipo/:id", authMiddleware, verificarRoles([1]), deleteElement);
router.put(
  "/:tipo/toggle/:id",
  authMiddleware,
  verificarRoles([1]),
  toggleElementEstado,
);

export default router;
