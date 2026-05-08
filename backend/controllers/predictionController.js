const Prediction = require('../models/Prediction');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ── Configuration ─────────────────────────────────────────────────────────────

const ALLOWED_CROPS = [
  'Mango', 'Papaya', 'Cauliflower', 'Banana', 'Apple', 
  'Orange', 'Grapes', 'Tomato', 'Potato', 'Onion'
];

const crypto = require('crypto');

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateImageHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Gets all available Gemini API keys from environment variables for rotation.
 */
function getApiKeys() {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  if (process.env.VITE_GEMINI_API_KEY) keys.push(process.env.VITE_GEMINI_API_KEY);
  return [...new Set(keys)]; // Unique keys only
}

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
  if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported') || msg.includes('deprecated')) {
    return 'not_found';
  }
  if (msg.includes('503') || msg.includes('529') || msg.includes('overload') || msg.includes('unavailable')) {
    return 'overload';
  }
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('fetch') || msg.includes('timeout')) {
    return 'network';
  }
  return 'unknown';
}

/**
 * Call Gemini with rotation and retry.
 */
async function callGeminiWithRotation(contents, maxRetries = 2) {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error('AI API key not configured.');

  // Refined model chain with highly compatible production names
  const modelChain = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro-vision' // Legacy fallback
  ];

  console.log(`[API] Attempting analysis with ${keys.length} keys and ${modelChain.length} models...`);

  let lastError = null;

  // Try each key in the rotation
  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    console.log(`[API] Trying Key #${i + 1} (${apiKey.substring(0, 6)}...)`);
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // For each key, try each model in the chain
    for (const modelName of modelChain) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API Timeout')), 25000)
          );
          
          const result = await Promise.race([
            model.generateContent(contents),
            timeoutPromise
          ]);

          if (!result || !result.response) throw new Error('Empty AI response');
          
          const text = result.response.text();
          if (text && text.trim()) return { text: text.trim(), modelName };
        } catch (err) {
          lastError = err;
          const errType = classifyError(err);
          console.warn(`[API] Attempt ${attempt} failed with ${modelName}: ${err.message.substring(0, 80)}`);
          
          // If 429 (Rate Limit), move to the NEXT KEY immediately
          if (errType === 'rate_limit') {
            console.warn(`[API] Key rate limited. Rotating to next key...`);
            break; // Breaks inner model loop, continues to next key
          }
          
          // If 404 (Not Found), move to the NEXT MODEL immediately
          if (errType === 'not_found') {
            break; // Breaks attempt loop, tries next model for same key
          }
          
          // If other error, try next attempt for same model
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
            continue;
          }
          break; // Next model
        }
      }
      // If we broke out of attempts due to rate limit, we should also stop trying models for this key
      if (classifyError(lastError) === 'rate_limit') break;
    }
  }
  throw lastError || new Error('All AI keys are currently exhausted.');
}

function userFriendlyError(err) {
  const type = classifyError(err);
  const msg = err.message || '';
  
  switch (type) {
    case 'rate_limit':
      return { status: 429, message: 'AI service busy. Please wait a moment.', errorType: 'rate_limit' };
    case 'overload':
      return { status: 503, message: 'AI service overloaded. Trying again...', errorType: 'overload' };
    case 'network':
      return { status: 503, message: 'Connection timeout. Please check your internet.', errorType: 'network' };
    default:
      // Include hint if it might be a configuration issue
      if (msg.includes('key') || msg.includes('API')) {
        return { status: 500, message: 'AI service configuration error. Please check API keys.', errorType: 'config' };
      }
      return { status: 500, message: 'Analysis failed. Please try again with a clearer image.', errorType: 'default' };
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

const analyzeImage = async (req, res) => {
  try {
    console.log('[ANALYZE] Starting high-reliability diagnostic');

    // 1. Image loading & Hashing
    let buffer;
    
    if (req.file) {
      // Prioritize buffer from memoryStorage (more reliable on Render)
      buffer = req.file.buffer;
      if (!buffer && req.file.path) {
        // Fallback to disk if somehow path is still used
        try {
          buffer = fs.readFileSync(req.file.path);
        } catch (e) {
          console.error('[ANALYZE] Disk read failed:', e.message);
        }
      }
    } else if (req.body?.image) {
      // Handle base64
      try {
        const matches = req.body.image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(req.body.image, 'base64');
      } catch (e) {
        console.error('[ANALYZE] Base64 decode failed:', e.message);
      }
    }

    if (!buffer || buffer.length < 500) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid or missing image data. Please try uploading the file again.',
        errorType: 'image_invalid'
      });
    }

    const imageHash = generateImageHash(buffer);

    // 2. Check Cache (Database lookup)
    const cachedResult = await Prediction.findOne({ imageHash }).sort({ createdAt: -1 });
    if (cachedResult) {
      console.log('[CACHE] Returning saved result for identical image');
      return res.status(200).json({ 
        success: true, 
        data: {
          crop_name: cachedResult.crop,
          disease_name: cachedResult.diseaseName,
          confidence: cachedResult.confidenceScore,
          description: cachedResult.symptoms,
          cause: cachedResult.cause || 'Unknown',
          treatment: cachedResult.treatment,
          prevention: cachedResult.prevention,
          isCached: true
        },
        saved: true,
        id: cachedResult._id
      });
    }

    const mimeType = detectMimeType(buffer);
    const imagePart = { inlineData: { data: buffer.toString('base64'), mimeType } };

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
      // Use high-reliability rotation logic
      const result = await callGeminiWithRotation([analysisPrompt, imagePart], 2);
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
          error: `Crop identified as ${cropName}, which is not currently supported.`,
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
      console.error('[ANALYZE] Engine Error:', err.message);
      const { status, message, errorType } = userFriendlyError(err);
      
      return res.status(status).json({ 
        success: false, 
        error: message, 
        errorType: errorType,
        details: 'The AI engine is currently under high load or rate-limited.'
      });
    }

    // 5. Save to DB (async)
    let savedRecord = null;
    let imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    
    try {
      savedRecord = await Prediction.create({
        userId: req.user?.id || null, 
        imageUrl,
        imageHash, // SAVE HASH FOR CACHING
        crop: finalData.crop_name,
        diseaseName: finalData.disease_name,
        confidenceScore: finalData.confidence,
        treatment: finalData.treatment,
        prevention: finalData.prevention,
        symptoms: finalData.description,
        cause: finalData.cause
      });
      console.log('[DB] Prediction saved with hash');
    } catch (dbErr) {
      console.warn('[DB] Save failed:', dbErr.message);
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
