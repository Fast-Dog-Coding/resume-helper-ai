const logger = require('./logger');
const Knowledge = require('../models/Knowledge');
const Config = require('../models/Config');

async function buildContext() {
    try {
        // 1. Load system instructions from MongoDB Config collection
        const instructionsDoc = await Config.findOne({ key: 'concierge_instructions' }).exec();
        if (!instructionsDoc) {
            throw new Error('concierge_instructions key not found in MongoDB config collection.');
        }
        let finalContext = instructionsDoc.value + '\n\n';
        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY START]\n';

        // 2. Load all knowledge base records from MongoDB
        try {
            const knowledgeDocs = await Knowledge.find().sort({ sortOrder: 1 }).exec();

            for (const doc of knowledgeDocs) {
                finalContext += `---\nFILE NAME: ${doc.title}\n---\n${doc.content}\n\n`;
            }
            logger.info(`Loaded instructions from MongoDB config and ${knowledgeDocs.length} context documents.`);
        } catch (dbError) {
            logger.error(`Error reading Knowledge from MongoDB: ${dbError.message}`);
        }

        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY END]\n';
        return finalContext;

    } catch (e) {
        logger.error('Failed to build context from MongoDB', e);
        return 'You are a helpful assistant.'; // Fallback to prevent Mongoose validation error
    }
}

module.exports = { buildContext };
