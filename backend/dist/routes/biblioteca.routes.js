"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const biblioteca_controller_1 = __importStar(require("../controllers/biblioteca.controller"));
// import { upload } from "../middlewares/multer.middleware";
const auth_middleware_1 = require("../middlewares/auth.middleware");
const roles_middleware_1 = require("../middlewares/roles.middleware");
//const storage = multer.memoryStorage();
//const upload = multer({ storage });
const router = (0, express_1.Router)();
//**************** Rutas de los archivos ************************ */
/**FUNCIONA
 * Posibles respuestas del endpoint:
 * HTTP 200 (todos los archivos subidos exitosamente) o 207 (algunos archivos subidos exitosamente) :
 * {
 * success: true,
 * message:'Todos los archivos subidos exitosamente',
 * results: [
 *  {
 *      success: true,
 *      nombre: file.originalname,
 *      message: 'Archivo subido correctamente',
 *      content: archivo
 *  },...
 * ]
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error al subir los archivos',
 *  }
 */
// solo los tipoUsuarios 0, 1 y 2 pueden subir archivos
// router.post("/upload", upload.array('archivos'), authMiddleware, verificarRoles([0, 1, 2]), BibliotecaController.uploadFiles as any);
// RF023: Ahora usuarios básicos (2) y premium (3) también pueden subir archivos
router.post("/upload", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1, 2, 3]), biblioteca_controller_1.uploadLibrary.array('archivos'), biblioteca_controller_1.default.uploadFiles);
/**
 * MOVE FILES ENTRE CARPETAS
 *
 * Posibles respuestas del endpoint:
 *
 * HTTP 200 (archivos movidos exitosamente):
 * {
 *   success: true,
 *   message: 'Archivos movidos correctamente',
 *   results: [
 *     {
 *       success: true,
 *       fileId: "id_del_archivo",
 *       message: "Archivo movido correctamente"
 *     },
 *     ...
 *   ]
 * }
 *
 * HTTP 400:
 * {
 *   success: false,
 *   message: 'No se enviaron archivos o falta carpeta destino'
 * }
 *
 * HTTP 403:
 * {
 *   success: false,
 *   message: 'No tienes permisos para mover archivos'
   }
 *
 * HTTP 404:
 * {
 *   success: false,
 *   message: 'Algún archivo o carpeta no existe'
 * }
 *
 * HTTP 500:
 * {
 *   success: false,
 *   message: 'Error al mover los archivos'
 * }
 *
 * REGLAS:
 * - Solo usuarios con tipoUsuario 0, 1, 2 y 3 pueden mover archivos
 * - Los archivos cambian únicamente su campo `folder`
 * - No se duplican archivos, solo se actualiza su ubicación
 *
 */
// Endpoint MOVE FILES
router.put("/move", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.moveFiles);
/* ====================== NUEVO: descarga del binario ====================== */
/**
 * Descarga: GET /api/biblioteca/files/:id
 */
router.get("/files/:id", biblioteca_controller_1.default.downloadArchivo);
/* ====================== FIN NUEVO ====================== */
/**
 * Posibles respuestas del endpoint:
 * HTTP 200:
 * {
 *  success: true,
 *  message:'Archivo eliminado correctamente',
 *  results: [
 *      {
 *          success: true,
 *          nombre: file.originalname,
 *          message: 'Archivo eliminado correctamente',
 *      },...
 *  ]
 * }
 * HTTP 400:
 *  {
 *      success: false,
 *      message:'id es requerido',
 *  }
 * HTTP 404:
 *  {
 *      success: false,
 *      message:'Archivo no encontrado',
 *  }
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error al eliminar los archivos',
 *      error: error.message
 *  }
*/
//solo los tipoUsuarios 0 y 1  pueden eliminar archivos
router.delete("/delete/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.deleteFile);
/**
 * Posibles respuestas del endpoint:
 * HTTP 200:
 *  {
 *      success: true,
 *      results: {archivo[]}
 *  }
 *
 * HTTP 404:
 *  {
 *      success: false,
 *      message:'Carpeta no encontrada',
 *  }
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error del sistema',
 *      error: error.message
 *  }
 */
router.route("/buscar").get(biblioteca_controller_1.default.filterArchivo);
//**************************** Rutas de las carpetas ****************************** */
/**
 * FUNCIONA
 * Posibles respuestas del endpoint:
 * HTTP 200:
 * {
 *      success: true,
 *      contentFile: archivo[],
 *      contentFolder: folder[],
 * }
 * HTTP 400:
 *  {
 *      success: false,
 *      message:'id es requerido',
 *  }
 * HTTP 404:
 *  {
 *      success: false,
 *      message:'Archivo no encontrado',
 *  }
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error al eliminar los archivos',
 *      error: error.message
 *  }
 */
router.get("/list/:id", /*authMiddleware, verificarRoles([0, 1]),*/ biblioteca_controller_1.default.list);
/**FUNCIONA
 * Posibles respuestas del endpoint:
 * HTTP 200:
 * {
 *      success: true,
 *      message:'Carpeta creada correctamente',
 *      content: folder,
 * }
 * HTTP 400:
 *  {
 *      success: false,
 *      message:'nombre y parent es requerido',
 *  }
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error al crear la carpeta',
 *      error: error.message
 *  }
 */
//solo los tipoUsuarios 0 y 1  pueden crear carpetas
router.post("/folder", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.createFolder);
/**
 * Posibles respuestas del endpoint:
 * HTTP 200:
 * {
 *      success: rue,
 *      message:'Carpeta eliminada correctamente',
 *      content: folder,
 * }
 * HTTP 400:
 *  {
 *      success: false,
 *      message:'id es requerido',
 *  }
 * HTTP 404:
 *  {
 *      success: false,
 *      message:'Carpeta no encontrada',
 *  }
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error del sistema',
 *      error: error.message
 *  }
 */
//solo los tipoUsuarios 0 y 1  pueden eliminar carpetas
router.route("/folder/:id").delete(auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.deleteFolder);
router.put("/folder/move", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.moveFolders);
/**
 * Posibles respuestas del endpoint: actualizacion de los metadatos del archivo
 * HTTP 200:
 *  {
 *      success: true,
 *      message:'Archivo actualizado correctamente',
 *      content: archivo,
 *  }
 * HTTP 400:
 *  {
 *      success: false,
 *      message:'id es requerido',
 *  }
 * HTTP 404:
 *  {
 *      success: false,
 *      message:'Archivo no encontrado',
 *  }
 * HTTP 500:
 *  {
 *      success: false,
 *      message:'Error del sistema',
 *      error: error.message
 *  }
 *
 */
//solo los tipoUsuarios 0 y 1  pueden actualizar archivos
router.put("/edit/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.updateFile);
/* ====================== RF023: Rutas para aprobación de archivos ====================== */
/**
 * @description: Lista archivos pendientes de aprobación
 * @route: GET /api/biblioteca/pending
 * Solo admin (1) y super-admin (0)
 */
router.get("/pending", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.listPendingFiles);
/**
 * @description: Aprueba un archivo pendiente
 * @route: PUT /api/biblioteca/approve/:id
 * Solo admin (1) y super-admin (0)
 */
router.put("/approve/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.approveFile);
/**
 * @description: Rechaza un archivo pendiente
 * @route: PUT /api/biblioteca/reject/:id
 * Solo admin (1) y super-admin (0)
 */
router.put("/reject/:id", auth_middleware_1.authMiddleware, (0, roles_middleware_1.verificarRoles)([0, 1]), biblioteca_controller_1.default.rejectFile);
/* ====================== FIN RF023 ====================== */
exports.default = router;
