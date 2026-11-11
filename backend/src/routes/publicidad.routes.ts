import { Router } from "express";
import { uploadImageMemory } from "../utils/imageUpload";
import { secureUploads } from "../utils/uploadSecurity";
import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

import {
  createPublicidad,
  deletePublicidad,
  getPublicidades,
  updatePublicidad,
} from "../controllers/publicidad.controller";

const router = Router();

// Consultar publicidad, libre para todos
router.get("/get-publicidades", getPublicidades);

// Crear, editar y eliminar, solo admin (tipoUsuario 1 o 0)
router.post(
  "/create-publicidad",
  authMiddleware,
  verificarRoles([0, 1]),
  uploadImageMemory.single("imagen"),
  secureUploads("images"),
  createPublicidad,
);

router.delete(
  "/delete-publicidad/:id",
  authMiddleware,
  verificarRoles([0, 1]),
  deletePublicidad,
);

router.put(
  "/update-publicidad/:id",
  authMiddleware,
  verificarRoles([0, 1]),
  uploadImageMemory.single("imagen"),
  secureUploads("images"),
  updatePublicidad,
);

export default router;