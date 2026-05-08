const express = require('express');
const router = express.Router();
const { 
  getAdminStats, 
  getAllUsers, 
  getAllPredictions, 
  deleteUser, 
  deletePrediction 
} = require('../controllers/adminController');
const { protect, adminProtect } = require('../middleware/auth');

// Apply protection to all admin routes
router.use(protect);
router.use(adminProtect);

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.get('/predictions', getAllPredictions);
router.delete('/users/:id', deleteUser);
router.delete('/predictions/:id', deletePrediction);

module.exports = router;
