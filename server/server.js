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
].filter(Boolean);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)), credentials: true }));
app.use(express.json({ limit: '50mb' }));

const chatRoutes = require('./routes/chat');
const videoRoutes = require('./routes/video');
const quizRoutes = require('./routes/quiz');
const dbRoutes = require('./routes/db');
const documentRoutes = require('./routes/document');

// Mount with and without /api prefix for compatibility with client proxy and direct calls
app.use('/api/chat', chatRoutes);
app.use('/chat', chatRoutes);

app.use('/api/video', videoRoutes);
app.use('/video', videoRoutes);

app.use('/api/quiz', quizRoutes);
app.use('/quiz', quizRoutes);

app.use('/api/db', dbRoutes);
app.use('/db', dbRoutes);

app.use('/api/document', documentRoutes);
app.use('/document', documentRoutes);

// Serve frontend static files (only when dist exists — e.g. Docker deployment)
const frontendPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return;
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Proxy running on port ${PORT}`);
});
