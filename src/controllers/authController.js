const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists'
      });
    }

    // Create new user
    const user = User.create({ name, email, password });
    
    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });

    console.log(`New user registered: ${email}`);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Failed to register user'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = User.findByEmailForAuth(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Validate password
    const isValidPassword = User.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

    console.log(`User logged in: ${email}`);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Failed to login'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user information'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = User.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          error: 'Email is already taken'
        });
      }
    }

    // Update user
    const updatedUser = User.update(userId, { name, email });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        updated_at: updatedUser.updated_at
      }
    });

    console.log(`User profile updated: ${updatedUser.email}`);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = User.findByEmailForAuth(req.user.email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Validate current password
    const isValidPassword = User.validatePassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    User.updatePassword(userId, newPassword);

    res.json({
      message: 'Password changed successfully'
    });

    console.log(`Password changed for user: ${user.email}`);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password'
    });
  }
};

// Logout (client-side token removal)
const logout = async (req, res) => {
  try {
    res.json({
      message: 'Logout successful'
    });

    console.log(`User logged out: ${req.user.email}`);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Failed to logout'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate new token
    const token = generateToken(userId);

    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Failed to refresh token'
    });
  }
};

// Get user stats
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const Note = require('../models/Note');
    
    const stats = Note.getStats(userId);
    const recentNotes = Note.getRecentlyUpdated(userId, 3);

    res.json({
      stats: {
        totalNotes: stats.total,
        privateNotes: stats.private_count,
        sharedNotes: stats.shared_count,
        publicNotes: stats.public_count
      },
      recentNotes
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Failed to get user statistics'
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout,
  refreshToken,
  getUserStats
};