const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function preloadContextCache() {
    // 1. Get the local, project-specific system instructions
    const instructionsPath = path.join(__dirname, 'instructions.md');
    const dataDir = path.join(process.cwd(), 'data'); // Your shared symlink

    try {
        let finalContext = fs.readFileSync(instructionsPath, 'utf8') + '\n\n';
        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY START]\n';

        // 2. Load all shared markdown knowledge base files (if directory exists)
        try {
            if (fs.existsSync(dataDir)) {
                const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));

                for (const file of files) {
                    const filePath = path.join(dataDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    finalContext += `---\nFILE NAME: ${file}\n---\n${content}\n\n`;
                }
                logger.info(`Preloaded local instructions and ${files.length} shared context documents into memory.`);
            } else {
                logger.warn(`Context Warning: Data directory not found at ${dataDir}. Skipping shared context files.`);
            }
        } catch (dirError) {
            logger.error(`Error reading data directory: ${dirError.message}`);
        }

        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY END]\n';
        return finalContext;

    } catch (e) {
        logger.error('Failed to preload primary context files', e);
        return 'You are a helpful assistant.'; // Fallback to prevent Mongoose validation error
    }
}

// Export the compiled chunk directly
module.exports = preloadContextCache();
