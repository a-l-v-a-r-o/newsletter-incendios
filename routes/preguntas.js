// routes/preguntas.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware: exige sesión iniciada
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

// Listado público de preguntas
router.get('/preguntas', async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT p.id, p.contenido, p.categoria, p.fecha,
             u.nombre AS autor,
             (SELECT COUNT(*) FROM respuesta r WHERE r.id_pregunta = p.id) AS n_respuestas
      FROM pregunta p
      JOIN usuario u ON u.id = p.id_autor_pregunta
      ORDER BY p.fecha DESC
    `);

    res.render('preguntas', {
      preguntas: result.rows,
      error: null,
      success: req.query.ok === '1',
      valores: {},
    });
  } catch (err) {
    next(err);
  }
});

// Formulario + envío (misma URL, GET muestra, POST inserta)
router.post('/preguntas', requireLogin, async (req, res, next) => {
  const { pregunta, categoria } = req.body;
  const valores = { pregunta, categoria };

  try {
    if (!pregunta || !pregunta.trim()) {
      const result = await db.execute(`
        SELECT p.id, p.contenido, p.categoria, p.fecha,
               u.nombre AS autor,
               (SELECT COUNT(*) FROM respuesta r WHERE r.id_pregunta = p.id) AS n_respuestas
        FROM pregunta p
        JOIN usuario u ON u.id = p.id_autor_pregunta
        ORDER BY p.fecha DESC
      `);
      return res.render('preguntas', {
        preguntas: result.rows,
        error: 'La pregunta no puede estar vacía',
        success: false,
        valores,
      });
    }

    await db.execute({
      sql: `INSERT INTO pregunta (contenido, id_autor_pregunta, categoria)
            VALUES (?, ?, ?)`,
      args: [
        pregunta.trim(),
        req.session.user.id,
        categoria && categoria.trim() ? categoria.trim() : null,
      ],
    });

    return res.redirect('/preguntas?ok=1');
  } catch (err) {
    next(err);
  }
});

// Detalle de una pregunta con sus respuestas
router.get('/pregunta/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const pregResult = await db.execute({
      sql: `SELECT p.id, p.contenido, p.categoria, p.fecha,
                   u.nombre AS autor
            FROM pregunta p
            JOIN usuario u ON u.id = p.id_autor_pregunta
            WHERE p.id = ?`,
      args: [id],
    });
    const pregunta = pregResult.rows[0];
    if (!pregunta) return res.status(404).send('Pregunta no encontrada');

    const respResult = await db.execute({
      sql: `SELECT r.id, r.contenido, r.fecha, u.nombre AS autor
            FROM respuesta r
            JOIN usuario u ON u.id = r.id_autor_respuesta
            WHERE r.id_pregunta = ?
            ORDER BY r.fecha ASC`,
      args: [id],
    });

    res.render('pregunta', {
      pregunta,
      respuestas: respResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;