const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    keywords: [String],
    content: {
        type: String,
        required: true
    },
    sortOrder: {
        type: Number,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

knowledgeSchema.index({ keywords: 1 });

knowledgeSchema.pre('save', async function (next) {
    // Only run this logic if sortOrder isn't manually set by the user
    if (this.sortOrder !== undefined && this.sortOrder !== null) {
        return next();
    }

    try {
        // Find the document with the highest sortOrder
        const lastDoc = await this.constructor
            .findOne({}, { sortOrder: 1 })
            .sort({ sortOrder: -1 })
            .exec();

        if (!lastDoc || lastDoc.sortOrder === undefined) {
            // If the collection is empty, start at 10
            this.sortOrder = 10;
        } else {
            // Calculate the next value divisible by 10
            this.sortOrder = (Math.floor(lastDoc.sortOrder / 10) + 1) * 10;
        }

        next();
    } catch (err) {
        next(err);
    }
});

module.exports = mongoose.model('Knowledge', knowledgeSchema);
