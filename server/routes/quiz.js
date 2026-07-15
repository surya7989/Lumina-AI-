const express = require('express');
const router = express.Router();
const https = require('https');
const { supabaseRequest } = require('../utils/supabase');

const TABLE_MAP = {
  categories: 'quiz_categories',
  questions: 'questions',
  results: 'quiz_results',
};

function extractTopic(explanation) {
  if (!explanation) return null;
  const match = explanation.match(/^\[([^\]]+)\]\s*/);
  return match ? match[1] : null;
}

function stripTopic(explanation) {
  if (!explanation) return '';
  return explanation.replace(/^\[([^\]]+)\]\s*/, '');
}

function mapQuestionFields(q) {
  if (!q) return q;
  return {
    id: q.id,
    questionText: q.question,
    options: q.options,
    correctAnswer: q.correct_answer,
    difficulty: q.difficulty,
    explanation: stripTopic(q.explanation),
    categoryId: q.category_id,
    topic: extractTopic(q.explanation),
    isActive: q.is_active,
  };
}

function mapQuestionFieldsInverse(body) {
  const out = {};
  if (body.questionText !== undefined) out.question = body.questionText;
  if (body.options !== undefined) out.options = body.options;
  if (body.correctAnswer !== undefined) out.correct_answer = Number(body.correctAnswer);
  if (body.difficulty !== undefined) out.difficulty = body.difficulty;
  if (body.category !== undefined) out.category_id = body.category;
  if (body.categoryId !== undefined) out.category_id = body.categoryId;
  if (body.isActive !== undefined) out.is_active = body.isActive;
  if (body.topic !== undefined) {
    out.explanation = `[${body.topic}] ${body.explanation || ''}`;
  } else if (body.explanation !== undefined) {
    out.explanation = body.explanation;
  }
  return out;
}

function mapCategoryFields(c) {
  if (!c) return c;
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    isActive: c.is_active,
    is_active: c.is_active,
    questionCount: c.questionCount || 0,
    createdAt: c.created_at,
  };
}

// --- AI Generate questions (with topic) ---
router.post('/ai-generate', async (req, res) => {
  try {
    const { categoryId, categoryName, count = 5, difficulty = 'mixed', topic } = req.body || {};

    if (!categoryId && !categoryName) {
      return res.status(400).json({ success: false, error: 'Category is required' });
    }
    if (!Number.isInteger(Number(count)) || Number(count) < 1 || Number(count) > 20) {
      return res.status(400).json({ success: false, error: 'count must be between 1 and 20' });
    }

    const diffInstruction = difficulty === 'mixed'
      ? 'Mix of easy (30%), medium (40%), and hard (30%) questions'
      : `All questions should be ${difficulty} difficulty`;

    const topicInstruction = topic
      ? `Focus specifically on: ${topic}`
      : `Cover a range of topics within ${categoryName || 'the category'}`;

    const prompt = `Generate exactly ${count} multiple-choice quiz questions for the category "${categoryName || 'General'}".

${topicInstruction}

${diffInstruction}

For each question, provide:
- questionText: The question
- options: Array of 4 possible answers
- correctAnswer: Index (0-3) of the correct answer
- difficulty: "easy", "medium", or "hard"
- explanation: Brief explanation of the correct answer
- topic: A specific subtopic name (e.g. "Algebra", "World War II", "Grammar", "Chemistry")

Return ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "questionText": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "difficulty": "medium",
    "explanation": "...",
    "topic": "Subtopic name"
  }
]`;

    const payload = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a quiz generator. You ONLY respond with valid JSON arrays. No markdown, no code block fences, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
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

    const groqResult = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error) reject(new Error(parsed.error.message || 'Groq API error'));
            else resolve(parsed);
          } catch { reject(new Error('Failed to parse Groq response')); }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    const text = groqResult.choices?.[0]?.message?.content || '[]';
    let questions;
    try {
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error('Not an array');
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { questions = JSON.parse(match[0]); } catch { questions = []; }
      } else {
        questions = [];
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to generate valid questions. Please try again.' });
    }

    const saved = [];
    for (const q of questions.slice(0, count)) {
      try {
        const topic = q.topic || '';
        const explanation = topic ? `[${topic}] ${q.explanation || ''}` : (q.explanation || '');
        const result = await supabaseRequest('POST', '/rest/v1/questions', {
          category_id: categoryId,
          question: q.questionText,
          options: q.options,
          correct_answer: q.correctAnswer,
          difficulty: q.difficulty || 'medium',
          explanation: explanation,
          is_active: true,
        });
        saved.push(result);
      } catch {}
    }

    return res.json({ success: true, data: { generated: questions.slice(0, count), saved: saved.length } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Start quiz (returns questions arranged by topic) ---
router.post('/start', async (req, res) => {
  try {
    const { categoryId, numberOfQuestions, count } = req.body || {};
    const limit = numberOfQuestions || count || 10;

    const data = await supabaseRequest('GET', `/rest/v1/questions?select=*&category_id=eq.${categoryId}&is_active=eq.true`);
    let questions = Array.isArray(data) ? data : [];
    if (questions.length === 0) {
      return res.status(404).json({ success: false, error: 'No questions available for this category' });
    }

    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, limit);

    const mapped = shuffled.map(q => ({
      id: q.id,
      questionText: q.question,
      text: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      difficulty: q.difficulty,
      explanation: stripTopic(q.explanation),
      categoryId: q.category_id,
      topic: extractTopic(q.explanation) || 'General',
    }));

    const topics = {};
    for (const q of mapped) {
      const t = q.topic || 'General';
      if (!topics[t]) topics[t] = [];
      topics[t].push(q);
    }

    const topicOrder = Object.entries(topics).sort((a, b) => a[0].localeCompare(b[0]));
    const arranged = [];
    for (const [, qs] of topicOrder) {
      arranged.push(...qs);
    }

    return res.json({
      success: true,
      data: {
        questions: arranged,
        topics: Object.keys(topics),
        timeLimit: 600,
        totalQuestions: arranged.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Submit quiz ---
router.post('/submit', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.categoryId) return res.status(400).json({ success: false, error: 'categoryId is required' });
    if (!body.answers || !body.answers.length) return res.status(400).json({ success: false, error: 'answers are required' });

    let studentId = body.studentId;
    let workspaceId = body.workspaceId;

    // Try to get student from JWT token
    if (!studentId && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
          headers: { 'Authorization': `Bearer ${token}`, 'apikey': process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          const email = userData.email;
          if (email) {
            const studentsData = await supabaseRequest('GET', `/rest/v1/students?select=id,workspace_id&email=eq.${encodeURIComponent(email)}`);
            if (Array.isArray(studentsData) && studentsData.length > 0) {
              studentId = studentsData[0].id;
              if (!workspaceId) workspaceId = studentsData[0].workspace_id;
            }
          }
        }
      } catch {
        console.error('Failed to get user from token');
      }
    }

    // Fallback: use/create demo student
    if (!studentId) {
      const demoEmail = 'demo@student.com';
      let demoStudents = await supabaseRequest('GET', `/rest/v1/students?select=id,workspace_id&email=eq.${demoEmail}`);
      if (Array.isArray(demoStudents) && demoStudents.length > 0) {
        studentId = demoStudents[0].id;
        workspaceId = demoStudents[0].workspace_id;
      } else {
        let wsData = await supabaseRequest('GET', '/rest/v1/workspaces?select=id&limit=1');
        workspaceId = Array.isArray(wsData) && wsData.length > 0 ? wsData[0].id : null;
        if (workspaceId) {
          const newStudent = await supabaseRequest('POST', '/rest/v1/students', {
            student_id: 'DEMO001', name: 'Demo Student', email: demoEmail, workspace_id: workspaceId,
          });
          studentId = Array.isArray(newStudent) ? newStudent[0]?.id : newStudent?.id;
        }
      }
    }

    // Final safety check - ensure we have a studentId
    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Could not resolve student record. Please seed database with /db/setup' });
    }
    if (!workspaceId) {
      const wsData = await supabaseRequest('GET', '/rest/v1/workspaces?select=id&limit=1');
      workspaceId = Array.isArray(wsData) && wsData.length > 0 ? wsData[0].id : null;
    }
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'No workspace configured. Please seed the database first.' });
    }

    const data = await supabaseRequest('GET', `/rest/v1/questions?select=id,correct_answer,question,options,explanation&category_id=eq.${body.categoryId}`);
    const qs = Array.isArray(data) ? data : [];
    const questionMap = {};
    qs.forEach(q => {
      questionMap[q.id] = {
        correctAnswer: q.correct_answer,
        questionText: q.question,
        options: q.options,
        explanation: q.explanation,
      };
    });

    const answers = body.answers || [];
    let score = 0;
    const graded = answers.map(a => {
      const qi = questionMap[a.questionId] || {};
      const correctIdx = Number(qi.correctAnswer);
      const opts = Array.isArray(qi.options)
        ? qi.options
        : (typeof qi.options === 'string' ? JSON.parse(qi.options) : []);
      const correctText = opts[correctIdx];
      const sel = a.selectedAnswer;
      // selectedAnswer may be the option text (from the UI) or the numeric index
      const isCorrect = sel === correctText || Number(sel) === correctIdx;
      if (isCorrect) score++;
      return {
        questionId: a.questionId,
        questionText: qi.questionText || `Question ${a.questionId}`,
        selectedAnswer: a.selectedAnswer,
        isCorrect,
        correctAnswer: qi.correctAnswer,
        explanation: qi.explanation ? qi.explanation.replace(/^\[([^\]]+)\]\s*/, '') : '',
      };
    });

    const total = answers.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    let result = await supabaseRequest('POST', '/rest/v1/quiz_results', {
      student_id: studentId,
      workspace_id: workspaceId,
      category_id: body.categoryId,
      score,
      total_questions: total,
      answers: graded,
      time_taken: body.timeTaken || 0,
      percentage: pct,
    });
    if (Array.isArray(result)) result = result[0];

    return res.status(201).json({
      success: true,
      data: {
        id: result?.id,
        score,
        total,
        percentage: pct,
        correctCount: score,
        incorrectCount: total - score,
        answers: graded,
        timeTaken: body.timeTaken || 0,
      },
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Results ---
router.get('/results', async (req, res) => {
  try {
    const data = await supabaseRequest('GET', '/rest/v1/quiz_results?select=*,students(name,student_id)');
    return res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Leaderboard ---
router.post('/leaderboard', async (req, res) => {
  try {
    const p = req.body || {};
    let path = '/rest/v1/quiz_results?select=student_id,score,total_questions,percentage,students(name,student_id)&order=percentage.desc&limit=50';
    if (p.startDate && p.endDate) {
      path += `&completed_at=gte.${p.startDate}&completed_at=lte.${p.endDate}`;
    }
    const data = await supabaseRequest('GET', path);
    const results = Array.isArray(data) ? data : [];
    const mapped = results.map((r, i) => ({
      rank: i + 1,
      name: r.students?.name || r.studentName || 'Unknown',
      score: r.score,
      total: r.total_questions,
      percentage: r.percentage,
      studentId: r.student_id,
    }));
    return res.json({ success: true, data: mapped });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Analytics ---
router.post('/analytics', async (req, res) => {
  try {
    const p = req.body || {};
    let path = '/rest/v1/quiz_results?select=*';
    if (p.startDate && p.endDate) path += `&completed_at=gte.${p.startDate}&completed_at=lte.${p.endDate}`;
    const data = await supabaseRequest('GET', path);
    const results = Array.isArray(data) ? data : [];
    const total = results.length;
    const avgPct = total > 0 ? results.reduce((s, r) => s + (r.percentage || 0), 0) / total : 0;
    return res.json({ success: true, data: { total, avgPercentage: avgPct, results } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// --- Generic CRUD proxy with field mapping ---

router.all('/categories', async (req, res) => {
  try {
    const method = req.method;
    if (method === 'GET') {
      const data = await supabaseRequest('GET', '/rest/v1/quiz_categories?select=*');
      const categories = Array.isArray(data) ? data : [];
      const withCounts = [];
      for (const c of categories) {
        try {
          const qs = await supabaseRequest('GET', `/rest/v1/questions?select=id&category_id=eq.${c.id}&is_active=eq.true&limit=1000`);
          withCounts.push({ ...c, questionCount: Array.isArray(qs) ? qs.length : 0 });
        } catch {
          withCounts.push({ ...c, questionCount: 0 });
        }
      }
      return res.json({ success: true, data: withCounts.map(mapCategoryFields) });
    }
    if (method === 'POST') {
      let result = await supabaseRequest('POST', '/rest/v1/quiz_categories', { name: req.body.name, description: req.body.description || '', is_active: true });
      if (Array.isArray(result)) result = result[0];
      return res.status(201).json({ success: true, data: mapCategoryFields({ ...result, questionCount: 0 }) });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.all('/categories/:id', async (req, res) => {
  try {
    const method = req.method;
    const id = req.params.id;
    if (method === 'GET') {
      const result = await supabaseRequest('GET', `/rest/v1/quiz_categories?id=eq.${id}&select=*`);
      const cat = Array.isArray(result) ? result[0] : result;
      if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
      return res.json({ success: true, data: mapCategoryFields(cat) });
    }
    if (method === 'PUT') {
      let result = await supabaseRequest('PATCH', `/rest/v1/quiz_categories?id=eq.${id}`, { name: req.body.name, description: req.body.description });
      if (Array.isArray(result)) result = result[0];
      return res.json({ success: true, data: mapCategoryFields(result) });
    }
    if (method === 'DELETE') {
      await supabaseRequest('DELETE', `/rest/v1/quiz_categories?id=eq.${id}`);
      return res.json({ success: true, data: null });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.all('/questions', async (req, res) => {
  try {
    const method = req.method;
    if (method === 'GET') {
      const data = await supabaseRequest('GET', '/rest/v1/questions?select=*');
      const questions = Array.isArray(data) ? data : [];
      return res.json({ success: true, data: questions.map(mapQuestionFields) });
    }
    if (method === 'POST') {
      const mapped = mapQuestionFieldsInverse(req.body);
      if (!mapped.question) return res.status(400).json({ success: false, error: 'questionText is required' });
      if (!Array.isArray(mapped.options) || mapped.options.length !== 4 || mapped.options.some(option => !String(option).trim())) return res.status(400).json({ success: false, error: 'Exactly four non-empty options are required' });
      if (!Number.isInteger(mapped.correct_answer) || mapped.correct_answer < 0 || mapped.correct_answer > 3) return res.status(400).json({ success: false, error: 'correctAnswer must be an option index from 0 to 3' });
      if (!mapped.category_id) return res.status(400).json({ success: false, error: 'category is required' });
      mapped.is_active = true;
      let result = await supabaseRequest('POST', '/rest/v1/questions', mapped);
      if (Array.isArray(result)) result = result[0];
      return res.status(201).json({ success: true, data: mapQuestionFields(result) });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.all('/questions/:id', async (req, res) => {
  try {
    const method = req.method;
    const id = req.params.id;
    if (method === 'GET') {
      const result = await supabaseRequest('GET', `/rest/v1/questions?id=eq.${id}&select=*`);
      const q = Array.isArray(result) ? result[0] : result;
      if (!q) return res.status(404).json({ success: false, error: 'Question not found' });
      return res.json({ success: true, data: mapQuestionFields(q) });
    }
    if (method === 'PUT') {
      const mapped = mapQuestionFieldsInverse(req.body);
      let result = await supabaseRequest('PATCH', `/rest/v1/questions?id=eq.${id}`, mapped);
      if (Array.isArray(result)) result = result[0];
      return res.json({ success: true, data: mapQuestionFields(result) });
    }
    if (method === 'DELETE') {
      await supabaseRequest('DELETE', `/rest/v1/questions?id=eq.${id}`);
      return res.json({ success: true, data: null });
    }
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
