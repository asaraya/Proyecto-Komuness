import { Router } from "express";
import {
    createTutorial,
    deleteTutorial,
    getTutoriales,
    updateTutorial,
} from "../controllers/tutorial.controller";

import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";

const router = Router();

// Consultar tutoriales, libre para todos
router.get("/get-tutoriales", getTutoriales);

// Crear y eliminar, solo admin (tipoUsuario 1 o 0)
router.post("/create-tutorial", authMiddleware, verificarRoles([0, 1]), createTutorial);
router.delete("/delete-tutorial/:id", authMiddleware, verificarRoles([0, 1]), deleteTutorial);
router.put("/update-tutorial/:id", authMiddleware, verificarRoles([0, 1]), updateTutorial);

export default router;
