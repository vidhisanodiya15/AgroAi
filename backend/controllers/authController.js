const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id, email, name, role) => {
  return jwt.sign({ id, email, name, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default the first user to be an admin (optional logic, kept from mock logic)
    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'user';

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: generateToken(user._id, user.email, user.name, user.role),
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;

    // Master Admin bypass from environment variables
    const masterAdminEmail = process.env.ADMIN_EMAIL || 'admin@agro.ai';
    const masterAdminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (email === masterAdminEmail && password === masterAdminPass) {
      if (!isAdmin) {
        return res.status(403).json({ success: false, error: 'Master Admin must use the Admin Login portal.' });
      }
      return res.json({
        success: true,
        user: { id: 'master_admin', name: 'Master Admin', email, role: 'admin' },
        token: generateToken('master_admin', email, 'Master Admin', 'admin')
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Enforce role separation
      if (isAdmin && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Access denied: Regular users cannot use the Admin portal.' });
      }
      if (!isAdmin && user.role === 'admin') {
        return res.status(403).json({ success: false, error: 'Administrators must use the Admin Login portal.' });
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: generateToken(user._id, user.email, user.name, user.role),
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid ID or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
