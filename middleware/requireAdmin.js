// middleware/requireAdmin.js

//redirige a requiere permisos
module.exports = require('./requirePermiso')('usuario.gestionar');

 /*module.exports = function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.rango === 'admin') {
    return next();
  }
  return res.redirect('/login');
};  */