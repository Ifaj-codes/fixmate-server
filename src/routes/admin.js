import express from 'express';
import { usersCollection, servicesCollection, bookingsCollection, paymentsCollection, ObjectId } from '../config/db.js';
import { verifyToken, verifyAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Apply verifyToken and verifyAdmin to all admin routes
router.use(verifyToken, verifyAdmin);

// GET /api/admin/overview (Stats for admin dashboard)
router.get('/overview', async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments({});
    const totalTechnicians = await usersCollection.countDocuments({ role: 'technician' });
    const totalCustomers = await usersCollection.countDocuments({ role: 'customer' });
    const pendingServices = await servicesCollection.countDocuments({ approvalStatus: 'pending' });
    const approvedServices = await servicesCollection.countDocuments({ approvalStatus: 'approved' });
    const totalBookings = await bookingsCollection.countDocuments({});

    const allPaymentsCursor = await paymentsCollection.find({});
    const allPayments = await allPaymentsCursor.toArray();
    const totalRevenue = allPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTechnicians,
        totalCustomers,
        pendingServices,
        approvedServices,
        totalBookings,
        totalRevenue: Math.round(totalRevenue * 100) / 100
      }
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
});

// GET /api/admin/users (List all users)
router.get('/users', async (req, res) => {
  try {
    const cursor = await usersCollection.find({});
    const users = await cursor.sort({ createdAt: -1 }).toArray();

    const sanitizedUsers = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      area: u.area || '',
      image: u.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      createdAt: u.createdAt
    }));

    res.status(200).json({ success: true, users: sanitizedUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/role (Change user role, cannot change own role)
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['customer', 'technician', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const targetUser = await usersCollection.findOne({ _id: id });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Safety rule: Admin cannot change their own role!
    if (targetUser.email === req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admins cannot change their own role'
      });
    }

    await usersCollection.updateOne({ _id: id }, { $set: { role } });

    res.status(200).json({
      success: true,
      message: `User role successfully updated to ${role}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// GET /api/admin/services (List all services with filter)
router.get('/services', async (req, res) => {
  try {
    const { approvalStatus } = req.query;
    const query = {};

    if (approvalStatus && approvalStatus !== 'All') {
      query.approvalStatus = approvalStatus;
    }

    const cursor = await servicesCollection.find(query);
    const services = await cursor.sort({ createdAt: -1 }).toArray();

    res.status(200).json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch services for admin' });
  }
});

// PATCH /api/admin/services/:id/approval (Approve or Reject service)
router.patch('/services/:id/approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status' });
    }

    const service = await servicesCollection.findOne({ _id: id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    await servicesCollection.updateOne({ _id: id }, { $set: { approvalStatus } });

    res.status(200).json({
      success: true,
      message: `Service has been marked as ${approvalStatus}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update service approval status' });
  }
});

// GET /api/admin/bookings (List all platform bookings with status filter)
router.get('/bookings', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    const cursor = await bookingsCollection.find(query);
    const bookings = await cursor.sort({ createdAt: -1 }).toArray();

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings for admin' });
  }
});

// GET /api/admin/transactions (List all payment documents and total revenue)
router.get('/transactions', async (req, res) => {
  try {
    const cursor = await paymentsCollection.find({});
    const transactions = await cursor.sort({ paidAt: -1 }).toArray();

    const totalRevenue = transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    res.status(200).json({
      success: true,
      transactions,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      count: transactions.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

export default router;
