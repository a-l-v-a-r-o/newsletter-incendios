// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../database/db');

// Mostrar formulario
router.get('/login', (req, res, next) => {
  res.render('login', { error: null });
});

// Procesar login
router.post('/login', async (req, res, next) => {
  try {
  const { email, password } = req.body;

  const result = await db.execute({
      sql: 'SELECT * FROM usuario WHERE email = ?',
      args: [email],
    });
    const user = result.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('login', { error: 'Email o contraseña incorrectos' });
  }

  req.session.user = {
  id: Number(user.id),
  nombre: user.nombre,
  id_rol: Number(user.id_rol),
};

  return res.redirect('/');
  } catch (err) {
    next(err);
  }
});


router.get('/signin', (req, res) => {
  res.render('signin', { error: null, valores: {} });
});

router.post('/signin', async (req, res, next) => {
  const { nombre, email, password, password2 } = req.body;
  const valores = { nombre, email };

  try {
    // Validaciones básicas
    if (!nombre || !nombre.trim()) {
      return res.render('signin', { error: 'El nombre es obligatorio', valores });
    }
    if (!email || !email.trim()) {
      return res.render('signin', { error: 'El email es obligatorio', valores });
    }
    if (!password || password.length < 6) {
      return res.render('signin', { error: 'La contraseña debe tener al menos 6 caracteres', valores });
    }
    if (password !== password2) {
      return res.render('signin', { error: 'Las contraseñas no coinciden', valores });
    }

    // ¿Ya existe ese email?
    const existe = await db.execute({
      sql: 'SELECT id FROM usuario WHERE email = ?',
      args: [email.trim().toLowerCase()],
    });
    if (existe.rows.length > 0) {
      return res.render('signin', { error: 'Ya existe una cuenta con ese email', valores });
    }

    const rolResult = await db.execute({
  sql: 'SELECT id FROM rol WHERE nombre = ?',
  args: ['Usuario'],
});
const idRolUsuario = Number(rolResult.rows[0].id);
    // Crear usuario
    const hash = bcrypt.hashSync(password, 10);
    const insert = await db.execute({
      sql: `INSERT INTO usuario (nombre, email, password_hash, id_rol)
            VALUES (?, ?, ?, ?)`,
      args: [nombre.trim(), email.trim().toLowerCase(), hash, idRolUsuario],
    });

    // Iniciar sesión automáticamente tras el registro
    req.session.user = {
      id: Number(insert.lastInsertRowid),
      nombre: nombre.trim(),
      id_rol: idRolUsuario
    };

    return res.redirect('/');
  } catch (err) {
    next(err);
  }
});
// Logout
router.post('/logout', (req, res, next) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;