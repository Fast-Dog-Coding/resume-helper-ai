const OpenAI = require('openai');
const {
  OPEN_AI_ORGANIZATION_ID,
  OPEN_AI_PROJECT_ID,
  OPEN_AI_PROJECT_SECRET
} = process.env;
const openai = new OpenAI({
  organization: OPEN_AI_ORGANIZATION_ID,
  project: OPEN_AI_PROJECT_ID,
  apiKey: OPEN_AI_PROJECT_SECRET
});

module.exports = openai;
