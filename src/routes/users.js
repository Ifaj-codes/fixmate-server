import express from 'express';
import { usersCollection, ObjectId } from '../config/db.js';
import { verifyToken, generateToken } from '../middlewares/auth.js';

const router = express.Router();

// PATCH /api/users/profile (All logged-in users update profile)
router.patch('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, area, bio, image } = req.body;

    const user = await usersCollection.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateFields = {};
    if (name && name.trim()) updateFields.name = name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (area !== undefined) updateFields.area = area.trim();
    if (bio !== undefined) updateFields.bio = bio.trim();
    if (image) updateFields.image = image;

    await usersCollection.updateOne({ email: req.user.email }, { $set: updateFields });

    const updatedUser = await usersCollection.findOne({ email: req.user.email });
    const { password, ...safeUser } = updatedUser;

    // Issue updated token with new name
    const newToken = generateToken({
      id: safeUser._id,
      email: safeUser.email,
      role: safeUser.role,
      name: safeUser.name
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: safeUser,
      token: newToken
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

export default router;
