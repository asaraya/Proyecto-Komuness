import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
    requierePermisoCuentaRegresiva,
    getCuentasActivas,
    getCuentas,
    createCuenta,
    createCuentaDeEvento,
    updateCuenta,
    deleteCuenta,
} from "../controllers/cuentaRegresiva.controller";

// UI65: cuentas regresivas de la página principal
const router = Router();

router.get("/activas", getCuentasActivas);

router.get("/", authMiddleware, requierePermisoCuentaRegresiva, getCuentas);
router.post("/", authMiddleware, requierePermisoCuentaRegresiva, createCuenta);
router.post("/evento/:publicacionId", authMiddleware, requierePermisoCuentaRegresiva, createCuentaDeEvento);
router.put("/:id", authMiddleware, requierePermisoCuentaRegresiva, updateCuenta);
router.delete("/:id", authMiddleware, requierePermisoCuentaRegresiva, deleteCuenta);

export default router;
