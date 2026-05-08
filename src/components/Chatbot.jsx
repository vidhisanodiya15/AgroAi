import { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { MessageSquare, X, Send, Sparkles, ChevronRight, Mic } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { API_ENDPOINTS } from '../config';

// ── UI strings ────────────────────────────────────────────────────────────────
const UI = {
  en: {
    greeting: "Hello! I'm Agro AI Assistant 🌿\n\nI can help you with:\n• Crop disease identification & treatment\n• Fertilizer recommendations\n• Farming best practices\n• Pest management\n• Seasonal crop advice\n\nWhat would you like to know?",
    placeholder: "Ask about crops, diseases, fertilizers...",
    typing: "Agro AI is thinking...",
    suggested: "Quick Questions:",
    clear: "Clear Chat",
    error: "Sorry, I couldn't connect to the AI service. Please check your internet connection and try again.",
    questions: [
      "How to treat tomato blight?",
      "Best fertilizer for rice?",
      "Guava leaf disease symptoms?",
      "How to grow mango organically?",
      "Potato late blight treatment?",
      "Wheat rust prevention tips?",
    ],
  },
  hi: {
    greeting: "नमस्ते! मैं एग्रो एआई असिस्टेंट हूँ 🌿\n\nमैं इनमें मदद कर सकता हूँ:\n• फसल रोग पहचान और उपचार\n• उर्वरक सिफारिशें\n• खेती की सर्वोत्तम प्रथाएं\n• कीट प्रबंधन\n• मौसमी फसल सलाह\n\nआप क्या जानना चाहते हैं?",
    placeholder: "फसल, रोग, उर्वरक के बारे में पूछें...",
    typing: "एग्रो एआई सोच रहा है...",
    suggested: "त्वरित प्रश्न:",
    clear: "चैट साफ़ करें",
    error: "क्षमा करें, एआई सेवा से कनेक्ट नहीं हो सका। कृपया पुनः प्रयास करें।",
    questions: [
      "टमाटर ब्लाइट का इलाज कैसे करें?",
      "चावल के लिए सबसे अच्छा उर्वरक?",
      "अमरूद के पत्ते के रोग के लक्षण?",
      "आम जैविक रूप से कैसे उगाएं?",
      "आलू लेट ब्लाइट उपचार?",
      "गेहूं रस्ट रोकथाम के टिप्स?",
    ],
  },
};

// ── Render markdown-like text (Optimized with memo) ───────────────────────────
const RenderMessage = memo(({ text }) => {
  const lines = useMemo(() => text.split('\n'), [text]);
  
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        // Bullet points
        if (line.startsWith('• ') || line.startsWith('- ') || line.match(/^\d+\./)) {
          return (
            <div key={i} style={{ paddingLeft: '0.5rem', marginBottom: '0.2rem' }}>
              {rendered}
            </div>
          );
        }
        // Headings (lines with emojis at start or ending with :)
        if (line.match(/^[🌿🦠💊🛡️💡🌱🧪💧🪨🗓️✨👉⚠️📋]/)) {
          return (
            <div key={i} style={{ fontWeight: 600, marginTop: i > 0 ? '0.6rem' : 0, marginBottom: '0.2rem' }}>
              {rendered}
            </div>
          );
        }
        if (line === '') return <div key={i} style={{ height: '0.4rem' }} />;
        return <div key={i}>{rendered}</div>;
      })}
    </div>
  );
});

// ── Main Chatbot component ────────────────────────────────────────────────────
export default function Chatbot({ inline = false }) {
  const { language } = useLanguage();
  
  // Memoize translations to avoid re-calculation
  const T = useMemo(() => UI[language] || UI.en, [language]);

  const makeGreeting = useCallback((lang) => ({ 
    text: (UI[lang] || UI.en).greeting, 
    isBot: true 
  }), []);

  const [isOpen, setIsOpen] = useState(inline);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('agro_chat_v3');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [makeGreeting(language)];
  });

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const prevLangRef = useRef(language);

  // Optimized Scroll to bottom
  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    localStorage.setItem('agro_chat_v3', JSON.stringify(messages));
  }, [messages, isTyping]);

  // Reset greeting when language changes
  useEffect(() => {
    if (prevLangRef.current !== language) {
      prevLangRef.current = language;
      setMessages([makeGreeting(language)]);
    }
  }, [language, makeGreeting]);

  // Setup speech recognition (one-time setup)
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => { 
      const transcript = e.results[0][0].transcript;
      if (transcript) setInput(transcript);
      setIsListening(false); 
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  const toggleListen = useCallback((e) => {
    e.preventDefault();
    if (!recognitionRef.current) { alert('Voice input not supported in this browser.'); return; }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, language]);

  const sendMessage = useCallback(async (text) => {
    const userText = text.trim();
    if (!userText || isTyping) return;

    // 1. Instant feedback: Update UI immediately
    setMessages(prev => [...prev, { text: userText, isBot: false }]);
    setInput('');
    setIsTyping(true);

    try {
      // 2. Optimized history handling: Only send last 6 messages for context
      const historyForApi = messages.slice(-6).map(m => ({ text: m.text, isBot: m.isBot }));

      const response = await fetch(API_ENDPOINTS.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: historyForApi,
          lang: language,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.reply) {
        let errMsg = data.error || 'No reply from server';
        if (response.status === 429 || errMsg.includes('busy') || errMsg.includes('quota')) {
          errMsg = '⏳ AI service busy. Please try again.';
        }
        throw new Error(errMsg);
      }

      setMessages(prev => [...prev, { text: data.reply, isBot: true }]);
    } catch (err) {
      console.error('[Chatbot] Error:', err.message);
      setMessages(prev => [...prev, { text: T.error, isBot: true, isError: true }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, language, T.error]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  }, [input, sendMessage]);

  const clearChat = useCallback(() => {
    const fresh = [makeGreeting(language)];
    setMessages(fresh);
    localStorage.removeItem('agro_chat_v3');
  }, [language, makeGreeting]);

  const showSuggestions = useMemo(() => messages.length <= 1, [messages.length]);

  return (
    <div style={inline
      ? { width: '100%', height: '100%' }
      : { position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }
    }>
      {(isOpen || inline) ? (
        <div
          className={`glass-panel ${inline ? '' : 'animate-slide-up'}`}
          style={{
            width: inline ? '100%' : '400px',
            height: inline ? '100%' : '620px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: inline ? 'none' : '0 10px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '0.9rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} color="#000" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Agro AI Assistant</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)' }}>● Online</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={clearChat}
                style={{ background: 'none', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '6px' }}
              >
                {T.clear}
              </button>
              {!inline && (
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Suggested questions */}
            {showSuggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{T.suggested}</span>
                {T.questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(43,209,94,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  >
                    {q} <ChevronRight size={13} color="var(--accent-color)" />
                  </button>
                ))}
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                  maxWidth: '88%',
                  background: msg.isBot
                    ? (msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.07)')
                    : 'var(--accent-color)',
                  color: msg.isBot ? 'var(--text-primary)' : '#000',
                  padding: '0.75rem 1rem',
                  borderRadius: '14px',
                  borderBottomLeftRadius: msg.isBot ? '3px' : '14px',
                  borderBottomRightRadius: msg.isBot ? '14px' : '3px',
                  fontSize: '0.9rem',
                  border: msg.isError ? '1px solid rgba(239,68,68,0.3)' : 'none',
                }}
              >
                <RenderMessage text={msg.text} />
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(255,255,255,0.07)',
                padding: '0.75rem 1rem',
                borderRadius: '14px',
                borderBottomLeftRadius: '3px',
                fontSize: '0.85rem',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span style={{ display: 'flex', gap: '3px' }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--accent-color)',
                      animation: `bounce 1.2s ${d * 0.2}s infinite`,
                    }} />
                  ))}
                </span>
                {T.typing}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '0.75rem',
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              gap: '0.4rem',
              alignItems: 'center',
              flexShrink: 0,
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            <button
              type="button"
              onClick={toggleListen}
              title="Voice input"
              style={{
                width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                background: isListening ? 'var(--danger)' : 'rgba(255,255,255,0.08)',
                border: '1px solid var(--glass-border)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: isListening ? 'pulse 1.5s infinite' : 'none',
              }}
            >
              <Mic size={16} color={isListening ? '#fff' : 'var(--accent-color)'} />
            </button>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isListening ? (language === 'hi' ? 'सुन रहा हूँ...' : 'Listening...') : T.placeholder}
              disabled={isTyping}
              className="glass-input"
              style={{
                flex: 1,
                borderRadius: '20px',
                padding: '0.65rem 1.2rem',
              }}
            />

            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: (isTyping || !input.trim()) ? 'rgba(255,255,255,0.1)' : 'var(--accent-color)',
                border: 'none',
                cursor: (isTyping || !input.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <Send size={17} color={(isTyping || !input.trim()) ? 'var(--text-secondary)' : '#000'} />
            </button>
          </form>
        </div>
      ) : (
        /* Floating button */
        <button
          onClick={() => setIsOpen(true)}
          className="animate-slide-up"
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'var(--accent-color)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(43,209,94,0.4)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageSquare size={28} color="#000" />
        </button>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}
