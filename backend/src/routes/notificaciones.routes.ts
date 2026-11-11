import { Router } from "express";
import {
  getNotificaciones,
  createNotificacion,
  deleteNotificacion,
  updateNotificacion,
  notificacionSeenBy
} from "../controllers/notificacion.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Obtener notificaciones con o sin filtro
// Filtro se vería algo como notificaciones?userId=...
router.get("/", authMiddleware, getNotificaciones);

// Crud (solo admin/super-admin)
router.post("/", authMiddleware, verificarRoles([0, 1]), createNotificacion);
router.delete("/:id", authMiddleware, verificarRoles([0, 1]), deleteNotificacion);
router.put("/:id", authMiddleware, verificarRoles([0, 1]), updateNotificacion);

// Un usuario vio la notificación
router.patch("/:id/visto", authMiddleware, notificacionSeenBy);

export default router;
