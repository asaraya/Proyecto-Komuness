import { Router } from "express";
import {
    crearBoletin,
    obtenerBoletines,
    obtenerBoletinPorId,
    actualizarBoletin,
    enviarBoletin,
    eliminarBoletin,
    cancelarBoletin
} from "../controllers/boletin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Todos los endpoints de boletines solo para admin (roles 0 y 1)

// Crear un nuevo boletín
router.post("/", authMiddleware, verificarRoles([0, 1]), crearBoletin);

// Obtener todos los boletines
router.get("/", authMiddleware, verificarRoles([0, 1]), obtenerBoletines);

// Obtener un boletín por ID
router.get("/:id", authMiddleware, verificarRoles([0, 1]), obtenerBoletinPorId);

// Actualizar un boletín
router.put("/:id", authMiddleware, verificarRoles([0, 1]), actualizarBoletin);

// Enviar un boletín
router.post("/:id/enviar", authMiddleware, verificarRoles([0, 1]), enviarBoletin);

// Cancelar un boletín
router.post("/:id/cancelar", authMiddleware, verificarRoles([0, 1]), cancelarBoletin);

// Eliminar un boletín
router.delete("/:id", authMiddleware, verificarRoles([0, 1]), eliminarBoletin);

export default router;
