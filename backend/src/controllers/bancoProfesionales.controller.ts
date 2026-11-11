import { Request, Response } from 'express';
import { modelPerfil } from '../models/perfil.model';
import { modelUsuario } from '../models/usuario.model';
import { obtenerFaltantesBanco } from '../utils/perfilElegibilidad';

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Clases de caracteres que incluyen la letra con y sin acento (mayúscula y minúscula)
const ACCENT_CLASSES: Record<string, string> = {
  a: '[aáàäâAÁÀÄÂ]',
  e: '[eéèëêEÉÈËÊ]',
  i: '[iíìïîIÍÌÏÎ]',
  o: '[oóòöôOÓÒÖÔ]',
  u: '[uúùüûUÚÙÜÛ]',
  n: '[nñNÑ]',
  c: '[cçCÇ]'
};

const sinAcento = (char: string): string =>
  char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Construye un patrón de regex que ignora mayúsculas y acentos y escapa
 * los caracteres especiales para evitar regex inválidas o ReDoS.
 */
const patronInsensibleAcentos = (value: string): string =>
  value
    .trim()
    .split('')
    .map((char) => ACCENT_CLASSES[sinAcento(char)] || escapeRegExp(char))
    .join('');

/**
 * Obtener listado de profesionales aprobados para el banco
 * @route GET /api/banco-profesionales
 */
export const obtenerProfesionales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, provincia, canton, page = 1, limit = 12 } = req.query;

    // Construir query base - solo perfiles que están en el banco y son públicos
    const query: any = {
      enBancoProfesionales: true,
      perfilPublico: true
    };

    // Búsqueda por nombre si se proporciona
    if (search && typeof search === 'string') {
      const searchPattern = patronInsensibleAcentos(search);
      query.$or = [
        { nombre: { $regex: searchPattern, $options: 'i' } },
        { apellidos: { $regex: searchPattern, $options: 'i' } },
        { ocupacionPrincipal: { $regex: searchPattern, $options: 'i' } },
        { especialidad: { $regex: searchPattern, $options: 'i' } }
      ];
    }

    // Filtro por provincia (coincidencia exacta, insensible a mayúsculas y acentos)
    if (provincia && typeof provincia === 'string' && provincia.trim() !== '') {
      query.provincia = { $regex: `^${patronInsensibleAcentos(provincia)}$`, $options: 'i' };
    }

    // Filtro por cantón/zona (coincidencia parcial, insensible a mayúsculas y acentos)
    if (canton && typeof canton === 'string' && canton.trim() !== '') {
      query.canton = { $regex: patronInsensibleAcentos(canton), $options: 'i' };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Obtener profesionales con paginación - INCLUIR fotoPerfil
    const profesionales = await modelPerfil
      .find(query)
      .populate('usuarioId', 'nombre apellido email tipoUsuario')
      .select('nombre apellidos ocupacionPrincipal especialidad provincia canton fotoPerfil usuarioId enBancoProfesionales perfilPublico') // INCLUIR fotoPerfil explícitamente
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Contar total para paginación
    const total = await modelPerfil.countDocuments(query);

    res.status(200).json({
      success: true,
      data: profesionales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error en obtenerProfesionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los profesionales',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * ver si un usuario es profesional
 * @route GET /api/banco-profesionales/es-profesional/:id
 */
export const esProfesional = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const perfil = await modelPerfil.findOne({ 
      usuarioId: id,
      enBancoProfesionales: true,
      perfilPublico: true
    });

    res.status(200).json({
      success: true,
      esProfesional: !!perfil
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al verificar profesional' });
  }
};

/**
 * Unirse/Retirarse del banco de profesionales
 * @route PUT /api/banco-profesionales/toggle
 */
export const toggleBancoProfesionales = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user._id;
    const esAdmin = user?.tipoUsuario === 0 || user?.tipoUsuario === 1;

    const perfil = await modelPerfil.findOne({ usuarioId: userId });
    
    if (!perfil) {
      res.status(404).json({
        success: false,
        message: 'Perfil no encontrado'
      });
      return;
    }

    const quiereUnirse = !perfil.enBancoProfesionales;

    // Validación de elegibilidad en el servidor (no confiar solo en el frontend)
    if (quiereUnirse && !esAdmin) {
      const faltantes = obtenerFaltantesBanco(perfil);
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
    if (quiereUnirse) {
      perfil.perfilPublico = true;
    }

    // Toggle del estado
    perfil.enBancoProfesionales = !perfil.enBancoProfesionales;
    await perfil.save();

    res.status(200).json({
      success: true,
      message: perfil.enBancoProfesionales 
        ? 'Te has unido al banco de profesionales' 
        : 'Te has retirado del banco de profesionales',
      data: {
        enBancoProfesionales: perfil.enBancoProfesionales,
        perfilPublico: perfil.perfilPublico
      }
    });
  } catch (error) {
    console.error('Error en toggleBancoProfesionales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Quitar usuario del banco de profesionales (solo administradores)
 * @route PUT /api/banco-profesionales/:id/quitar
 */
export const quitarDelBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // ID del perfil

    // Verificar que el usuario que hace la solicitud es admin
    const adminUserId = (req as any).user._id;
    const adminUser = await modelUsuario.findById(adminUserId);
    
    if (!adminUser || (adminUser.tipoUsuario !== 0 && adminUser.tipoUsuario !== 1)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
      return;
    }

    // Buscar el perfil por ID
    const perfil = await modelPerfil.findById(id);
    
    if (!perfil) {
      res.status(404).json({
        success: false,
        message: 'Perfil no encontrado'
      });
      return;
    }


    // Si ya no está en el banco, retornar mensaje apropiado
    if (!perfil.enBancoProfesionales) {
      res.status(200).json({
        success: true,
        message: 'El usuario ya no está en el banco de profesionales',
        data: perfil
      });
      return;
    }

    // Quitar del banco
    perfil.enBancoProfesionales = false;
    await perfil.save();

    console.log('Perfil actualizado exitosamente');

    res.status(200).json({
      success: true,
      message: 'Usuario retirado del banco de profesionales exitosamente',
      data: perfil
    });
  } catch (error) {
    console.error('Error detallado en quitarDelBanco:', error);
    res.status(500).json({
      success: false,
      message: 'Error al retirar del banco',
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};

/**
 * Obtener estado actual del usuario en el banco de profesionales
 * @route GET /api/banco-profesionales/estado
 */
export const obtenerEstadoBanco = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;

    const perfil = await modelPerfil.findOne({ usuarioId: userId });
    
    if (!perfil) {
      res.status(200).json({
        success: false,
        data: {
          enBancoProfesionales: false,
          perfilPublico: false
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        enBancoProfesionales: perfil.enBancoProfesionales,
        perfilPublico: perfil.perfilPublico
      }
    });
  } catch (error) {
    console.error('Error en obtenerEstadoBanco:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el estado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
