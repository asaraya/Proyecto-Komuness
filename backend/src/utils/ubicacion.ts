import { IUbicacion } from '../interfaces/publicacion.interface';

export const UBICACION_DIRECCION_MAX = 500;

export type UbicacionResult =
  | { ok: true; ubicacion?: IUbicacion }
  | { ok: false; error: string };

// Valida y normaliza la ubicación de una publicación (evento o emprendimiento).
// El campo es opcional: si no viene (undefined, null o ""), devuelve ok sin ubicación.
// Si viene pero es inválida, devuelve el mensaje de error para responder 400.
export function validarUbicacion(input: any): UbicacionResult {
  if (input === undefined || input === null) return { ok: true };
  if (typeof input === 'string' && input.trim() === '') return { ok: true };

  let ubicacion: any = input;

  // Si es string (JSON de FormData), parsear
  if (typeof input === 'string') {
    try {
      ubicacion = JSON.parse(input);
    } catch {
      return { ok: false, error: 'La ubicación no tiene un formato JSON válido.' };
    }
  }

  if (!ubicacion || typeof ubicacion !== 'object' || Array.isArray(ubicacion)) {
    return {
      ok: false,
      error: 'La ubicación debe ser un objeto con latitude, longitude y direccion.',
    };
  }

  const lat = parseCoordenada(ubicacion.latitude);
  const lng = parseCoordenada(ubicacion.longitude);

  if (lat === undefined || lat < -90 || lat > 90) {
    return { ok: false, error: 'La latitud de la ubicación debe ser un número entre -90 y 90.' };
  }
  if (lng === undefined || lng < -180 || lng > 180) {
    return { ok: false, error: 'La longitud de la ubicación debe ser un número entre -180 y 180.' };
  }

  const dir = typeof ubicacion.direccion === 'string' ? ubicacion.direccion.trim() : '';
  if (dir.length === 0) {
    return { ok: false, error: 'La dirección de la ubicación es obligatoria.' };
  }
  if (dir.length > UBICACION_DIRECCION_MAX) {
    return {
      ok: false,
      error: `La dirección de la ubicación no puede superar ${UBICACION_DIRECCION_MAX} caracteres.`,
    };
  }

  return {
    ok: true,
    ubicacion: {
      latitude: lat,
      longitude: lng,
      direccion: dir,
      mapLink: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
    },
  };
}

// Number("") y Number(null) dan 0, por eso se descartan antes de convertir.
function parseCoordenada(input: any): number | undefined {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  if (typeof input === 'string' && input.trim() !== '') {
    const n = Number(input);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
