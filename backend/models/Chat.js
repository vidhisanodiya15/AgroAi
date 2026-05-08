const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  userMessage: {
    type: String,
    required: true,
  },
  aiResponse: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['general', 'crop_disease', 'weather', 'fertilizer', 'pest_management'],
    default: 'general',
  },
  helpful: {
    type: Boolean,
    default: null, // null = not rated, true = helpful, false = not helpful
  },
}, { timestamps: true });

// Index for faster queries
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

module.exports = mongoose.model('Chat', chatSchema);
