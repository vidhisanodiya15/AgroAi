const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Global Configuration & Cache ─────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Simple in-memory cache for repeated queries (limited to 100 entries)
const CHAT_CACHE = new Map();
const MAX_CACHE_SIZE = 100;

function getCacheKey(message, lang) {
  return `${lang}:${message.trim().toLowerCase()}`;
}

/**
 * @desc    Chatbot handler with conversation history, model fallback, and caching
 * @route   POST /api/chat
 */
const chatWithAI = async (req, res) => {
  try {
    const { message, history = [], lang = 'en' } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    if (!genAI) {
      return res.status(500).json({ success: false, error: 'Gemini API key is not configured.' });
    }

    // 1. Check Cache for simple queries (no history needed for exact match)
    const cacheKey = getCacheKey(message, lang);
    if (history.length === 0 && CHAT_CACHE.has(cacheKey)) {
      console.log('[CHAT] Cache Hit:', cacheKey);
      return res.json({ success: true, reply: CHAT_CACHE.get(cacheKey), cached: true });
    }

    const modelChain = [
      'gemini-3.1-flash-lite',
      'gemini-2.0-flash', 
      'gemini-1.5-flash', 
      'gemini-flash-latest', 
      'gemini-2.0-flash-lite',
      'gemini-pro-latest'
    ];

    const systemInstruction = `You are "Agro AI Assistant", a highly knowledgeable agricultural expert AI.
Your expertise: crop cultivation, plant diseases, fertilizers, pest management, soil health, irrigation, organic farming.
RULES:
1. Give SPECIFIC, ACCURATE answers — never generic advice
2. For diseases: mention symptoms, cause (pathogen), treatment steps, and prevention
3. For crops: cover season, soil, water, fertilizer, common diseases
4. Use clear formatting with emojis
5. Keep responses concise but complete
6. ${lang === 'hi' ? 'RESPOND ENTIRELY IN HINDI (Devanagari script).' : 'Respond in English.'}
7. Never say "I don't know" — always provide the best available agricultural guidance`;

    let reply = null;
    let lastErr = null;

    // 2. Optimized Model Polling
    for (const modelName of modelChain) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

        // Map history and ensure it follows the User -> Model -> User pattern
        let chatHistory = [];
        const rawHistory = (history || []).filter(h => h.text && h.text.trim());
        
        for (const h of rawHistory) {
          const role = h.isBot ? 'model' : 'user';
          // Gemini requires alternating roles starting with user
          if (chatHistory.length === 0 && role === 'model') continue; 
          if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === role) {
            // Merge consecutive same-role messages
            chatHistory[chatHistory.length - 1].parts[0].text += `\n${h.text}`;
          } else {
            chatHistory.push({ role, parts: [{ text: h.text }] });
          }
        }

        const chat = model.startChat({
          history: chatHistory,
          generationConfig: { 
            temperature: 0.7, 
            maxOutputTokens: 1024,
            topP: 0.8,
            topK: 40
          },
        });

        // Set a timeout for the API call to reduce waiting time
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), 15000)
        );

        const result = await Promise.race([
          chat.sendMessage(message.trim()),
          timeoutPromise
        ]);

        reply = result.response.text();
        if (reply && reply.trim()) {
          console.log(`[CHAT] ✓ Model: ${modelName}`);
          break;
        }
      } catch (err) {
        lastErr = err;
        const msg = err.message || '';
        console.warn(`[CHAT] ${modelName} failed: ${msg.substring(0, 50)}`);
        
        // If it's a model not found, move to next model immediately
        if (msg.includes('404') || msg.includes('not found')) continue;
        
        // For 429, try next model immediately instead of internal retry to save time
        if (msg.includes('429') || msg.includes('quota')) continue;
        
        // Other errors, try next model
        continue;
      }
    }

    // 3. Fallback Handling (Absolute Reliability)
    if (!reply) {
      console.warn('[CHAT] All models failed or timed out. Providing high-quality fallback.');
      
      // We provide a simulated response as a last resort so the user is never stuck
      reply = "I'm currently receiving many requests, but as your Agro AI Assistant, I recommend focusing on proper irrigation and soil testing while I'm being optimized. How can I help you with general farming tips today? (Agro AI Mode)";
      
      if (lang === 'hi') {
        reply = "मुझे वर्तमान में कई अनुरोध मिल रहे हैं, लेकिन आपके एग्रो एआई सहायक के रूप में, मैं उचित सिंचाई और मिट्टी परीक्षण पर ध्यान केंद्रित करने की सलाह देता हूं। आज मैं सामान्य खेती युक्तियों के साथ आपकी कैसे मदद कर सकता हूं? (एग्रो एआई मोड)";
      }
      
      return res.json({ success: true, reply, isSimulated: true });
    }

    // 4. Update Cache (for simple queries)
    if (history.length === 0 && reply) {
      if (CHAT_CACHE.size >= MAX_CACHE_SIZE) {
        const firstKey = CHAT_CACHE.keys().next().value;
        CHAT_CACHE.delete(firstKey);
      }
      CHAT_CACHE.set(cacheKey, reply.trim());
    }

    res.json({ success: true, reply: reply.trim() });
  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.status(500).json({ success: false, error: 'Chatbot service error.' });
  }
};

module.exports = { chatWithAI };
