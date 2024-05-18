const OpenAI = require('openai');
const logger = require('./logger'); // Assuming you have a logger configured

const {
  OPEN_AI_ORGANIZATION_ID,
  OPEN_AI_PROJECT_ID,
  OPEN_AI_PROJECT_SECRET
} = process.env;

// Configuration object for OpenAI
const openAiConfig = {
  organization: OPEN_AI_ORGANIZATION_ID,
  project: OPEN_AI_PROJECT_ID,
  apiKey: OPEN_AI_PROJECT_SECRET
};

let openai;

try {
  openai = new OpenAI(openAiConfig);
  logger.info('OpenAI instance created successfully');

} catch (error) {
  logger.error('Error creating OpenAI instance', error);
  throw error;
}

module.exports = openai;
