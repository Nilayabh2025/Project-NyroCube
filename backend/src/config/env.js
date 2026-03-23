const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'change-this-to-a-long-random-secret',
  externalApiKey: process.env.EXTERNAL_APP_API_KEY || 'nyrocube-secure-api-key',
  aiMode: process.env.AI_MODE || 'local',
  openAiKey: process.env.OPENAI_API_KEY || '',
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openAiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4000'
};
