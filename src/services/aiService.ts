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
      
      Instructions for Generation:
      1. Write the title in a mix of English and Bengali (e.g., 'সুন্দর ৩ বেডের ফ্ল্যাট ভাড়া (Premium Apartment)') that is catchy and highlights features.
      2. Write the description strictly in Markdown in Bengali language. Divide it into clear headings:
         ### 🏠 বাসা বা ফ্ল্যাটের বিবরণ
         (Highlight rooms, bathrooms, draft edits, etc.)
         ### ✨ বিশেষ সুযোগ-সুবিধাসমূহ
         (Mention utilities, water, electricity, safety, parking)
         ### 📍 লোকেশন ও আশেপাশের বিশেষ স্থান
         (Mention schools, main road access, markets based on address)
         ### 📞 যোগাযোগের ঠিকানা
         (Mention directly calling or messaging landlord via call/whatsapp buttons below)
      3. Clean spelling, formatting, and grammar errors from the 'Existing User Input/Voice Draft'. Integrate its features cleanly.
      
      Generate a response STRICTLY in JSON format matching this schema:
      {
        "title": "listing title...",
        "description": "polished markdown description...",
        "tags": ["tolet", "rent", "thakurgaon", ...],
        "extractedSpecs": {
          "rentAmount": 4700 (extract this from the Voice Draft text if it wasn't specified in the rentAmount field, e.g. if the voice draft says 'ভাড়া ৪৭০০' extract 4700 as a number. Otherwise, omit this key),
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
    
    // Offline/Fallback Parser to extract specs from voice text using Regex
    let extRent = 0;
    let extBed = 0;
    let extBath = 0;
    
    const draftText = metadata.description || '';
    
    // Convert Bengali numerals to English numerals
    const cleanText = draftText
      .replace(/০/g, '0').replace(/১/g, '1').replace(/২/g, '2').replace(/৩/g, '3')
      .replace(/৪/g, '4').replace(/৫/g, '5').replace(/৬/g, '6').replace(/৭/g, '7')
      .replace(/৮/g, '8').replace(/৯/g, '9');
      
    // Regex for Rent (e.g. look for 4-5 digit numbers, or words near vara/rent/হলো)
    const rentRegex = /(?:ভাড়া|ভাড়ায়|ভাড়া হলো|ভাড়া হচ্ছ|vara|rent|amount|taka|টাকা)\s*(?:হলো|is)?\s*(\d{4,5})/i;
    const rentMatch = cleanText.match(rentRegex);
    if (rentMatch) {
      extRent = Number(rentMatch[1]);
    } else {
      const generalNum = cleanText.match(/\b(\d{4,5})\b/);
      if (generalNum) {
        extRent = Number(generalNum[1]);
      }
    }
    
    // Regex for Bedrooms (e.g. "তিন রুম", "২টি বেড", "3 room")
    const bedRegex = /(\d+)\s*(?:রুম|বেড|room|bed)/i;
    const bedMatch = cleanText.match(bedRegex);
    if (bedMatch) {
      extBed = Number(bedMatch[1]);
    } else {
      if (/তিন\s*রুম|তিনটি\s*রুম/i.test(cleanText)) extBed = 3;
      else if (/দুই\s*রুম|two\s*room|দুইটি\s*রুম|দুইটা/i.test(cleanText)) extBed = 2;
      else if (/এক\s*রুম|one\s*room|একটি\s*রুম/i.test(cleanText)) extBed = 1;
    }
    
    // Regex for Bathrooms
    const bathRegex = /(\d+)\s*(?:বাথরুম|বাথ|bath)/i;
    const bathMatch = cleanText.match(bathRegex);
    if (bathMatch) {
      extBath = Number(bathMatch[1]);
    } else {
      if (/দুই\s*বাথরুম|two\s*bath|two\s*bathroom|দুইটি\s*বাথরুম|দুইটা/i.test(cleanText)) extBath = 2;
      else if (/এক\s*বাথরুম|one\s*bath|one\s*bathroom|একটি\s*বাথরুম|একটা/i.test(cleanText)) extBath = 1;
    }

    const finalRent = extRent || metadata.rentAmount || 0;
    const finalBed = extBed || (metadata.bedrooms && metadata.bedrooms !== 2 ? metadata.bedrooms : 2);
    const finalBath = extBath || (metadata.bathrooms && metadata.bathrooms !== 2 ? metadata.bathrooms : 1);
    const finalAddress = metadata.address || 'Thakurgaon Sadar, Thakurgaon';

    // Construct a beautiful HTML/Markdown output dynamically
    const fallbackTitle = metadata.title || `ঠাকুরগাঁও সদরে সুন্দর ${finalBed} বেডের ফ্ল্যাট ভাড়া (Premium Apartment)`;
    const fallbackDescription = `### 🏠 ঠাকুরগাঁওয়ে সুপরিসর বাসা ভাড়া\n\n**ঠিকানা/লোকেশন:** ${finalAddress}\n\n**বাসার বিবরণ ও সুযোগ-সুবিধাসমূহ:**\nবাসাটিতে রয়েছে ${finalBed}টি চমৎকার শোবার ঘর (Bedrooms) এবং ${finalBath}টি বাথরুম। রুমগুলো অত্যন্ত আলো-বাতাসপূর্ণ এবং খোলামেলা পরিবেশে অবস্থিত। ফ্যামিলি বা ব্যাচেলরদের থাকার জন্য নিরিবিলি ও নিরাপদ পরিবেশ।\n\n- **মাসিক ভাড়া:** ৳${finalRent} BDT (আলোচনা সাপেক্ষ)\n- **অ্যাডভান্সড ডিপোজিট:** আলোচনা সাপেক্ষ\n- **ব্যাচেলর গ্রহণযোগ্যতা:** ${metadata.isBachelorAllowed ? 'হ্যাঁ' : 'না'}\n\n**আশেপাশের বিশেষ সুবিধা:**\n- ২৪ ঘণ্টা নিরবচ্ছিন্ন পানি ও বিদ্যুৎ সুবিধা\n- নিরাপদ পার্কিং স্পেস\n- মসজিদ, বাজার ও যাতায়াত ব্যবস্থার খুব কাছে\n\nভাড়া নিতে আগ্রহী হলে নিচের **সরাসরি কল** অথবা **হোয়াটসঅ্যাপ চ্যাট** বাটনে ক্লিক করে ল্যান্ডলর্ডের সাথে যোগাযোগ করুন।`;

    return {
      title: fallbackTitle,
      description: fallbackDescription,
      tags: ['tolet', 'thakurgaon', 'rent', 'family-flat'],
      extractedSpecs: {
        rentAmount: finalRent,
        bedrooms: finalBed,
        bathrooms: finalBath
      }
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
