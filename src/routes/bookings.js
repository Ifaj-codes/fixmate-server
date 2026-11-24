import express from 'express';
import { bookingsCollection, servicesCollection, ObjectId } from '../config/db.js';
import { verifyToken, verifyCustomer, verifyTechnician } from '../middlewares/auth.js';

const router = express.Router();

// POST /api/bookings (Customer: Create a repair request)
router.post('/', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { serviceId, customerPhone, address, preferredDate, problemDescription } = req.body;

    if (!serviceId || !customerPhone || !address || !preferredDate || !problemDescription) {
      return res.status(400).json({ success: false, message: 'All booking fields are required' });
    }

    if (problemDescription.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Problem description must be at least 20 characters long'
      });
    }

    // Date validation: today or future date only
    const bookingDate = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(bookingDate.getTime()) || bookingDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Preferred date must be today or a future date'
      });
    }

    // Load service from database
    const service = await servicesCollection.findOne({ _id: serviceId });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Prevent technician requesting own service (extra safety check)
    if (service.technicianEmail === req.user.email) {
      return res.status(400).json({ success: false, message: 'Technicians cannot request their own services' });
    }

    // Check duplicate active requests:
    // A customer cannot have two active requests (requested, accepted or in-progress) for the same service
    const existingActiveBooking = await bookingsCollection.findOne({
      serviceId: serviceId,
      customerEmail: req.user.email,
      status: { $in: ['requested', 'accepted', 'in-progress'] }
    });

    if (existingActiveBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active request for this service'
      });
    }

    const newBooking = {
      ticketNo: 'FM-' + Math.floor(1000 + Math.random() * 9000),
      serviceId: service._id.toString(),
      serviceTitle: service.title,
      serviceImage: service.image,
      category: service.category,
      basePrice: service.basePrice,
      finalAmount: service.basePrice, // default = basePrice until technician completes
      technicianName: service.technicianName,
      technicianEmail: service.technicianEmail,
      customerName: (req.body.customerName || req.user.name || 'Nesar Uddin Ifaj (Customer)').trim(),
      customerEmail: (req.body.customerEmail || req.user.email || 'customer@fixmate.com').trim(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      preferredDate: bookingDate,
      problemDescription: problemDescription.trim(),
      status: 'requested',
      paymentStatus: 'unpaid',
      statusHistory: [
        { status: 'requested', changedAt: new Date() }
      ],
      createdAt: new Date()
    };

    const result = await bookingsCollection.insertOne(newBooking);

    res.status(201).json({
      success: true,
      message: 'Repair request submitted successfully',
      bookingId: result.insertedId
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ success: false, message: 'Failed to create booking request' });
  }
});

// GET /api/bookings/my (Customer: Get own bookings)
router.get('/my', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const cursor = await bookingsCollection.find({ customerEmail: req.user.email });
    const bookings = await cursor.sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer bookings' });
  }
});

// PATCH /api/bookings/:id/cancel (Customer: Cancel booking - allowed ONLY when status is 'requested')
router.patch('/:id/cancel', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await bookingsCollection.findOne({ _id: id });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only cancel your own bookings' });
    }

    if (booking.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking once it has been accepted or processed by the technician'
      });
    }

    await bookingsCollection.updateOne(
      { _id: id },
      {
        $set: { status: 'cancelled' },
        $push: { statusHistory: { status: 'cancelled', changedAt: new Date() } }
      }
    );

    res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// GET /api/bookings/technician (Technician: Get assigned bookings with optional status filter)
router.get('/technician', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { technicianEmail: req.user.email };

    if (status && status !== 'All') {
      query.status = status;
    }

    const cursor = await bookingsCollection.find(query);
    const bookings = await cursor.sort({ createdAt: -1 }).toArray();

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch technician bookings' });
  }
});

// PATCH /api/bookings/:id/status (Technician: Job Status Pipeline enforcement)
router.patch('/:id/status', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const { nextStatus, finalAmount } = req.body;

    const booking = await bookingsCollection.findOne({ _id: id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Owner verification
    if (booking.technicianEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only update jobs assigned to you' });
    }

    const currentStatus = booking.status;

    // Challenge 3 Status Pipeline verification
    let isValidTransition = false;

    if (currentStatus === 'requested') {
      if (nextStatus === 'accepted' || nextStatus === 'rejected') {
        isValidTransition = true;
      }
    } else if (currentStatus === 'accepted') {
      if (nextStatus === 'in-progress') {
        isValidTransition = true;
      }
    } else if (currentStatus === 'in-progress') {
      if (nextStatus === 'completed') {
        isValidTransition = true;
      }
    }

    if (!isValidTransition) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${currentStatus}' to '${nextStatus}'. Please follow the job pipeline.`
      });
    }

    const updateFields = {
      status: nextStatus
    };

    // When marking 'completed', must send finalAmount (greater than 0)
    if (nextStatus === 'completed') {
      const amountNum = Number(finalAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Final amount must be a positive number greater than 0 when completing a job'
        });
      }
      updateFields.finalAmount = amountNum;
    }

    await bookingsCollection.updateOne(
      { _id: id },
      {
        $set: updateFields,
        $push: { statusHistory: { status: nextStatus, changedAt: new Date() } }
      }
    );

    res.status(200).json({
      success: true,
      message: `Job status updated to '${nextStatus}' successfully`,
      status: nextStatus
    });
  } catch (err) {
    console.error('Status transition error:', err);
    res.status(500).json({ success: false, message: 'Failed to update job status' });
  }
});

// POST /api/bookings/:id/review (Bonus 2: Rating & Review for paid booking)
router.post('/:id/review', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const booking = await bookingsCollection.findOne({ _id: id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'You can only review paid services' });
    }

    await bookingsCollection.updateOne(
      { _id: id },
      {
        $set: {
          rating: ratingNum,
          review: review?.trim() || '',
          reviewedAt: new Date()
        }
      }
    );

    res.status(200).json({ success: true, message: 'Review submitted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

export default router;
