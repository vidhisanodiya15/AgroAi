const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Key Management (Shared Logic) ─────────────────────────────────────────────
const getApiKeys = () => {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].filter(k => k && k.length > 10);
};

// ── Chat Controller ──────────────────────────────────────────────────────────
const chatWithAI = async (req, res) => {
  try {
    const { message, history = [], lang = 'en' } = req.body;
    const keys = getApiKeys();

    if (!message) return res.status(400).json({ success: false, error: 'Message required.' });
    if (keys.length === 0) return res.status(500).json({ success: false, error: 'AI keys not configured.' });

    // Use latest stable models
    const modelChain = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    
    const systemInstruction = `You are "Agro AI Assistant", an agricultural expert. 
    ${lang === 'hi' ? 'Respond in Hindi.' : 'Respond in English.'} 
    Keep it helpful and concise.`;

    let reply = null;

    // Try Keys -> Try Models
    for (let kIdx = 0; kIdx < keys.length; kIdx++) {
      const genAI = new GoogleGenerativeAI(keys[kIdx]);

      for (const modelName of modelChain) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
          
          // Map history (Simplified)
          const chatHistory = (history || []).slice(-6).map(h => ({
            role: h.isBot ? 'model' : 'user',
            parts: [{ text: h.text }]
          }));

          const chat = model.startChat({ history: chatHistory });
          
          const result = await Promise.race([
            chat.sendMessage(message.trim()),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
          ]);

          reply = result.response.text();
          if (reply) break;
        } catch (err) {
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('429')) {
             console.warn(`[CHAT] Key #${kIdx+1} busy. Rotating...`);
             break; // Next key
          }
          continue; // Next model
        }
      }
      if (reply) break;
    }

    // Fallback if all else fails
    if (!reply) {
      reply = lang === 'hi' 
        ? "क्षमा करें, हमारी एआई सेवा अभी व्यस्त है। कृपया 1 मिनट बाद पुनः प्रयास करें।"
        : "I'm currently very busy with other farmers. Please try again in 1 minute!";
      return res.json({ success: true, reply, isFallback: true });
    }

    res.json({ success: true, reply: reply.trim() });
  } catch (error) {
    console.error('[CHAT] Error:', error);
    res.status(500).json({ success: false, error: 'Service error.' });
  }
};

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
