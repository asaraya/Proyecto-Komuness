import { Router } from 'express';
import {
    createActividad,
    deleteActividad,
    getActividades,
    updateActividad,
    getActividadesCerca,
} from "../controllers/actividades.controller";

import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

//Consulta las actividades(Cualquiera puede consultar las actividades)
router.get("/get-actividades", getActividades);
router.get("/actividades-cerca", getActividadesCerca);

//Crea las actividades (cualquier usuario logueado)
router.post("/create-actividad", authMiddleware, createActividad);
//Elimina las actividades (Solo el usuario que la creo puede eliminarla o el admin)
router.delete("/delete-actividad/:id", authMiddleware, deleteActividad);
//Actualiza las actividades (Solo el usuario que la creo puede editarla o el admin)
router.put("/update-actividad/:id", authMiddleware, updateActividad);

export default router;