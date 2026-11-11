import mongoose from "mongoose";

const ROLES_ENCUESTA = ["comprador", "vendedor", "ambos"];

const normalizeString = (value: unknown, maxLength = 120): string => {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
};

const normalizeUbicacion = (input: any) => {
    if (!input || typeof input !== "object") return undefined;

    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    const direccion = normalizeString(input.direccion, 500);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return undefined;
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return undefined;

    return {
        latitude,
        longitude,
        direccion: direccion || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        mapLink: normalizeString(input.mapLink, 500) ||
            `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
    };
};

export const normalizeEncuestaInicio = (input: any) => {
    if (!input || typeof input !== "object") return undefined;

    const rol = ROLES_ENCUESTA.includes(String(input.rol))
        ? String(input.rol)
        : "comprador";
    const ubicacion = normalizeUbicacion(input.ubicacion);
    const queVende = normalizeString(input.queVende);
    const etiquetas = Array.isArray(input.etiquetas)
        ? input.etiquetas
            .map((id: unknown) => String(id || "").trim())
            .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        : [];
    const completada = Boolean(rol || ubicacion || queVende || etiquetas.length);

    return {
        rol,
        ubicacion,
        queVende,
        etiquetas,
        completada,
        completadaEn: completada ? new Date() : null
    };
};
