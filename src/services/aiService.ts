import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API client safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('WARNING: GEMINI_API_KEY is not configured. AI features will run in mock mode.');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

// Safe wrapper for Gemini 1.5 Flash Model
export const generateListingDescription = async (
  metadata: {
    title?: string;
    rentAmount: number;
    category: string;
    bedrooms: number;
    bathrooms: number;
    address: string;
    isBachelorAllowed: boolean;
    description?: string; // Optional user dictation draft
  },
  imagesBase64?: string[] // Optional base64 image strings
): Promise<{ title: string; description: string; tags: string[]; extractedSpecs?: { rentAmount?: number; bedrooms?: number; bathrooms?: number } }> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert real estate copywriter in Bangladesh. Based on the following property details, draft description (which might be raw speech-to-text text in Bangla/English), and uploaded images, generate a high-converting listing.
      
      Property Info:
      - Initial Title: "${metadata.title || ''}"
      - Rent Amount: ${metadata.rentAmount || 'Not specified'} BDT
      - Category: ${metadata.category}
      - Bedrooms: ${metadata.bedrooms || 'Not specified'}
      - Bathrooms: ${metadata.bathrooms || 'Not specified'}
      - Address/Location: "${metadata.address || 'Not specified'}"
      - Bachelor Allowed: ${metadata.isBachelorAllowed ? 'Yes' : 'No'}
      - Existing User Input/Voice Draft: "${metadata.description || ''}"
      
      Generate a response STRICTLY in JSON format matching this schema:
      {
        "title": "An attractive, catchy listing title including location and key features (e.g., 'Spacious 3 BHK Family Apartment in Dhanmondi')",
        "description": "A structured, detailed description written in markdown (in clear Bengali language) highlighting key features, ventilation, lighting, security, nearby landmarks, and amenities. Correct grammar and spelling of any voice draft, polishing it into highly professional copy.",
        "tags": ["array", "of", "5-7", "relevant", "search", "tags", "in", "english", "and", "bengali"],
        "extractedSpecs": {
          "rentAmount": 12000 (extract this from the Voice Draft text if it wasn't specified in the rentAmount field, e.g. if the voice draft says 'ভাড়া ৪৭০০' extract 4700 as a number. Otherwise, omit this key),
          "bedrooms": 3 (extract bedroom count as number from the Voice Draft if not specified in metadata),
          "bathrooms": 2 (extract bathroom count as number from the Voice Draft if not specified in metadata)
        }
      }

      Do not wrap the response in markdown blocks like \`\`\`json. Return only raw, parseable JSON.
    `;

    const contents: any[] = [prompt];

    // Handle optional base64 images (multimodal vision support)
    if (imagesBase64 && imagesBase64.length > 0) {
      imagesBase64.forEach((imgBase64, idx) => {
        // Strip data prefix if present (e.g., "data:image/jpeg;base64,")
        const cleanBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, '');
        contents.push({
          inlineData: {
            data: cleanBase64,
            mimeType: 'image/jpeg',
          },
        });
      });
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text().trim();
    
    // Clean response in case LLM wraps it in markdown codeblocks
    const cleanJson = responseText
      .replace(/^```json/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleanJson);
    return {
      title: parsed.title || metadata.title || 'Premium Rental Property',
      description: parsed.description || 'No description generated.',
      tags: parsed.tags || ['tolet', 'dhaka', 'rent'],
      extractedSpecs: parsed.extractedSpecs || undefined,
    };
  } catch (error) {
    console.error('Gemini listing generator error:', error);
    // Return high quality fallback description in Bengali
    return {
      title: metadata.title || `Spacious ${metadata.bedrooms} Beds Flat in ${metadata.address.split(',')[0]}`,
      description: `### সুন্দর ও সুপরিসর ফ্ল্যাট ভাড়ার বিজ্ঞাপন\n\n**লোকেশন:** ${metadata.address}\n\n**বিবরণ:**\n${metadata.bedrooms}টি বেডরুম ও ${metadata.bathrooms}টি বাথরুম সহ একটি আকর্ষণীয় ${metadata.category} বাসা ভাড়া দেওয়া হবে। ফ্ল্যাটটিতে পর্যাপ্ত আলো-বাতাস এবং সার্বক্ষণিক নিরাপত্তা রয়েছে।\n\n- **ভাড়া:** ৳${metadata.rentAmount} প্রতি মাস\n- **ব্যাচেলর অনুমতি:** ${metadata.isBachelorAllowed ? 'হ্যাঁ' : 'না'}\n\nযোগাযোগের জন্য সরাসরি কল অথবা হোয়াটসঅ্যাপ বাটনে ক্লিক করুন।`,
      tags: ['tolet', 'bangladesh', metadata.category.toLowerCase().replace(' ', '-')],
    };
  }
};

export const parseNaturalLanguageQuery = async (
  queryText: string
): Promise<{
  filters: {
    address?: string;
    rentMin?: number;
    rentMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    isBachelorAllowed?: boolean;
    category?: string;
  };
  reasoning: string;
}> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are the AI Recommendation Assistant for RentWise AI, a property rental platform in Bangladesh.
      Your task is to analyze a natural language search query (written in English, Bengali, or Banglish) and extract structured search filter parameters.
      
      User query: "${queryText}"

      Return a response STRICTLY in JSON format matching this schema:
      {
        "filters": {
          "address": "Single keyword representing the location/neighborhood (e.g. 'Dhanmondi', 'Mirpur', 'Chittagong'), null if not specified",
          "rentMin": number or null,
          "rentMax": number or null (e.g. if user says 'under 25k', rentMax is 25000),
          "bedrooms": number or null,
          "bathrooms": number or null,
          "isBachelorAllowed": boolean or null,
          "category": "One of: 'Family', 'Bachelor Allowed', 'Sublet', 'Hostel', 'Commercial Office' or null"
        },
        "reasoning": "A warm, helpful explanation in Bengali describing what search filters were extracted and how you are going to find the property (e.g., 'আমি আপনার জন্য ধানমন্ডি এলাকায় ২৫,০০০ টাকার মধ্যে ২ বেডরুমের ফ্যামিলি ফ্ল্যাট খুঁজছি।')"
      }

      Do not wrap the response in markdown blocks like \`\`\`json. Return only raw, parseable JSON.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    const cleanJson = responseText
      .replace(/^```json/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleanJson);
    return {
      filters: parsed.filters || {},
      reasoning: parsed.reasoning || 'আপনার অনুসন্ধান অনুযায়ী বাসা খোঁজা হচ্ছে।',
    };
  } catch (error) {
    console.error('Gemini recommendation parser error:', error);
    // Simple rules-based fallback parser
    const lower = queryText.toLowerCase();
    const filters: any = {};
    let reasoning = 'আপনার অনুসন্ধান অনুযায়ী প্রোপার্টি খোঁজা হচ্ছে।';

    if (lower.includes('dhanmondi') || lower.includes('ধানমন্ডি')) {
      filters.address = 'Dhanmondi';
      reasoning = 'আমি আপনার জন্য ধানমন্ডি এলাকার বাসাগুলো খুঁজছি।';
    } else if (lower.includes('mirpur') || lower.includes('মিরপুর')) {
      filters.address = 'Mirpur';
      reasoning = 'আমি আপনার জন্য মিরপুর এলাকার বাসাগুলো খুঁজছি।';
    } else if (lower.includes('uttara') || lower.includes('উত্তরা')) {
      filters.address = 'Uttara';
      reasoning = 'আমি আপনার জন্য উত্তরা এলাকার বাসাগুলো খুঁজছি।';
    }

    if (lower.includes('bachelor') || lower.includes('ব্যাচেলর')) {
      filters.isBachelorAllowed = true;
      filters.category = 'Bachelor Allowed';
    }
    if (lower.includes('family') || lower.includes('ফ্যামিলি')) {
      filters.category = 'Family';
    }

    // Try to extract maximum rent (e.g. 20k, 25000)
    const matches = lower.match(/(\d+)\s*(k|thousand|হাজার|০০০)/);
    if (matches) {
      let val = parseInt(matches[1]);
      if (matches[2] === 'k' || matches[2] === 'thousand' || matches[2] === 'হাজার') {
        val = val * 1000;
      }
      filters.rentMax = val;
    }

    return { filters, reasoning };
  }
};
