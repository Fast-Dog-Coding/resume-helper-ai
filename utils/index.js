const LogEvent = require('../models/log-event');

async function logEvent(who, what, threadId, logType) {
  await LogEvent.create({ who, what, threadId, logType });
}

module.exports = { logEvent, LogTypes: LogEvent.LogTypes };
