import multer from 'multer';
import path from 'path';
import fsp from 'fs/promises';
import { verifyFileContent } from './fileContent';
import { Request, Response, NextFunction } from 'express';

export const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const MAX_IMAGE_MB = parseInt(process.env.MAX_IMAGE_MB || '5', 10);
export const MAX_IMAGES_PER_REQUEST = parseInt(process.env.MAX_IMAGES_PER_REQUEST || '10', 10);

export class ImageValidationError extends Error {}

export const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (IMAGE_MIMES.has(file.mimetype) && IMAGE_EXTS.has(ext)) return cb(null, true);
  cb(new ImageValidationError('Formato no permitido. Solo JPG, PNG o WEBP.'));
};

/** Para rutas que guardan en GridFS (publicaciones, publicidad) */
export const uploadImageMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: MAX_IMAGES_PER_REQUEST },
});

/** Lanza ImageValidationError si algún archivo no es una imagen real que coincida con su extensión */
export async function assertRealImages(files: Express.Multer.File[]) {
  for (const f of files) {
    const res = await verifyFileContent(f, 'images');
    if (!res.ok) throw new ImageValidationError(`"${f.originalname}": ${res.reason}.`);
    f.mimetype = res.mime; // usar el tipo real, no el que declaró el cliente
  }
}

/** Borra del disco los archivos temporales (no hace nada con memoryStorage) */
export async function cleanupFiles(files?: Express.Multer.File[]) {
  await Promise.all((files ?? []).filter(f => f.path).map(f => fsp.unlink(f.path).catch(() => {})));
}

/** Middleware global de errores de subida: ponlo al final de app.ts */
export function uploadErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const map: Record<string, string> = {
      LIMIT_FILE_SIZE: `La imagen supera el máximo de ${MAX_IMAGE_MB} MB.`,
      LIMIT_FILE_COUNT: `Máximo ${MAX_IMAGES_PER_REQUEST} imágenes por solicitud.`,
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado.',
    };
    return res.status(400).json({ success: false, message: map[err.code] || err.message });
  }
  if (err instanceof ImageValidationError) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
}