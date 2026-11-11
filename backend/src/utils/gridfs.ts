import mongoose from 'mongoose';
import fs from 'fs';

let bucket: mongoose.mongo.GridFSBucket | null = null;

function getBucket(): mongoose.mongo.GridFSBucket {
  if (!bucket) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('MongoDB no está conectado');
    bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  }
  return bucket;
}

/**
 * Guarda un Buffer en GridFS
 */
// en src/utils/gridfs.ts
export function saveBufferToGridFS(
  buffer: Buffer,
  filename: string,
  mimetype?: string
): Promise<{ id: any; filename: string }> {
  return new Promise((resolve, reject) => {
    const bkt = getBucket(); // <- usar getBucket()

    const uploadStream = bkt.openUploadStream(filename, { contentType: mimetype });
    uploadStream.once('error', reject);
    uploadStream.once('finish', () => {
      resolve({ id: uploadStream.id, filename: uploadStream.filename });
    });
    uploadStream.end(buffer);
  });
}


/**
 * Guarda un archivo de Multer en GridFS
 */
export async function saveMulterFileToGridFS(
  file: Express.Multer.File,
  prefix?: string
): Promise<{ id: any; filename: string }> {
  const safe = file.originalname.replace(/[^\w.\- ]+/g, '_');
  const name = (prefix ? `${prefix}/` : '') + `${Date.now()}_${safe}`;
  try {
    const buffer = file.buffer ?? (await fs.promises.readFile(file.path));
    return await saveBufferToGridFS(buffer, name, file.mimetype);
  } finally {
    if (file.path) await fs.promises.unlink(file.path).catch(() => {});
  }
}

/**
 * Alias de compatibilidad con código antiguo
 * (por si en algún punto se importó uploadBufferToGridFS)
 */
export { saveBufferToGridFS as uploadBufferToGridFS };

/**
 * Borra un archivo por id en GridFS
 */
export async function deleteGridFSFile(id: string) {
  const bkt = getBucket();
  await bkt.delete(new mongoose.Types.ObjectId(id));
}

/** Borra sin lanzar error si ya no existe */
export async function safeDeleteGridFS(id?: string) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return;
  await deleteGridFSFile(id).catch(() => {});
}

/** Extrae el id de una URL tipo .../api/files/<id> */
export function gridIdFromUrl(url?: string): string | undefined {
  return url?.split('/').filter(Boolean).pop();
}

