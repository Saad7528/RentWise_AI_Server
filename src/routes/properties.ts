import { Router, Request, Response } from 'express';
import { Property } from '../models/Property';
import { SystemSetting } from '../models/SystemSetting';
import { authenticate } from '../middleware/auth';

const router = Router();

// 1. Get properties list (Explore / rentals) with filtering, sorting, and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      rentMin,
      rentMax,
      bedrooms,
      bathrooms,
      isBachelorAllowed,
      sort,
      lat,
      lng,
      radius,
      district,
      thana,
      neighborhood,
      page = 1,
      limit = 12,
    } = req.query;

    const query: any = { status: 'APPROVED' };

    // Cascading geographical location filters
    const addressFilters: any[] = [];
    if (district) {
      addressFilters.push({ address: { $regex: String(district), $options: 'i' } });
    }
    if (thana) {
      addressFilters.push({ address: { $regex: String(thana), $options: 'i' } });
    }
    if (neighborhood) {
      addressFilters.push({ address: { $regex: String(neighborhood), $options: 'i' } });
    }

    if (addressFilters.length > 0) {
      query.$and = query.$and || [];
      query.$and.push(...addressFilters);
    }

    // Text search (Title or Address)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Geospatial proximity search (if lat/lng pinned coordinates provided)
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radius) || 10000, // default to 10km if radius not specified
        },
      };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Price range filters
    if (rentMin || rentMax) {
      query.rentAmount = {};
      if (rentMin) query.rentAmount.$gte = Number(rentMin);
      if (rentMax) query.rentAmount.$lte = Number(rentMax);
    }

    // Bedrooms & Bathrooms
    if (bedrooms) {
      query.bedrooms = Number(bedrooms);
    }
    if (bathrooms) {
      query.bathrooms = Number(bathrooms);
    }

    // Bachelor Allowed
    if (isBachelorAllowed === 'true') {
      query.isBachelorAllowed = true;
    }

    // Sorting parameters
    let sortOption: any = { createdAt: -1 }; // default newest
    if (sort === 'priceAsc') {
      sortOption = { rentAmount: 1 };
    } else if (sort === 'priceDesc') {
      sortOption = { rentAmount: -1 };
    } else if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Apply sorting only if not doing geospatial $near query (as $near auto-sorts by proximity)
    let dbQuery = Property.find(query);
    if (!lat || !lng) {
      dbQuery = dbQuery.sort(sortOption);
    }

    const properties = await dbQuery
      .skip(skip)
      .limit(limitNum);

    const countQuery = { ...query };
    if (countQuery.location && countQuery.location.$near) {
      const rad = (Number(radius) || 10000) / 6378100; // convert radius to radians for earth sphere
      countQuery.location = {
        $geoWithin: {
          $centerSphere: [ [ Number(lng), Number(lat) ], rad ]
        }
      };
    }

    const total = await Property.countDocuments(countQuery);

    res.json({
      properties,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

// 2. Geospatial Radius search (nearby properties)
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // Radius in meters (default 5km)

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and Longitude are required' });
    }

    const properties = await Property.find({
      status: 'APPROVED',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radius),
        },
      },
    }).limit(20);

    res.json({ properties });
  } catch (error) {
    console.error('Geospatial query error:', error);
    res.status(500).json({ message: 'Failed to find nearby properties' });
  }
});

// 3. Get Landlord's own listings (Protected)
router.get('/my-listings', authenticate, async (req: Request, res: Response) => {
  try {
    const landlordId = req.user?.id || req.user?._id.toString();
    const properties = await Property.find({ landlordId }).sort({ createdAt: -1 });
    res.json({ properties });
  } catch (error) {
    console.error('Error fetching landlord listings:', error);
    res.status(500).json({ message: 'Failed to fetch your listings' });
  }
});

// 4. Get Single Property Details (Public) + Related properties
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Get related properties (same area/category, excluding current one)
    const firstWordAddress = property.address.split(',')[0].trim();
    const related = await Property.find({
      _id: { $ne: property._id },
      status: 'APPROVED',
      $or: [
        { category: property.category },
        { address: { $regex: firstWordAddress, $options: 'i' } }
      ]
    }).limit(4);

    res.json({ property, related });
  } catch (error) {
    console.error('Error fetching property detail:', error);
    res.status(500).json({ message: 'Failed to fetch property details' });
  }
});

// 5. Create new property listing (Protected)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      rentAmount,
      deposit,
      category,
      bedrooms,
      bathrooms,
      isBachelorAllowed,
      address,
      latitude,
      longitude,
      images,
      contactPhone,
    } = req.body;

    // Simple validation
    if (!title || !rentAmount || !category || !bedrooms || !bathrooms || !address || !latitude || !longitude || !contactPhone) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Fetch system settings to see if we should auto-approve
    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = await SystemSetting.create({ autoApproveListings: false });
    }

    const landlordId = req.user?.id || req.user?._id.toString();
    const status = setting.autoApproveListings ? 'APPROVED' : 'PENDING';

    const newProperty = await Property.create({
      title,
      description,
      rentAmount: Number(rentAmount),
      deposit: Number(deposit || 0),
      category,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      isBachelorAllowed: isBachelorAllowed === true || isBachelorAllowed === 'true',
      address,
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)], // [longitude, latitude]
      },
      images: Array.isArray(images) ? images : [],
      status,
      landlordId,
      contactPhone,
    });

    res.status(201).json({
      message: status === 'APPROVED' ? 'Property listed successfully' : 'Property submitted for admin approval',
      property: newProperty,
    });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ message: 'Failed to create property listing' });
  }
});

// 6. Update property listing (Protected, owner or admin)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const landlordId = req.user?.id || req.user?._id.toString();
    const isAdmin = req.user?.role === 'ADMIN';

    // Verify ownership or admin privileges
    if (property.landlordId !== landlordId && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to modify this listing' });
    }

    const {
      title,
      description,
      rentAmount,
      deposit,
      category,
      bedrooms,
      bathrooms,
      isBachelorAllowed,
      address,
      latitude,
      longitude,
      images,
      contactPhone,
      status,
    } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (rentAmount !== undefined) updateData.rentAmount = Number(rentAmount);
    if (deposit !== undefined) updateData.deposit = Number(deposit);
    if (category !== undefined) updateData.category = category;
    if (bedrooms !== undefined) updateData.bedrooms = Number(bedrooms);
    if (bathrooms !== undefined) updateData.bathrooms = Number(bathrooms);
    if (isBachelorAllowed !== undefined) updateData.isBachelorAllowed = isBachelorAllowed === true;
    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined && longitude !== undefined) {
      updateData.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
    }
    if (images !== undefined) updateData.images = images;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;

    // Landlords can mark as RENTED or PENDING (if updating), Admins can change status directly
    if (status !== undefined) {
      if (isAdmin) {
        updateData.status = status;
      } else if (status === 'RENTED' || status === 'APPROVED') {
        updateData.status = status;
      }
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    res.json({ message: 'Property updated successfully', property: updatedProperty });
  } catch (error) {
    console.error('Error updating property:', error);
    res.status(500).json({ message: 'Failed to update property' });
  }
});

// 7. Delete property listing (Protected, owner or admin)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const landlordId = req.user?.id || req.user?._id.toString();
    const isAdmin = req.user?.role === 'ADMIN';

    // Verify ownership or admin privileges
    if (property.landlordId !== landlordId && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to delete this listing' });
    }

    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ message: 'Failed to delete listing' });
  }
});

export default router;
