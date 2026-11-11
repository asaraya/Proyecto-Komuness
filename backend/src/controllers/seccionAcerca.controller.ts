import { Request, Response } from "express";
import { modelSeccionAcerca } from "../models/seccionAcerca.model";
import fs from 'fs';
import path from 'path';
import fsp from 'fs/promises';
import crypto from 'crypto';
import multer from 'multer';
import {
  imageFileFilter,
  MAX_IMAGE_MB,
  assertRealImages,
  cleanupFiles,
  ImageValidationError,
} from '../utils/imageUpload';

const ACERCADE_BASE_DIR = process.env.ACERCADE_LIB || '/srv/uploads/acercade';

const MAX_IMAGENES_PROYECTOS = parseInt(process.env.MAX_IMAGENES_PROYECTOS || '50', 10);
const MAX_IMAGENES_EQUIPO = parseInt(process.env.MAX_IMAGENES_EQUIPO || '50', 10);

/** Asegura subcarpeta por año/mes */
async function ensureAcercaDeDir(): Promise<string> {
  const now = new Date();
  const dir = path.join(
    ACERCADE_BASE_DIR,
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0')
  );
  await fsp.mkdir(dir, { recursive: true });
  await fsp.access(dir, fs.constants.W_OK);
  return dir;
}

/** Saca la key relativa de una URL /acercade/..., o null si no es válida */
function keyFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.pathname.startsWith('/acercade/')) return null;
    return decodeURIComponent(u.pathname.slice('/acercade/'.length));
  } catch {
    return null;
  }
}

/** Borra del disco la imagen de una URL, solo si está dentro de ACERCADE_BASE_DIR */
async function deleteFromDisk(url?: string): Promise<void> {
  const key = keyFromUrl(url);
  if (!key) return;
  const abs = path.normalize(path.resolve(ACERCADE_BASE_DIR, key));
  const base = path.normalize(ACERCADE_BASE_DIR + path.sep);
  if (!abs.startsWith(base)) return;
  await fsp.unlink(abs).catch(() => {});
}

export const uploadAcercaDe = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        cb(null, await ensureAcercaDeDir());
      } catch (err) {
        console.error('Multer - Error en destino:', err);
        cb(err as Error, ACERCADE_BASE_DIR);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  fileFilter: imageFileFilter,                         // solo JPG, PNG, WEBP
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: 1 },
});

/**
 * Obtener la sección acerca de (solo activa)
 */
export const getSeccionAcerca = async (req: Request, res: Response): Promise<void> => {
  try {
    let seccion = await modelSeccionAcerca.findOne({ estado: true });

    if (!seccion) {
      const seccionDefault = new modelSeccionAcerca({
        titulo: "COOPESINERGIA R.L. - Tejiendo Futuro en Comunidad",
        contenido: "Coopesinergia R.L. es una cooperativa autogestionaria de carácter cultural y comunitario que ejecuta proyectos para el desarrollo humano. Actualmente estamos trabajando en Tejarcillos de Alajuelita, un territorio marcado por la migración, la pobreza y el abandono institucional, pero con una enorme riqueza humana, creativa y solidaria. Desde este contexto, el proyecto Komuness surge como una respuesta colectiva, diseñada y impulsada en conjunto con los líderes juveniles y las familias, para crear espacios dignos, seguros y significativos para la niñez, adolescencia y juventudes, donde el arte, la educación y la cooperación sean motores de transformación social.",
        historia: "Nuestra historia...",
        mision: "Nuestra misión...",
        vision: "Nuestra visión...",
        queHacemos: "Nuestro trabajo parte del convencimiento de que el arte no es un lujo, sino una herramienta vital para la reconstrucción del tejido social, la afirmación de la identidad y la generación de bienestar integral. En Tejarcillos, la cultura es raíz, refugio y resistencia.",
        motivacion: "Nace de la certeza de que la ternura y la acción colectiva pueden transformar la exclusión en memoria de superación y la precariedad en esperanza y oportunidades.",
        impacto: "Cada clase, mural o comida compartida es un acto de dignidad. Estos espacios ya están dando frutos tangibles...",
        uneteCausa: "Te invitamos a ser parte de esta transformación colectiva. Tu apoyo puede tomar muchas formas...",
        informacionDonaciones: {
          cuentaBancaria: "0005964154",
          iban: "CR86016111084159641540",
          nombreCuenta: "Coopesinergia",
          cedulaJuridica: "3-002-639930",
          emailFinanzas: "coopesinergiafinanzas@gmail.com",
          donacionesEspecie: [
            "Alimentos en buen estado para el comedor",
            "Materiales para nuestros procesos creativos",
            "Ropa nueva o usada en buen estado"
          ]
        },
        contactos: {
          telefono: "85690514",
          email: "komunesscr@gmail.com",
          facebook: "https://www.facebook.com/komuness",
          instagram: "https://www.instagram.com/komunesscr/"
        },
        equipo: [],
        imagenesProyectos: [],
        imagenesEquipo: []
      });

      const saved = await seccionDefault.save();
      res.json(saved);
      return;
    }

    // Si el documento existe pero le faltan campos nuevos, completarlos
    if (!seccion.queHacemos) {
      seccion.queHacemos = "Nuestro trabajo parte del convencimiento de que el arte no es un lujo, sino una herramienta vital para la reconstrucción del tejido social, la afirmación de la identidad y la generación de bienestar integral. En Tejarcillos, la cultura es raíz, refugio y resistencia.";
    }
    if (!seccion.motivacion) {
      seccion.motivacion = "Nace de la certeza de que la ternura y la acción colectiva pueden transformar la exclusión en memoria de superación y la precariedad en esperanza y oportunidades.";
    }
    if (!seccion.impacto) {
      seccion.impacto = "Cada clase, mural o comida compartida es un acto de dignidad. Estos espacios ya están dando frutos tangibles...";
    }
    if (!seccion.uneteCausa) {
      seccion.uneteCausa = "Te invitamos a ser parte de esta transformación colectiva. Tu apoyo puede tomar muchas formas...";
    }
    if (!seccion.informacionDonaciones) {
      seccion.informacionDonaciones = {
        cuentaBancaria: "0005964154",
        iban: "CR86016111084159641540",
        nombreCuenta: "Coopesinergia",
        cedulaJuridica: "3-002-639930",
        emailFinanzas: "coopesinergiafinanzas@gmail.com",
        donacionesEspecie: [
          "Alimentos en buen estado para el comedor",
          "Materiales para nuestros procesos creativos",
          "Ropa nueva o usada en buen estado"
        ]
      };
    }

    await seccion.save();
    res.json(seccion);
  } catch (error) {
    console.error('Error en getSeccionAcerca:', error);
    res.status(500).json({ message: "Error al obtener la sección acerca de" });
  }
};

/**
 * Crear o actualizar sección acerca de
 */
export const createOrUpdateSeccionAcerca = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      titulo,
      contenido,
      historia,
      mision,
      vision,
      queHacemos,
      motivacion,
      impacto,
      uneteCausa,
      informacionDonaciones,
      contactos,
      equipo,
      imagenesProyectos
    } = req.body;

    if (!titulo && !contenido) {
      res.status(400).json({ message: "Datos incompletos" });
      return;
    }

    const seccion = await modelSeccionAcerca.findOne({ estado: true });

    if (seccion) {
      // imagenesProyectos solo se acepta como un REORDENAMIENTO de las
      // imágenes que ya existen (mismas URLs, distinto orden). Subir y borrar
      // imágenes sigue pasando por /upload y /imagen, que validan archivos.
      let imagenesOrdenadas: string[] | undefined;
      if (imagenesProyectos !== undefined) {
        const actuales: string[] = (seccion.imagenesProyectos || []).map(String);
        const esReordenamiento =
          Array.isArray(imagenesProyectos) &&
          imagenesProyectos.every((img: unknown) => typeof img === 'string') &&
          imagenesProyectos.length === actuales.length &&
          [...imagenesProyectos].sort().join('\n') === [...actuales].sort().join('\n');

        if (!esReordenamiento) {
          res.status(409).json({
            message:
              "La lista de imágenes del carrusel cambió mientras editabas. Recarga la página e inténtalo de nuevo."
          });
          return;
        }
        imagenesOrdenadas = imagenesProyectos as string[];
      }

      const updateData = {
        titulo: titulo !== undefined ? titulo : seccion.titulo,
        contenido: contenido !== undefined ? contenido : seccion.contenido,
        historia: historia !== undefined ? historia : seccion.historia,
        mision: mision !== undefined ? mision : seccion.mision,
        vision: vision !== undefined ? vision : seccion.vision,
        queHacemos: queHacemos !== undefined ? queHacemos : seccion.queHacemos,
        motivacion: motivacion !== undefined ? motivacion : seccion.motivacion,
        impacto: impacto !== undefined ? impacto : seccion.impacto,
        uneteCausa: uneteCausa !== undefined ? uneteCausa : seccion.uneteCausa,
        informacionDonaciones: informacionDonaciones !== undefined ? informacionDonaciones : seccion.informacionDonaciones,
        contactos: contactos !== undefined ? contactos : seccion.contactos,
        equipo: equipo !== undefined ? equipo : seccion.equipo,
        imagenesProyectos: imagenesOrdenadas !== undefined ? imagenesOrdenadas : seccion.imagenesProyectos
      };

      const updated = await modelSeccionAcerca.findOneAndUpdate(
        { estado: true },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({ message: "No se encontró la sección para actualizar" });
        return;
      }

      res.json(updated);
    } else {
      const nuevaSeccion = new modelSeccionAcerca({
        titulo: titulo || "Título por defecto",
        contenido: contenido || "Contenido por defecto",
        historia: historia || "Historia por defecto",
        mision: mision || "Misión por defecto",
        vision: vision || "Visión por defecto",
        queHacemos: queHacemos || "Qué hacemos por defecto",
        motivacion: motivacion || "Motivación por defecto",
        impacto: impacto || "Impacto por defecto",
        uneteCausa: uneteCausa || "Únete a nuestra causa por defecto",
        informacionDonaciones: informacionDonaciones || {
          cuentaBancaria: "0005964154",
          iban: "CR86016111084159641540",
          nombreCuenta: "Coopesinergia",
          cedulaJuridica: "3-002-639930",
          emailFinanzas: "coopesinergiafinanzas@gmail.com",
          donacionesEspecie: []
        },
        contactos: contactos || {
          telefono: "85690514",
          email: "komunesscr@gmail.com",
          facebook: "",
          instagram: ""
        },
        equipo: equipo || [],
        imagenesProyectos: [],
        imagenesEquipo: []
      });

      const saved = await nuevaSeccion.save();
      res.status(201).json(saved);
    }
  } catch (error: unknown) {
    console.error('Error en createOrUpdateSeccionAcerca:', error);

    let errorMessage = "Error al guardar la sección acerca de";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    res.status(500).json({
      message: "Error al guardar la sección acerca de",
      error: errorMessage
    });
  }
};









export const uploadImagen = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  try {
    if (!file) {
      res.status(400).json({ message: "No se subió ningún archivo" });
      return;
    }

    const { tipo } = req.body;
    if (!['proyectos', 'equipo'].includes(tipo)) {
      await cleanupFiles([file]);
      res.status(400).json({ message: "Tipo debe ser 'proyectos' o 'equipo'" });
      return;
    }

    await assertRealImages([file]);

    const seccion = await modelSeccionAcerca.findOne({ estado: true });
    if (!seccion) {
      await cleanupFiles([file]);
      res.status(404).json({ message: "No se encontró la sección acerca de" });
      return;
    }

    const lista = tipo === 'proyectos' ? seccion.imagenesProyectos : seccion.imagenesEquipo;
    const max = tipo === 'proyectos' ? MAX_IMAGENES_PROYECTOS : MAX_IMAGENES_EQUIPO;
    if (lista.length >= max) {
      await cleanupFiles([file]);
      res.status(400).json({ message: `Máximo ${max} imágenes para ${tipo}` });
      return;
    }

    const relKey = path.relative(ACERCADE_BASE_DIR, file.path).split(path.sep).join('/');
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'https://komuness.duckdns.org';
    const imagenUrl = `${publicBaseUrl}/acercade/${relKey}`;

    lista.push(imagenUrl);
    await seccion.save();

    res.json({ message: "Imagen subida exitosamente", path: imagenUrl, key: relKey });
  } catch (error) {
    await cleanupFiles(file ? [file] : []);
    if (error instanceof ImageValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('ERROR en uploadImagen:', error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al subir imagen",
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteImagen = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, imagenPath } = req.body;

    if (!['proyectos', 'equipo'].includes(tipo)) {
      res.status(400).json({ message: "Tipo debe ser 'proyectos' o 'equipo'" });
      return;
    }
    if (typeof imagenPath !== 'string' || !imagenPath) {
      res.status(400).json({ message: "imagenPath es requerido" });
      return;
    }

    const seccion = await modelSeccionAcerca.findOne({ estado: true });
    if (!seccion) {
      res.status(404).json({ message: "No se encontró la sección acerca de" });
      return;
    }

    const lista = tipo === 'proyectos' ? seccion.imagenesProyectos : seccion.imagenesEquipo;
    if (!lista.includes(imagenPath)) {
      res.status(404).json({ message: "La imagen no pertenece a esta sección" });
      return;
    }

    if (tipo === 'proyectos') {
      seccion.imagenesProyectos = seccion.imagenesProyectos.filter(img => img !== imagenPath);
    } else {
      seccion.imagenesEquipo = seccion.imagenesEquipo.filter(img => img !== imagenPath);
    }
    await seccion.save();

    // Solo después de guardar en BD se borra del disco
    await deleteFromDisk(imagenPath);

    res.json({ message: "Imagen eliminada exitosamente" });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ message: "Error al eliminar imagen" });
  }
};

export const downloadImagen = async (req: Request, res: Response): Promise<void> => {
  try {
    const key = req.params[0] || req.params.key;
    if (!key) {
      res.status(400).json({ success: false, message: 'Ruta requerida' });
      return;
    }

    const absNorm = path.normalize(path.resolve(ACERCADE_BASE_DIR, key));
    const base = path.normalize(ACERCADE_BASE_DIR + path.sep);

    if (!absNorm.startsWith(base)) {
      res.status(403).json({ success: false, message: 'Ruta inválida' });
      return;
    }

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[path.extname(absNorm).toLowerCase()];
    if (!contentType || !fs.existsSync(absNorm)) {
      res.status(404).json({ success: false, message: 'Imagen no encontrada' });
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');

    const stream = fs.createReadStream(absNorm);
    stream.on('error', (error) => {
      console.error('Error al leer archivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error al leer la imagen' });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Error en downloadImagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: (error as Error).message
    });
  }
};

export const uploadImagenMiembro = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  try {
    if (!file) {
      res.status(400).json({ message: "No se subió ningún archivo" });
      return;
    }

    const idx = Number(req.body.miembroIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      await cleanupFiles([file]);
      res.status(400).json({ message: "miembroIndex inválido" });
      return;
    }

    await assertRealImages([file]);

    const seccion = await modelSeccionAcerca.findOne({ estado: true });
    if (!seccion) {
      await cleanupFiles([file]);
      res.status(404).json({ message: "No se encontró la sección acerca de" });
      return;
    }

    if (!seccion.equipo[idx]) {
      await cleanupFiles([file]);
      res.status(400).json({ message: "Miembro del equipo no encontrado" });
      return;
    }

    const relKey = path.relative(ACERCADE_BASE_DIR, file.path).split(path.sep).join('/');
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'https://komuness.duckdns.org';
    const imagenUrl = `${publicBaseUrl}/acercade/${relKey}`;

    const imagenAnterior = seccion.equipo[idx].imagen;
    seccion.equipo[idx].imagen = imagenUrl;
    await seccion.save();

    // La foto anterior ya no se usa: se borra del disco
    await deleteFromDisk(imagenAnterior);

    res.json({ message: "Imagen de perfil subida exitosamente", path: imagenUrl, key: relKey });
  } catch (error) {
    await cleanupFiles(file ? [file] : []);
    if (error instanceof ImageValidationError) {
      res.status(400).json({ message: error.message });
      return;
    }
    console.error('Error al subir imagen de miembro:', error);
    res.status(500).json({ message: "Error al subir imagen de perfil" });
  }
};

export const deleteImagenMiembro = async (req: Request, res: Response): Promise<void> => {
  try {
    const idx = Number(req.body.miembroIndex);
    if (!Number.isInteger(idx) || idx < 0) {
      res.status(400).json({ message: "miembroIndex inválido" });
      return;
    }

    const seccion = await modelSeccionAcerca.findOne({ estado: true });
    if (!seccion) {
      res.status(404).json({ message: "No se encontró la sección acerca de" });
      return;
    }

    if (!seccion.equipo[idx]) {
      res.status(400).json({ message: "Miembro del equipo no encontrado" });
      return;
    }

    // Se usa la imagen guardada en BD, no la que manda el cliente
    const imagenActual = seccion.equipo[idx].imagen;
    seccion.equipo[idx].imagen = undefined;
    await seccion.save();

    await deleteFromDisk(imagenActual);

    res.json({ message: "Imagen de perfil eliminada exitosamente" });
  } catch (error) {
    console.error('Error al eliminar imagen de miembro:', error);
    res.status(500).json({ message: "Error al eliminar imagen de perfil" });
  }
};