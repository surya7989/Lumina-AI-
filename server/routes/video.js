const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
// Store uploads temporarily
const upload = multer({
  dest: path.join(__dirname, '..', 'tmp'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'video/mp4', 'video/webm', 'video/mpeg', 'video/ogg',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'audio/flac', 'audio/m4a', 'audio/mp4', 'audio/webm',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp4|webm|mpeg|ogg|mp3|wav|flac|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload mp4, webm, mp3, wav, ogg, or flac.'));
    }
  },
});

function transcribeWithGroq(filePath, fileName) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), fileName);
    form.append('model', 'whisper-large-v3');
    form.append('language', 'en');
    form.append('response_format', 'verbose_json');

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) reject(new Error(parsed.error.message || 'Transcription failed'));
          else resolve(parsed);
        } catch {
          reject(new Error('Failed to parse transcription response'));
        }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

function analyzeWithLLM(transcript, fileName) {
  return new Promise((resolve, reject) => {
    const prompt = `You are an expert content analyst. Analyze the following transcript from a video/audio file named "${fileName}".

Provide a comprehensive analysis with the following sections:
1. **Summary**: A clear, concise summary of what the content is about
2. **Key Topics**: List the main topics discussed
3. **Key Points**: Bullet points of the most important information
4. **Content Type**: What type of content this is (lecture, tutorial, interview, presentation, etc.)
5. **Duration Estimate**: Based on the content density
6. **Learning Objectives**: If educational, what can viewers learn from this
7. **Notable Quotes**: Any standout statements or quotes

TRANSCRIPT:
${transcript}`;

    const data = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an expert content analyst that provides detailed, well-structured analysis of video and audio content. Use markdown formatting.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) reject(new Error(parsed.error.message || 'Analysis failed'));
          else resolve(parsed.choices?.[0]?.message?.content || 'No analysis generated');
        } catch {
          reject(new Error('Failed to parse analysis response'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

router.post('/analyze', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;

  try {
    // Step 1: Transcribe with Whisper
    const transcription = await transcribeWithGroq(filePath, fileName);
    const transcript = transcription.text || '';

    if (!transcript.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any speech from the file. Please upload a file with clear audio.',
      });
    }

    // Step 2: Analyze transcript with LLM
    const analysis = await analyzeWithLLM(transcript, fileName);

    // Step 3: Build segments from Whisper data
    const segments = (transcription.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    }));

    return res.status(200).json({
      success: true,
      data: {
        fileName,
        fileSize: req.file.size,
        transcript,
        analysis,
        segments,
        duration: transcription.duration || null,
        language: transcription.language || 'en',
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(filePath); } catch {}
  }
});

// Multer errors occur before the handler above. Return the same JSON contract
// so the Video Analysis page can always display a useful message.
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'File too large. Maximum size is 100MB.'
      : error.message;
    return res.status(400).json({ success: false, error: message });
  }
  if (error) return res.status(400).json({ success: false, error: error.message || 'Upload failed' });
  return next();
});

module.exports = router;
