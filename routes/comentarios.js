// routes/comentarios.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Middleware: exige sesión iniciada
function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

// Crear comentario raíz
router.post('/noticia/:id/comentar', requireLogin, async (req, res, next) => {
  const idNoticia = Number(req.params.id);
  const { contenido } = req.body;

  try {
    if (!contenido || !contenido.trim()) {
      return res.redirect(`/noticia/${idNoticia}#comentarios`);
    }

    await db.execute({
      sql: `INSERT INTO comentario (id_noticia, id_autor, contenido)
            VALUES (?, ?, ?)`,
      args: [idNoticia, req.session.user.id, contenido.trim()],
    });

    return res.redirect(`/noticia/${idNoticia}#comentarios`);
  } catch (err) {
    next(err);
  }
});

// Responder a un comentario
router.post('/comentario/:id/responder', requireLogin, async (req, res, next) => {
  const idPadre = Number(req.params.id);
  const { contenido } = req.body;

  try {
    // Averiguar a qué noticia pertenece el comentario padre
    const padre = await db.execute({
      sql: 'SELECT id_noticia FROM comentario WHERE id = ?',
      args: [idPadre],
    });
    if (padre.rows.length === 0) {
      return res.status(404).send('Comentario no encontrado');
    }
    const idNoticia = Number(padre.rows[0].id_noticia);

    if (!contenido || !contenido.trim()) {
      return res.redirect(`/noticia/${idNoticia}#comentarios`);
    }

    await db.execute({
      sql: `INSERT INTO comentario (id_noticia, id_autor, id_padre, contenido)
            VALUES (?, ?, ?, ?)`,
      args: [idNoticia, req.session.user.id, idPadre, contenido.trim()],
    });

    return res.redirect(`/noticia/${idNoticia}#comentario-${idPadre}`);
  } catch (err) {
    next(err);
  }
});

// Borrar el propio comentario
router.post('/comentario/:id/borrar', requireLogin, async (req, res, next) => {
  const id = Number(req.params.id);
  const idUsuario = Number(req.session.user.id);

  try {
    const c = await db.execute({
      sql: 'SELECT id_noticia, id_autor FROM comentario WHERE id = ?',
      args: [id],
    });

    if (c.rows.length === 0) {
      return res.status(404).send('Comentario no encontrado');
    }

    // Solo el autor puede borrar su propio comentario por esta ruta
    if (Number(c.rows[0].id_autor) !== idUsuario) {
      return res.status(403).send('No puedes borrar un comentario que no es tuyo');
    }

    const idNoticia = Number(c.rows[0].id_noticia);

    // Borrado real
    // await db.execute({ sql: 'DELETE FROM comentario WHERE id_padre = ?', args: [id] });
    // await db.execute({ sql: 'DELETE FROM comentario WHERE id = ?', args: [id] });

    //soft delete
    await db.execute({
      sql: 'UPDATE comentario SET eliminado = 1 WHERE id = ?',
      args: [id],
    });

    return res.redirect(`/noticia/${idNoticia}#comentario-${id}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;