const mongoose = require('mongoose');
const runSchema = new mongoose.Schema({
  runId: String,
  run: Object,
  thread: Object
});

const Run = mongoose.model('runs', runSchema);

module.exports = Run;
