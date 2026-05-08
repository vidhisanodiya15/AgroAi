const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const fs = require('fs');

const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

// Manual fallback if dotenv fails to see the key
if (!process.env.OPENWEATHER_API_KEY) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('OPENWEATHER_API_KEY=')) {
        process.env.OPENWEATHER_API_KEY = line.split('=')[1].trim();
        console.log('📡 Manual fallback: OPENWEATHER_API_KEY loaded from file.');
      }
    }
  } catch (err) {
    console.error('📡 Manual fallback failed:', err.message);
  }
}

if (result.error) {
  console.warn('⚠️ Standard dotenv load failed, using manual fallback if possible.');
} else {
  console.log(`📡 Environment loaded from: ${envPath}`);
}

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Note: Static Frontend serving removed to allow separate deployment

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));

// ── Image Analysis ────────────────────────────────────────────────────────────
const { analyzeImage } = require('./controllers/predictionController');
const { optionalProtect } = require('./middleware/auth');
const upload = require('./middleware/upload');

app.post('/api/analyze-image', optionalProtect, upload.single('image'), analyzeImage);

// ── Chatbot ───────────────────────────────────────────────────────────────────
const { chatWithAI } = require('./controllers/chatbotController');
app.post('/api/chat', chatWithAI);

// ── Weather API Proxy ────────────────────────────────────────────────────────
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon, city, units = 'metric' } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      console.warn('[WEATHER] No API key found, serving mock data.');
      return res.json({
        success: true,
        isMock: true,
        data: {
          name: city || 'New Delhi',
          sys: { country: 'IN' },
          main: { temp: 28, humidity: 65, pressure: 1012 },
          weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
          wind: { speed: 4.1 },
          recommendation: "Note: Showing demo data. Please add OPENWEATHER_API_KEY to your .env for real-time local weather."
        }
      });
    }

    let url = `https://api.openweathermap.org/data/2.5/weather?appid=${apiKey}&units=${units}`;
    if (lat && lon) url += `&lat=${lat}&lon=${lon}`;
    else if (city) url += `&q=${city}`;
    else return res.status(400).json({ success: false, error: 'Location required (lat/lon or city)' });

    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || 'Weather fetch failed' 
      });
    }

    // Add AI-based recommendation based on weather
    let recommendation = "Standard irrigation recommended.";
    if (data.main.humidity > 80) recommendation = "High humidity detected. Monitor for fungal diseases like Late Blight.";
    if (data.main.temp > 35) recommendation = "Extreme heat. Increase irrigation frequency to prevent plant stress.";
    if (data.weather[0].main === 'Rain') recommendation = "Rain forecast. Delay scheduled irrigation and chemical spraying.";

    res.json({ success: true, isMock: false, data: { ...data, recommendation } });
  } catch (error) {
    console.error('[WEATHER] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch weather data' });
  }
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Agro AI Backend is running', timestamp: new Date().toISOString() });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('image')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Health Check ──────────────────────────────────────────────────────────────

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  connectDB(); // Don't await, let it connect in background
  app.listen(PORT, () => {
    console.log(`✅ Agro AI Backend running on http://localhost:${PORT}`);
    console.log(`   Gemini API key: ${(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) ? '✓ loaded' : '✗ MISSING'}`);
    console.log(`   OpenWeather API key: ${process.env.OPENWEATHER_API_KEY ? '✓ loaded' : '✗ MISSING'}`);
  });
};

startServer();
