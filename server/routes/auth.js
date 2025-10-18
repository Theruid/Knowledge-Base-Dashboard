import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = db.prepare('SELECT * FROM Users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert new user
    const stmt = db.prepare('INSERT INTO Users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword);
    
    // Do not generate JWT token for signup - users need to be activated first
    
    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account needs to be activated by an administrator before you can log in.',
      requiresActivation: true
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Find user
    const user = db.prepare('SELECT * FROM Users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Check if user account is activated
    if (user.is_activated !== 1) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account not activated. Please contact an administrator.' 
      });
    }
    
    // Update last login time
    db.prepare('UPDATE Users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    // Generate JWT token with extended expiration (7 days)
    const token = jwt.sign({ 
      id: user.id, 
      username: user.username,
      role: user.role 
    }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_activated: user.is_activated
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, role, is_activated, created_at, last_login FROM Users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving user information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Authentication middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication token required' 
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    req.user = user;
    next();
  });
}

// Admin middleware
export function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
}

// Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, role, is_activated, created_at, last_login FROM Users').all();
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update user role (admin only)
router.patch('/users/:userId/role', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate input
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required (admin or user)'
      });
    }
    
    // Update user role
    const stmt = db.prepare('UPDATE Users SET role = ? WHERE id = ?');
    const result = stmt.run(role, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `User role updated to ${role} successfully`
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint to activate/deactivate a user account (admin only)
router.patch('/activate/:userId', authenticateToken, requireAdmin, (req, res) => {
  try {
    // In a real app, you would check if the current user has admin privileges
    // For simplicity, we're allowing any authenticated user to do this
    // You should implement proper role-based authorization
    
    const { userId } = req.params;
    const { activate } = req.body;
    
    // Validate input
    if (activate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Activation status is required'
      });
    }
    
    const activationValue = activate ? 1 : 0;
    
    // Update user activation status
    const stmt = db.prepare('UPDATE Users SET is_activated = ? WHERE id = ?');
    const result = stmt.run(activationValue, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `User ${activate ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user activation status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Change password endpoint
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    // Get user from database
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    const stmt = db.prepare('UPDATE Users SET password = ? WHERE id = ?');
    const result = stmt.run(hashedPassword, userId);
    
    if (result.changes === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export const authRoutes = router;
