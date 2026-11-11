export interface PerfilElegibilidadBanco {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  canton?: string;
  provincia?: string;
  fotoPerfil?: string;
  ocupacionPrincipal?: string;
  formacionAcademica?: unknown[];
}

/**
 * Devuelve la lista de campos que le faltan a un perfil para poder
 * unirse al banco de profesionales.
 */
export const obtenerFaltantesBanco = (
  perfil?: PerfilElegibilidadBanco | null
): string[] => {
  const faltantes: string[] = [];

  if (!perfil?.nombre) faltantes.push('Nombre');
  if (!perfil?.apellidos) faltantes.push('Apellidos');
  if (!perfil?.telefono) faltantes.push('Teléfono');
  if (!perfil?.canton) faltantes.push('Cantón');
  if (!perfil?.provincia) faltantes.push('Provincia');
  if (!perfil?.fotoPerfil) faltantes.push('Foto de perfil');
  if (!perfil?.ocupacionPrincipal) faltantes.push('Ocupación principal');
  if (!perfil?.formacionAcademica?.length) faltantes.push('Formación académica');

  return faltantes;
};
