const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const Knowledge = require('../models/Knowledge');

async function buildContext() {
    // 1. Get the local, project-specific system instructions
    const instructionsPath = path.join(__dirname, 'instructions.md');

    try {
        let finalContext = fs.readFileSync(instructionsPath, 'utf8') + '\n\n';
        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY START]\n';

        // 2. Load all shared knowledge base records from MongoDB
        try {
            const knowledgeDocs = await Knowledge.find().sort({ sortOrder: 1 }).exec();
            
            for (const doc of knowledgeDocs) {
                finalContext += `---\nFILE NAME: ${doc.title}\n---\n${doc.content}\n\n`;
            }
            logger.info(`Loaded local instructions and ${knowledgeDocs.length} context documents from MongoDB.`);
        } catch (dbError) {
            logger.error(`Error reading Knowledge from MongoDB: ${dbError.message}`);
        }

        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY END]\n';
        return finalContext;

    } catch (e) {
        logger.error('Failed to preload primary context files', e);
        return 'You are a helpful assistant.'; // Fallback to prevent Mongoose validation error
    }
}

module.exports = { buildContext };
