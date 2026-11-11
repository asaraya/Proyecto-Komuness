import multer from "multer";
import { Router } from "express";
import BibliotecaController, { uploadLibrary } from "../controllers/biblioteca.controller";
// import { upload } from "../middlewares/multer.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";
import { verificarRoles } from "../middlewares/roles.middleware";
import { secureUploads } from "../utils/uploadSecurity";
//const storage = multer.memoryStorage();
//const upload = multer({ storage });

const router = Router();


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
router.post("/upload", authMiddleware, verificarRoles([0, 1, 2, 3]), uploadLibrary, secureUploads('library'), BibliotecaController.uploadFiles as any
);


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
router.put(
  "/move",
  authMiddleware,
  verificarRoles([0, 1]),
  BibliotecaController.moveFiles as any
);

/* ====================== NUEVO: descarga del binario ====================== */
/**
 * Descarga: GET /api/biblioteca/files/:id
 */
router.get("/files/:id", BibliotecaController.downloadArchivo as any);
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
router.delete("/delete/:id", authMiddleware, verificarRoles([0, 1]), BibliotecaController.deleteFile as any);


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
router.route("/buscar").get(BibliotecaController.filterArchivo as any);


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
router.get("/list/:id", /*authMiddleware, verificarRoles([0, 1]),*/ BibliotecaController.list as any);
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
router.post("/folder", authMiddleware, verificarRoles([0, 1]), BibliotecaController.createFolder as any);
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
router.route("/folder/:id").delete(authMiddleware, verificarRoles([0, 1]), BibliotecaController.deleteFolder as any);





router.put("/folder/move", authMiddleware, verificarRoles([0, 1]), BibliotecaController.moveFolders as any);







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
router.put("/edit/:id", authMiddleware, verificarRoles([0, 1]), BibliotecaController.updateFile as any);

/* ====================== RF023: Rutas para aprobación de archivos ====================== */
/**
 * @description: Lista archivos pendientes de aprobación
 * @route: GET /api/biblioteca/pending
 * Solo admin (1) y super-admin (0)
 */
router.get("/pending", authMiddleware, verificarRoles([0, 1]), BibliotecaController.listPendingFiles as any);

/**
 * @description: Aprueba un archivo pendiente
 * @route: PUT /api/biblioteca/approve/:id
 * Solo admin (1) y super-admin (0)
 */
router.put("/approve/:id", authMiddleware, verificarRoles([0, 1]), BibliotecaController.approveFile as any);

/**
 * @description: Rechaza un archivo pendiente
 * @route: PUT /api/biblioteca/reject/:id
 * Solo admin (1) y super-admin (0)
 */
router.put("/reject/:id", authMiddleware, verificarRoles([0, 1]), BibliotecaController.rejectFile as any);
/* ====================== FIN RF023 ====================== */


export default router;
