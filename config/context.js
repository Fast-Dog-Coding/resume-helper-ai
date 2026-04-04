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

        // 2. Load all shared markdown knowledge base files
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));

        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            finalContext += `---\nFILE NAME: ${file}\n---\n${content}\n\n`;
        }

        finalContext += '[STATIC KNOWLEDGE BASE BOUNDARY END]\n';

        logger.info(`Preloaded local instructions and ${files.length} shared context documents into memory.`);
        return finalContext;

    } catch (e) {
        logger.error('Failed to preload context files', e);
        return '';
    }
}

// Export the compiled chunk directly
module.exports = preloadContextCache();
