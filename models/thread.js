const mongoose = require('mongoose');
const threadSchema = new mongoose.Schema({
  threadId: String,
  thread: Object
});

const Thread = mongoose.model('threads', threadSchema);

module.exports = Thread;
