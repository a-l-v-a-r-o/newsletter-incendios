// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database/db');
const { cargarCache } = require('./utils/permisos');


const noticiasRouter = require('./routes/noticias');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const preguntasRouter = require('./routes/preguntas');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 día
}));

// Pasar el usuario logueado a TODAS las vistas
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  if (req.session.user) {
    try {
      const { getPermisosDeRol } = require('./utils/permisos');
      const permisos = await getPermisosDeRol(req.session.user.id_rol);
      res.locals.permisos = permisos;             // Set de claves
      res.locals.puede = (clave) => permisos.has(clave);
    } catch {
      res.locals.permisos = new Set();
      res.locals.puede = () => false;
    }
  } else {
    res.locals.permisos = new Set();
    res.locals.puede = () => false;
  }
  next();
});

app.use('/', noticiasRouter);
app.use('/', authRouter);
app.use('/admin', adminRouter);
app.use('/', preguntasRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno del servidor');
});

app.use((req, res, next) => {
  res.locals.query = req.query;
  next();
});

(async () => {
  try {
    await cargarCache();
  } catch (err) {
    console.error('Error precargando permisos:', err);
  }

  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
})();
