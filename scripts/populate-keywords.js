require('dotenv').config();
const mongoose = require('mongoose');
const Knowledge = require('../models/Knowledge');
const logger = require('../config/logger');

const keywordMap = {
    '01_AI_Asst_Facts_about_Grant.md': ['facts', 'personal', 'citizenship', 'education', 'marital', 'demographics'],
    '02_AI_Asst_Biography.md': ['biography', 'bio', 'history', 'timeline', 'executive profile', 'industry expertise', 'career overview'],
    '03_AI_Asst_Resume_2026_Grant_Lindsay.md': ['resume', 'skills', 'experience', 'technologies', 'achievements', 'employment'],
    '04_AI_Asst_Projects.md': ['projects', 'portfolio', 'clients', 'roles', 'tech stack', 'impact', 'case studies'],
    '05_AI_Asst_LinkedIn_Recommendations.md': ['recommendations', 'linkedin', 'testimonials', 'references', 'feedback', 'endorsements'],
    '06_AI_Asst_Links_about_Grant.md': ['links', 'urls', 'github', 'linkedin', 'portfolio', 'resume link', 'contact'],
    '07_AI_Asst_STAR-Formatted_Responses.md': ['star', 'interview', 'responses', 'strengths', 'weaknesses', 'conflict', 'leadership', 'accomplishments', 'behavioral']
};

async function populateKeywords() {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTION, {
            dbName: process.env.MONGODB_DB_NAME
        });
        logger.info('MongoDB Connected for Keyword Population');

        const docs = await Knowledge.find();
        
        for (const doc of docs) {
            if (keywordMap[doc.title]) {
                doc.keywords = keywordMap[doc.title];
                await doc.save();
                logger.info(`Updated keywords for: ${doc.title}`);
            } else {
                logger.warn(`No keywords mapped for: ${doc.title}`);
            }
        }

        logger.info('Keyword population complete.');
        process.exit(0);
    } catch (error) {
        logger.error('Error populating keywords:', error);
        process.exit(1);
    }
}

populateKeywords();
