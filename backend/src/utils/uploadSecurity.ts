import { Request, Response, NextFunction } from 'express';
import fsp from 'fs/promises';
import { verifyFileContent, UploadPolicy } from './fileContent';

export class UploadValidationError extends Error {}

/** Junta los archivos de req.file / req.files (array o fields) */
export function collectUploadedFiles(req: Request): Express.Multer.File[] {
  const out: Express.Multer.File[] = [];
  if (req.file) out.push(req.file);
  const files = req.files as Express.Multer.File[] | Record<string, Express.Multer.File[]> | undefined;
  if (Array.isArray(files)) out.push(...files);
  else if (files && typeof files === 'object') Object.values(files).forEach(list => out.push(...list));
  return out;
}

export async function deleteFromDisk(files: Express.Multer.File[]) {
  await Promise.all(files.filter(f => f.path).map(f => fsp.unlink(f.path).catch(() => {})));
}

/**
 * Se coloca justo DESPUÉS de multer en la ruta. Garantiza que un archivo no aceptado
 * nunca queda en disco:
 *  1. Verifica el contenido real de cada archivo; si alguno falla, borra TODOS y responde 400.
 *  2. Si la petición termina con error (4xx/5xx) por cualquier otra razón (validaciones del
 *     controlador, excepciones, etc.) o el cliente corta la conexión, borra los archivos del disco.
 *
 * Los archivos solo permanecen si la respuesta fue exitosa. Un controlador que acepte
 * parcialmente (ej. 207) debe borrar por sí mismo los que descarte.
 */
export function secureUploads(policy: UploadPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const files = collectUploadedFiles(req);
    if (files.length === 0) return next();

    let responded = false;
    res.on('finish', () => {
      responded = true;
      if (res.statusCode >= 400) void deleteFromDisk(files);
    });
    res.on('close', () => {
      if (!responded) void deleteFromDisk(files); // conexión cortada antes de responder
    });

    for (const f of files) {
      const result = await verifyFileContent(f, policy);
      if (!result.ok) {
        res.status(400).json({
          success: false,
          message: `${f.originalname}: ${result.reason}.`,
          errorCode: 'INVALID_FILE_CONTENT',
        });
        return; // el hook 'finish' borra los archivos
      }
      f.mimetype = result.mime; // MIME real, no el declarado por el cliente
    }
    next();
  };
}
