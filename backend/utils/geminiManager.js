/**
 * geminiManager.js
 * Centralized Gemini API manager for production stability.
 *
 * Key features:
 * 1. Request Queue  — Only ONE Gemini call runs at a time (prevents simultaneous quota burn)
 * 2. Key Rotation   — Rotates through GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3
 * 3. Key Cooldown   — If a key gets 429, it is locked for 60s before retrying
 * 4. Auto Retry     — Exponential backoff for transient errors
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Key Management ─────────────────────────────────────────────────────────────
function getApiKeys() {
  const raw = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(k => k && k.trim().length > 10);
  const unique = [...new Set(raw.map(k => k.trim()))];
  console.log(`[GeminiMgr] Loaded ${unique.length} unique API key(s).`);
  return unique;
}

// ── Per-Key Cooldown Tracker ───────────────────────────────────────────────────
const keyCooldowns = {};

function isKeyCoolingDown(key) {
  const coolUntil = keyCooldowns[key];
  if (!coolUntil) return false;
  if (Date.now() > coolUntil) { delete keyCooldowns[key]; return false; }
  return true;
}

function coolDownKey(key, seconds = 60) {
  console.warn(`[GeminiMgr] Key ...${key.slice(-4)} cooled down for ${seconds}s`);
  keyCooldowns[key] = Date.now() + seconds * 1000;
}

// ── Request Queue ──────────────────────────────────────────────────────────────
// Serializes all Gemini requests so only one runs at a time.
let queueRunning = false;
const requestQueue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    drainQueue();
  });
}

async function drainQueue() {
  if (queueRunning || requestQueue.length === 0) return;
  queueRunning = true;
  const { fn, resolve, reject } = requestQueue.shift();
  try {
    resolve(await fn());
  } catch (err) {
    reject(err);
  } finally {
    queueRunning = false;
    // Brief pause between requests to avoid burst-limiting
    setTimeout(drainQueue, 800);
  }
}

// ── Internal: Try a single Gemini model ───────────────────────────────────────
async function tryModel(genAI, modelName, contents, timeoutMs = 25000) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await Promise.race([
    model.generateContent(contents),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), timeoutMs)),
  ]);
  const text = result.response.text();
  if (!text || !text.trim()) throw new Error('Empty response');
  return text.trim();
}

// ── Internal: Try a single chat model ─────────────────────────────────────────
async function tryChatModel(genAI, modelName, systemInstruction, message, history, timeoutMs = 15000) {
  const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
  const chat = model.startChat({ history });
  const result = await Promise.race([
    chat.sendMessage(message),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), timeoutMs)),
  ]);
  const text = result.response.text();
  if (!text || !text.trim()) throw new Error('Empty response');
  return text.trim();
}

// ── Public: Image / Vision Analysis ───────────────────────────────────────────
/**
 * @param {Array} contents - Gemini content parts array
 * @returns {{ text: string, modelName: string }}
 */
async function callGemini(contents) {
  return enqueue(async () => {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error('No Gemini API keys configured.');

    // Use valid v1beta models that are currently supported
    const models = ['gemini-2.0-flash', 'gemini-1.5-pro'];
    let lastError = null;

    for (const key of keys) {
      if (isKeyCoolingDown(key)) {
        console.warn(`[GeminiMgr] Skipping key ...${key.slice(-4)} (cooling)`);
        continue;
      }

      for (const modelName of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            console.log(`[GeminiMgr] [Vision] Key ...${key.slice(-4)} | ${modelName} | attempt ${attempt + 1}`);
            const text = await tryModel(new GoogleGenerativeAI(key), modelName, contents);
            console.log(`[GeminiMgr] ✅ Vision success with ${modelName}`);
            return { text, modelName };
          } catch (err) {
            lastError = err;
            const msg = (err.message || '').toLowerCase();

            if (msg.includes('429') || msg.includes('quota') || err.status === 429) {
              coolDownKey(key, 60);
              break; // Stop trying models for this key
            }
            if (msg.includes('404') || msg.includes('not found') || err.status === 404) {
              break; // Model not available, try next model
            }
            if (attempt === 0) {
              const delay = 3000 + Math.random() * 2000; // 3-5s with jitter
              console.warn(`[GeminiMgr] Retrying in ${delay}ms...`);
              await new Promise(r => setTimeout(r, delay));
            }
          }
        }
        if (isKeyCoolingDown(key)) break; // Key got rate-limited, move to next key
      }
    }

    throw lastError || new Error('All Gemini keys and models exhausted.');
  });
}

// ── Public: Chat ───────────────────────────────────────────────────────────────
/**
 * @param {string} systemInstruction - System prompt for the model
 * @param {string} message - User message
 * @param {Array} chatHistory - [{role, parts}] Gemini format history
 * @returns {string} - AI reply text
 */
async function callGeminiChat(systemInstruction, message, chatHistory = []) {
  return enqueue(async () => {
    const keys = getApiKeys();
    if (keys.length === 0) throw new Error('No Gemini API keys configured.');

    const models = ['gemini-2.0-flash', 'gemini-1.5-pro'];
    let lastError = null;

    for (const key of keys) {
      if (isKeyCoolingDown(key)) {
        console.warn(`[GeminiMgr] Skipping key ...${key.slice(-4)} (cooling)`);
        continue;
      }

      for (const modelName of models) {
        try {
          console.log(`[GeminiMgr] [Chat] Key ...${key.slice(-4)} | ${modelName}`);
          const text = await tryChatModel(
            new GoogleGenerativeAI(key),
            modelName,
            systemInstruction,
            message,
            chatHistory
          );
          console.log(`[GeminiMgr] ✅ Chat success with ${modelName}`);
          return text;
        } catch (err) {
          lastError = err;
          const msg = (err.message || '').toLowerCase();

          if (msg.includes('429') || msg.includes('quota') || err.status === 429) {
            coolDownKey(key, 60);
            break; // Stop trying models for this key, move to next key
          }
          // For 404 or other errors, try next model
          console.warn(`[GeminiMgr] [Chat] ${modelName} failed: ${msg.slice(0, 60)}`);
          continue;
        }
      }
      // Continue to next key if this one's cooling or all models failed
    }

    throw lastError || new Error('All Gemini keys and models exhausted for chat.');
  });
}

module.exports = { callGemini, callGeminiChat, getApiKeys };
