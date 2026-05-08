/**
 * geminiManager.js
 * Centralized Gemini API manager for production stability.
 * 
 * Features:
 * - Request queue (prevents simultaneous calls from hitting rate limits)
 * - Multi-key rotation (GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3)
 * - Per-key cooldown tracking (avoids retrying an exhausted key)
 * - Exponential backoff retries
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Key Management ─────────────────────────────────────────────────────────────
function getApiKeys() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(k => k && k.length > 10);
  return [...new Set(keys)];
}

// ── Per-Key Cooldown Tracker ───────────────────────────────────────────────────
// If a key hits a 429, we mark it as "cooling down" for 60 seconds.
const keyCooldowns = {};

function isKeyCoolingDown(key) {
  const coolUntil = keyCooldowns[key];
  if (!coolUntil) return false;
  if (Date.now() > coolUntil) {
    delete keyCooldowns[key];
    return false;
  }
  return true;
}

function coolDownKey(key, seconds = 60) {
  console.warn(`[GeminiMgr] Key ...${key.slice(-4)} cooling down for ${seconds}s`);
  keyCooldowns[key] = Date.now() + seconds * 1000;
}

// ── Request Queue ──────────────────────────────────────────────────────────────
// Ensures only one Gemini request runs at a time, preventing simultaneous quota burns.
let queueRunning = false;
const requestQueue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (queueRunning || requestQueue.length === 0) return;
  queueRunning = true;
  const { fn, resolve, reject } = requestQueue.shift();
  try {
    const result = await fn();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    queueRunning = false;
    // Small delay between requests to be polite to the API
    setTimeout(processQueue, 500);
  }
}

// ── Core API Call ──────────────────────────────────────────────────────────────
/**
 * @param {Array} contents - The content parts to send to Gemini
 * @param {object} options - { modelChain, timeoutMs }
 * @returns {{ text: string, modelName: string }}
 */
async function callGemini(contents, options = {}) {
  const {
    modelChain = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b'],
    timeoutMs = 25000,
  } = options;

  // Wrap in queue to serialize requests
  return enqueue(async () => {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error('No Gemini API keys configured.');

    const availableKeys = keys.filter(k => !isKeyCoolingDown(k));
    if (availableKeys.length === 0) {
      throw new Error('All API keys are currently cooling down. Please wait a minute.');
    }

    console.log(`[GeminiMgr] Starting request. Available keys: ${availableKeys.length}/${keys.length}`);
    let lastError = null;

    for (const key of availableKeys) {
      const genAI = new GoogleGenerativeAI(key);

      for (const modelName of modelChain) {
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
          try {
            console.log(`[GeminiMgr] Key ...${key.slice(-4)} | Model: ${modelName} | Retry: ${retries}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await Promise.race([
              model.generateContent(contents),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
            ]);

            const text = result.response.text();
            if (text && text.trim()) {
              console.log(`[GeminiMgr] ✅ Success with ${modelName}`);
              return { text: text.trim(), modelName };
            }
            throw new Error('Empty response from model');

          } catch (err) {
            lastError = err;
            const msg = (err.message || '').toLowerCase();

            // Rate limit → Cool this key, try next key
            if (msg.includes('429') || msg.includes('quota') || (err.status === 429)) {
              coolDownKey(key, 60);
              break; // Exit model loop, move to next key
            }

            // Model not found → try next model
            if (msg.includes('404') || msg.includes('not found') || (err.status === 404)) {
              console.warn(`[GeminiMgr] Model ${modelName} not found. Skipping.`);
              break;
            }

            // Timeout or other → retry with backoff
            if (retries < maxRetries) {
              const delay = (retries + 1) * 2000;
              console.warn(`[GeminiMgr] Error (${err.message?.slice(0, 50)}). Retrying in ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
              retries++;
            } else {
              break; // Try next model
            }
          }
        }

        // If this key was just cooled down, stop trying models for it
        if (isKeyCoolingDown(key)) break;
      }
    }

    throw lastError || new Error('All Gemini API keys and models are exhausted.');
  });
}

/**
 * Simplified wrapper for chat requests (text-only)
 */
async function callGeminiChat(model, message, chatHistory = []) {
  return enqueue(async () => {
    const keys = getApiKeys();
    const availableKeys = keys.filter(k => !isKeyCoolingDown(k));
    if (availableKeys.length === 0) throw new Error('All API keys are cooling down. Try again in a minute.');

    const modelChain = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b'];
    let lastError = null;

    for (const key of availableKeys) {
      const genAI = new GoogleGenerativeAI(key);

      for (const modelName of modelChain) {
        try {
          const mdl = genAI.getGenerativeModel({ model: modelName, systemInstruction: model.systemInstruction });
          const chat = mdl.startChat({ history: chatHistory });
          const result = await Promise.race([
            chat.sendMessage(message),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000)),
          ]);
          const text = result.response.text();
          if (text) return text.trim();
        } catch (err) {
          lastError = err;
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('429') || msg.includes('quota')) {
            coolDownKey(key, 60);
            break; // Next key
          }
          continue; // Next model
        }
      }
      if (!isKeyCoolingDown(key)) break; // Got a response
    }

    throw lastError || new Error('Chat API exhausted.');
  });
}

module.exports = { callGemini, callGeminiChat, getApiKeys };
