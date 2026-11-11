import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { imageFileFilter } from '../utils/imageUpload';

// Tamaño máximo por archivo (MB). Prioriza UPLOAD_MAX_FILE_SIZE_MB, luego LIBRARY_MAX_FILE_SIZE_MB, por defecto 80MB
// Añadimos un pequeño margen (slack) en bytes para cubrir overhead del multipart/form-data.
const maxFileSizeMB = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB || process.env.LIBRARY_MAX_FILE_SIZE_MB || '80', 10);
const maxFileSizeSlackBytes = parseInt(process.env.UPLOAD_MAX_FILE_SIZE_SLACK_BYTES || String(1 * 1024 * 1024), 10); // 1 MB por defecto
// Cantidad máxima de archivos por subida
const maxFilesPerUpload = parseInt(process.env.UPLOAD_MAX_FILES || '20', 10);

/** Extensión en minúsculas */
const extOf = (name: string) => path.extname(name).toLowerCase();

/** Nombre único: timestamp + aleatorio + extensión */
const uniqueName = (originalname: string) =>
  `${Date.now()}-${Math.round(Math.random() * 1e9)}${extOf(originalname)}`;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const folder = process.env.NODE_ENV === 'production'
      ? '/tmp/uploads'
      : path.join(__dirname, '../tmp/uploads');

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
});

// Genérico, SIN filtro de tipo: no usarlo en rutas que reciban solo imágenes
const fileFilter: multer.Options['fileFilter'] = (_req, _file, cb) => cb(null, true);

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (maxFileSizeMB * 1024 * 1024) + maxFileSizeSlackBytes,
    files: maxFilesPerUpload,
  },
});

// ===== Temática (fondo) =====
const themeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const isProd = process.env.NODE_ENV === 'production';
    const baseUploadsDir = process.env.UPLOAD_DIR || (isProd
      ? '/srv/uploads'
      : path.join(__dirname, '../tmp/uploads'));
    const folder = path.join(baseUploadsDir, 'tematica');

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
});

export const uploadThemeBackground = multer({
  storage: themeStorage,
  fileFilter: imageFileFilter,        // JPG, PNG, WEBP (MIME + extensión)
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
});

// ===== Perfiles de usuario =====
const perfilStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const isProd = process.env.NODE_ENV === 'production';

    let folder: string;

    // Determinar carpeta según tipo de archivo
    if (file.mimetype === 'application/pdf') {
      // CVs
      folder = isProd
        ? (process.env.CSV_LIB || '/srv/uploads/csv')
        : path.join(__dirname, '../tmp/uploads/perfiles/cvs');
    } else {
      // Fotos de perfil
      folder = isProd
        ? (process.env.PROFILE_LIB || '/srv/uploads/perfil')
        : path.join(__dirname, '../tmp/uploads/perfiles/fotos');
    }

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: (_req, file, cb) => cb(null, uniqueName(file.originalname)),
});

// Filtro para CVs (solo PDFs)
const cvFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'));
  }
};

// Multer para fotos de perfil (max 5MB)
export const uploadFotoPerfil = multer({
  storage: perfilStorage,
  fileFilter: imageFileFilter,        // JPG, PNG, WEBP (MIME + extensión)
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

// Multer para CVs (max 10MB)
export const uploadCV = multer({
  storage: perfilStorage,
  fileFilter: cvFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});