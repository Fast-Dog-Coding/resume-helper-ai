const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for LogEvent
const logEventSchema = new Schema({
  who: {
    type: String,
    required: true,
    trim: true
  },
  when: {
    type: Date,
    default: Date.now,
    required: true
  },
  what: {
    type: String,
    required: true,
    trim: true
  },
  threadId: {
    type: String,
    trim: true,
    default: null
  },
  logType: {
    type: String,
    required: true,
    enum: ['request', 'response', 'error', 'warning']
  }
});

// Add static property for logType values
logEventSchema.statics.LogTypes = {
  REQUEST: 'request',
  RESPONSE: 'response',
  ERROR: 'error',
  WARNING: 'warning'
};

// Create the LogEvent model using the schema
const LogEvent = mongoose.model('LogEvent', logEventSchema);

// Export the model
module.exports = LogEvent;
