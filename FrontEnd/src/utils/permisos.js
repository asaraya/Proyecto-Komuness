// UI65: misma regla que el backend (utils/cuentaRegresiva.ts): admins (0 y 1)
// siempre; el resto solo si administración le dio el permiso.
export function puedeGestionarCuentasRegresivas(user) {
  if (!user) return false;
  const rol = Number(user.tipoUsuario);
  return rol === 0 || rol === 1 || user.puedeCrearCuentaRegresiva === true;
}
