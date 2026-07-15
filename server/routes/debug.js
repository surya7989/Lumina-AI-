const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const info = {
      nodeEnv: process.env.NODE_ENV || null,
      supabaseUrlSet: !!process.env.SUPABASE_URL,
      supabaseServiceRoleKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      viteEnvPresent: !!process.env.VITE_SUPABASE_URL || !!process.env.VITE_SUPABASE_ANON_KEY,
      now: new Date().toISOString(),
    };
    return res.json({ success: true, info });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
