import { FilterQuery } from 'mongoose';
import { IPublicacion } from '../interfaces/publicacion.interface';

const PUBLICACION_DIAS_VIGENCIA = 15;
const EVENTO_DIAS_GRACIA = 7;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

type PublicacionExpirable = Partial<IPublicacion> & {
  createdAt?: string | Date;
  fechaExpiracion?: string | Date | null;
};

function startOfDay(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function endOfDay(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(23, 59, 59, 999);
  return copia;
}

function addDays(fecha: Date, dias: number): Date {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

export function parsePublicationDate(input?: string | Date | null): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input !== 'string') return null;

  const value = input.trim();
  if (!value) return null;

  if (value.includes('/')) {
    const [day, month, year] = value.split('/').map((part) => Number(part));
    if ([day, month, year].every(Number.isFinite)) {
      const parsed = new Date(year, month - 1, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  if (value.includes('-')) {
    const isoDate = value.split('T')[0];
    const [year, month, day] = isoDate.split('-').map((part) => Number(part));
    if ([day, month, year].every(Number.isFinite)) {
      const parsed = new Date(year, month - 1, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolvePublicationBaseDate(publicacion: PublicacionExpirable): Date {
  return (
    parsePublicationDate(publicacion.createdAt ?? null) ||
    parsePublicationDate(publicacion.fecha ?? null) ||
    new Date()
  );
}

export function calculatePublicationExpirationDate(publicacion: PublicacionExpirable): Date | null {
  if (publicacion.tag === 'emprendimiento') return null;

  if (publicacion.tag === 'evento') {
    const fechaEvento = parsePublicationDate(publicacion.fechaEvento ?? null);
    if (fechaEvento) {
      return endOfDay(addDays(startOfDay(fechaEvento), EVENTO_DIAS_GRACIA));
    }
  }

  const fechaBase = resolvePublicationBaseDate(publicacion);
  return endOfDay(addDays(startOfDay(fechaBase), PUBLICACION_DIAS_VIGENCIA - 1));
}

export function calculateRemainingDays(
  fechaExpiracion?: string | Date | null,
  referencia: Date = new Date()
): number | null {
  const parsed = parsePublicationDate(fechaExpiracion ?? null);
  if (!parsed) return null;

  const diff = Math.floor((startOfDay(parsed).getTime() - startOfDay(referencia).getTime()) / MS_POR_DIA) + 1;
  return Math.max(diff, 0);
}

export function buildActivePublicationQuery(
  referencia: Date = new Date()
): FilterQuery<IPublicacion> {
  return {
    $or: [
      { tag: 'emprendimiento' },
      { fechaExpiracion: { $gt: referencia } },
      { fechaExpiracion: { $exists: false } },
      { fechaExpiracion: null },
    ],
  };
}
