import { Router } from "express";
import {
    getPaquetesSuscripcion,
    createPaqueteSuscripcion,
    deletePaqueteSuscripcion,
    updatePaquetesSuscripcion,
} from "../controllers/paqueteSuscripcion.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Consultar tutoriales, libre para todos
router.get("/get-paquetes", getPaquetesSuscripcion);

// Crear y eliminar, solo admin (tipoUsuario 1 o 0)
router.post("/create-paquete", authMiddleware, verificarRoles([0, 1]), createPaqueteSuscripcion);
router.delete("/delete-paquete/:id", authMiddleware, verificarRoles([0, 1]), deletePaqueteSuscripcion);
router.put("/update-paquete/:id", authMiddleware, verificarRoles([0, 1]), updatePaquetesSuscripcion);

export default router;
