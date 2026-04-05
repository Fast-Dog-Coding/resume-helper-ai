require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Knowledge = require('../models/Knowledge');
const logger = require('../config/logger');

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION, {
            dbName: process.env.MONGODB_DB_NAME
        });
        logger.info('MongoDB Connected for Migration');

        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            logger.warn(`Data directory not found at ${dataDir}.`);
            process.exit(0);
        }

        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));
        const docsToInsert = [];

        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            let sortOrder = 10; // Default if not parseable
            const match = file.match(/^(\d+)_/);
            if (match) {
                sortOrder = parseInt(match[1], 10) * 10;
            }

            let existingDoc = await Knowledge.findOne({ title: file });
            if (existingDoc) {
                logger.info(`Document ${file} already exists. Updating...`);
                existingDoc.content = content;
                existingDoc.sortOrder = sortOrder;
                await existingDoc.save();
            } else {
                docsToInsert.push({
                    title: file,
                    content: content,
                    sortOrder: sortOrder
                });
            }
        }

        if (docsToInsert.length > 0) {
            await Knowledge.insertMany(docsToInsert);
            logger.info(`Inserted ${docsToInsert.length} documents.`);
        }

        logger.info('Migration complete.');
        process.exit(0);

    } catch (error) {
        logger.error('Migration error:', error);
        process.exit(1);
    }
}

migrate();
