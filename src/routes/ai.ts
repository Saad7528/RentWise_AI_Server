import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { generateListingDescription, parseNaturalLanguageQuery } from '../services/aiService';
import { Property } from '../models/Property';

const router = Router();

// 1. AI Description and Title Generator
router.post('/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const { title, rentAmount, category, bedrooms, bathrooms, address, isBachelorAllowed, imagesBase64, description } = req.body;

    // Strict validation ONLY when no description draft is provided to polish
    if (!description && (!rentAmount || !category || !bedrooms || !bathrooms || !address)) {
      return res.status(400).json({ message: 'Missing required metadata for description generation' });
    }

    const aiResponse = await generateListingDescription(
      {
        title,
        rentAmount: rentAmount ? Number(rentAmount) : 0,
        category: category || 'Family',
        bedrooms: bedrooms ? Number(bedrooms) : 0,
        bathrooms: bathrooms ? Number(bathrooms) : 0,
        address: address || '',
        isBachelorAllowed: isBachelorAllowed === true || isBachelorAllowed === 'true',
        description,
      },
      imagesBase64
    );

    res.json(aiResponse);
  } catch (error) {
    console.error('AI Generator Route Error:', error);
    res.status(500).json({ message: 'AI generation failed' });
  }
});

// 2. AI Smart Recommendation Engine (Natural Language Query parsing)
router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { queryText } = req.body;

    if (!queryText || queryText.trim() === '') {
      return res.status(400).json({ message: 'Query text is required' });
    }

    // Parse user intent using Gemini 1.5 Flash
    const parsedQuery = await parseNaturalLanguageQuery(queryText);
    const { filters, reasoning } = parsedQuery;

    // Build MongoDB query based on extracted filters
    const dbQuery: any = { status: 'APPROVED' };

    if (filters.address) {
      // Search address by regex match
      dbQuery.address = { $regex: filters.address, $options: 'i' };
    }

    if (filters.rentMin !== undefined && filters.rentMin !== null) {
      dbQuery.rentAmount = dbQuery.rentAmount || {};
      dbQuery.rentAmount.$gte = filters.rentMin;
    }

    if (filters.rentMax !== undefined && filters.rentMax !== null) {
      dbQuery.rentAmount = dbQuery.rentAmount || {};
      dbQuery.rentAmount.$lte = filters.rentMax;
    }

    if (filters.bedrooms) {
      dbQuery.bedrooms = filters.bedrooms;
    }

    if (filters.bathrooms) {
      dbQuery.bathrooms = filters.bathrooms;
    }

    if (filters.isBachelorAllowed === true) {
      dbQuery.isBachelorAllowed = true;
    }

    if (filters.category) {
      dbQuery.category = filters.category;
    }

    // Execute the database search
    const properties = await Property.find(dbQuery).sort({ createdAt: -1 }).limit(10);

    res.json({
      properties,
      reasoning,
      parsedFilters: filters,
    });
  } catch (error) {
    console.error('AI Recommendation Route Error:', error);
    res.status(500).json({ message: 'Recommendation query failed' });
  }
});

export default router;
