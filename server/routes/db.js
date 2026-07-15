const express = require('express');
const router = express.Router();
const { supabaseRequest } = require('../utils/supabase');

router.post('/setup', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    if (force) {
      const allCats = await supabaseRequest('GET', '/rest/v1/quiz_categories?select=id');
      if (Array.isArray(allCats)) {
        for (const c of allCats) {
          try { await supabaseRequest('DELETE', `/rest/v1/questions?category_id=eq.${c.id}`); } catch {}
          try { await supabaseRequest('DELETE', `/rest/v1/quiz_results?category_id=eq.${c.id}`); } catch {}
        }
      }
      try { await supabaseRequest('DELETE', '/rest/v1/quiz_categories?id=neq.00000000-0000-0000-0000-000000000000'); } catch {}
    }

    const DEMO_CATEGORIES = [
      { name: 'Mathematics', description: 'Test your math skills from algebra to calculus', is_active: true },
      { name: 'Science', description: 'Explore physics, chemistry, and biology', is_active: true },
      { name: 'English', description: 'Improve your grammar, vocabulary, and comprehension', is_active: true },
      { name: 'History', description: 'Journey through world history and civilizations', is_active: true },
      { name: 'Technology', description: 'Test your knowledge of computers, programming, and IT', is_active: true },
    ];

    const existingCats = force ? [] : await supabaseRequest('GET', '/rest/v1/quiz_categories?select=id&limit=1');
    let createdNewCats = false;

    const created = [];
    if (Array.isArray(existingCats) && existingCats.length === 0 || force) {
      for (const cat of DEMO_CATEGORIES) {
        const result = await supabaseRequest('POST', '/rest/v1/quiz_categories', cat);
        created.push(Array.isArray(result) ? result[0] : result);
      }
      createdNewCats = true;
    } else {
      const allCats = await supabaseRequest('GET', '/rest/v1/quiz_categories?select=id&limit=5');
      if (Array.isArray(allCats)) created.push(...allCats.slice(0, 5));
    }

    if (createdNewCats) {
      const QUESTIONS = [
        { category_id: created[0].id, question: 'What is the value of π (pi) rounded to 2 decimal places?', options: ['3.14', '3.16', '3.12', '3.18'], correct_answer: 0, difficulty: 'easy', explanation: '[Algebra] 3.14 is the standard approximation of pi rounded to 2 decimal places.', is_active: true },
        { category_id: created[0].id, question: 'What is the derivative of x²?', options: ['x', '2x', 'x²', '2'], correct_answer: 1, difficulty: 'medium', explanation: '[Calculus] The derivative of x² is 2x using the power rule.', is_active: true },
        { category_id: created[0].id, question: 'What is 7 × 8 + 4?', options: ['56', '60', '64', '52'], correct_answer: 1, difficulty: 'easy', explanation: '[Arithmetic] 7×8=56, 56+4=60.', is_active: true },
        { category_id: created[0].id, question: 'What is the square root of 144?', options: ['10', '11', '12', '13'], correct_answer: 2, difficulty: 'easy', explanation: '[Arithmetic] 12×12=144.', is_active: true },
        { category_id: created[0].id, question: 'Solve for x: 2x + 6 = 14', options: ['3', '4', '5', '6'], correct_answer: 1, difficulty: 'medium', explanation: '[Algebra] 2x=8, x=4.', is_active: true },
        { category_id: created[1].id, question: 'What is the chemical symbol for water?', options: ['H2O', 'CO2', 'NaCl', 'O2'], correct_answer: 0, difficulty: 'easy', explanation: '[Chemistry] H2O is the chemical formula for water.', is_active: true },
        { category_id: created[1].id, question: 'What planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correct_answer: 2, difficulty: 'easy', explanation: '[Astronomy] Mars appears reddish due to iron oxide on its surface.', is_active: true },
        { category_id: created[1].id, question: 'What is the speed of light approximately?', options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '100,000 km/s'], correct_answer: 0, difficulty: 'medium', explanation: '[Physics] Light travels at about 300,000 kilometers per second in a vacuum.', is_active: true },
        { category_id: created[1].id, question: 'What force keeps planets orbiting the sun?', options: ['Magnetism', 'Gravity', 'Friction', 'Centrifugal'], correct_answer: 1, difficulty: 'easy', explanation: '[Physics] Gravity is the attractive force between celestial bodies.', is_active: true },
        { category_id: created[1].id, question: 'What is the atomic number of Carbon?', options: ['4', '6', '8', '12'], correct_answer: 1, difficulty: 'medium', explanation: '[Chemistry] Carbon has 6 protons, so its atomic number is 6.', is_active: true },
        { category_id: created[2].id, question: 'What is a synonym for "happy"?', options: ['Sad', 'Angry', 'Joyful', 'Tired'], correct_answer: 2, difficulty: 'easy', explanation: '[Vocabulary] Joyful means feeling or expressing great happiness.', is_active: true },
        { category_id: created[2].id, question: 'Which part of speech describes a noun?', options: ['Verb', 'Adjective', 'Adverb', 'Preposition'], correct_answer: 1, difficulty: 'easy', explanation: '[Grammar] Adjectives describe or modify nouns.', is_active: true },
        { category_id: created[2].id, question: 'What is the past tense of "go"?', options: ['Goed', 'Going', 'Went', 'Gone'], correct_answer: 2, difficulty: 'easy', explanation: '[Grammar] "Went" is the irregular past tense of "go".', is_active: true },
        { category_id: created[2].id, question: 'What is a metaphor?', options: ['A comparison using like/as', 'A direct comparison', 'A rhyming scheme', 'A type of poem'], correct_answer: 1, difficulty: 'medium', explanation: '[Literature] A metaphor directly compares unrelated subjects without using like or as.', is_active: true },
        { category_id: created[2].id, question: 'Identify the adverb: "She ran quickly."', options: ['She', 'Ran', 'Quickly', 'None'], correct_answer: 2, difficulty: 'easy', explanation: '[Grammar] "Quickly" modifies the verb "ran".', is_active: true },
        { category_id: created[3].id, question: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correct_answer: 2, difficulty: 'easy', explanation: '[World War II] WWII ended in 1945 after the surrender of Germany and Japan.', is_active: true },
        { category_id: created[3].id, question: 'Who was the first President of the United States?', options: ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'], correct_answer: 1, difficulty: 'easy', explanation: '[American History] George Washington served as the first US President from 1789-1797.', is_active: true },
        { category_id: created[3].id, question: 'What ancient civilization built the pyramids?', options: ['Romans', 'Greeks', 'Egyptians', 'Persians'], correct_answer: 2, difficulty: 'easy', explanation: '[Ancient Civilizations] The ancient Egyptians built the pyramids as tombs for pharaohs.', is_active: true },
        { category_id: created[3].id, question: 'What year was the Berlin Wall torn down?', options: ['1987', '1988', '1989', '1990'], correct_answer: 2, difficulty: 'medium', explanation: '[Modern History] The Berlin Wall fell on November 9, 1989.', is_active: true },
        { category_id: created[3].id, question: 'Who discovered America in 1492?', options: ['Vasco da Gama', 'Ferdinand Magellan', 'Christopher Columbus', 'Amerigo Vespucci'], correct_answer: 2, difficulty: 'easy', explanation: '[Exploration] Christopher Columbus reached the Americas in 1492.', is_active: true },
        { category_id: created[4].id, question: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Core Process Unit'], correct_answer: 1, difficulty: 'easy', explanation: '[Computer Hardware] CPU stands for Central Processing Unit.', is_active: true },
        { category_id: created[4].id, question: 'What programming language is known as the "language of the web"?', options: ['Python', 'Java', 'JavaScript', 'C++'], correct_answer: 2, difficulty: 'easy', explanation: '[Programming] JavaScript is the primary language for web browsers.', is_active: true },
        { category_id: created[4].id, question: 'What does "HTML" stand for?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'HyperTransfer Markup Language'], correct_answer: 0, difficulty: 'easy', explanation: '[Web Development] HTML stands for HyperText Markup Language.', is_active: true },
        { category_id: created[4].id, question: 'What is the binary representation of the number 5?', options: ['101', '110', '100', '111'], correct_answer: 0, difficulty: 'medium', explanation: '[Computer Science] 5 in binary is 101 (1×4 + 0×2 + 1×1).', is_active: true },
        { category_id: created[4].id, question: 'What is a REST API?', options: ['A database', 'An architectural style for APIs', 'A programming language', 'A type of server'], correct_answer: 1, difficulty: 'hard', explanation: '[Web Development] REST is an architectural style for designing networked APIs.', is_active: true },
      ];
      for (const q of QUESTIONS) {
        try {
          await supabaseRequest('POST', '/rest/v1/questions', q);
        } catch {}
      }
    }

    try {
      const existingWorkspaces = await supabaseRequest('GET', '/rest/v1/workspaces?select=id&limit=1');
      let wsId;
      if (Array.isArray(existingWorkspaces) && existingWorkspaces.length > 0) {
        wsId = existingWorkspaces[0].id;
      } else {
        // Break circular FK: profiles ← workspaces.admin_id → profiles.workspace_id
        // Step 1: find or create a superadmin profile with workspace_id = null
        const existingProfiles = await supabaseRequest('GET', '/rest/v1/profiles?select=id,email,workspace_id&limit=1');
        let adminId;
        if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
          adminId = existingProfiles[0].id;
        }
        if (!adminId) {
          // Create a workspace admin using the demo email as placeholder (no auth.users FK check)
          const newProfile = await supabaseRequest('POST', '/rest/v1/profiles', {
            id: '6112c667-2c92-4f43-94d7-3095af77aba5',
            name: 'Super Admin',
            email: 'superadmin@aiplatform.com',
            role: 'superadmin',
            workspace_id: null,
          });
          adminId = Array.isArray(newProfile) ? newProfile[0]?.id : newProfile?.id;
        }
        if (adminId) {
          const wsResult = await supabaseRequest('POST', '/rest/v1/workspaces', {
            name: 'Demo Workspace',
            email: 'demo@workspace.com',
            admin_id: adminId,
            total_students: 1,
          });
          wsId = Array.isArray(wsResult) ? wsResult[0]?.id : wsResult?.id;
          // Step 2: update the profile to link back to the workspace
          if (wsId) {
            try {
              await supabaseRequest('PATCH', `/rest/v1/profiles?id=eq.${adminId}`, { workspace_id: wsId });
            } catch {}
          }
        }
      }
      if (wsId) {
        const existingStudents = await supabaseRequest('GET', '/rest/v1/students?select=id&limit=1');
        if (!Array.isArray(existingStudents) || existingStudents.length === 0) {
          await supabaseRequest('POST', '/rest/v1/students', {
            student_id: 'DEMO001',
            name: 'Demo Student',
            email: 'demo@student.com',
            workspace_id: wsId,
          });
        }
      }
    } catch (e) { console.error('Seed workspace error:', e); }

    return res.json({ success: true, message: 'Demo data seeded successfully', categories: DEMO_CATEGORIES.length, questions: createdNewCats ? 25 : 0 });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.all('/:table/:id?', async (req, res) => {
  try {
    const table = TABLE_MAP[req.params.table];
    if (!table) return res.status(400).json({ success: false, error: `Unknown table: ${req.params.table}` });
    const id = req.params.id;
    const method = req.method;

    if (method === 'GET') {
      if (id && id !== 'undefined' && id !== 'null' && id !== '') {
        const result = await supabaseRequest('GET', `/rest/v1/${table}?id=eq.${id}&select=*`);
        const item = Array.isArray(result) ? result[0] : result;
        return res.json({ success: true, data: item || null });
      }
      // Forward any query params (select, offset, limit, order, filters) to Supabase
      const qs = Object.entries(req.query).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      let path = `/rest/v1/${table}?select=*${qs ? '&' + qs : ''}`;
      try {
        const result = await supabaseRequest('GET', path + '&order=created_at.desc');
        return res.json({ success: true, data: Array.isArray(result) ? result : [] });
      } catch {
        const result = await supabaseRequest('GET', path);
        return res.json({ success: true, data: Array.isArray(result) ? result : [] });
      }
    }

    if (method === 'POST') {
      let result = await supabaseRequest('POST', `/rest/v1/${table}`, req.body);
      if (Array.isArray(result)) result = result[0];
      return res.status(201).json({ success: true, data: result });
    }

    if (method === 'PUT' && id && id !== 'undefined' && id !== 'null' && id !== '') {
      let result = await supabaseRequest('PATCH', `/rest/v1/${table}?id=eq.${id}`, req.body);
      if (Array.isArray(result)) result = result[0];
      return res.json({ success: true, data: result });
    }

    if (method === 'DELETE' && id && id !== 'undefined' && id !== 'null' && id !== '') {
      await supabaseRequest('DELETE', `/rest/v1/${table}?id=eq.${id}`);
      return res.json({ success: true, data: null });
    }

    return res.status(400).json({ success: false, error: 'Invalid request' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
