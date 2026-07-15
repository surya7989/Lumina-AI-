const https = require('https');
const { supabaseRequest } = require('../utils/supabase');
const { resolveSuperadminProfile } = require('../utils/profile');

async function getUserFromRequest(req) {
  if (req.user) return req.user;
  const id = await resolveSuperadminProfile();
  return { id, role: 'superadmin' };
}

function normalizeModelText(value, opts = {}) {
  const { trim = true } = opts;

  const extract = (item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      if (typeof item.text === 'string') return item.text;
      if (typeof item.content === 'string') return item.content;
    }
    return '';
  };

  const joinFragments = (parts) => {
    let out = '';
    for (const p of parts) {
      if (!p) continue;
      if (out && /[A-Za-z0-9]$/.test(out) && /^[A-Za-z0-9]/.test(p)) out += ' ';
      out += p;
    }
    return out;
  };

  if (typeof value === 'string') return trim ? value.trim() : value;
  if (Array.isArray(value)) {
    const parts = value.map(extract);
    const joined = joinFragments(parts);
    return trim ? joined.trim() : joined;
  }
  if (value && typeof value === 'object') {
    const text = extract(value);
    return trim ? text.trim() : text;
  }
  return '';
}

function buildFallbackChat(user) {
  const now = new Date().toISOString();
  const fallbackId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: fallbackId,
    user_id: user?.id || 'local-user',
    user_type: user?.role || 'user',
    title: 'New Chat',
    messages: [],
    created_at: now,
    updated_at: now,
  };
}

const createChat = async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    let result;
    try {
      result = await supabaseRequest('POST', '/rest/v1/chat_histories', {
        user_id: user.id,
        user_type: user.role || 'user',
        title: 'New Chat',
        messages: [],
      });
    } catch (error) {
      console.error('Chat persistence failed, using fallback chat:', error.message);
      result = buildFallbackChat(user);
    }

    if (Array.isArray(result)) result = result[0] || buildFallbackChat(user);
    if (!result || !result.id) result = buildFallbackChat(user);

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return res.status(201).json({ success: true, data: buildFallbackChat(await getUserFromRequest(req)) });
  }
};

function callGroqAPI(messages) {
  return new Promise((resolve, reject) => {
    const groqMessages = [
      { role: 'system', content: `You are an intelligent educational assistant for an AI Learning Platform. Use normal spaces and valid Markdown. For a simple learning request such as "explain HTML", return exactly this easy-to-read structure: first, one concise explanatory paragraph of 3-5 sentences; then a blank line; then the bold label **Important Points:**; then 5-8 short numbered points. Put every numbered point on its own new line. Do not use underlined headings made with === or ---, do not add many sections, and do not include code unless the user explicitly asks for code. For greetings, reply in 1-2 friendly sentences. Keep all answers accurate, simple, and concise.` },
    ];
    let hasImage = false;
    for (const m of messages) {
      if (m.imageBase64) {
        hasImage = true;
        groqMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: m.content || 'Describe this image in detail.' },
            { type: 'image_url', image_url: { url: m.imageBase64 } },
          ],
        });
      } else {
        groqMessages.push({ role: m.role, content: m.content || '' });
      }
    }
    const model = hasImage ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';
    const data = JSON.stringify({
      model,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 700,
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
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) reject(new Error(response.error.message || 'Groq API error'));
          else {
            const content = normalizeModelText(response.choices?.[0]?.message?.content);
            if (!content) reject(new Error('Groq returned an empty response'));
            else resolve(response);
          }
        } catch { reject(new Error('Failed to parse Groq API response')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function callGroqStream(messages, onChunk, onDone, onError, imageBase64) {
  const groqMessages = [
    { role: 'system', content: `You are an intelligent educational assistant for an AI Learning Platform. Use normal spaces and valid Markdown. For a simple learning request such as "explain HTML", return exactly this easy-to-read structure: first, one concise explanatory paragraph of 3-5 sentences; then a blank line; then the bold label **Important Points:**; then 5-8 short numbered points. Put every numbered point on its own new line. Do not use underlined headings made with === or ---, do not add many sections, and do not include code unless the user explicitly asks for code. For greetings, reply in 1-2 friendly sentences. Keep all answers accurate, simple, and concise.` },
  ];

  for (const m of messages) {
    if (m.imageBase64) {
      groqMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: m.content || 'Describe this image in detail.' },
          { type: 'image_url', image_url: { url: m.imageBase64 } },
        ],
      });
    } else {
      groqMessages.push({ role: m.role, content: m.content || '' });
    }
  }

  const model = imageBase64 ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';

  const payload = JSON.stringify({
    model,
    messages: groqMessages,
    temperature: 0.7,
    max_tokens: 700,
    stream: true,
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

  const req = https.request(options, (res) => {
    let doneCalled = false;
    let buffer = '';
    let apiError = null;

    const handleDone = () => {
      if (doneCalled) return;
      doneCalled = true;
      if (apiError) {
        onError(new Error(apiError));
      } else {
        onDone();
      }
    };

    const processLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) return true;
      const jsonStr = trimmed.slice(6);
      if (jsonStr === '[DONE]') { handleDone(); return false; }
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.error) {
          apiError = parsed.error.message || 'Groq API error';
          console.error('Groq API error:', apiError);
          return true;
        }
        const deltaContent = parsed.choices?.[0]?.delta?.content;
        if (deltaContent) {
          const content = normalizeModelText(deltaContent, { trim: false });
          if (content) onChunk(content);
        }
      } catch (e) {
        console.error('Stream parse error:', e.message, 'Line:', trimmed.slice(0, 100));
      }
      return true;
    };

    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!processLine(line)) return;
      }
    });

    res.on('end', () => {
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (!processLine(line)) break;
        }
      }
      handleDone();
    });

    res.on('error', (err) => {
      console.error('Stream response error:', err.message);
      apiError = err.message;
      handleDone();
    });
  });

  req.on('error', (err) => {
    console.error('Groq stream request error:', err.message);
    onError(err);
  });
  req.write(payload);
  req.end();
  return req;
}

const sendMessage = async (req, res) => {
  try {
    const { message, imageBase64 } = req.body;
    const chatId = req.params.id;
    if (!message && !imageBase64) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const chats = await supabaseRequest('GET', `/rest/v1/chat_histories?id=eq.${chatId}&select=*`);
    const chat = Array.isArray(chats) ? chats[0] : chats;
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const messages = chat.messages || [];
    const userMsg = { role: 'user', content: message || '', timestamp: new Date().toISOString(), ...(imageBase64 ? { imageBase64 } : {}) };
    messages.push(userMsg);

    let title = chat.title;
    if (title === 'New Chat' && message) {
      title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    let aiResponse;
    try {
      const groqResult = await callGroqAPI(messages);
      aiResponse = groqResult.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    } catch {
      aiResponse = 'I apologize, but I am currently experiencing a temporary issue. Please try asking your question again.';
    }

    messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() });

    // Strip imageBase64 before saving to Supabase (Supabase can't store large base64 reliably in JSONB)
    const saveMessages = messages.map(m => {
      if (m.imageBase64) return { role: m.role, content: m.content || '[Image attached]', timestamp: m.timestamp };
      return m;
    });
    await supabaseRequest('PATCH', `/rest/v1/chat_histories?id=eq.${chatId}`, { messages: saveMessages, title });

    return res.status(200).json({
      success: true,
      data: { chatId, userMessage: message, aiResponse, messageCount: messages.length },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const sendMessageStream = async (req, res) => {
  try {
    const { message, imageBase64 } = req.body;
    const chatId = req.params.id;
    if (!message && !imageBase64) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const chats = await supabaseRequest('GET', `/rest/v1/chat_histories?id=eq.${chatId}&select=*`);
    const chat = Array.isArray(chats) ? chats[0] : chats;
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    let title = chat.title;
    if (title === 'New Chat' && message) {
      title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    // Save user message immediately so it persists even if stream fails
    const savedUserMsg = { role: 'user', content: imageBase64 ? (message || '[Image attached]') : message, timestamp: new Date().toISOString() };
    await supabaseRequest('PATCH', `/rest/v1/chat_histories?id=eq.${chatId}`, { messages: [...(chat.messages || []), savedUserMsg], title });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'meta', chatId, title })}\n\n`);

    const streamMessages = [];
    for (const m of (chat.messages || [])) {
      if (m.imageBase64) {
        streamMessages.push({ ...m, imageBase64: m.imageBase64 });
      } else {
        streamMessages.push(m);
      }
    }
    streamMessages.push({ role: 'user', content: message || '', timestamp: new Date().toISOString(), ...(imageBase64 ? { imageBase64 } : {}) });

    let fullResponse = '';
    const groqReq = callGroqStream(
      streamMessages,
      (chunk) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      },
      () => {
        const fallback = 'I apologize, but I was unable to generate a response. Please try rephrasing your question.';
        const finalResponse = fullResponse.trim() ? fullResponse : fallback;
        fullResponse = finalResponse;
        const aiMessage = { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() };
        supabaseRequest('GET', `/rest/v1/chat_histories?id=eq.${chatId}&select=*`)
          .then((latest) => {
            const latestChat = Array.isArray(latest) ? latest[0] : latest;
            const msgs = latestChat?.messages || [];
            msgs.push(aiMessage);
            return supabaseRequest('PATCH', `/rest/v1/chat_histories?id=eq.${chatId}`, { messages: msgs, title });
          })
          .then(() => {
            if (!fullResponse.trim() || fullResponse === fallback) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallback })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ type: 'done', messageCount: fullResponse.length })}\n\n`);
            res.end();
          })
          .catch(() => {
            if (!fullResponse.trim() || fullResponse === fallback) {
              res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallback })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ type: 'done', messageCount: fullResponse.length })}\n\n`);
            res.end();
          });
      },
      (err) => {
        console.error('Stream generation error:', err.message);
        // Try fallback non-streaming API
        callGroqAPI(streamMessages)
          .then(groqResult => {
            fullResponse = groqResult.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
            const aiMessage = { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() };
            return supabaseRequest('GET', `/rest/v1/chat_histories?id=eq.${chatId}&select=*`)
              .then((latest) => {
                const latestChat = Array.isArray(latest) ? latest[0] : latest;
                const msgs = latestChat?.messages || [];
                msgs.push(aiMessage);
                return supabaseRequest('PATCH', `/rest/v1/chat_histories?id=eq.${chatId}`, { messages: msgs, title });
              })
              .then(() => {
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: fullResponse })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'done', messageCount: fullResponse.length })}\n\n`);
                res.end();
              });
          })
          .catch(fallbackErr => {
            console.error('Fallback API error:', fallbackErr.message);
            let fallback = 'I apologize, but I am currently experiencing a temporary issue. Please try asking your question again.';
            fullResponse = fallback;
            const aiMessage = { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() };
            supabaseRequest('GET', `/rest/v1/chat_histories?id=eq.${chatId}&select=*`)
              .then((latest) => {
                const latestChat = Array.isArray(latest) ? latest[0] : latest;
                const msgs = latestChat?.messages || [];
                msgs.push(aiMessage);
                return supabaseRequest('PATCH', `/rest/v1/chat_histories?id=eq.${chatId}`, { messages: msgs, title });
              })
              .catch(() => {});
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallback })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'done', messageCount: fullResponse.length })}\n\n`);
            res.end();
          });
      },
      imageBase64
    );

    req.on('close', () => { try { groqReq.destroy(); } catch {} });
  } catch (error) {
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    } catch {}
  }
};

module.exports = { createChat, sendMessage, sendMessageStream };

