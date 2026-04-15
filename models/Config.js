const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    value: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { collection: 'config' });

module.exports = mongoose.model('Config', configSchema);
