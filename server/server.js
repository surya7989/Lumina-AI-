const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
].filter(Boolean).map(o => o.replace(/\/$/, ''));
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const cleaned = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleaned)) return cb(null, true);
    if (origin.endsWith('.onrender.com')) return cb(null, true);
    console.warn('CORS blocked origin:', origin);
    return cb(null, false);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

const chatRoutes = require('./routes/chat');
const videoRoutes = require('./routes/video');
const quizRoutes = require('./routes/quiz');
const dbRoutes = require('./routes/db');
const documentRoutes = require('./routes/document');
const debugRoutes = require('./routes/debug');

// Mount with and without /api prefix for compatibility with client proxy and direct calls
app.use('/api/chat', chatRoutes);
app.use('/chat', chatRoutes);

app.use('/api/video', videoRoutes);
app.use('/video', videoRoutes);

// Debug endpoint (exposes only presence of envs; does NOT reveal keys)
app.use('/api/debug', debugRoutes);

app.use('/api/quiz', quizRoutes);
app.use('/quiz', quizRoutes);

app.use('/api/db', dbRoutes);
app.use('/db', dbRoutes);

app.use('/api/document', documentRoutes);
app.use('/document', documentRoutes);

// Serve frontend static files (dynamic: handle case where dist may not exist at startup)
const frontendPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');

// Middleware to serve static files when available. If not available yet, return a friendly 503 for root
app.use((req, res, next) => {
  // allow API routes to pass through
  if (req.path.startsWith('/api') || req.path.startsWith('/chat') || req.path.startsWith('/video') || req.path.startsWith('/db') || req.path.startsWith('/document')) return next();

  if (fs.existsSync(frontendPath)) {
    // serve static files from dist
    return express.static(frontendPath)(req, res, next);
  }

  // If frontend not ready, show a small placeholder for root/index to avoid blank page
  if (req.path === '/' || req.path === '/index.html') {
    return res.status(503).send(`<!doctype html><html><head><meta charset="utf-8"><title>Deploying...</title></head><body style="font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f7fafc;margin:0;"><div style="text-align:center;color:#333"><h2>Site is deploying</h2><p>The frontend build is not yet available. Please wait a moment and refresh the page.</p></div></body></html>`);
  }

  // For other asset requests, continue to next handlers (will 404 or be handled by other middleware)
  return next();
});

// Fallback for client-side routing: when dist exists, always serve index.html for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/chat') || req.path.startsWith('/video') || req.path.startsWith('/db') || req.path.startsWith('/document')) return next();
  if (fs.existsSync(frontendPath)) {
    return res.sendFile(path.join(frontendPath, 'index.html'));
  }
  return res.status(503).send('Frontend not ready');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Proxy running on port ${PORT}`);
});
