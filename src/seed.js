import bcrypt from 'bcryptjs';
import { connectDB, usersCollection, servicesCollection, bookingsCollection, paymentsCollection, ObjectId } from './config/db.js';

export async function runSeed() {
  console.log('🌱 Starting FixMate database seeding...');
  await connectDB();

  // Clear existing collections if desired
  const existingUsers = await usersCollection.countDocuments({});
  if (existingUsers > 0) {
    console.log(`Database already has ${existingUsers} users. Refreshing seed data...`);
  }

  // Common passwords
  const adminPass = await bcrypt.hash('Admin123#', 10);
  const techPass = await bcrypt.hash('Tech123#', 10);
  const userPass = await bcrypt.hash('User123#', 10);

  // 1. Users
  const seedUsers = [
    {
      _id: 'usr_admin_1',
      name: 'System Admin',
      email: 'admin@fixmate.com',
      password: adminPass,
      role: 'admin',
      phone: '+8801711000001',
      area: 'Gulshan, Dhaka',
      bio: 'FixMate platform master supervisor and lead service quality coordinator.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
      createdAt: new Date('2026-01-01')
    },
    {
      _id: 'usr_tech_1',
      name: 'Rahim Uddin (Pro Tech)',
      email: 'rahim.tech@fixmate.com',
      password: techPass,
      role: 'technician',
      phone: '+8801812345678',
      area: 'Dhanmondi, Dhaka',
      bio: 'Apple & Samsung certified hardware engineer with 8+ years experience in PCB diagnostics and micro-soldering.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      createdAt: new Date('2026-01-05')
    },
    {
      _id: 'usr_tech_2',
      name: 'Karimul Hasan (HVAC & Cooling)',
      email: 'karim.repair@fixmate.com',
      password: techPass,
      role: 'technician',
      phone: '+8801918765432',
      area: 'Mirpur, Dhaka',
      bio: 'Specialist in inverter AC servicing, compressor diagnostics, and high-capacity refrigerator gas refilling.',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      createdAt: new Date('2026-01-06')
    },
    {
      _id: 'usr_tech_3',
      name: 'Suman Roy (Home Electronics)',
      email: 'suman.tech@fixmate.com',
      password: techPass,
      role: 'technician',
      phone: '+8801611223344',
      area: 'Uttara, Dhaka',
      bio: 'Master technician for 4K OLED TVs, front-load washing machines, and domestic electrical safety cabling.',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
      createdAt: new Date('2026-01-08')
    },
    {
      _id: 'usr_cust_1',
      name: 'Nesar Uddin Ifaj (Customer)',
      email: 'customer@fixmate.com',
      password: userPass,
      role: 'customer',
      phone: '+8801755123456',
      area: 'Cumilla Cantonment',
      bio: 'Tech enthusiast and smart home user.',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      createdAt: new Date('2026-01-10')
    },
    {
      _id: 'usr_cust_2',
      name: 'Tanvir Hossain',
      email: 'tanvir@gmail.com',
      password: userPass,
      role: 'customer',
      phone: '+8801799887766',
      area: 'Banani, Dhaka',
      bio: 'Frequent customer for office IT hardware fixes.',
      image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
      createdAt: new Date('2026-01-12')
    }
  ];

  // 2. Services (14 comprehensive services across all categories)
  const seedServices = [
    {
      _id: 'srv_1',
      title: 'iPhone Original OLED Display Replacement',
      category: 'Smartphone',
      description: 'Complete display module replacement using genuine OEM panels. Includes TrueTone transfer, waterproof gasket sealing, and 6-month warranty.',
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
      basePrice: 65,
      estimatedDuration: '1-2 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Dhanmondi, Mohammadpur & Banani',
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-15')
    },
    {
      _id: 'srv_2',
      title: 'Samsung Galaxy Motherboard & Power IC Repair',
      category: 'Smartphone',
      description: 'Advanced SMD re-balling and short circuit removal for dead Samsung Galaxy S & Z series. Fixes no boot, bootloop, and sudden shutdown.',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      basePrice: 45,
      estimatedDuration: '3-5 hours',
      serviceMode: 'Shop Drop-off',
      serviceArea: 'Dhanmondi & Mirpur',
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-16')
    },
    {
      _id: 'srv_3',
      title: 'Gaming Laptop Deep Thermal Servicing & Liquid Metal Paste',
      category: 'Laptop & PC',
      description: 'Ultrasonic fan cleansing, heatpipe flushes, thermal pad replacement, and Arctic MX-6 / Liquid Metal application to drop temperatures by 15°C.',
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
      basePrice: 35,
      estimatedDuration: '2 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'All Dhaka Metropolitan Area',
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-18')
    },
    {
      _id: 'srv_4',
      title: 'MacBook Logic Board Water Damage Restoration',
      category: 'Laptop & PC',
      description: 'Chemical ultrasonic cleaning for corroded MacBook Air/Pro logic boards, trace reconstruction, and charging port IC chip replacement.',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
      basePrice: 85,
      estimatedDuration: '1-2 days',
      serviceMode: 'Shop Drop-off',
      serviceArea: 'Dhanmondi, Dhaka',
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-20')
    },
    {
      _id: 'srv_5',
      title: 'Split Inverter AC Jet-Wash Servicing & Disinfection',
      category: 'AC',
      description: 'High-pressure water pump jet wash for indoor blower and outdoor condenser coil. Clears molds, eliminates odors, and increases airflow.',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      basePrice: 25,
      estimatedDuration: '1 hour',
      serviceMode: 'Home Visit',
      serviceArea: 'Mirpur, Uttara & Gulshan',
      technicianName: 'Karimul Hasan (HVAC & Cooling)',
      technicianEmail: 'karim.repair@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-22')
    },
    {
      _id: 'srv_6',
      title: 'AC R32 / R410A Refrigerant Gas Leak Repair & Refill',
      category: 'AC',
      description: 'Nitrogen pressure leak detection, copper pipe brazing, vacuumization, and digital scale charging of high purity R32/R410A refrigerant gas.',
      image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      basePrice: 55,
      estimatedDuration: '2-3 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Mirpur, Dhaka',
      technicianName: 'Karimul Hasan (HVAC & Cooling)',
      technicianEmail: 'karim.repair@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-24')
    },
    {
      _id: 'srv_7',
      title: 'Double Door Refrigerator No-Frost Cooling Failure Fix',
      category: 'Refrigerator',
      description: 'Diagnosis and replacement of faulty defrost heaters, bi-metal sensors, defrost timers, and evaporator fan motors. Solves bottom chamber cooling loss.',
      image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
      basePrice: 40,
      estimatedDuration: '2 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Mirpur, Mohammadpur, Dhanmondi',
      technicianName: 'Karimul Hasan (HVAC & Cooling)',
      technicianEmail: 'karim.repair@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-26')
    },
    {
      _id: 'srv_8',
      title: 'Deep Freezer Compressor Replacement & R600a Gas Charging',
      category: 'Refrigerator',
      description: 'Original high-efficiency compressor installation with new copper filter drier, safety flushes, and environmentally friendly R600a gas charging.',
      image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
      basePrice: 90,
      estimatedDuration: '3-4 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Mirpur & Northern Dhaka',
      technicianName: 'Karimul Hasan (HVAC & Cooling)',
      technicianEmail: 'karim.repair@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-01-28')
    },
    {
      _id: 'srv_9',
      title: 'Smart 4K LED TV Backlight Strip Replacement',
      category: 'TV',
      description: 'Complete replacement of burnt LED backlight arrays with high-lumen, heat-sink backed LED bars. Fixes black screen with sound issues.',
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
      basePrice: 50,
      estimatedDuration: '2-3 hours',
      serviceMode: 'Shop Drop-off',
      serviceArea: 'Uttara & Mirpur',
      technicianName: 'Suman Roy (Home Electronics)',
      technicianEmail: 'suman.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-02-01')
    },
    {
      _id: 'srv_10',
      title: 'Smart TV Motherboard Firmware Flashing & HDMI Port Fix',
      category: 'TV',
      description: 'EEPROM programmer flashing for bootlooping Android/Google TVs, replacing damaged HDMI 2.1 ARC ports, and audio amp IC repair.',
      image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
      basePrice: 38,
      estimatedDuration: '1-2 days',
      serviceMode: 'Shop Drop-off',
      serviceArea: 'Uttara, Dhaka',
      technicianName: 'Suman Roy (Home Electronics)',
      technicianEmail: 'suman.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-02-03')
    },
    {
      _id: 'srv_11',
      title: 'Front-Load Washing Machine Drum Bearing & Seal Replacement',
      category: 'Washing Machine',
      description: 'Solving loud grinding noise during spin cycle. Heavy duty stainless drum bearing extraction, grease packing, and water-tight oil seal fitting.',
      image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
      basePrice: 70,
      estimatedDuration: '3-4 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Uttara, Gulshan & Banani',
      technicianName: 'Suman Roy (Home Electronics)',
      technicianEmail: 'suman.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-02-05')
    },
    {
      _id: 'srv_12',
      title: 'Washing Machine Drain Pump & Inlet Solenoid Valve Fix',
      category: 'Washing Machine',
      description: 'Troubleshooting error codes OE, 5E, and IE. Replacement of burned drain motor pumps and stuck dual water inlet valves.',
      image: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=80',
      basePrice: 32,
      estimatedDuration: '1-2 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'All Dhaka',
      technicianName: 'Suman Roy (Home Electronics)',
      technicianEmail: 'suman.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-02-08')
    },
    {
      _id: 'srv_13',
      title: 'Residential Circuit Breaker & Short Circuit Diagnostics',
      category: 'Electrical',
      description: 'Insulation megger testing, earthing voltage verification, distribution board load rebalancing, and RCBO/MCB replacement for home safety.',
      image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
      basePrice: 30,
      estimatedDuration: '2 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Dhanmondi, Gulshan, Mirpur',
      technicianName: 'Suman Roy (Home Electronics)',
      technicianEmail: 'suman.tech@fixmate.com',
      approvalStatus: 'approved',
      isAvailable: true,
      createdAt: new Date('2026-02-10')
    },
    {
      _id: 'srv_14',
      title: 'Smart Home Automated Switchboard & Inverter Wiring',
      category: 'Electrical',
      description: 'Complete wiring of Tuya/Zigbee smart relay switches, heavy appliance power sockets, and automatic changeover switch installation.',
      image: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800&q=80',
      basePrice: 48,
      estimatedDuration: '3-4 hours',
      serviceMode: 'Home Visit',
      serviceArea: 'Uttara, Dhanmondi, Gulshan',
      technicianName: 'Suman Roy (Home Electronics)',
      technicianEmail: 'suman.tech@fixmate.com',
      approvalStatus: 'pending', // Demo pending service for admin to approve!
      isAvailable: true,
      createdAt: new Date('2026-02-12')
    }
  ];

  // 3. Realistic Bookings in different stages
  const seedBookings = [
    {
      _id: 'bkg_1',
      serviceId: 'srv_1',
      serviceTitle: 'iPhone Original OLED Display Replacement',
      serviceImage: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80',
      category: 'Smartphone',
      basePrice: 65,
      finalAmount: 65,
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      customerName: 'Nesar Uddin Ifaj (Customer)',
      customerEmail: 'customer@fixmate.com',
      customerPhone: '+8801755123456',
      address: 'House 14, Road 5, Dhanmondi, Dhaka',
      preferredDate: new Date('2026-02-15'),
      problemDescription: 'My iPhone 14 Pro dropped on the floor and the upper right corner has black ink bleeding with touch lag.',
      status: 'completed',
      paymentStatus: 'paid',
      statusHistory: [
        { status: 'requested', changedAt: new Date('2026-02-15T10:00:00Z') },
        { status: 'accepted', changedAt: new Date('2026-02-15T11:00:00Z') },
        { status: 'in-progress', changedAt: new Date('2026-02-15T13:00:00Z') },
        { status: 'completed', changedAt: new Date('2026-02-15T15:00:00Z') },
        { status: 'paid', changedAt: new Date('2026-02-15T15:30:00Z') }
      ],
      createdAt: new Date('2026-02-15T10:00:00Z')
    },
    {
      _id: 'bkg_2',
      serviceId: 'srv_5',
      serviceTitle: 'Split Inverter AC Jet-Wash Servicing & Disinfection',
      serviceImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      category: 'AC',
      basePrice: 25,
      finalAmount: 30, // Includes minor outdoor drainage pipe fix
      technicianName: 'Karimul Hasan (HVAC & Cooling)',
      technicianEmail: 'karim.repair@fixmate.com',
      customerName: 'Nesar Uddin Ifaj (Customer)',
      customerEmail: 'customer@fixmate.com',
      customerPhone: '+8801755123456',
      address: 'Flat 4B, Green Corner, Mirpur 10, Dhaka',
      preferredDate: new Date('2026-02-20'),
      problemDescription: 'Gree 1.5 ton AC has bad mildew smell and reduced airflow across the room for 3 weeks.',
      status: 'completed',
      paymentStatus: 'unpaid', // Demo Pay Now button for customer!
      statusHistory: [
        { status: 'requested', changedAt: new Date('2026-02-20T09:00:00Z') },
        { status: 'accepted', changedAt: new Date('2026-02-20T10:00:00Z') },
        { status: 'in-progress', changedAt: new Date('2026-02-20T12:00:00Z') },
        { status: 'completed', changedAt: new Date('2026-02-20T14:00:00Z') }
      ],
      createdAt: new Date('2026-02-20T09:00:00Z')
    },
    {
      _id: 'bkg_3',
      serviceId: 'srv_3',
      serviceTitle: 'Gaming Laptop Deep Thermal Servicing & Liquid Metal Paste',
      serviceImage: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80',
      category: 'Laptop & PC',
      basePrice: 35,
      finalAmount: 35,
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      customerName: 'Tanvir Hossain',
      customerEmail: 'tanvir@gmail.com',
      customerPhone: '+8801799887766',
      address: 'Banani Block C, Road 11, Dhaka',
      preferredDate: new Date('2026-02-22'),
      problemDescription: 'Asus ROG Strix throttling CPU to 98C during rendering and shutting down randomly.',
      status: 'in-progress',
      paymentStatus: 'unpaid',
      statusHistory: [
        { status: 'requested', changedAt: new Date('2026-02-22T08:30:00Z') },
        { status: 'accepted', changedAt: new Date('2026-02-22T09:30:00Z') },
        { status: 'in-progress', changedAt: new Date('2026-02-22T11:00:00Z') }
      ],
      createdAt: new Date('2026-02-22T08:30:00Z')
    },
    {
      _id: 'bkg_4',
      serviceId: 'srv_7',
      serviceTitle: 'Double Door Refrigerator No-Frost Cooling Failure Fix',
      serviceImage: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
      category: 'Refrigerator',
      basePrice: 40,
      finalAmount: 40,
      technicianName: 'Karimul Hasan (HVAC & Cooling)',
      technicianEmail: 'karim.repair@fixmate.com',
      customerName: 'Nesar Uddin Ifaj (Customer)',
      customerEmail: 'customer@fixmate.com',
      customerPhone: '+8801755123456',
      address: 'Mirpur DOHS, Road 3, Dhaka',
      preferredDate: new Date('2026-02-24'),
      problemDescription: 'Top freezer is freezing rock solid but bottom refrigerator compartment is completely warm.',
      status: 'requested', // Demo for technician to Accept / Reject!
      paymentStatus: 'unpaid',
      statusHistory: [
        { status: 'requested', changedAt: new Date('2026-02-24T10:00:00Z') }
      ],
      createdAt: new Date('2026-02-24T10:00:00Z')
    }
  ];

  // 4. Corresponding Payments
  const seedPayments = [
    {
      _id: 'pay_1',
      bookingId: 'bkg_1',
      serviceTitle: 'iPhone Original OLED Display Replacement',
      customerName: 'Nesar Uddin Ifaj (Customer)',
      customerEmail: 'customer@fixmate.com',
      technicianName: 'Rahim Uddin (Pro Tech)',
      technicianEmail: 'rahim.tech@fixmate.com',
      amount: 65,
      currency: 'usd',
      transactionId: 'pi_3MtwL2LkdIwHu7ix28a3tLqE',
      stripeSessionId: 'cs_test_seed_session_paid_001',
      paymentStatus: 'paid',
      paidAt: new Date('2026-02-15T15:30:00Z'),
      createdAt: new Date('2026-02-15T15:30:00Z')
    }
  ];

  // Insert documents
  for (const u of seedUsers) {
    const existing = await usersCollection.findOne({ email: u.email });
    if (!existing) await usersCollection.insertOne(u);
  }

  for (const s of seedServices) {
    const existing = await servicesCollection.findOne({ _id: s._id });
    if (!existing) await servicesCollection.insertOne(s);
  }

  for (const b of seedBookings) {
    const existing = await bookingsCollection.findOne({ _id: b._id });
    if (!existing) await bookingsCollection.insertOne(b);
  }

  for (const p of seedPayments) {
    const existing = await paymentsCollection.findOne({ _id: p._id });
    if (!existing) await paymentsCollection.insertOne(p);
  }

  console.log('✅ FixMate database seed completed successfully!');
  console.log('Accounts ready:');
  console.log('  Admin:      admin@fixmate.com     / Admin123#');
  console.log('  Technician: rahim.tech@fixmate.com / Tech123#');
  console.log('  Customer:   customer@fixmate.com   / User123#');
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
