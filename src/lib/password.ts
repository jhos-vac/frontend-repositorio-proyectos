/**
 * Contraseña inicial de toda cuenta creada por el administrador (debe coincidir con
 * DEFAULT_USER_PASSWORD del backend). El usuario la cambia obligatoriamente al entrar.
 */
export const DEFAULT_PASSWORD = import.meta.env.VITE_DEFAULT_PASSWORD || "ITS_Semillero"
