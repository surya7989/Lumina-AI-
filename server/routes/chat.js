const express = require('express');
const router = express.Router();
const { supabaseRequest } = require('../utils/supabase');
const { resolveSuperadminProfile } = require('../utils/profile');
const { createChat, sendMessage, sendMessageStream } = require('../controllers/chatController');

async function getUserId(req) {
  if (req.user) return req.user.id;
  return resolveSuperadminProfile();
}

router.post('/', createChat);
router.post('/:id/message', sendMessage);
router.post('/:id/message/stream', sendMessageStream);

router.get('/', async (req, res) => {
  try {
    const userId = await getUserId(req);
    let path = `/rest/v1/chat_histories?select=*&user_id=eq.${userId}`;
    try {
      path += '&order=created_at.desc';
      const data = await supabaseRequest('GET', path);
      return res.json({ success: true, data: Array.isArray(data) ? data : [] });
    } catch {
      const data = await supabaseRequest('GET', path.replace('&order=created_at.desc', ''));
      return res.json({ success: true, data: Array.isArray(data) ? data : [] });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/search/*', async (req, res) => {
  try {
    const userId = await getUserId(req);
    const term = req.params[0] || '';
    const data = await supabaseRequest('GET', `/rest/v1/chat_histories?select=*&user_id=eq.${userId}&title=ilike.*${encodeURIComponent(term)}*&order=updated_at.desc`);
    return res.json({ success: true, data: Array.isArray(data) ? data : [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await supabaseRequest('GET', `/rest/v1/chat_histories?id=eq.${req.params.id}&select=*`);
    const chat = Array.isArray(data) ? data[0] : data;
    return res.json({ success: true, data: chat || null });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/rename', async (req, res) => {
  try {
    await supabaseRequest('PATCH', `/rest/v1/chat_histories?id=eq.${req.params.id}`, { title: req.body.title });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await supabaseRequest('DELETE', `/rest/v1/chat_histories?id=eq.${req.params.id}`);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;