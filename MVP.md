# MVP — Newsletter de Incendios Locales

**Fecha:** 24/09/2026
**Objetivo:** Tener una web funcional donde los vecinos lean noticias sobre incendios locales y pregunten a las autoridades.

## Roles

- **Visitante:** puede leer noticias y leer las respuestas que se han dado a otras preguntas. No puede escribir.
- **Usuario registrado:** además puede enviar preguntas y participar en el foro.
- **Administrador:** puede publicar noticias y responder preguntas.

## Funcionalidades incluidas en el MVP

### 1. Feed de noticias
- El administrador puede crear una noticia con: título, contenido y enlace opcional a la fuente.
- Cualquiera puede ver la lista de noticias ordenadas de más reciente a más antigua.
- Cualquiera puede abrir una noticia y verla completa.

### 2. Preguntas a autoridades
- Un usuario registrado puede enviar una pregunta.
- La pregunta queda en estado "sin responder".
- El administrador puede responderla.
- Cualquiera puede ver la lista de preguntas  y sus respuestas siempre que el usuario, la autoridad o el administrdor las hayan marcado como visibles para los demás.


### 3. Autenticación básica
- Registro e inicio de sesión con email y contraseña.
- Registro de usuario administrador y autoridad.

### 4. Panel de administrador y autoridad
- Publicar noticias.
- Responder preguntas.
- Borrar preguntas o respuestas si es necesario.

## Lo que NO entra en el MVP (para después)

- Foro
- Notificaciones por email.
- Subida de imágenes.
- Likes, reacciones o votos.
- Perfiles de usuario públicos.
- Búsqueda avanzada.
- Comentarios anidados en el foro.
- Moderación automática de contenido.
- Diseño responsive elaborado (basta con que se vea bien en móvil y escritorio de forma simple).

## Criterios de éxito del MVP

El MVP estará listo cuando:
1. El administrador pueda publicar una noticia y verla en la home.
2. Un usuario registrado pueda enviar una pregunta y verla en la lista.
3. El administrador pueda responder esa pregunta y el usuario la vea respondida.
4. Todo funcione en local con `node app.js` sin errores.

## Orden de construcción

1. Base de datos con tablas: usuarios, noticias, preguntas, foro_temas, foro_respuestas.
2. Feed de noticias (lo más simple: sin login aún).
3. Login y registro.
4. Preguntas a autoridades.
5. Despliegue en hosting gratuito.
6. Panel de administrador.

