import { modelPublicacion } from '../models/publicacion.model';
import { IAdjunto } from '../interfaces/publicacion.interface';
import { calculatePublicationExpirationDate } from '../utils/publicacionExpiration';
import { deleteGridFSFile } from '../utils/gridfs';
import { createNotificacion as createNotificacionService } from './notificacion.service';

const DEFAULT_JOB_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_REMINDER_DAYS_BEFORE = 3;

let expirationJobStarted = false;

export async function syncMissingPublicationExpirations(): Promise<number> {
  const publicaciones = await modelPublicacion.find({
    tag: { $in: ['publicacion', 'evento'] },
    $or: [{ fechaExpiracion: { $exists: false } }, { fechaExpiracion: null }],
  });

  let updatedCount = 0;

  for (const publicacion of publicaciones) {
    const fechaExpiracion = calculatePublicationExpirationDate(publicacion);
    if (!fechaExpiracion) continue;

    publicacion.fechaExpiracion = fechaExpiracion;
    await publicacion.save();
    updatedCount += 1;
  }

  return updatedCount;
}

export async function enviarRecordatoriosExpiracion(referencia: Date = new Date()): Promise<number> {
  const diasAntes = Number(process.env.RECORDATORIO_DIAS_ANTES || DEFAULT_REMINDER_DAYS_BEFORE);

  const limiteSuperior = new Date(referencia);
  limiteSuperior.setDate(limiteSuperior.getDate() + diasAntes);

  const publicacionesPorVencer = await modelPublicacion.find({
    tag: { $in: ['publicacion', 'evento'] },
    fechaExpiracion: { $gt: referencia, $lte: limiteSuperior },
    recordatorioEnviado: { $ne: true },
  });

  let enviados = 0;

  for (const publicacion of publicacionesPorVencer) {
    try {
      await createNotificacionService({
        nombre: 'Tu publicación está por vencer',
        descripcion: `"${publicacion.titulo}" vencerá pronto. Revisa si deseas renovarla o editarla.`,
        recipientes: [publicacion.autor.toString()],
        publicacionId: publicacion._id.toString(),
        tipo: 'recordatorio',
      });

      await modelPublicacion.updateOne(
        { _id: publicacion._id },
        { recordatorioEnviado: true }
      );

      enviados += 1;
    } catch (error) {
      console.warn('[Publicaciones][recordatorio] No se pudo notificar:', publicacion._id, error);
    }
  }

  return enviados;
}

export async function purgeExpiredPublicaciones(referencia: Date = new Date()): Promise<number> {
  const publicacionesCaducadas = await modelPublicacion.find({
    tag: { $in: ['publicacion', 'evento'] },
    fechaExpiracion: { $lte: referencia },
  });

  for (const publicacion of publicacionesCaducadas) {
    const adjuntos = (publicacion.adjunto || []) as IAdjunto[];

    for (const adjunto of adjuntos) {
      if (!adjunto?.key) continue;

      try {
        await deleteGridFSFile(adjunto.key);
      } catch (error) {
        console.warn('[Publicaciones][expiracion] No se pudo borrar adjunto expirado:', adjunto.key, error);
      }
    }

    await modelPublicacion.deleteOne({ _id: publicacion._id });
  }

  return publicacionesCaducadas.length;
}

export async function runPublicationExpirationMaintenance(): Promise<void> {
  try {
    await syncMissingPublicationExpirations();
  } catch (error) {
    console.error('[Publicaciones][expiracion] Error en sincronización:', error);
  }

  try {
    await enviarRecordatoriosExpiracion();
  } catch (error) {
    console.error('[Publicaciones][recordatorio] Error al enviar recordatorios:', error);
  }

  try {
    await purgeExpiredPublicaciones();
  } catch (error) {
    console.error('[Publicaciones][expiracion] Error al purgar vencidas:', error);
  }
}

export function startPublicationExpirationJob(): void {
  if (expirationJobStarted) return;
  expirationJobStarted = true;

  void runPublicationExpirationMaintenance().catch((error) => {
    console.error('[Publicaciones][expiracion] Error inicial de mantenimiento:', error);
  });

  const intervalMs = Number(process.env.PUBLICACION_EXPIRATION_JOB_MS || DEFAULT_JOB_INTERVAL_MS);
  const timer = setInterval(() => {
    void runPublicationExpirationMaintenance().catch((error) => {
      console.error('[Publicaciones][expiracion] Error en mantenimiento programado:', error);
    });
  }, intervalMs);

  timer.unref?.();
}