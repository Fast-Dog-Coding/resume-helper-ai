const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
    threadId: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 604800 // Automatically delete document after 7 days (TTL Index)
    },
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
        content: { type: String, required: true }
    }]
});

module.exports = mongoose.model('Thread', threadSchema);
