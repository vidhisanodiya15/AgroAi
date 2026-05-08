const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  imageUrl: {
    type: String,
    required: false,
  },
  crop: {
    type: String,
    required: false,
  },
  diseaseName: {
    type: String,
    required: false,
  },
  confidenceScore: {
    type: Number,
    required: false,
  },
  treatment: {
    type: String,
    required: false,
  },
  prevention: {
    type: String,
    required: false,
  },
  symptoms: {
    type: String,
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);
