const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');

const upload = multer({
  dest: path.join(__dirname, '..', 'tmp'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function extractText(filePath, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const textExts = ['.txt', '.md', '.csv', '.json', '.js', '.py', '.html', '.css', '.xml', '.yaml', '.yml', '.log', '.env', '.sh', '.bat', '.sql', '.ts', '.jsx', '.tsx'];
  if (textExts.includes(ext)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const binaryPatterns = ['\u0000', '\ufffd'];
  let binaryScore = 0;
  for (const ch of content.slice(0, 1000)) {
    if (binaryPatterns.includes(ch)) binaryScore++;
  }
  if (binaryScore > 10) {
    return null;
  }
  return content;
}

router.post('/analyze', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;

  try {
    const text = extractText(filePath, fileName);

    if (text === null) {
      return res.status(400).json({
        success: false,
        error: 'Binary file format not supported for direct text extraction. Please upload text-based files (.txt, .md, .csv, .json, .js, .py, .html, .css, .pdf).',
      });
    }

    const truncated = text.length > 100000 ? text.substring(0, 100000) + '\n\n...[truncated]' : text;

    const prompt = `You are analyzing a document named "${fileName}". Here is its content:

\`\`\`
${truncated}
\`\`\`

Please provide:
1. **Summary**: Brief overview of what this document contains
2. **Key Information**: Important data, code, or content from the document
3. **Format**: The type and structure of the document
4. **Notable Items**: Any interesting or important elements

Be thorough in your analysis.`;

    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a document analysis assistant. Provide clear, structured analysis of document content.' },
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
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const result = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error) reject(new Error(parsed.error.message || 'Analysis failed'));
            else resolve(parsed);
          } catch { reject(new Error('Failed to parse analysis response')); }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    const analysis = result.choices?.[0]?.message?.content || 'No analysis generated';

    return res.status(200).json({
      success: true,
      data: {
        fileName,
        fileSize: req.file.size,
        contentPreview: truncated.substring(0, 2000),
        analysis,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
});

module.exports = router;
