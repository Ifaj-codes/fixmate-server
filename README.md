# FixMate Server — Backend REST API

FixMate is an on-demand device and home appliance repair service platform backend built with Node.js, Express.js, MongoDB, BetterAuth, JWT, and Stripe.

## Key Features
- **4 MongoDB Collections Architecture**: `users`, `services`, `bookings`, `payments`.
- **Challenge 1**: Server-side Search, Category & Service Mode Filter, Sort (Price Low-to-High, High-to-Low, Newest), and Server-Side Pagination.
- **Challenge 2**: JWT Authentication & Role-Based Middlewares (`verifyToken`, `verifyCustomer`, `verifyTechnician`, `verifyAdmin`).
- **Challenge 3**: Server-Enforced Job Status Pipeline (`requested` → `accepted`/`rejected` → `in-progress` → `completed` with `finalAmount` → `paid`).
- **Challenge 4**: Stripe Checkout & Webhook Integration with strict idempotency (same payment cannot be recorded twice).
- **Admin Management**: User role modification (cannot change self), service approval/rejection, booking inspection, total revenue metrics.
- **Seed Data Engine**: Built-in seed script generating Admin, Technicians, Customers, 14 approved services, and realistic multi-stage bookings.

## Test Credentials
- **Admin**: `admin@fixmate.com` / `Admin123#`
- **Technician**: `rahim.tech@fixmate.com` / `Tech123#`
- **Customer**: `customer@fixmate.com` / `User123#`

## Environment Variables (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
IMGBB_API_KEY=your_imgbb_api_key
```

## Running Locally
```bash
npm install
npm run seed     # Populate realistic data
npm run dev      # Start server with file watching
```
