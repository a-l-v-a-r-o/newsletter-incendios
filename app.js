// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const db = require('./database/db');
const { cargarCache } = require('./utils/permisos');
const pkg = require('./package.json');
const noticiasRouter = require('./routes/noticias');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const preguntasRouter = require('./routes/preguntas');
const legalRouter = require('./routes/legal');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true,  sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }, // 1 día
}));

app.use(helmet());
app.use(compression());

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

// Variables globales para todas las vistas
app.use((req, res, next) => {
  res.locals.version = pkg.version;
  res.locals.contactoEmail = 'alvaropherez01@gmail.com';
  res.locals.lastUpdate = '25 de septiembre de 2026'; // actualízalo cuando cambies textos legales
  next();
});
app.use('/', legalRouter);
app.use('/', noticiasRouter);
app.use('/', authRouter);
app.use('/admin', adminRouter);
app.use('/', preguntasRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;
  res.status(status).send(message);
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
    if (PORT === 3000) {
      console.log(`Servidor en http://localhost:${PORT}`);
    } else {
    console.log(`${PORT}`);
    }
  });
})();
