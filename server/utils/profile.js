const { supabaseRequest } = require('./supabase');

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

async function resolveSuperadminProfile() {
  try {
    const byId = await supabaseRequest('GET', `/rest/v1/profiles?id=eq.${DEFAULT_USER_ID}&select=id&limit=1`);
    if (Array.isArray(byId) && byId.length) return byId[0].id;

    const byEmail = await supabaseRequest('GET', `/rest/v1/profiles?email=eq.superadmin@aiplatform.com&select=id&limit=1`);
    if (Array.isArray(byEmail) && byEmail.length) return byEmail[0].id;

    const created = await supabaseRequest('POST', '/rest/v1/profiles', {
      id: DEFAULT_USER_ID,
      name: 'Super Admin',
      email: 'superadmin@aiplatform.com',
      role: 'superadmin',
    });
    if (Array.isArray(created) && created.length) return created[0].id;
  } catch {
    // fall through to default
  }
  return DEFAULT_USER_ID;
}

module.exports = { resolveSuperadminProfile, DEFAULT_USER_ID };
