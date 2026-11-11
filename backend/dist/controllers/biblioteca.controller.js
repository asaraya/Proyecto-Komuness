"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLibrary = void 0;
const archivo_model_1 = require("../models/archivo.model");
const folder_model_1 = require("../models/folder.model");
const perfil_model_1 = require("../models/perfil.model");
const mongoose_1 = __importDefault(require("mongoose"));
/* ====================== NUEVO: dependencias para guardar en disco ====================== */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const multer_1 = __importDefault(require("multer"));
/**
 * Carpeta base para los binarios de la BIBLIOTECA en la VM.
 * - Si existe LIBRARY_DIR en el .env, se usa esa.
 * - Si no, se crea/usa /srv/uploads/biblioteca (derivado de UPLOAD_DIR si está definido).
 */
const LIB_DIR = process.env.LIBRARY_DIR ||
    path_1.default.join(process.env.UPLOAD_DIR || '/srv/uploads', 'biblioteca');
/** Asegura subcarpeta por año/mes (ej: /srv/uploads/biblioteca/2025/09) */
function ensureDestDir() {
    return __awaiter(this, void 0, void 0, function* () {
        const now = new Date();
        const dir = path_1.default.join(LIB_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
        yield promises_1.default.mkdir(dir, { recursive: true });
        return dir;
    });
}
/** Sanitiza el nombre del archivo */
function sanitizeName(name) {
    return name.replace(/[^\w.\- ]+/g, '_');
}
/**
 * Multer especializado para Biblioteca:
 * - Guarda en disco (no en memoria)
 * - Respeta la estructura por fecha
 */
const libraryMaxMB = parseInt(process.env.LIBRARY_MAX_FILE_SIZE_MB || '200', 10);
const maxFileSizeSlackBytes = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_SLACK_BYTES || String(1 * 1024 * 1024), 10); // 1MB slack
const ALLOWED_LIBRARY_MIME_TYPES = new Set([
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-rar',
]);
const ALLOWED_EXTENSIONS = new Set([
    '.pdf',
    '.xls',
    '.xlsx',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.txt',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.zip',
    '.rar',
]);
const libraryFileFilter = (_req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    // Validar MIME type Y extensión
    if (ALLOWED_LIBRARY_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error('Tipo de archivo no permitido. Permitidos: PDF, Excel, Word, PPT, TXT, PNG, JPG, WEBP, ZIP y RAR.'));
    }
};
exports.uploadLibrary = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const dir = yield ensureDestDir();
                cb(null, dir);
            }
            catch (err) {
                cb(err, LIB_DIR);
            }
        }),
        filename: (_req, file, cb) => {
            const safe = sanitizeName(file.originalname);
            cb(null, `${Date.now()}-${safe}`);
        },
    }),
    fileFilter: libraryFileFilter,
    limits: { fileSize: (libraryMaxMB * 1024 * 1024) + maxFileSizeSlackBytes },
});
/* ====================== FIN NUEVO ====================== */
class BibliotecaController {
    /**
     * @description: Sube los archivos a la biblioteca ~en digitalOcean spaces~ **(AHORA EN DISCO LOCAL DE LA VM)** y guarda los metadatos en la base de datos
     * RF023: Los archivos de usuarios básicos/premium quedan en estado "pendiente" hasta ser aprobados
     * @route: POST /api/biblioteca/upload
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static uploadFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { folderId, userId, userType } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId es requerido',
                    errors: []
                });
            }
            if (userType === undefined || userType === null) {
                return res.status(400).json({
                    success: false,
                    message: 'userType es requerido',
                    errors: []
                });
            }
            const files = req.files;
            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se han enviado archivos.',
                    errors: []
                });
            }
            // RF023: Convertir userType a número (puede venir como string desde FormData)
            const userTypeNum = parseInt(userType);
            // RF023: Los usuarios básicos/premium SÍ pueden subir a carpetas (no hay restricción aquí)
            // Solo NO pueden CREAR carpetas (eso se valida en createFolder)
            try {
                //3.5.4 - Validación de usuarios dentro del banco
                const perfil = yield perfil_model_1.modelPerfil.findOne({ usuarioId: userId });
                if (!perfil) {
                    res.status(200).json({
                        success: false,
                        message: "El perfil público no existe"
                    });
                    return;
                }
                if (!(perfil === null || perfil === void 0 ? void 0 : perfil.enBancoProfesionales)) {
                    res.status(200).json({
                        success: false,
                        message: "Este usuario no está en el banco de profesionales"
                    });
                    return;
                }
                const results = yield Promise.all(files.map((file) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        /* ===========================================================
                         * NUEVO: Guardado en disco ya lo realizó Multer (file.path)
                         * - Calculamos una "key" RELATIVA a LIB_DIR para guardarla en Atlas.
                         * - Luego generamos una URL de descarga servida por el backend.
                         * =========================================================== */
                        const relKey = path_1.default
                            .relative(LIB_DIR, file.path)
                            .split(path_1.default.sep)
                            .join('/');
                        // dentro del try de cada file en uploadFiles
                        const folderValue = !folderId || folderId === '0' ? null : new mongoose_1.default.Types.ObjectId(folderId);
                        const autorValue = new mongoose_1.default.Types.ObjectId(userId);
                        // RF023: Determinar el estado según el tipo de usuario
                        // tipoUsuario: 0=super-admin, 1=admin, 2=básico, 3=premium
                        const isBasicOrPremium = userTypeNum === 2 || userTypeNum === 3;
                        const estadoArchivo = isBasicOrPremium ? 'pendiente' : 'aprobado';
                        const esPublicoArchivo = !isBasicOrPremium; // Solo públicos si son aprobados automáticamente
                        // 1) Instancia (Mongoose ya asigna _id antes de guardar)
                        const archivo = new archivo_model_1.Archivo({
                            nombre: file.originalname,
                            fechaSubida: new Date(),
                            tipoArchivo: file.mimetype,
                            tamano: file.size,
                            autor: autorValue,
                            esPublico: esPublicoArchivo,
                            key: relKey,
                            folder: folderValue,
                            estado: estadoArchivo,
                            uploadedBy: autorValue,
                        });
                        // 2) Asigna la URL usando el _id generado y guarda una sola vez
                        archivo.url = `${process.env.PUBLIC_BASE_URL || 'https://localhost:5000'}/api/biblioteca/files/${archivo._id}`;
                        yield archivo.save();
                        return {
                            success: true,
                            nombre: file.originalname,
                            message: isBasicOrPremium
                                ? 'Archivo enviado con éxito. Solicita a un administrador que lo publique.'
                                : 'Archivo subido correctamente',
                            content: archivo
                        };
                    }
                    catch (error) {
                        console.error('Error detallado:', error); // Mejor logging
                        return {
                            success: false,
                            nombre: file.originalname,
                            message: error instanceof Error ? error.message : 'Error interno al procesar el archivo',
                            content: null
                        };
                    }
                })));
                // Verificar si hay errores en alguna de las respuestas
                const hasErrors = results.some(r => !r.success);
                const hasBasicOrPremiumFiles = results.some(r => r.success && r.message.includes('Solicita a un administrador'));
                // Mensaje general según el tipo de archivos subidos
                let generalMessage = 'Todos los archivos subidos exitosamente';
                if (hasErrors) {
                    generalMessage = 'Algunos archivos no se subieron correctamente';
                }
                else if (hasBasicOrPremiumFiles) {
                    const fileCount = results.filter(r => r.success).length;
                    generalMessage = fileCount === 1
                        ? 'Archivo enviado con éxito. Solicita a un administrador que lo publique.'
                        : `${fileCount} archivos enviados con éxito. Solicita a un administrador que los publique.`;
                }
                // Respuesta final al cliente
                return res.status(hasErrors ? 207 : 200).json({
                    success: !hasErrors,
                    message: generalMessage,
                    results
                });
            }
            catch (error) {
                console.error('Error general:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    static moveFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { fileIds, targetFolderId, userId, userType } = req.body;
            // ================= VALIDACIONES =================
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId es requerido',
                    results: []
                });
            }
            if (userType === undefined || userType === null) {
                return res.status(400).json({
                    success: false,
                    message: 'userType es requerido',
                    results: []
                });
            }
            if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se han enviado archivos para mover',
                    results: []
                });
            }
            if (!targetFolderId) {
                return res.status(400).json({
                    success: false,
                    message: 'targetFolderId es requerido',
                    results: []
                });
            }
            try {
                const userTypeNum = parseInt(userType);
                // ================= VALIDACIÓN DE PERMISOS =================
                // RF023: mismos roles que upload (0,1,2,3 pueden mover)
                const allowedRoles = [0, 1, 2, 3];
                if (!allowedRoles.includes(userTypeNum)) {
                    return res.status(403).json({
                        success: false,
                        message: 'No tienes permisos para mover archivos',
                        results: []
                    });
                }
                const folderValue = !targetFolderId || targetFolderId === "0"
                    ? null
                    : targetFolderId;
                const results = yield Promise.all(fileIds.map((fileId) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const archivo = yield archivo_model_1.Archivo.findById(fileId);
                        if (!archivo) {
                            return {
                                success: false,
                                fileId,
                                message: 'Archivo no encontrado hdjashdjsha',
                                content: null
                            };
                        }
                        // ================= ACTUALIZACIÓN =================
                        archivo.folder = folderValue;
                        yield archivo.save();
                        return {
                            success: true,
                            fileId,
                            nombre: archivo.nombre,
                            message: 'Archivo movido correctamente',
                            content: archivo
                        };
                    }
                    catch (error) {
                        console.error('Error moviendo archivo:', error);
                        return {
                            success: false,
                            fileId,
                            message: error instanceof Error
                                ? error.message
                                : 'Error interno al mover el archivo',
                            content: null
                        };
                    }
                })));
                // ================= RESPUESTA GLOBAL =================
                const hasErrors = results.some(r => !r.success);
                let generalMessage = 'Archivos movidos correctamente';
                if (hasErrors) {
                    generalMessage = 'Algunos archivos no pudieron moverse correctamente';
                }
                return res.status(hasErrors ? 207 : 200).json({
                    success: !hasErrors,
                    message: generalMessage,
                    results
                });
            }
            catch (error) {
                console.error('Error general al mover archivos:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * @description: Lista el contenido de una carpeta de la biblioteca (archivos y carpetas)
     * @route: GET /api/biblioteca/list/:id
     * si su id es 0, entonces se listan los archivos y carpetas de la raiz
     * de lo contrario, se listan los archivos y carpetas de la carpeta con el id especificado
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static list(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { nombre, global, publico, orden } = req.query;
            const ordenamiento = orden === 'asc' ? 1 : -1;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'id es requerido',
                    errors: []
                });
            }
            // generar el objectid basado en el id del param
            //no validar si no generarlo
            if (!mongoose_1.default.Types.ObjectId.isValid(id) && id !== '0') {
                return res.status(400).json({
                    success: false,
                    message: 'id es inválido',
                    errors: []
                });
            }
            // RF023: Modificar en la construcción de queryArchivos
            // Solo mostrar archivos aprobados (no pendientes ni rechazados)
            const queryArchivos = Object.assign(Object.assign(Object.assign(Object.assign({}, (global !== 'true' && {
                folder: id !== '0' ? new mongoose_1.default.Types.ObjectId(id) : null
            })), (nombre && { nombre: { $regex: nombre, $options: 'i' } })), (publico !== undefined && { esPublico: publico === 'true' })), { 
                // RF023: IMPORTANTE - Solo mostrar archivos aprobados
                estado: 'aprobado' });
            // Y en queryFolders
            const queryFolders = Object.assign(Object.assign({}, (global !== 'true' && {
                directorioPadre: id !== '0' ? new mongoose_1.default.Types.ObjectId(id) : null
            })), (nombre && { nombre: { $regex: nombre, $options: 'i' } }));
            try {
                const archivos = yield archivo_model_1.Archivo.find(queryArchivos)
                    .populate('autor', 'nombre')
                    .collation({ locale: 'es', strength: 2 })
                    .sort({ nombre: ordenamiento });
                const folders = yield folder_model_1.Folder.find(queryFolders)
                    .collation({ locale: 'es', strength: 2 })
                    .sort({ nombre: ordenamiento });
                return res.status(200).json({
                    success: true,
                    contentFile: archivos,
                    contentFolder: folders
                });
            }
            catch (error) {
                console.error('Error general:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * @description: Crea una carpeta en la biblioteca
     * @route: POST /api/biblioteca/folder
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static createFolder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { nombre, parent } = req.body;
            if (!nombre) {
                return res.status(400).json({
                    success: false,
                    message: 'nombre es requerido',
                    errors: []
                });
            }
            try {
                const folder = new folder_model_1.Folder({
                    nombre,
                    fechaCreacion: new Date(),
                    directorioPadre: parent === '0' ? null : parent
                });
                yield folder.save();
                return res.status(200).json({
                    success: true,
                    message: 'Carpeta creada correctamente',
                    content: folder
                });
            }
            catch (error) {
                console.error('Error general:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    static moveFolders(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { folderIds, targetFolderId } = req.body;
            if (!folderIds) {
                return res.status(400).json({
                    success: false,
                    message: 'carpetas a mover son requeridas',
                    errors: []
                });
            }
            try {
                const results = yield Promise.all(folderIds.map((folderId) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const folder = yield folder_model_1.Folder.findById(folderId);
                        if (!folder) {
                            return {
                                success: false,
                                folderId,
                                message: 'Carpeta no encontrado',
                                content: null
                            };
                        }
                        folder.directorioPadre = targetFolderId === '0' ? null : targetFolderId;
                        yield folder.save();
                        return res.status(200).json({
                            success: true,
                            message: 'Carpeta movida correctamente',
                            content: folder,
                        });
                    }
                    catch (error) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error interno del servidor al mover carpeta',
                            error: error instanceof Error ? error.message : 'An unknown error occurred'
                        });
                    }
                })));
            }
            catch (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor al mover carpetas',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * Función para eliminar un archivo de la biblioteca (modular, debido a que hay 2 funciones que la llaman)
     * @param id
     * @returns boolean
     */
    static deleteFileById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const archivo = yield archivo_model_1.Archivo.findById(id);
                if (!archivo)
                    return false;
                /* ====================== NUEVO: eliminar también del disco ====================== */
                try {
                    if (archivo.key) {
                        const abs = path_1.default.resolve(LIB_DIR, archivo.key);
                        const libNorm = path_1.default.normalize(LIB_DIR + path_1.default.sep);
                        const absNorm = path_1.default.normalize(abs);
                        if (absNorm.startsWith(libNorm) && fs_1.default.existsSync(absNorm)) {
                            yield promises_1.default.unlink(absNorm);
                        }
                    }
                }
                catch (e) {
                    console.warn('No se pudo eliminar el binario en disco:', e);
                }
                /* ====================== FIN NUEVO ====================== */
                // Eliminar el archivo de la biblioteca (documento en Atlas)
                yield archivo_model_1.Archivo.findByIdAndDelete(id);
                return true;
            }
            catch (error) {
                console.error(`Error en la función: ${this.constructor.name}\n Error general:${error}`);
                return false;
            }
        });
    }
    /**
     * @description: Elimina un archivo de la biblioteca
     * @route: DELETE /api/biblioteca/delete/:id
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static deleteFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'id es requerido',
                    errors: []
                });
            }
            try {
                const archivo = yield archivo_model_1.Archivo.findById(id);
                if (!archivo) {
                    return res.status(404).json({
                        success: false,
                        message: 'Archivo no encontrado',
                        errors: []
                    });
                }
                // Eliminar el archivo de la biblioteca
                yield BibliotecaController.deleteFileById(id);
                return res.status(200).json({
                    success: true,
                    message: 'Archivo eliminado correctamente',
                    content: archivo
                });
            }
            catch (error) {
                console.error('Error general:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * @description: Elimina una carpeta de la biblioteca
     * @route: DELETE /api/biblioteca/folder/:id
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static deleteFolder(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'id es requerido',
                    errors: []
                });
            }
            try {
                const folder = yield folder_model_1.Folder.findById(id);
                const archivos = yield archivo_model_1.Archivo.find({ folder: id });
                if (!folder) {
                    return res.status(404).json({
                        success: false,
                        message: 'Carpeta no encontrada',
                        errors: []
                    });
                }
                // Eliminar la carpeta de la biblioteca
                yield folder_model_1.Folder.findByIdAndDelete(id);
                //luego, eliminar todos los archivos que esten dentro de la carpeta
                for (const archivo of archivos) {
                    yield BibliotecaController.deleteFileById(((_a = archivo._id) === null || _a === void 0 ? void 0 : _a.toString()) || '');
                }
                return res.status(200).json({
                    success: true,
                    message: 'Carpeta y archivos eliminados correctamente',
                    content: folder
                });
            }
            catch (error) {
                console.error('Error general:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * @description: Busca un archivo de la biblioteca
     * @route: GET /biblioteca/search?params=values
     *   @param texto: Texto a buscar en el nombre del archivo o tipoArchivo (o folder)
     *   @param tipoArchivo: Tipo de archivo a buscar
     *   @param autor: ID del autor del archivo
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static filterArchivo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { texto, tipoArchivo, autor } = req.query;
                const filtro = {};
                let carpetasCoincidentes = [];
                // Filtro por texto (nombre del archivo o tipoArchivo)
                if (texto) {
                    filtro.$or = [
                        { nombre: { $regex: texto, $options: 'i' } },
                        { tipoArchivo: { $regex: texto, $options: 'i' } }
                    ];
                    carpetasCoincidentes = yield folder_model_1.Folder.find({
                        nombre: { $regex: texto, $options: 'i' }
                    });
                }
                // Filtro por tipo de archivo (por si se desea buscar por tipo aparte de la barra de búsqueda)
                if (tipoArchivo) {
                    filtro.tipoArchivo = { $regex: tipoArchivo, $options: 'i' };
                }
                // Filtro por autor (asegura que sea un ObjectId válido si aplica)
                if (autor) {
                    if (!mongoose_1.default.Types.ObjectId.isValid(autor)) {
                        res.status(400).json({ message: 'ID de autor inválido' });
                        return;
                    }
                    filtro.autor = autor;
                }
                // RF023: IMPORTANTE - Solo mostrar archivos aprobados en búsquedas
                filtro.estado = 'aprobado';
                // Si no hay ningún filtro válido, no hacemos búsqueda
                if (Object.keys(filtro).length === 1 && !texto) { // Cambio: ahora siempre tendrá al menos 'estado'
                    res.status(400).json({ message: 'Debe proporcionar al menos un parámetro de búsqueda' });
                    return;
                }
                // Buscar archivos según filtros
                const archivos = yield archivo_model_1.Archivo.find(filtro).populate('folder');
                // Si no hay resultados en ambos
                if (archivos.length === 0 && carpetasCoincidentes.length === 0) {
                    res.status(404).json({ message: 'No se encontraron resultados con esos criterios' });
                    return;
                }
                res.status(200).json({
                    carpetas: carpetasCoincidentes,
                    archivos
                });
            }
            catch (error) {
                const err = error;
                res.status(500).json({ message: err.message });
            }
        });
    }
    static updateFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const data = req.body;
                const resultado = yield archivo_model_1.Archivo.findByIdAndUpdate(id, data, { new: true });
                if (!resultado) {
                    res.status(404).json({
                        message: 'No se pudo editar el archivo'
                    });
                    return;
                }
                res.status(200).json({
                    resultado
                });
            }
            catch (error) {
                const err = error;
                res.status(500).json({
                    message: err.message
                });
            }
        });
    }
    /* ====================== NUEVO: descarga del binario desde la VM ====================== */
    /**
     * @description: Descarga (o muestra inline) un archivo de la biblioteca (binario en VM)
     * @route: GET /api/biblioteca/files/:id
     * Query opcionales:
     *   - ?inline=1     -> intenta mostrar en el navegador (imágenes/PDF)
     *   - ?download=1   -> fuerza descarga
     */
    static downloadArchivo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const doc = yield archivo_model_1.Archivo.findById(id);
                if (!doc) {
                    res.status(404).json({ success: false, message: 'Archivo no encontrado' });
                    return;
                }
                const abs = path_1.default.resolve(LIB_DIR, String(doc.key || ''));
                const libNorm = path_1.default.normalize(LIB_DIR + path_1.default.sep);
                const absNorm = path_1.default.normalize(abs);
                if (!absNorm.startsWith(libNorm)) {
                    res.status(403).json({ success: false, message: 'Ruta inválida' });
                    return;
                }
                if (doc.tipoArchivo)
                    res.setHeader('Content-Type', doc.tipoArchivo);
                /* ====================== NUEVO: decidir inline vs attachment ====================== */
                const wantsDownload = req.query.download === '1';
                const wantsInline = req.query.inline === '1';
                const isPreviewable = !!doc.tipoArchivo &&
                    (doc.tipoArchivo.startsWith('image/') || doc.tipoArchivo === 'application/pdf');
                const disposition = (wantsDownload || (!wantsInline && !isPreviewable)) ? 'attachment' : 'inline';
                if (doc.nombre) {
                    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.nombre)}"`);
                }
                /* ====================== FIN NUEVO ====================== */
                const stream = fs_1.default.createReadStream(absNorm);
                stream.on('error', () => res.status(404).json({ success: false, message: 'No se pudo abrir el archivo' }));
                stream.pipe(res);
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    /* ====================== RF023: Métodos para aprobar/rechazar archivos ====================== */
    /**
     * @description: Aprueba un archivo pendiente (solo admin/super-admin)
     * @route: PUT /api/biblioteca/approve/:id
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static approveFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID de archivo inválido'
                    });
                }
                const archivo = yield archivo_model_1.Archivo.findById(id);
                if (!archivo) {
                    return res.status(404).json({
                        success: false,
                        message: 'Archivo no encontrado'
                    });
                }
                if (archivo.estado === 'aprobado') {
                    return res.status(400).json({
                        success: false,
                        message: 'El archivo ya está aprobado'
                    });
                }
                // Actualizar estado y hacer público
                archivo.estado = 'aprobado';
                archivo.esPublico = true;
                yield archivo.save();
                return res.status(200).json({
                    success: true,
                    message: 'Archivo aprobado correctamente',
                    content: archivo
                });
            }
            catch (error) {
                console.error('Error al aprobar archivo:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * @description: Rechaza un archivo pendiente (solo admin/super-admin)
     * @route: PUT /api/biblioteca/reject/:id
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static rejectFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID de archivo inválido'
                    });
                }
                const archivo = yield archivo_model_1.Archivo.findById(id);
                if (!archivo) {
                    return res.status(404).json({
                        success: false,
                        message: 'Archivo no encontrado'
                    });
                }
                if (archivo.estado === 'rechazado') {
                    return res.status(400).json({
                        success: false,
                        message: 'El archivo ya está rechazado'
                    });
                }
                // Actualizar estado
                archivo.estado = 'rechazado';
                archivo.esPublico = false;
                yield archivo.save();
                return res.status(200).json({
                    success: true,
                    message: 'Archivo rechazado correctamente',
                    content: archivo
                });
            }
            catch (error) {
                console.error('Error al rechazar archivo:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
    /**
     * @description: Lista archivos pendientes de aprobación (solo admin/super-admin)
     * @route: GET /api/biblioteca/pending
     * @param req: Request
     * @param res: Response
     * @returns: Response
     */
    static listPendingFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const archivosPendientes = yield archivo_model_1.Archivo.find({ estado: 'pendiente' })
                    .populate('autor', 'nombre apellido email')
                    .populate('uploadedBy', 'nombre apellido email tipoUsuario')
                    .sort({ fechaSubida: -1 }); // Más recientes primero
                return res.status(200).json({
                    success: true,
                    count: archivosPendientes.length,
                    archivos: archivosPendientes
                });
            }
            catch (error) {
                console.error('Error al listar archivos pendientes:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                });
            }
        });
    }
}
exports.default = BibliotecaController;
