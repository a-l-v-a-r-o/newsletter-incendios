// middleware/requirePermiso.js
const { tienePermiso } = require('../utils/permisos');

module.exports = function requirePermiso(clave) {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.user) {
        return res.redirect('/login');
      }
      const ok = await tienePermiso(req.session.user, clave);
      if (!ok) {
        return res.status(403).render('403', { clave });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};