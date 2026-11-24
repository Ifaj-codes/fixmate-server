import express from 'express';
import { servicesCollection, usersCollection, ObjectId } from '../config/db.js';
import { verifyToken, verifyTechnician } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/services (Public with Server-side Search, Filter, Sort, Pagination)
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      serviceMode = '',
      sort = 'newest',
      page = 1,
      limit = 9,
      featured = false
    } = req.query;

    const query = {
      approvalStatus: 'approved',
      isAvailable: true
    };

    // Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // Service Mode filter
    if (serviceMode && serviceMode !== 'All') {
      query.serviceMode = serviceMode;
    }

    // Search filter (by title or category)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { category: searchRegex },
        { description: searchRegex }
      ];
    }

    // Sort order definition
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortObj = { basePrice: 1 };
    } else if (sort === 'price_desc') {
      sortObj = { basePrice: -1 };
    } else if (sort === 'newest') {
      sortObj = { createdAt: -1 };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = featured ? 6 : (parseInt(limit, 10) || 9);
    const skipNum = featured ? 0 : (pageNum - 1) * limitNum;

    // Execute count and query on MongoDB / store
    const totalCount = await servicesCollection.countDocuments(query);
    const cursor = await servicesCollection.find(query);
    const services = await cursor.sort(sortObj).skip(skipNum).limit(limitNum).toArray();

    res.status(200).json({
      success: true,
      services,
      total: totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      limit: limitNum
    });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// GET /api/services/technician/my (Technician: Get own services)
router.get('/technician/my', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const cursor = await servicesCollection.find({ technicianEmail: req.user.email });
    const services = await cursor.sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch technician services' });
  }
});

// GET /api/services/:id (Public: Get single service details)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query;
    try {
      query = { _id: id };
    } catch {
      query = { _id: id };
    }

    const service = await servicesCollection.findOne(query);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Fetch technician summary from users collection
    const technicianUser = await usersCollection.findOne({ email: service.technicianEmail });
    const technicianSummary = {
      name: service.technicianName,
      email: service.technicianEmail,
      photo: technicianUser?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      area: technicianUser?.area || service.serviceArea || 'Dhaka',
      bio: technicianUser?.bio || 'Certified specialist with extensive repair experience.'
    };

    res.status(200).json({
      success: true,
      service: {
        ...service,
        technician: technicianSummary
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch service details' });
  }
});

// POST /api/services (Technician: Add a new service)
router.post('/', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      basePrice,
      estimatedDuration,
      serviceMode,
      serviceArea,
      image
    } = req.body;

    if (!title || !category || !description || !basePrice || !estimatedDuration || !serviceMode || !serviceArea) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const priceNum = Number(basePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Base price must be a positive number' });
    }

    const newService = {
      title: title.trim(),
      category,
      description: description.trim(),
      basePrice: priceNum,
      estimatedDuration: estimatedDuration.trim(),
      serviceMode,
      serviceArea: serviceArea.trim(),
      image: image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      technicianName: req.user.name,
      technicianEmail: req.user.email,
      approvalStatus: 'pending',
      isAvailable: true,
      createdAt: new Date()
    };

    const result = await servicesCollection.insertOne(newService);
    res.status(201).json({
      success: true,
      message: 'Service created successfully and waiting for admin approval',
      serviceId: result.insertedId
    });
  } catch (err) {
    console.error('Add service error:', err);
    res.status(500).json({ success: false, message: 'Failed to add service' });
  }
});

// PATCH /api/services/:id (Technician: Update service - resets approvalStatus to pending)
router.patch('/:id', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const service = await servicesCollection.findOne({ _id: id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.technicianEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only edit your own services' });
    }

    const {
      title,
      category,
      description,
      basePrice,
      estimatedDuration,
      serviceMode,
      serviceArea,
      image
    } = req.body;

    const updateFields = {
      approvalStatus: 'pending' // Rule: Resets back to pending upon editing!
    };

    if (title) updateFields.title = title.trim();
    if (category) updateFields.category = category;
    if (description) updateFields.description = description.trim();
    if (basePrice !== undefined) updateFields.basePrice = Number(basePrice);
    if (estimatedDuration) updateFields.estimatedDuration = estimatedDuration.trim();
    if (serviceMode) updateFields.serviceMode = serviceMode;
    if (serviceArea) updateFields.serviceArea = serviceArea.trim();
    if (image) updateFields.image = image;

    await servicesCollection.updateOne({ _id: id }, { $set: updateFields });

    res.status(200).json({
      success: true,
      message: 'Service updated successfully and re-submitted for admin approval'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update service' });
  }
});

// PATCH /api/services/:id/availability (Technician: Toggle availability)
router.patch('/:id/availability', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const service = await servicesCollection.findOne({ _id: id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.technicianEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only toggle your own services' });
    }

    const newAvailability = !service.isAvailable;
    await servicesCollection.updateOne({ _id: id }, { $set: { isAvailable: newAvailability } });

    res.status(200).json({
      success: true,
      message: `Service availability set to ${newAvailability ? 'Available' : 'Unavailable'}`,
      isAvailable: newAvailability
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
});

// DELETE /api/services/:id (Technician: Delete service)
router.delete('/:id', verifyToken, verifyTechnician, async (req, res) => {
  try {
    const { id } = req.params;
    const service = await servicesCollection.findOne({ _id: id });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.technicianEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own services' });
    }

    await servicesCollection.deleteOne({ _id: id });
    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete service' });
  }
});

export default router;
