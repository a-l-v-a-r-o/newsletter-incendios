// utils/permisos.js
const db = require('../database/db');

// Cache en memoria: { id_rol: Set(['noticia.crear', ...]) }
// Se rellena en la primera consulta y se refresca cada X segundos.
let cache = new Map();
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

async function cargarCache() {
  const result = await db.execute(`
    SELECT rp.id_rol, p.clave
    FROM rol_permiso rp
    JOIN permiso p ON p.id = rp.id_permiso
  `);
  const nuevo = new Map();
  for (const fila of result.rows) {
    const idRol = Number(fila.id_rol);
    if (!nuevo.has(idRol)) nuevo.set(idRol, new Set());
    nuevo.get(idRol).add(fila.clave);
  }
  cache = nuevo;
  cacheTimestamp = Date.now();
}

async function getPermisosDeRol(idRol) {
  if (Date.now() - cacheTimestamp > CACHE_TTL_MS) {
    await cargarCache();
  }
  return cache.get(Number(idRol)) || new Set();
}

async function tienePermiso(user, clave) {
  if (!user) return false;
  const permisos = await getPermisosDeRol(user.id_rol);
  return permisos.has(clave);
}

module.exports = { tienePermiso, getPermisosDeRol, cargarCache };