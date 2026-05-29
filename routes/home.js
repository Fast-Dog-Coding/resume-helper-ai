const express = require('express');
const router = express.Router();
const { loadingMessages } = require('../config/ui');

const PRIVACY_LAST_UPDATED = 'May 28, 2026';

/* GET home page. */
router.get('/', function(req, res) {
  res.render('home', { title: 'Candidate Concierge', loadingMessages });
});

/* GET combined privacy & terms */
router.get('/privacy', function(req, res) {
  res.render('privacy', {
    title: 'Privacy & Terms — Candidate Concierge',
    lastUpdated: PRIVACY_LAST_UPDATED
  });
});

module.exports = router;

