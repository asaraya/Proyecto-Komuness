import { Request, Response } from 'express';
import { modelPerfil } from '../models/perfil.model';
import { modelUsuario } from '../models/usuario.model';
import { obtenerFaltantesBanco } from '../utils/perfilElegibilidad';
import fs from 'fs';
import path from 'path';

const PROFILE_DIR = process.env.PROFILE_LIB || '/srv/uploads/perfil';
const CSV_DIR = process.env.CSV_LIB || '/srv/uploads/csv';

const PERFIL_URL_PREFIX = '/perfil/';
const CSV_URL_PREFIX = '/csv/';

function resolveProfileFilePath(storedPath?: string | null): string | null {
  if (!storedPath) return null;

  // Nuevo esquema: URL pública /perfil/<archivo>
  if (storedPath.startsWith(PERFIL_URL_PREFIX)) {
    const fileName = storedPath.slice(PERFIL_URL_PREFIX.length);
    return path.join(PROFILE_DIR, fileName);
  }

  // Esquema legado: ruta absoluta bajo /tmp
  if (storedPath.startsWith('/tmp/')) {
    return storedPath;
  }

  // Si ya es absoluta, la usamos tal cual
  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }

  // Fallback: relativa al proyecto
  return path.join(__dirname, '..', storedPath);
}

function resolveCvFilePath(storedPath?: string | null): string | null {
  if (!storedPath) return null;

  // Nuevo esquema: URL pública /csv/<archivo>
  if (storedPath.startsWith(CSV_URL_PREFIX)) {
    const fileName = storedPath.slice(CSV_URL_PREFIX.length);
    return path.join(CSV_DIR, fileName);
  }

  // Esquema legado: ruta absoluta bajo /tmp
  if (storedPath.startsWith('/tmp/')) {
    return storedPath;
  }

  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }

  return path.join(__dirname, '..', storedPath);
}

/**
 * Obtener perfil público de un usuario por ID
 * @route GET /api/perfil/:id
 */
export const obtenerPerfilPublico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { modo } = req.query;

    const perfil = await modelPerfil.findOne({ usuarioId: id }).populate('usuarioId', 'nombre apellido email');

    if (!perfil) {
      res.status(404).json({ message: 'Perfil no encontrado' });
      return;
    }

    // Verificar si el perfil es público
    if (!perfil.perfilPublico) {
      res.status(403).json({ message: 'Este perfil no es público' });
      return;
    }

    // Si modo=basico, retornar solo información básica
    if (modo === 'basico') {
      const perfilBasico = {
        _id: perfil._id,
        usuarioId: perfil.usuarioId,
        nombre: perfil.nombre,
        apellidos: perfil.apellidos,
        fotoPerfil: perfil.fotoPerfil,
        ocupacionPrincipal: perfil.ocupacionPrincipal,
        especialidad: perfil.especialidad,
        provincia: perfil.provincia,
        canton: perfil.canton
      };
      res.status(200).json({ data: perfilBasico });
      return;
    }

    // Retornar perfil completo
    const perfilCompleto = perfil.toObject();

    res.status(200).json({ data: perfilCompleto });
  } catch (error) {
    console.error('Error en obtenerPerfilPublico:', error);
    res.status(500).json({
      message: 'Error al obtener el perfil',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener mi perfil completo (usuario autenticado)
 * @route GET /api/perfil/usuario/me
 */
export const obtenerMiPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    let perfil = await modelPerfil.findOne({ usuarioId: userId }).populate('usuarioId', 'nombre apellido email encuestaInicio.etiquetas');

    // Si no existe perfil, crear uno vacío
    if (!perfil) {
      const usuario = await modelUsuario.findById(userId);
      if (!usuario) {
        res.status(404).json({ message: 'Usuario no encontrado' });
        return;
      }

      perfil = await modelPerfil.create({
        usuarioId: userId,
        nombre: usuario.nombre,
        apellidos: usuario.apellido,
        formacionAcademica: [],
        experienciaLaboral: [],
        habilidades: [],
        etiquetas: [],
        proyectos: [],
        redesSociales: {}
      });
    }

    res.status(200).json({ data: perfil });
  } catch (error) {
    console.error('Error en obtenerMiPerfil:', error);
    res.status(500).json({
      message: 'Error al obtener el perfil',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear o actualizar perfil completo
 * @route POST /api/perfil
 */
export const crearOActualizarPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { etiquetas, ...datosActualizados } = req.body;

    console.log(etiquetas);
    // Verificar que el usuario existe
    const usuario = await modelUsuario.findById(userId);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    if (etiquetas !== undefined) {
      usuario.encuestaInicio = usuario.encuestaInicio || {};
      usuario.encuestaInicio.etiquetas = [];
      usuario.encuestaInicio.etiquetas = etiquetas;
      await usuario.save();
    }
    
    // Buscar perfil existente
    let perfil = await modelPerfil.findOne({ usuarioId: userId });

    const esAdmin = usuario.tipoUsuario === 0 || usuario.tipoUsuario === 1;
    const quiereEstarEnBanco = datosActualizados.enBancoProfesionales === true;

    // Si se intenta aparecer en el banco, validar elegibilidad en el servidor
    if (quiereEstarEnBanco) {
      const perfilResultante = {
        ...(perfil ? perfil.toObject() : {}),
        ...datosActualizados
      };

      if (!esAdmin) {
        const faltantes = obtenerFaltantesBanco(perfilResultante);
        if (faltantes.length > 0) {
          res.status(200).json({
            success: false,
            message: 'Debes completar tu perfil antes de unirte al banco',
            data: faltantes
          });
          return;
        }
      }

      // Un perfil dentro del banco debe ser público para poder listarse
      datosActualizados.perfilPublico = true;
    }

    if (perfil) {
      // Actualizar perfil existente
      Object.assign(perfil, datosActualizados);
      await perfil.save();
    } else {
      // Crear nuevo perfil
      perfil = await modelPerfil.create({
        usuarioId: userId,
        ...datosActualizados
      });
    }

    res.status(200).json({ 
      message: 'Perfil actualizado exitosamente',
      data: perfil 
    });
  } catch (error) {
    console.error('Error en crearOActualizarPerfil:', error);
    res.status(500).json({
      message: 'Error al actualizar el perfil',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Subir foto de perfil
 * @route PUT /api/perfil/foto
 */
export const subirFotoPerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    if (!req.file) {
      res.status(400).json({ message: 'No se proporcionó ninguna imagen' });
      return;
    }

    // Buscar o crear perfil
    let perfil = await modelPerfil.findOne({ usuarioId: userId });
    
    if (!perfil) {
      perfil = await modelPerfil.create({
        usuarioId: userId,
        formacionAcademica: [],
        experienciaLaboral: [],
        habilidades: [],
        proyectos: [],
        redesSociales: {}
      });
    }

    // Eliminar foto anterior si existe
    if (perfil.fotoPerfil) {
      const rutaAnterior = resolveProfileFilePath(perfil.fotoPerfil as unknown as string);
      if (rutaAnterior && fs.existsSync(rutaAnterior)) {
        fs.unlinkSync(rutaAnterior);
      }
    }

    // Guardar nueva ruta (URL relativa pública en prod, ruta "tmp" en dev)
    const isProd = process.env.NODE_ENV === 'production';
    const rutaRelativa = isProd
      ? `${PERFIL_URL_PREFIX}${req.file.filename}`
      : `/tmp/uploads/perfiles/fotos/${req.file.filename}`;

    perfil.fotoPerfil = rutaRelativa;
    await perfil.save();

    res.status(200).json({ 
      message: 'Foto de perfil actualizada exitosamente',
      fotoPerfil: rutaRelativa
    });
  } catch (error) {
    console.error('Error en subirFotoPerfil:', error);
    res.status(500).json({
      message: 'Error al subir la foto de perfil',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Subir CV
 * @route PUT /api/perfil/cv
 */
export const subirCV = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    if (!req.file) {
      res.status(400).json({ message: 'No se proporcionó ningún archivo' });
      return;
    }

    // Buscar o crear perfil
    let perfil = await modelPerfil.findOne({ usuarioId: userId });
    
    if (!perfil) {
      perfil = await modelPerfil.create({
        usuarioId: userId,
        formacionAcademica: [],
        experienciaLaboral: [],
        habilidades: [],
        proyectos: [],
        redesSociales: {}
      });
    }

    // Eliminar CV anterior si existe
    if (perfil.cvUrl) {
      const rutaAnterior = resolveCvFilePath(perfil.cvUrl as unknown as string);
      if (rutaAnterior && fs.existsSync(rutaAnterior)) {
        fs.unlinkSync(rutaAnterior);
      }
    }

    // Guardar nueva ruta (URL relativa pública en prod, ruta "tmp" en dev)
    const isProd = process.env.NODE_ENV === 'production';
    const rutaRelativa = isProd
      ? `${CSV_URL_PREFIX}${req.file.filename}`
      : `/tmp/uploads/perfiles/cvs/${req.file.filename}`;

    perfil.cvUrl = rutaRelativa;
    await perfil.save();

    res.status(200).json({ 
      message: 'CV subido exitosamente',
      cvUrl: rutaRelativa
    });
  } catch (error) {
    console.error('Error en subirCV:', error);
    res.status(500).json({
      message: 'Error al subir el CV',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Eliminar CV
 * @route DELETE /api/perfil/cv
 */
export const eliminarCV = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    const perfil = await modelPerfil.findOne({ usuarioId: userId });
    
    if (!perfil) {
      res.status(404).json({ message: 'Perfil no encontrado' });
      return;
    }

    if (!perfil.cvUrl) {
      res.status(404).json({ message: 'No hay CV para eliminar' });
      return;
    }

    // Eliminar archivo físico
    const rutaArchivo = resolveCvFilePath(perfil.cvUrl as unknown as string);
    if (rutaArchivo && fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo);
    }

    // Actualizar perfil
    perfil.cvUrl = undefined;
    await perfil.save();

    res.status(200).json({ message: 'CV eliminado exitosamente' });
  } catch (error) {
    console.error('Error en eliminarCV:', error);
    res.status(500).json({
      message: 'Error al eliminar el CV',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Actualizar correo principal del usuario
 * @route PUT /api/perfil/correo-principal
 */
export const actualizarCorreoPrincipal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'El correo es requerido' });
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Formato de correo inválido' });
      return;
    }

    // Verificar que el correo no esté en uso
    const emailExistente = await modelUsuario.findOne({ email, _id: { $ne: userId } });
    if (emailExistente) {
      res.status(400).json({ message: 'El correo ya está en uso por otro usuario' });
      return;
    }

    // Actualizar correo
    const usuario = await modelUsuario.findByIdAndUpdate(
      userId,
      { email },
      { new: true }
    );

    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ 
      message: 'Correo actualizado exitosamente',
      email: usuario.email
    });
  } catch (error) {
    console.error('Error en actualizarCorreoPrincipal:', error);
    res.status(500).json({
      message: 'Error al actualizar el correo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Obtener mi perfil completo (usuario autenticado)
 * @route GET /api/perfil/usuario/elegibilidad-banco
 */
export const validacionParaBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    let perfil = await modelPerfil.findOne({ usuarioId: userId }).select('nombre apellidos telefono canton provincia fotoPerfil ocupacionPrincipal formacionAcademica').lean();

    // Si no encuentra el perfil, retorna un error
    if (!perfil) {
      res.status(404).json({message: 'Este perfil público no existe'});
      return;
    }


    const faltantes = obtenerFaltantesBanco(perfil);

    if (perfil && faltantes.length > 0) {
      res.status(200).json({
        success: false,
        message: 'Debes completar tu perfil antes de unirte al banco',
        data: faltantes
      });
      return 
    }
      
    //En el caso de que sí pueda unirse, retorna con éxito
    res.status(200).json({ 
      success: true
    });

  } catch (error) {
    console.error('Error en obtenerMiPerfil:', error);
    res.status(500).json({
      message: 'Error al obtener el perfil',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};