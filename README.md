# FixMate Server — Backend REST API

RESTful API backend for **FixMate** (Smart Device & Home Appliance Repair Service Platform), built for **CSE-324 Web Technologies Sessional (Assignment 9)**.

---

## 📌 Project Overview
- **Developer**: Nesar Uddin Ifaj
- **Student ID**: 1119004
- **Institution**: Bangladesh Army International University of Science and Technology (BAIUST)
- **Course**: CSE-324 Web Technologies Sessional
- **Category**: 006

---

## 🌐 Endpoints & Repositories
- **Live Production API**: [https://fixmate-server-blond.vercel.app](https://fixmate-server-blond.vercel.app)
- **Live Client Web App**: [https://fixmate-client-six-xi.vercel.app](https://fixmate-client-six-xi.vercel.app)
- **Server Repository**: [https://github.com/Ifaj-codes/fixmate-server](https://github.com/Ifaj-codes/fixmate-server)
- **Client Repository**: [https://github.com/Ifaj-codes/fixmate-client](https://github.com/Ifaj-codes/fixmate-client)

---

## 🛠️ Tech Architecture
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (ES Modules)
- **Database**: MongoDB (Atlas cloud connection with local data store fallback)
- **Authentication**: JWT (JSON Web Tokens) with custom role-based middlewares
- **Payment Gateway**: Stripe Checkout & Webhook verification with idempotent transaction storage

---

## 📂 Core MongoDB Collections
1. `users`: Credentials, roles (`customer`, `technician`, `admin`), profile data, timestamps.
2. `services`: Repair catalog listings, pricing, duration, approval status (`pending`, `approved`, `rejected`), availability toggle.
3. `bookings`: Repair jobs, customer info, technician assignments, status pipeline (`requested`, `accepted`, `in-progress`, `completed`, `cancelled`, `rejected`), ticket numbers (`Ticket #FM-XXXX`), final bill amounts.
4. `payments`: Payment records, transaction IDs, timestamps, payment method, booking references.

---

## 🔒 Security & Middlewares
- `verifyToken`: Validates incoming JWT bearer tokens.
- `verifyCustomer`: Ensures only authenticated customers can book repairs and initiate checkout.
- `verifyTechnician`: Restricts job pipeline transitions and service creation to verified technicians.
- `verifyAdmin`: Guards platform user management, listing approvals, and platform financials.

---

## 🔑 Test Credentials

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@fixmate.com` | `Admin123#` |
| **Technician** | `rahim.tech@fixmate.com` | `Tech123#` |
| **Customer** | `customer@fixmate.com` | `User123#` |

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Seed initial data (users, approved services, bookings)
npm run seed

# 3. Start development server
npm run dev
```

---

## 👤 Author Contact
- **Nesar Uddin Ifaj**
- Student ID: 1119004 | BAIUST CSE
- Email: `nesaruddinifaj@gmail.com`
- GitHub: [https://github.com/Ifaj-codes](https://github.com/Ifaj-codes)
- LinkedIn: [https://www.linkedin.com/in/nesar-uddin-ifaj-0a8567446](https://www.linkedin.com/in/nesar-uddin-ifaj-0a8567446)
