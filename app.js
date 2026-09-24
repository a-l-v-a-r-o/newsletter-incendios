const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.send('Hola mundo. Mi newsletter de incendios funciona.');
});

app.listen(3000, () => {
  console.log('Servidor en http://localhost:3000');
});