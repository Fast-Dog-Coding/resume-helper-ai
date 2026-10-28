require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Config = require('../models/Config');
const Knowledge = require('../models/Knowledge');
const Thread = require('../models/Thread');
const logger = require('../config/logger');

const STAR_TITLE = '07_AI_Asst_STAR-Formatted_Responses.md';
const LEGACY_PHRASE = '(as mentioned in the resume)';
const INSTRUCTIONS_KEY = 'concierge_instructions';

function countPhrase(content) {
    if (typeof content !== 'string' || content.length === 0) {
        return 0;
    }
    return content.split(LEGACY_PHRASE).length - 1;
}

/**
 * Cached chat threads keep their original system prompt until the 7-day TTL.
 * Clearing them is the default so a prompt cutover does not leave stale threads
 * behind. `--clear-threads` requests the same cleanup explicitly.
 * `--keep-threads` leaves existing threads in place.
 *
 * @param {string[]} argv
 * @returns {boolean}
 */
function shouldClearThreads(argv) {
    if (argv.includes('--keep-threads') && !argv.includes('--clear-threads')) {
        return false;
    }
    return true;
}

async function sync() {
    if (!process.env.MONGODB_CONNECTION || !process.env.MONGODB_DB_NAME) {
        logger.error('MONGODB_CONNECTION and MONGODB_DB_NAME are required to sync the concierge database.');
        process.exit(1);
    }

    const instructionsPath = path.join(__dirname, '../config/instructions.md');
    if (!fs.existsSync(instructionsPath)) {
        logger.error(`Instructions file not found at ${instructionsPath}.`);
        process.exit(1);
    }

    const instructions = fs.readFileSync(instructionsPath, 'utf8');
    if (instructions.trim().length === 0) {
        logger.error(`Instructions file at ${instructionsPath} is empty.`);
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION, {
            dbName: process.env.MONGODB_DB_NAME
        });
        logger.info('MongoDB connected for concierge sync.');

        await Config.findOneAndUpdate(
            { key: INSTRUCTIONS_KEY },
            {
                $set: {
                    value: instructions,
                    updatedAt: new Date()
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        logger.info(`Upserted Config document { key: '${INSTRUCTIONS_KEY}' }.`);

        const starDocs = await Knowledge.find({ title: STAR_TITLE }).exec();
        if (starDocs.length === 0) {
            logger.warn(`No Knowledge document titled ${STAR_TITLE} was found. STAR stories were not modified.`);
        }

        for (const doc of starDocs) {
            const before = countPhrase(doc.content);
            if (before > 0) {
                doc.content = doc.content.split(LEGACY_PHRASE).join('');
                await doc.save();
                logger.info(`Stripped ${before} occurrence(s) of "${LEGACY_PHRASE}" from ${STAR_TITLE}.`);
            }
            const remaining = countPhrase(doc.content);
            if (remaining === 0) {
                logger.info(`${STAR_TITLE} has no remaining occurrence of "${LEGACY_PHRASE}".`);
            } else {
                logger.warn(`${STAR_TITLE} still has ${remaining} occurrence(s) of "${LEGACY_PHRASE}" after stripping.`);
            }
        }

        const removed = await Knowledge.deleteMany({ title: { $ne: STAR_TITLE } });
        logger.info(`Deleted ${removed.deletedCount} legacy Knowledge document(s) other than ${STAR_TITLE}.`);

        if (shouldClearThreads(process.argv)) {
            const explicit = process.argv.includes('--clear-threads');
            logger.warn(
                explicit
                    ? 'Clearing the Thread collection because --clear-threads was set. Cached chats still holding the previous system prompt will be deleted.'
                    : 'Clearing the Thread collection by default so cached chats with the previous system prompt do not linger for 7 days.'
            );
            const deleted = await Thread.deleteMany({});
            logger.info(`Deleted ${deleted.deletedCount} Thread document(s).`);
        } else {
            const remaining = await Thread.countDocuments();
            logger.warn(
                `Thread collection was not cleared (${remaining} document(s) remain) because --keep-threads was set. Cached system prompts stay until the 7-day TTL. Re-run with --clear-threads to delete them now.`
            );
        }

        logger.info('Concierge database sync complete.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        logger.error('Concierge database sync failed', error);
        try {
            await mongoose.disconnect();
        } catch (disconnectError) {
            logger.error('Failed to disconnect from MongoDB after sync error', disconnectError);
        }
        process.exit(1);
    }
}

sync();
