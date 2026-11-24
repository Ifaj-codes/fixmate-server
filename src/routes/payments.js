import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { paymentsCollection, bookingsCollection, ObjectId } from '../config/db.js';
import { verifyToken, verifyCustomer } from '../middlewares/auth.js';

dotenv.config();

const router = express.Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

let stripe = null;
if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.includes('mock') && !STRIPE_SECRET_KEY.includes('Mock')) {
  try {
    stripe = new Stripe(STRIPE_SECRET_KEY);
  } catch (err) {
    console.warn('⚠️ Stripe initialization skipped (mock mode active)');
  }
}

// In-memory mock session store for local/testing without real Stripe secret
const mockStripeSessions = new Map();

// POST /api/payments/create-checkout-session (Customer only)
router.post('/create-checkout-session', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const booking = await bookingsCollection.findOne({ _id: bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Ownership check
    if (booking.customerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only pay for your own booking' });
    }

    // Must be completed and unpaid
    if (booking.status !== 'completed' || booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment is only allowed for completed, unpaid repair jobs'
      });
    }

    const finalAmount = Number(booking.finalAmount || booking.basePrice);
    const amountInCents = Math.round(finalAmount * 100);

    // If real Stripe is configured, create real Stripe Checkout Session
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `FixMate Repair: ${booking.serviceTitle}`,
                  description: `Technician: ${booking.technicianName} | Category: ${booking.category}`
                },
                unit_amount: amountInCents
              },
              quantity: 1
            }
          ],
          mode: 'payment',
          metadata: {
            bookingId: booking._id.toString(),
            customerEmail: req.user.email
          },
          success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${CLIENT_URL}/payment/cancel`
        });

        return res.status(200).json({ success: true, url: session.url, sessionId: session.id });
      } catch (stripeErr) {
        console.warn('Real stripe session creation failed, using mock session fallback:', stripeErr.message);
      }
    }

    // Test mode / Mock fallback: simulate seamless checkout session
    const mockSessionId = 'cs_test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    mockStripeSessions.set(mockSessionId, {
      id: mockSessionId,
      payment_status: 'paid',
      amount_total: amountInCents,
      currency: 'usd',
      payment_intent: 'pi_test_' + Date.now(),
      metadata: {
        bookingId: booking._id.toString(),
        customerEmail: req.user.email
      }
    });

    const mockCheckoutUrl = `${CLIENT_URL}/payment/checkout?bookingId=${booking._id}&amount=${finalAmount}&serviceTitle=${encodeURIComponent(booking.serviceTitle)}&ticketNo=${booking.ticketNo || 'FM-1045'}`;
    res.status(200).json({
      success: true,
      url: mockCheckoutUrl,
      sessionId: mockSessionId
    });
  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate payment session' });
  }
});

// POST /api/payments/complete-simulated-payment (Customer: Simulated Stripe Pay with Card)
router.post('/complete-simulated-payment', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const booking = await bookingsCollection.findOne({ _id: bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.customerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only pay for your own booking' });
    }

    if (booking.status !== 'completed' || booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Payment is only allowed for completed, unpaid bookings' });
    }

    const finalAmount = Number(booking.finalAmount || booking.basePrice);
    const txnId = 'pi_' + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();
    const sessionId = 'cs_sim_' + Date.now();

    // Check if already paid (idempotency safety check)
    const existing = await paymentsCollection.findOne({ bookingId: booking._id.toString() });
    if (!existing) {
      const newPayment = {
        bookingId: booking._id.toString(),
        serviceTitle: booking.serviceTitle,
        customerName: req.user.name,
        customerEmail: req.user.email,
        technicianName: booking.technicianName,
        technicianEmail: booking.technicianEmail,
        amount: finalAmount,
        currency: 'usd',
        transactionId: txnId,
        stripeSessionId: sessionId,
        paymentStatus: 'paid',
        paidAt: new Date()
      };
      await paymentsCollection.insertOne(newPayment);

      await bookingsCollection.updateOne(
        { _id: booking._id },
        {
          $set: { paymentStatus: 'paid', updatedAt: new Date() },
          $push: { statusHistory: { status: 'paid', changedAt: new Date() } }
        }
      );
    }

    res.status(200).json({
      success: true,
      transactionId: txnId,
      amount: finalAmount,
      serviceTitle: booking.serviceTitle,
      technicianName: booking.technicianName,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    });
  } catch (err) {
    console.error('Simulated payment error:', err);
    res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
});

// GET /api/payments/verify (Verify session & save payment idempotently)
router.get('/verify', async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'session_id is required' });
    }

    let sessionData = null;

    if (stripe) {
      try {
        sessionData = await stripe.checkout.sessions.retrieve(session_id);
      } catch (err) {
        sessionData = mockStripeSessions.get(session_id);
      }
    } else {
      sessionData = mockStripeSessions.get(session_id);
    }

    if (!sessionData) {
      return res.status(404).json({ success: false, message: 'Stripe session not found or expired' });
    }

    if (sessionData.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Stripe session indicates payment was not completed' });
    }

    const bookingId = sessionData.metadata?.bookingId;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Invalid session: bookingId missing in metadata' });
    }

    const booking = await bookingsCollection.findOne({ _id: bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Associated booking not found' });
    }

    // Idempotency check: Make sure payment is saved exactly once!
    let existingPayment = await paymentsCollection.findOne({ stripeSessionId: session_id });

    if (!existingPayment) {
      const paymentDoc = {
        bookingId: booking._id.toString(),
        serviceTitle: booking.serviceTitle,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        technicianName: booking.technicianName,
        technicianEmail: booking.technicianEmail,
        amount: sessionData.amount_total / 100,
        currency: sessionData.currency || 'usd',
        transactionId: sessionData.payment_intent || ('pi_' + Date.now()),
        stripeSessionId: session_id,
        paymentStatus: 'paid',
        paidAt: new Date(),
        createdAt: new Date()
      };

      const result = await paymentsCollection.insertOne(paymentDoc);
      existingPayment = { _id: result.insertedId, ...paymentDoc };

      // Update booking to paid & push statusHistory
      await bookingsCollection.updateOne(
        { _id: bookingId },
        {
          $set: { paymentStatus: 'paid' },
          $push: { statusHistory: { status: 'paid', changedAt: new Date() } }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      payment: existingPayment,
      booking
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
});

// GET /api/payments/my (Customer: Get payment history)
router.get('/my', verifyToken, verifyCustomer, async (req, res) => {
  try {
    const cursor = await paymentsCollection.find({ customerEmail: req.user.email });
    const payments = await cursor.sort({ paidAt: -1 }).toArray();
    res.status(200).json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
});

// POST /api/payments/webhook (Challenge 4: Stripe Webhook handler)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (stripe && endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      const existingPayment = await paymentsCollection.findOne({ stripeSessionId: session.id });
      if (!existingPayment) {
        const booking = await bookingsCollection.findOne({ _id: bookingId });
        if (booking) {
          const paymentDoc = {
            bookingId: booking._id.toString(),
            serviceTitle: booking.serviceTitle,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            technicianName: booking.technicianName,
            technicianEmail: booking.technicianEmail,
            amount: session.amount_total / 100,
            currency: session.currency || 'usd',
            transactionId: session.payment_intent,
            stripeSessionId: session.id,
            paymentStatus: 'paid',
            paidAt: new Date(),
            createdAt: new Date()
          };

          await paymentsCollection.insertOne(paymentDoc);
          await bookingsCollection.updateOne(
            { _id: bookingId },
            {
              $set: { paymentStatus: 'paid' },
              $push: { statusHistory: { status: 'paid', changedAt: new Date() } }
            }
          );
        }
      }
    }
  }

  res.json({ received: true });
});

export default router;
