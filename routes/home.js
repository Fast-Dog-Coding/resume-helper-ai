const express = require('express');
const router = express.Router();
const { loadingMessages } = require('../config/ui');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('home', { title: 'Candidate Concierge', loadingMessages });
});

module.exports = router;

