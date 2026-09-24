// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const requirePermiso = require('../middleware/requirePermiso');

// ---------------------------------------------------------------
// Panel principal
// ---------------------------------------------------------------
router.get('/', requirePermiso('noticia.crear'), async (req, res, next) => {
  try {
    const noticiasResult = await db.execute('SELECT COUNT(*) AS n FROM noticia');
    const preguntasResult = await db.execute('SELECT COUNT(*) AS n FROM pregunta');

    // En Turso, los COUNT vienen como BigInt a veces; forzamos Number
    const totalNoticias = Number(noticiasResult.rows[0].n);
    const totalPreguntas = Number(preguntasResult.rows[0].n);

    res.render('admin/dashboard', {
      user: req.session.user,
      totalNoticias,
      totalPreguntas,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// Formulario: nueva noticia
// ---------------------------------------------------------------
router.get('/nueva-noticia', requirePermiso('noticia.crear'), async (req, res, next) => {
  try {
    const categoriasResult = await db.execute(
      'SELECT * FROM categoria ORDER BY nombre'
    );

    res.render('admin/nueva-noticia', {
      categorias: categoriasResult.rows,
      error: null,
      valores: {},
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// Crear noticia
// ---------------------------------------------------------------
router.post('/nueva-noticia', requirePermiso('noticia.crear'), async (req, res, next) => {
  const { titulo, contenido, enlace, imagen, categorias} = req.body;

  // Normalizar categorías a un array (puede venir string si solo se marca una)
  const categoriasArray = Array.isArray(categorias)
    ? categorias
    : categorias
      ? [categorias]
      : [];

  // Validación mínima
  if (!titulo || !contenido || !titulo.trim() || !contenido.trim()) {
    try {
      const listaCategorias = await db.execute(
        'SELECT * FROM categoria ORDER BY nombre'
      );
      return res.render('admin/nueva-noticia', {
        categorias: listaCategorias.rows,
        error: 'Título y contenido son obligatorios',
        valores: { titulo, contenido, enlace, imagen},
      });
    } catch (err) {
      return next(err);
    }
  }

  // Transacción: insertar noticia + categorías de forma atómica
  let tx;
  try {
    tx = await db.transaction('write');

    const insertNoticia = await tx.execute({
  sql: `INSERT INTO noticia (titulo, contenido, enlace, imagen, id_autor)
        VALUES (?, ?, ?, ?, ?)`,
  args: [
    titulo.trim(),
    contenido.trim(),
    enlace && enlace.trim() ? enlace.trim() : null,
    imagen && imagen.trim() ? imagen.trim() : null,
    req.session.user.id
  ],
});

    const idNoticia = Number(insertNoticia.lastInsertRowid);

    for (const idCat of categoriasArray) {
      await tx.execute({
        sql: 'INSERT INTO noticia_categoria (id_noticia, id_categoria) VALUES (?, ?)',
        args: [idNoticia, Number(idCat)],
      });
    }

    await tx.commit();
    return res.redirect(`/noticia/${idNoticia}`);
  } catch (err) {
    if (tx) {
      try {
        await tx.rollback();
      } catch (rollbackErr) {
        console.error('Error al hacer rollback:', rollbackErr);
      }
    }
    return next(err);
  }
});

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
    res.render('admin/preguntas', {
      user: req.session.user,
      preguntas: result.rows,
      success: req.query.ok === '1',
      error: req.query.err || null,
    });
  } catch (err) {
    next(err);
  }
});

// Formulario para responder
router.get('/preguntas/:id/responder', requirePermiso('pregunta.responder'), async (req, res, next) => {
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

    res.render('admin/responder', {
      user: req.session.user,
      pregunta,
      respuestas: respResult.rows,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// Guardar respuesta
router.post('/preguntas/:id/responder', requirePermiso('pregunta.responder'), async (req, res, next) => {
  const id = Number(req.params.id);
  const { contenido } = req.body;

  try {
    if (!contenido || !contenido.trim()) {
      const pregResult = await db.execute({
        sql: `SELECT p.id, p.contenido, p.categoria, p.fecha,
                     u.nombre AS autor
              FROM pregunta p
              JOIN usuario u ON u.id = p.id_autor_pregunta
              WHERE p.id = ?`,
        args: [id],
      });
      const respResult = await db.execute({
        sql: `SELECT r.id, r.contenido, r.fecha, u.nombre AS autor
              FROM respuesta r
              JOIN usuario u ON u.id = r.id_autor_respuesta
              WHERE r.id_pregunta = ?
              ORDER BY r.fecha ASC`,
        args: [id],
      });
      return res.render('admin/responder', {
        user: req.session.user,
        pregunta: pregResult.rows[0],
        respuestas: respResult.rows,
        error: 'La respuesta no puede estar vacía',
      });
    }

    await db.execute({
      sql: `INSERT INTO respuesta (id_pregunta, id_autor_respuesta, contenido)
            VALUES (?, ?, ?)`,
      args: [id, req.session.user.id, contenido.trim()],
    });

    return res.redirect(`/admin/preguntas/${id}/responder`);
  } catch (err) {
    next(err);
  }
});

// Listado de usuarios
router.get('/usuarios', requirePermiso('usuario.gestionar'), async (req, res, next) => {
  try {
    const usersResult = await db.execute(`
      SELECT u.id, u.nombre, u.email, u.fecha_registro,
             r.id   AS id_rol,
             r.nombre AS rol
      FROM usuario u
      LEFT JOIN rol r ON r.id = u.id_rol
      ORDER BY u.fecha_registro DESC
    `);

    const rolesResult = await db.execute(
      'SELECT id, nombre, descripcion FROM rol ORDER BY nombre'
    );

    res.render('admin/usuarios', {
      user: req.session.user,
      usuarios: usersResult.rows,
      roles: rolesResult.rows,
      success: req.query.ok === '1',
      error: req.query.err || null,
    });
  } catch (err) {
    next(err);
  }
});

// Cambiar el rol de un usuario
router.post('/usuarios/:id/rol', requirePermiso('usuario.gestionar'), async (req, res, next) => {
  const idUsuario = Number(req.params.id);
  const idRol = Number(req.body.id_rol);

  try {
    // Evitar que un admin se quite a sí mismo el rol si es el último admin
    if (idUsuario === req.session.user.id) {
      const otrosAdmins = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM usuario
              WHERE id_rol = (SELECT id FROM rol WHERE nombre = 'Administrador')
                AND id != ?`,
        args: [idUsuario],
      });

      const rolNuevo = await db.execute({
        sql: 'SELECT nombre FROM rol WHERE id = ?',
        args: [idRol],
      });

      const esAdminNuevo = rolNuevo.rows[0]?.nombre === 'Administrador';
      const n = Number(otrosAdmins.rows[0].n);

      if (Number(otrosAdmins.rows[0].n) === 0 && !esAdminNuevo) {
        return res.redirect('/admin/usuarios?err=' + encodeURIComponent(
          'No puedes quitarte el rol de Administrador: eres el único que queda'
        ));
      }
    }

    // Verificar que el rol existe
    const rolExiste = await db.execute({
      sql: 'SELECT id FROM rol WHERE id = ?',
      args: [idRol],
    });
    if (rolExiste.rows.length === 0) {
      return res.redirect('/admin/usuarios?err=' + encodeURIComponent('Rol no válido'));
    }

    await db.execute({
      sql: 'UPDATE usuario SET id_rol = ? WHERE id = ?',
      args: [idRol, idUsuario],
    });

    return res.redirect('/admin/usuarios?ok=1');
  } catch (err) {
    next(err);
  }
});

// Crear usuario desde el panel (opcional pero útil)
router.post('/usuarios/nuevo', requirePermiso('usuario.gestionar'), async (req, res, next) => {
  const { nombre, email, password, id_rol } = req.body;

  try {
    if (!nombre || !email || !password) {
      return res.redirect('/admin/usuarios?err=' + encodeURIComponent(
        'Nombre, email y contraseña son obligatorios'
      ));
    }
    if (password.length < 6) {
      return res.redirect('/admin/usuarios?err=' + encodeURIComponent(
        'La contraseña debe tener al menos 6 caracteres'
      ));
    }

    const existe = await db.execute({
      sql: 'SELECT id FROM usuario WHERE email = ?',
      args: [email.trim().toLowerCase()],
    });
    if (existe.rows.length > 0) {
      return res.redirect('/admin/usuarios?err=' + encodeURIComponent(
        'Ya existe un usuario con ese email'
      ));
    }

    const bcrypt = require('bcrypt');
    const hash = bcrypt.hashSync(password, 10);

    await db.execute({
      sql: `INSERT INTO usuario (nombre, email, password_hash, id_rol)
            VALUES (?, ?, ?, ?)`,
      args: [
        nombre.trim(),
        email.trim().toLowerCase(),
        hash,
        Number(id_rol) || null,
      ],
    });

    return res.redirect('/admin/usuarios?ok=1');
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// NOTICIAS: listado y borrado
// ---------------------------------------------------------------
router.get('/noticias', requirePermiso('noticia.crear'), async (req, res, next) => {
  try {
    const result = await db.execute(`
      SELECT n.id, n.titulo, n.fecha,
             u.nombre AS autor
      FROM noticia n
      LEFT JOIN usuario u ON u.id = n.id_autor
      ORDER BY n.fecha DESC
    `);

    res.render('admin/noticias', {
      user: req.session.user,
      noticias: result.rows,
      success: req.query.ok === '1',
      error: req.query.err || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/noticias/:id/borrar', requirePermiso('noticia.borrar'), async (req, res, next) => {
  const id = Number(req.params.id);

  try {
    // Borrar primero las relaciones con categorías (por si no tienes CASCADE)
    await db.execute({
      sql: 'DELETE FROM noticia_categoria WHERE id_noticia = ?',
      args: [id],
    });

    await db.execute({
      sql: 'DELETE FROM noticia WHERE id = ?',
      args: [id],
    });

    return res.redirect('/admin/noticias?ok=1');
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// PREGUNTAS: borrado
// ---------------------------------------------------------------
router.post('/preguntas/:id/borrar', requirePermiso('pregunta.borrar'), async (req, res, next) => {
  const id = Number(req.params.id);

  try {
    // Borrar respuestas asociadas
    await db.execute({
      sql: 'DELETE FROM respuesta WHERE id_pregunta = ?',
      args: [id],
    });

    // Borrar la pregunta
    await db.execute({
      sql: 'DELETE FROM pregunta WHERE id = ?',
      args: [id],
    });

    return res.redirect('/admin/preguntas?ok=1');
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------
// USUARIOS: borrado
// ---------------------------------------------------------------
router.post('/usuarios/:id/borrar', requirePermiso('usuario.gestionar'), async (req, res, next) => {
  const id = Number(req.params.id);

  try {
    // No puedes borrarte a ti mismo
    if (id === Number(req.session.user.id)) {
      return res.redirect('/admin/usuarios?err=' + encodeURIComponent(
        'No puedes borrar tu propia cuenta'
      ));
    }

    // No se puede borrar al último Administrador
    const target = await db.execute({
      sql: `SELECT u.id, r.nombre AS rol
            FROM usuario u
            LEFT JOIN rol r ON r.id = u.id_rol
            WHERE u.id = ?`,
      args: [id],
    });

    if (target.rows.length === 0) {
      return res.redirect('/admin/usuarios?err=' + encodeURIComponent('Usuario no encontrado'));
    }

    if (target.rows[0].rol === 'Administrador') {
      const otros = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM usuario
              WHERE id_rol = (SELECT id FROM rol WHERE nombre = 'Administrador')
                AND id != ?`,
        args: [id],
      });

      if (Number(otros.rows[0].n) === 0) {
        return res.redirect('/admin/usuarios?err=' + encodeURIComponent(
          'No puedes borrar al último Administrador'
        ));
      }
    }

    await db.execute({
      sql: 'DELETE FROM usuario WHERE id = ?',
      args: [id],
    });

    return res.redirect('/admin/usuarios?ok=1');
  } catch (err) {
    next(err);
  }
});

module.exports = router;