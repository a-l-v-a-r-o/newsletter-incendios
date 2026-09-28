// routes/noticias.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { tienePermiso } = require('../utils/permisos');

router.get('/', async (req, res) => {
  const result = await db.execute(
    'SELECT id, titulo, contenido, enlace, imagen, fecha FROM noticia ORDER BY fecha DESC'
  );
  const noticias = result.rows;

  // Adjuntar categorías a cada noticia
  for (const n of noticias) {
    const catResult = await db.execute({
      sql: `SELECT c.nombre FROM categoria c
            JOIN noticia_categoria nc ON nc.id_categoria = c.id
            WHERE nc.id_noticia = ?`,
      args: [n.id],
    });
    n.categorias = catResult.rows.map(c => c.nombre);
  }

  res.render('index', { noticias });
});

router.get('/noticia/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const result = await db.execute({
    sql: 'SELECT id, titulo, contenido, enlace, imagen, fecha FROM noticia WHERE id = ?',
    args: [id],
  });

  const noticia = result.rows[0];
  if (!noticia) return res.status(404).send('Noticia no encontrada');

  const catResult = await db.execute({
    sql: `SELECT c.nombre FROM categoria c
          JOIN noticia_categoria nc ON nc.id_categoria = c.id
          WHERE nc.id_noticia = ?`,
    args: [id],
  });
  noticia.categorias = catResult.rows.map(c => c.nombre);

  const comentariosResult = await db.execute({
    sql: `SELECT c.id, c.contenido, c.fecha, c.eliminado, c.id_autor, u.nombre AS autor
          FROM comentario c
          JOIN usuario u ON u.id = c.id_autor
          WHERE c.id_noticia = ? AND c.id_padre IS NULL
          ORDER BY c.fecha DESC`,
    args: [id],
  });
  const comentarios = comentariosResult.rows;

  for (const comentario of comentarios) {
    const respuestasResult = await db.execute({
      sql: `SELECT c.id, c.contenido, c.fecha, c.eliminado, c.id_autor, u.nombre AS autor
            FROM comentario c
            JOIN usuario u ON u.id = c.id_autor
            WHERE c.id_padre = ?
            ORDER BY c.fecha ASC`,
      args: [comentario.id],
    });
    comentario.respuestas = respuestasResult.rows;
  }

  res.render('noticia', { noticia, comentarios });
});

module.exports = router;