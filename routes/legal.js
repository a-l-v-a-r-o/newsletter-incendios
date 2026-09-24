// routes/legal.js
const express = require('express');
const router = express.Router();

router.get('/aviso-legal', (req, res) => {
  res.render('legal/aviso-legal');
});

router.get('/privacidad', (req, res) => {
  res.render('legal/privacidad');
});

router.get('/cookies', (req, res) => {
  res.render('legal/cookies');
});

router.get('/contacto', (req, res) => {
  res.render('legal/contacto');
});

module.exports = router;