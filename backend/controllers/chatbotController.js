const { callGeminiChat, getApiKeys } = require('../utils/geminiManager');

// ── Chat Controller ──────────────────────────────────────────────────────────
const chatWithAI = async (req, res) => {
  try {
    const { message, history = [], lang = 'en' } = req.body;
    const keys = getApiKeys();

    if (!message) return res.status(400).json({ success: false, error: 'Message required.' });
    if (keys.length === 0) return res.status(500).json({ success: false, error: 'AI keys not configured.' });

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

    // Map chat history to Gemini format (alternating user/model)
    let chatHistory = [];
    const rawHistory = (history || []).filter(h => h.text && h.text.trim()).slice(-10);
    for (const h of rawHistory) {
      const role = h.isBot ? 'model' : 'user';
      if (chatHistory.length === 0 && role === 'model') continue;
      if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === role) {
        chatHistory[chatHistory.length - 1].parts[0].text += `\n${h.text}`;
      } else {
        chatHistory.push({ role, parts: [{ text: h.text }] });
      }
    }

    // Delegate to centralized manager (includes request queue + key rotation)
    const reply = await callGeminiChat({ systemInstruction }, message.trim(), chatHistory);

    res.json({ success: true, reply });
  } catch (error) {
    console.error('[CHAT] Error:', error.message);
    
    const isBusy = (error.message || '').toLowerCase().includes('cooling') 
      || (error.message || '').toLowerCase().includes('exhausted');
    
    const fallbackReply = req.body.lang === 'hi'
      ? 'क्षमा करें, हमारी एआई सेवा अभी व्यस्त है। कृपया 1 मिनट बाद पुनः प्रयास करें।'
      : "I'm currently very busy. Please try again in 1 minute!";

    if (isBusy) {
      return res.json({ success: true, reply: fallbackReply, isFallback: true });
    }
    res.status(500).json({ success: false, error: 'Chatbot service error.' });
  }
};

module.exports = { chatWithAI };
