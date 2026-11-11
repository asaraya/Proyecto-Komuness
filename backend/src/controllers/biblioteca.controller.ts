import { Request, Response } from "express";
import { Archivo } from "../models/archivo.model";
import { Folder } from "../models/folder.model";
import { modelPerfil } from "../models/perfil.model";
import { modelCategoria } from "../models/categoria.model";
import { IArchivo } from "../interfaces/archivo.interface";
import { notificarPublicacionAutomatica } from "../services/notificacion.service";
import mongoose from "mongoose";

import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import multer from "multer";
import crypto from "crypto";

const LIB_DIR =
  process.env.LIBRARY_DIR ||
  path.join(process.env.UPLOAD_DIR || "/srv/uploads", "biblioteca");

async function ensureDestDir(): Promise<string> {
  const now = new Date();
  const dir = path.join(
    LIB_DIR,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

function sanitizeName(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_");
}

const MAX_FILE_NAME_LENGTH = 150;

/**
 * Resuelve el nombre final de un archivo subido.
 * - Sin nombre personalizado: se usa el original.
 * - Con nombre personalizado: se valida y se conserva SIEMPRE la extensión original
 *   (el usuario no puede cambiar el formato del archivo renombrándolo).
 */
export function resolveFileName(
  originalName: string,
  custom: unknown,
): { name: string } | { error: string } {
  if (custom === undefined || custom === null || custom === "") {
    return { name: originalName };
  }
  if (typeof custom !== "string") return { error: "El nombre del archivo no es válido" };

  const ext = path.extname(originalName).toLowerCase();
  let base = custom.trim();
  // Si el usuario escribió la extensión, se quita para no duplicarla
  if (ext && base.toLowerCase().endsWith(ext)) base = base.slice(0, -ext.length).trim();

  if (!base) return { error: "El nombre del archivo no puede estar vacío" };
  if (/[\\/:*?"<>|\x00-\x1f]/.test(base)) {
    return { error: 'El nombre contiene caracteres no permitidos (\\ / : * ? " < > |)' };
  }
  if (base.startsWith(".")) return { error: "El nombre no puede comenzar con un punto" };
  if (base.length + ext.length > MAX_FILE_NAME_LENGTH) {
    return { error: `El nombre es demasiado largo (máximo ${MAX_FILE_NAME_LENGTH} caracteres)` };
  }
  return { name: base + ext };
}

const libraryMaxMB = parseInt(
  process.env.LIBRARY_MAX_FILE_SIZE_MB || "200",
  10,
);
const maxFileSizeSlackBytes = parseInt(
  process.env.UPLOAD_MAX_FILE_SIZE_SLACK_BYTES || String(1 * 1024 * 1024),
  10,
);

const ALLOWED_LIBRARY_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-rar",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".xls",
  ".xlsx",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".zip",
  ".rar",
]);

const libraryFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    ALLOWED_LIBRARY_MIME_TYPES.has(file.mimetype) &&
    ALLOWED_EXTENSIONS.has(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Tipo de archivo no permitido. Permitidos: PDF, Excel, Word, PPT, TXT, PNG, JPG, WEBP, ZIP y RAR.",
      ),
    );
  }
};

export const uploadLibrary = (req: Request, res: Response, next: Function) => {
  multer({
    storage: multer.diskStorage({
      destination: async (_req, _file, cb) => {
        try {
          const dir = await ensureDestDir();
          cb(null, dir);
        } catch (err) {
          cb(err as any, LIB_DIR);
        }
      },
      filename: (_req, file, cb) => {
        // Nombre en disco aleatorio (no depende del nombre que mande el cliente); el nombre visible va en la BD
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
      },
    }),
    fileFilter: libraryFileFilter,
    limits: { fileSize: (libraryMaxMB * 1024 * 1024) + maxFileSizeSlackBytes },
  }).array('archivos')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Tipo de archivo no permitido o error en la subida',
        errors: []
      });
    }
    next();
  });
};
class BibliotecaController {
  static async uploadFiles(req: Request, res: Response) {
    const { folderId, userId, userType, categoriaId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId es requerido",
        errors: [],
      });
    }

    if (userType === undefined || userType === null) {
      return res.status(400).json({
        success: false,
        message: "userType es requerido",
        errors: [],
      });
    }

    if (!categoriaId || !mongoose.Types.ObjectId.isValid(categoriaId)) {
      return res.status(400).json({
        success: false,
        message: "La categoría es obligatoria",
        errors: [],
      });
    }

    const categoriaExiste = await modelCategoria.exists({
      _id: categoriaId,
      estado: true,
    });
    if (!categoriaExiste) {
      return res.status(400).json({
        success: false,
        message: "La categoría seleccionada no existe",
        errors: [],
      });
    }

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se han enviado archivos.",
        errors: [],
      });
    }

    // Nombres personalizados (opcional): JSON array alineado con el orden de `archivos`
    let customNames: unknown[] = [];
    if (req.body.nombres) {
      try {
        const parsed = JSON.parse(req.body.nombres);
        if (Array.isArray(parsed)) customNames = parsed;
      } catch {
        return res.status(400).json({
          success: false,
          message: "El formato de los nombres de archivo no es válido",
          errors: [],
        });
      }
    }

    const finalNames: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const resolved = resolveFileName(files[i].originalname, customNames[i]);
      if ("error" in resolved) {
        return res.status(400).json({
          success: false,
          message: `${files[i].originalname}: ${resolved.error}`,
          errors: [],
        });
      }
      finalNames.push(resolved.name);
    }

    const userTypeNum = parseInt(userType);

    try {
      const perfil = await modelPerfil.findOne({ usuarioId: userId });

      if (!perfil) {
        // Errores 4xx: secureUploads borra del disco los archivos recibidos
        res.status(404).json({
          success: false,
          message: "El perfil público no existe",
        });
        return;
      }

      if (!perfil?.enBancoProfesionales) {
        res.status(403).json({
          success: false,
          message: "Este usuario no está en el banco de profesionales",
        });
        return;
      }

      const results = await Promise.all(
        files.map(async (file, index) => {
          const displayName = finalNames[index];

          try {
            const relKey = path
              .relative(LIB_DIR, file.path)
              .split(path.sep)
              .join("/");

            const folderValue =
              !folderId || folderId === "0"
                ? null
                : new mongoose.Types.ObjectId(folderId);
            const autorValue = new mongoose.Types.ObjectId(userId);

            const isBasicOrPremium = userTypeNum === 2 || userTypeNum === 3;
            const estadoArchivo = isBasicOrPremium ? "pendiente" : "aprobado";
            const esPublicoArchivo = !isBasicOrPremium;

            const archivo = new Archivo({
              nombre: displayName,
              fechaSubida: new Date(),
              tipoArchivo: file.mimetype,
              tamano: file.size,
              autor: autorValue,
              esPublico: esPublicoArchivo,
              key: relKey,
              folder: folderValue,
              categoria: new mongoose.Types.ObjectId(categoriaId),
              estado: estadoArchivo,
              uploadedBy: autorValue,
            });

            archivo.url = `${process.env.PUBLIC_BASE_URL || "https://localhost:5000"}/api/biblioteca/files/${archivo._id}`;
            await archivo.save();

            if (estadoArchivo === "aprobado") {
              try {
                await notificarPublicacionAutomatica({
                  publicacionId: String(archivo._id),
                  titulo: archivo.nombre,
                  tagOrigen: "biblioteca",
                });
              } catch (notiError) {
                console.warn(
                  "No se pudo notificar la subida del archivo de biblioteca:",
                  notiError,
                );
              }
            }

            return {
              success: true,
              nombre: file.originalname,
              message: isBasicOrPremium
                ? "Archivo enviado con éxito. Solicita a un administrador que lo publique."
                : "Archivo subido correctamente",
              content: archivo,
            };
          } catch (error) {
            console.error("Error detallado:", error);
            // Un archivo que no se registró en la BD no debe quedarse en disco
            await fsp.unlink(file.path).catch(() => {});
            return {
              success: false,
              nombre: file.originalname,
              message:
                error instanceof Error
                  ? error.message
                  : "Error interno al procesar el archivo",
              content: null,
            };
          }
        }),
      );

      const hasErrors = results.some((r) => !r.success);
      const hasBasicOrPremiumFiles = results.some(
        (r) => r.success && r.message.includes("Solicita a un administrador"),
      );

      let generalMessage = "Todos los archivos subidos exitosamente";
      if (hasErrors) {
        generalMessage = "Algunos archivos no se subieron correctamente";
      } else if (hasBasicOrPremiumFiles) {
        const fileCount = results.filter((r) => r.success).length;
        generalMessage =
          fileCount === 1
            ? "Archivo enviado con éxito. Solicita a un administrador que lo publique."
            : `${fileCount} archivos enviados con éxito. Solicita a un administrador que los publique.`;
      }

      return res.status(hasErrors ? 207 : 200).json({
        success: !hasErrors,
        message: generalMessage,
        results,
      });
    } catch (error) {
      console.error("Error general:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async moveFiles(req: Request, res: Response) {
    const { fileIds, targetFolderId, userId, userType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId es requerido",
        results: [],
      });
    }

    if (userType === undefined || userType === null) {
      return res.status(400).json({
        success: false,
        message: "userType es requerido",
        results: [],
      });
    }

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se han enviado archivos para mover",
        results: [],
      });
    }

    if (!targetFolderId) {
      return res.status(400).json({
        success: false,
        message: "targetFolderId es requerido",
        results: [],
      });
    }

    try {
      const userTypeNum = parseInt(userType);
      const allowedRoles = [0, 1, 2, 3];

      if (!allowedRoles.includes(userTypeNum)) {
        return res.status(403).json({
          success: false,
          message: "No tienes permisos para mover archivos",
          results: [],
        });
      }

      const folderValue =
        !targetFolderId || targetFolderId === "0" ? null : targetFolderId;

      const results = await Promise.all(
        fileIds.map(async (fileId: string) => {
          try {
            const archivo = await Archivo.findById(fileId);

            if (!archivo) {
              return {
                success: false,
                fileId,
                message: "Archivo no encontrado",
                content: null,
              };
            }

            archivo.folder = folderValue;
            await archivo.save();

            return {
              success: true,
              fileId,
              nombre: archivo.nombre,
              message: "Archivo movido correctamente",
              content: archivo,
            };
          } catch (error) {
            console.error("Error moviendo archivo:", error);
            return {
              success: false,
              fileId,
              message:
                error instanceof Error
                  ? error.message
                  : "Error interno al mover el archivo",
              content: null,
            };
          }
        }),
      );

      const hasErrors = results.some((r) => !r.success);
      let generalMessage = "Archivos movidos correctamente";

      if (hasErrors) {
        generalMessage = "Algunos archivos no pudieron moverse correctamente";
      }

      return res.status(hasErrors ? 207 : 200).json({
        success: !hasErrors,
        message: generalMessage,
        results,
      });
    } catch (error) {
      console.error("Error general al mover archivos:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async list(req: Request, res: Response) {
    const { id } = req.params;
    const { nombre, global, publico, orden, categoria } = req.query;
    const ordenamiento = orden === "asc" ? 1 : -1;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id es requerido",
        errors: [],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id) && id !== "0") {
      return res.status(400).json({
        success: false,
        message: "id es inválido",
        errors: [],
      });
    }

    const queryArchivos = {
      ...(global !== "true" && {
        folder: id !== "0" ? new mongoose.Types.ObjectId(id) : null,
      }),
      ...(nombre && { nombre: { $regex: nombre, $options: "i" } }),
      ...(publico !== undefined && { esPublico: publico === "true" }),
      ...(categoria &&
        mongoose.Types.ObjectId.isValid(categoria as string) && {
          categoria: new mongoose.Types.ObjectId(categoria as string),
        }),
      estado: "aprobado",
    };

    const queryFolders = {
      ...(global !== "true" && {
        directorioPadre: id !== "0" ? new mongoose.Types.ObjectId(id) : null,
      }),
      ...(nombre && { nombre: { $regex: nombre, $options: "i" } }),
    };

    try {
      const archivos = await Archivo.find(queryArchivos)
        .populate("autor", "nombre")
        .populate("categoria", "nombre")
        .collation({ locale: "es", strength: 2 })
        .sort({ nombre: ordenamiento });
      const folders = categoria
        ? []
        : await Folder.find(queryFolders)
            .collation({ locale: "es", strength: 2 })
            .sort({ nombre: ordenamiento });

      return res.status(200).json({
        success: true,
        contentFile: archivos,
        contentFolder: folders,
      });
    } catch (error) {
      console.error("Error general:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async createFolder(req: Request, res: Response) {
    const { nombre, parent } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "nombre es requerido",
        errors: [],
      });
    }

    try {
      const folder = new Folder({
        nombre,
        fechaCreacion: new Date(),
        directorioPadre: parent === "0" ? null : parent,
      });
      await folder.save();

      return res.status(200).json({
        success: true,
        message: "Carpeta creada correctamente",
        content: folder,
      });
    } catch (error) {
      console.error("Error general:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async moveFolders(req: Request, res: Response) {
    const { folderIds, targetFolderId } = req.body;
    if (!folderIds) {
      return res.status(400).json({
        success: false,
        message: "carpetas a mover son requeridas",
        errors: [],
      });
    }
    try {
      await Promise.all(
        folderIds.map(async (folderId: String) => {
          try {
            const folder = await Folder.findById(folderId);

            if (!folder) {
              return {
                success: false,
                folderId,
                message: "Carpeta no encontrado",
                content: null,
              };
            }
            folder.directorioPadre =
              targetFolderId === "0" ? null : targetFolderId;
            await folder.save();

            return {
              success: true,
              message: "Carpeta movida correctamente",
              content: folder,
            };
          } catch (error) {
            return {
              success: false,
              message: "Error interno del servidor al mover carpeta",
              error:
                error instanceof Error
                  ? error.message
                  : "An unknown error occurred",
            };
          }
        }),
      );
      return res.status(200).json({
        success: true,
        message: "Carpetas procesadas correctamente",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor al mover carpetas",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async deleteFileById(id: string) {
    try {
      const archivo = await Archivo.findById(id);

      if (!archivo) return false;

      try {
        if (archivo.key) {
          const abs = path.resolve(LIB_DIR, archivo.key);
          const libNorm = path.normalize(LIB_DIR + path.sep);
          const absNorm = path.normalize(abs);
          if (absNorm.startsWith(libNorm) && fs.existsSync(absNorm)) {
            await fsp.unlink(absNorm);
          }
        }
      } catch (e) {
        console.warn("No se pudo eliminar el binario en disco:", e);
      }

      await Archivo.findByIdAndDelete(id);

      return true;
    } catch (error) {
      console.error(
        `Error en la función: ${this.constructor.name}\n Error general:${error}`,
      );
      return false;
    }
  }

  static async deleteFile(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id es requerido",
        errors: [],
      });
    }

    try {
      const archivo = await Archivo.findById(id);

      if (!archivo) {
        return res.status(404).json({
          success: false,
          message: "Archivo no encontrado",
          errors: [],
        });
      }
      await BibliotecaController.deleteFileById(id);
      return res.status(200).json({
        success: true,
        message: "Archivo eliminado correctamente",
        content: archivo,
      });
    } catch (error) {
      console.error("Error general:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async deleteFolder(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id es requerido",
        errors: [],
      });
    }

    try {
      const folder = await Folder.findById(id);
      const archivos: IArchivo[] = await Archivo.find({ folder: id });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: "Carpeta no encontrada",
          errors: [],
        });
      }
      await Folder.findByIdAndDelete(id);
      for (const archivo of archivos) {
        await BibliotecaController.deleteFileById(
          archivo._id?.toString() || "",
        );
      }
      return res.status(200).json({
        success: true,
        message: "Carpeta y archivos eliminados correctamente",
        content: folder,
      });
    } catch (error) {
      console.error("Error general:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async filterArchivo(req: Request, res: Response) {
    try {
      const { texto, tipoArchivo, autor, categoria } = req.query;

      const filtro: any = {};
      let carpetasCoincidentes: string | any[] = [];

      if (texto) {
        filtro.$or = [
          { nombre: { $regex: texto, $options: "i" } },
          { tipoArchivo: { $regex: texto, $options: "i" } },
        ];
        carpetasCoincidentes = await Folder.find({
          nombre: { $regex: texto as string, $options: "i" },
        });
      }

      if (tipoArchivo) {
        filtro.tipoArchivo = { $regex: tipoArchivo, $options: "i" };
      }

      if (autor) {
        if (!mongoose.Types.ObjectId.isValid(autor as string)) {
          res.status(400).json({ message: "ID de autor inválido" });
          return;
        }
        filtro.autor = autor;
      }

      if (categoria) {
        if (!mongoose.Types.ObjectId.isValid(categoria as string)) {
          res.status(400).json({ message: "ID de categoría inválido" });
          return;
        }
        filtro.categoria = categoria;
        carpetasCoincidentes = [];
      }

      filtro.estado = "aprobado";

      if (Object.keys(filtro).length === 1 && !texto) {
        res
          .status(400)
          .json({
            message: "Debe proporcionar al menos un parámetro de búsqueda",
          });
        return;
      }

      const archivos = await Archivo.find(filtro).populate("folder");

      if (archivos.length === 0 && carpetasCoincidentes.length === 0) {
        res
          .status(404)
          .json({ message: "No se encontraron resultados con esos criterios" });
        return;
      }

      res.status(200).json({
        carpetas: carpetasCoincidentes,
        archivos,
      });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ message: err.message });
    }
  }

  static async updateFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: Partial<IArchivo> = req.body;
      const resultado = await Archivo.findByIdAndUpdate(id, data, {
        new: true,
      });

      if (!resultado) {
        res.status(404).json({
          message: "No se pudo editar el archivo",
        });
        return;
      }
      res.status(200).json({
        resultado,
      });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({
        message: err.message,
      });
    }
  }

  static async downloadArchivo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const doc = await Archivo.findById(id);
      if (!doc) {
        res
          .status(404)
          .json({ success: false, message: "Archivo no encontrado" });
        return;
      }

      const abs = path.resolve(LIB_DIR, String(doc.key || ""));
      const libNorm = path.normalize(LIB_DIR + path.sep);
      const absNorm = path.normalize(abs);

      if (!absNorm.startsWith(libNorm)) {
        res.status(403).json({ success: false, message: "Ruta inválida" });
        return;
      }

      if (doc.tipoArchivo) res.setHeader("Content-Type", doc.tipoArchivo);
      // Evita que el navegador "adivine" otro tipo y ejecute contenido activo; aísla lo que se muestra inline
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Security-Policy",
        "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      );

      const wantsDownload = req.query.download === "1";
      const wantsInline = req.query.inline === "1";
      const isPreviewable =
        !!doc.tipoArchivo &&
        (doc.tipoArchivo.startsWith("image/") ||
          doc.tipoArchivo === "application/pdf");

      const disposition =
        wantsDownload || (!wantsInline && !isPreviewable)
          ? "attachment"
          : "inline";

      if (doc.nombre) {
        res.setHeader(
          "Content-Disposition",
          `${disposition}; filename="${encodeURIComponent(doc.nombre)}"`,
        );
      }

      const stream = fs.createReadStream(absNorm);
      stream.on("error", () =>
        res
          .status(404)
          .json({ success: false, message: "No se pudo abrir el archivo" }),
      );
      stream.pipe(res);
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  static async approveFile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "ID de archivo inválido",
        });
      }

      const archivo = await Archivo.findById(id);

      if (!archivo) {
        return res.status(404).json({
          success: false,
          message: "Archivo no encontrado",
        });
      }

      if (archivo.estado === "aprobado") {
        return res.status(400).json({
          success: false,
          message: "El archivo ya está aprobado",
        });
      }

      archivo.estado = "aprobado";
      archivo.esPublico = true;
      await archivo.save();

      try {
        await notificarPublicacionAutomatica({
          publicacionId: String(archivo._id),
          titulo: archivo.nombre,
          tagOrigen: "biblioteca",
        });
      } catch (notiError) {
        console.warn(
          "No se pudo notificar la aprobación del archivo de biblioteca:",
          notiError,
        );
      }

      return res.status(200).json({
        success: true,
        message: "Archivo aprobado correctamente",
        content: archivo,
      });
    } catch (error) {
      console.error("Error al aprobar archivo:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async rejectFile(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "ID de archivo inválido",
        });
      }

      const archivo = await Archivo.findById(id);

      if (!archivo) {
        return res.status(404).json({
          success: false,
          message: "Archivo no encontrado",
        });
      }

      if (archivo.estado === "rechazado") {
        return res.status(400).json({
          success: false,
          message: "El archivo ya está rechazado",
        });
      }

      archivo.estado = "rechazado";
      archivo.esPublico = false;
      await archivo.save();

      return res.status(200).json({
        success: true,
        message: "Archivo rechazado correctamente",
        content: archivo,
      });
    } catch (error) {
      console.error("Error al rechazar archivo:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  static async listPendingFiles(req: Request, res: Response) {
    try {
      const archivosPendientes = await Archivo.find({ estado: "pendiente" })
        .populate("autor", "nombre apellido email")
        .populate("uploadedBy", "nombre apellido email tipoUsuario")
        .sort({ fechaSubida: -1 });

      return res.status(200).json({
        success: true,
        count: archivosPendientes.length,
        archivos: archivosPendientes,
      });
    } catch (error) {
      console.error("Error al listar archivos pendientes:", error);
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }
}

export default BibliotecaController;
