import express from 'express';
import bcrypt from 'bcryptjs';
import { usersCollection } from '../config/db.js';
import { generateToken, verifyToken } from '../middlewares/auth.js';

const router = express.Router();

// Password validator helper
function validatePassword(password) {
  if (!password || password.length < 6) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  return hasUpper && hasLower;
}

// POST /api/auth/sign-up
router.post('/sign-up', async (req, res) => {
  try {
    const { name, email, password, role, phone, area, bio, image } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters, with at least one uppercase and one lowercase letter'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    // Role enforcement: strictly 'customer' or 'technician', never allow 'admin' registration
    let userRole = 'customer';
    if (role === 'technician') {
      userRole = 'technician';
    } else {
      userRole = 'customer';
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      phone: phone || '',
      area: area || '',
      bio: bio || '',
      image: image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId;

    const token = generateToken({
      id: userId,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });

    const userResponse = {
      _id: userId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      area: newUser.area,
      bio: newUser.bio,
      image: newUser.image,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Sign-up error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

// POST /api/auth/sign-in
router.post('/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      area: user.area || '',
      bio: user.bio || '',
      image: user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      createdAt: user.createdAt
    };

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('Sign-in error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during sign in' });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { password, ...userResponse } = user;
    res.status(200).json({ success: true, user: userResponse });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch current user' });
  }
});

export default router;
