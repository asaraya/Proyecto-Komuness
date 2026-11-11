"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCV = exports.uploadFotoPerfil = exports.uploadThemeBackground = exports.upload = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const multer_1 = __importDefault(require("multer"));
// Tamaño máximo por archivo (MB). Prioriza UPLOAD_MAX_FILE_SIZE_MB, luego LIBRARY_MAX_FILE_SIZE_MB, por defecto 200MB
// Añadimos un pequeño margen (slack) en bytes para cubrir overhead del multipart/form-data (boundaries, headers).
const maxFileSizeMB = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB || process.env.LIBRARY_MAX_FILE_SIZE_MB || '80', 10);
const maxFileSizeSlackBytes = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_SLACK_BYTES || String(1 * 1024 * 1024), 10); // 1 MB por defecto
// Cantidad máxima de archivos por subida
const maxFilesPerUpload = parseInt(process.env.UPLOAD_MAX_FILES || '20', 10);
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const folder = process.env.NODE_ENV === 'production'
            ? '/tmp/uploads'
            : node_path_1.default.join(__dirname, '../tmp/uploads');
        if (!node_fs_1.default.existsSync(folder)) {
            node_fs_1.default.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${node_path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const fileFilter = (_req, _file, cb) => cb(null, true);
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        // Aplicar slack para permitir que la sobrecarga de multipart no provoque rechazos cuando el archivo
        // pesa exactamente el límite (por ejemplo 200MB). Valor = configured MB + slack bytes.
        fileSize: (maxFileSizeMB * 1024 * 1024) + maxFileSizeSlackBytes,
        files: maxFilesPerUpload,
    },
});
const themeStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const isProd = process.env.NODE_ENV === 'production';
        const baseUploadsDir = process.env.UPLOAD_DIR || (isProd
            ? '/srv/uploads'
            : node_path_1.default.join(__dirname, '../tmp/uploads'));
        const folder = node_path_1.default.join(baseUploadsDir, 'tematica');
        if (!node_fs_1.default.existsSync(folder)) {
            node_fs_1.default.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (_req, file, cb) => {
        const extension = node_path_1.default.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
        cb(null, uniqueName);
    }
});
const themeImageFilter = (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG, WEBP o GIF.'));
};
exports.uploadThemeBackground = (0, multer_1.default)({
    storage: themeStorage,
    fileFilter: themeImageFilter,
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: 1,
    },
});
// Storage específico para perfiles de usuario
const perfilStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const isProd = process.env.NODE_ENV === 'production';
        let folder;
        // Determinar carpeta según tipo de archivo
        if (file.mimetype === 'application/pdf') {
            // CVs
            if (isProd) {
                folder = process.env.CSV_LIB || '/srv/uploads/csv';
            }
            else {
                folder = node_path_1.default.join(__dirname, '../tmp/uploads/perfiles/cvs');
            }
        }
        else {
            // Fotos de perfil
            if (isProd) {
                folder = process.env.PROFILE_LIB || '/srv/uploads/perfil';
            }
            else {
                folder = node_path_1.default.join(__dirname, '../tmp/uploads/perfiles/fotos');
            }
        }
        if (!node_fs_1.default.existsSync(folder)) {
            node_fs_1.default.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${node_path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
// Filtro para fotos de perfil (solo imágenes)
const fotoPerfilFilter = (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
};
// Filtro para CVs (solo PDFs)
const cvFilter = (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    }
    else {
        cb(new Error('Solo se permiten archivos PDF'));
    }
};
// Multer para fotos de perfil (max 5MB)
exports.uploadFotoPerfil = (0, multer_1.default)({
    storage: perfilStorage,
    fileFilter: fotoPerfilFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1,
    },
});
// Multer para CVs (max 10MB)
exports.uploadCV = (0, multer_1.default)({
    storage: perfilStorage,
    fileFilter: cvFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1,
    },
});
