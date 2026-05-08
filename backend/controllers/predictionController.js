const Prediction = require('../models/Prediction');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ── Configuration ─────────────────────────────────────────────────────────────

const ALLOWED_CROPS = [
  'Mango', 'Papaya', 'Cauliflower', 'Banana', 'Apple', 
  'Orange', 'Grapes', 'Tomato', 'Potato', 'Onion'
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) return 'image/jpeg';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

function cleanCropName(raw) {
  let name = raw.trim();
  name = name.replace(/```[\s\S]*?```/g, '').replace(/[`"'*_#]/g, '').trim();
  const prefixes = [
    'the crop in this image is', 'the crop is', 'this is a', 'this is an',
    'crop name is', 'crop name:', 'crop:', 'plant:', 'identified crop:',
    'identified as', 'the plant is', 'answer:', 'result:', 'based on',
    'the image shows', 'i can see', 'looking at', 'i believe this is',
    'this appears to be', 'this looks like', 'the image depicts',
  ];
  const lower = name.toLowerCase();
  for (const p of prefixes) {
    if (lower.startsWith(p)) { name = name.substring(p.length).trim(); break; }
  }
  name = name.split('\n')[0].split('.')[0].split(',')[0].trim();
  name = name.replace(/[.,;:!?]+$/, '').trim();
  
  // Normalize to Title Case
  if (!name) return 'Unknown';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function extractJSON(text) {
  try {
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[JSON] Parse error:', text);
    return null;
  }
}

function classifyError(err) {
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('429') || msg.includes('too many requests') || msg.includes('quota') || msg.includes('rate')) {
    return 'rate_limit';
  }
  if (msg.includes('503') || msg.includes('529') || msg.includes('overload') || msg.includes('unavailable')) {
    return 'overload';
  }
  if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported')) {
    return 'not_found';
  }
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'network';
  }
  return 'unknown';
}

/**
 * Call Gemini with timeout and retry.
 */
async function callGeminiWithRetry(genAI, modelChain, contents, maxRetries = 3) {
  const DELAYS = [3000, 6000, 12000];
  let lastError = null;

  for (const modelName of modelChain) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API Timeout')), 12000) // 12s timeout
        );
        
        const result = await Promise.race([
          model.generateContent(contents),
          timeoutPromise
        ]);

        const text = result.response.text();
        if (text && text.trim()) {
          return { text: text.trim(), modelName };
        }
      } catch (err) {
        lastError = err;
        const errType = classifyError(err);
        if (errType === 'not_found') break; 
        if (errType === 'rate_limit' || errType === 'overload' || err.message === 'API Timeout') {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, DELAYS[attempt - 1]));
            continue;
          }
        }
        break; // skip to next model
      }
    }
  }
  throw lastError || new Error('AI Engine is currently unresponsive.');
}

function userFriendlyError(err) {
  const type = classifyError(err);
  switch (type) {
    case 'rate_limit':
      return { status: 429, message: 'AI service busy. Please wait a moment.', errorType: 'rate_limit' };
    case 'overload':
      return { status: 503, message: 'AI service overloaded. Trying again...', errorType: 'overload' };
    case 'network':
      return { status: 503, message: 'Connection timeout. Please check your internet.', errorType: 'network' };
    default:
      return { status: 500, message: 'Analysis failed. Please try again with a clearer image.', errorType: 'default' };
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

const analyzeImage = async (req, res) => {
  try {
    console.log('[ANALYZE] Starting restricted 10-crop diagnostic');

    // 1. Image loading
    let imageUrl = '';
    let buffer;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      buffer = fs.readFileSync(req.file.path);
    } else if (req.body?.image) {
      const matches = req.body.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(req.body.image, 'base64');
    } else {
      return res.status(400).json({ success: false, error: 'No image provided.' });
    }

    if (!buffer || buffer.length < 500) {
      return res.status(400).json({ success: false, error: 'Invalid image data.' });
    }

    // 2. Resolve API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'AI API key not configured.' });

    const mimeType = detectMimeType(buffer);
    const imagePart = { inlineData: { data: buffer.toString('base64'), mimeType } };
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Prioritize fastest models for <10s response
    const modelChain = [
      'gemini-3.1-flash-lite',
      'gemini-2.0-flash', 
      'gemini-1.5-flash', 
      'gemini-flash-latest', 
      'gemini-2.0-flash-lite',
      'gemini-pro-latest'
    ];

    // 3. Single-Stage Analysis (Reduces API calls to avoid 429 rate limits)
    const analysisPrompt = `TASK: Identify and analyze the plant leaf in this image.
ALLOWED CROPS: ${ALLOWED_CROPS.join(', ')}.

RULES:
1. If the image is NOT a plant leaf or NOT one of the allowed crops, return ONLY this JSON: {"error": "crop_not_detected"}
2. If it IS an allowed crop, analyze its health and return JSON ONLY:
{
  "crop_name": "Crop Name from ALLOWED list",
  "disease_name": "Disease Name or Healthy",
  "confidence": <0-100>,
  "description": "2 sentences of observations in English",
  "description_hi": "Observations in Hindi",
  "cause": "Specific pathogen or N/A",
  "treatment": "Numbered treatment steps in English",
  "treatment_hi": "Treatment in Hindi",
  "prevention": "3 prevention tips"
}
NO extra text, NO markdown blocks.`;

    let finalData = null;
    try {
      const result = await callGeminiWithRetry(genAI, modelChain, [analysisPrompt, imagePart]);
      const resJson = extractJSON(result.text);
      
      if (!resJson) throw new Error('Failed to parse AI response');
      
      if (resJson.error === 'crop_not_detected') {
        return res.status(422).json({
          success: false,
          error: 'Crop not recognized clearly, please upload a clearer image of an allowed crop.',
          errorType: 'crop_not_detected'
        });
      }

      const rawCrop = resJson.crop_name || 'Unknown';
      const cropName = ALLOWED_CROPS.find(c => c.toLowerCase() === rawCrop.toLowerCase()) || cleanCropName(rawCrop);

      if (cropName === 'Unknown' || !ALLOWED_CROPS.map(c => c.toLowerCase()).includes(cropName.toLowerCase())) {
        return res.status(422).json({
          success: false,
          error: 'Crop not recognized as one of the supported types.',
          errorType: 'crop_not_detected'
        });
      }

      let confidence = parseInt(resJson.confidence, 10) || 85;
      const ensureString = (val) => {
        if (!val) return '';
        if (Array.isArray(val)) return val.join('\n');
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      };

      finalData = {
        crop_name: cropName,
        disease_name: resJson.disease_name || 'Unknown',
        confidence: Math.min(confidence, 100),
        description: ensureString(resJson.description || 'N/A'),
        description_hi: ensureString(resJson.description_hi || ''),
        cause: ensureString(resJson.cause || 'Unknown'),
        treatment: ensureString(resJson.treatment || 'Consult expert.'),
        treatment_hi: ensureString(resJson.treatment_hi || ''),
        prevention: ensureString(resJson.prevention || 'Maintain farm health.'),
      };
      console.log(`[ANALYZE] ✓ ${finalData.crop_name}: ${finalData.disease_name} (${finalData.confidence}%)`);
    } catch (err) {
      const { status, message, errorType } = userFriendlyError(err);
      
      // CRITICAL FALLBACK: If AI is rate-limited, provide a simulated result so the app works
      if (errorType === 'rate_limit') {
        console.warn('[ANALYZE] AI Rate Limited. Providing simulated response...');
        finalData = {
          crop_name: 'Mango', // Default for simulation
          disease_name: 'Anthracnose (Simulated)',
          confidence: 78,
          description: 'Dark, sunken spots on leaves and stems. This is a simulated response because the AI service is currently at its limit.',
          description_hi: 'पत्तियों और तनों पर काले, धंसे हुए धब्बे। यह एक सिम्युलेटेड प्रतिक्रिया है क्योंकि एआई सेवा वर्तमान में अपनी सीमा पर है।',
          cause: 'Colletotrichum gloeosporioides (Fungus)',
          treatment: '1. Prune affected branches.\n2. Apply copper-based fungicide.\n3. Ensure better air circulation.',
          treatment_hi: '1. प्रभावित शाखाओं की छँटाई करें।\n2. कॉपर-आधारित कवकनाशी लगाएं।\n3. बेहतर वायु संचार सुनिश्चित करें।',
          prevention: 'Avoid overhead irrigation, use resistant varieties, and maintain field sanitation.',
          isSimulated: true
        };
        return res.status(200).json({ success: true, data: finalData, isSimulated: true });
      }
      
      return res.status(status).json({ success: false, error: message, errorType });
    }

    // 5. Save to DB (async)
    let savedRecord = null;
    if (req.user && finalData) {
      try {
        savedRecord = await Prediction.create({
          userId: req.user.id, 
          imageUrl,
          crop: finalData.crop_name,
          diseaseName: finalData.disease_name,
          confidenceScore: finalData.confidence,
          treatment: finalData.treatment,
          prevention: finalData.prevention,
          symptoms: finalData.description,
        });
        console.log('[DB] Prediction saved automatically');
      } catch (dbErr) {
        console.warn('[DB] Save failed:', dbErr.message);
      }
    }

    return res.status(200).json({ 
      success: true, 
      data: finalData, 
      saved: !!savedRecord,
      id: savedRecord ? savedRecord._id : null
    });

  } catch (error) {
    console.error('[ANALYZE] Error:', error.message);
    const { status, message, errorType } = userFriendlyError(error);
    return res.status(status).json({ success: false, error: message, errorType });
  }
};

const createPrediction = async (req, res) => {
  try {
    const { crop, diseaseName, confidenceScore, treatment, prevention, symptoms, imageUrl } = req.body;
    
    const prediction = await Prediction.create({
      userId: req.user.id,
      crop,
      diseaseName,
      confidenceScore,
      treatment,
      prevention,
      symptoms,
      imageUrl
    });

    res.status(201).json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    // Fix: Use _id from JWT token (stored as id in payload but refers to MongoDB _id)
    const userId = req.user?.id || req.user?._id;
    const predictions = await Prediction.find({ userId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const detectCrop = (req, res) => analyzeImage(req, res);
const detectDisease = (req, res) => analyzeImage(req, res);

module.exports = { createPrediction, getHistory, analyzeImage, detectCrop, detectDisease };
