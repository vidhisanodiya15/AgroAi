const express = require('express');
const router = express.Router();
const {
  createPrediction,
  getHistory,
  analyzeImage,
  detectCrop,
  detectDisease
} = require('../controllers/predictionController');
const { protect, optionalProtect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/', protect, upload.single('image'), createPrediction);
router.get('/history', protect, getHistory);

// Direct AI routes
router.post('/analyze', optionalProtect, upload.single('image'), analyzeImage);
router.post('/detect-crop', optionalProtect, upload.single('image'), detectCrop);
router.post('/detect-disease', optionalProtect, upload.single('image'), detectDisease);

module.exports = router;
