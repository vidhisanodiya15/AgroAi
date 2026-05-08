const express = require('express');
const router = express.Router();
const { submitFeedback, getAllFeedback, deleteFeedback } = require('../controllers/feedbackController');
const { protect, adminProtect } = require('../middleware/auth');

router.post('/', submitFeedback);
router.get('/', protect, adminProtect, getAllFeedback);
router.delete('/:id', protect, adminProtect, deleteFeedback);

module.exports = router;
