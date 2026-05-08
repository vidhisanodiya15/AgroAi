const User = require('../models/User');
const Prediction = require('../models/Prediction');

// @desc    Get administrative dashboard stats
// @route   GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPredictions = await Prediction.countDocuments();
    
    // Get recent activity (last 5 predictions)
    const recentPredictions = await Prediction.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        users: totalUsers,
        predictions: totalPredictions,
      },
      recentActivity: recentPredictions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all predictions
// @route   GET /api/admin/predictions
const getAllPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);
    // Also delete their predictions
    await Prediction.deleteMany({ userId: req.params.id });
    
    res.json({ success: true, message: 'User and their records removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a prediction record
// @route   DELETE /api/admin/predictions/:id
const deletePrediction = async (req, res) => {
  try {
    const prediction = await Prediction.findByIdAndDelete(req.params.id);
    if (!prediction) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Record removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAdminStats,
  getAllUsers,
  getAllPredictions,
  deleteUser,
  deletePrediction
};
