import supabase from './supabase'

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || '/api'

// ====== Error class (matches axios error shape) ======
class ApiError extends Error {
  constructor(message, status = 500) {
    super(message)
    this.response = { data: { message }, status }
  }
}

// ====== Raw Supabase helpers (proxied through server to bypass RLS) ======
async function listRaw(table, params = {}) {
  const p = params.params || params
  const sp = new URLSearchParams()
  if (p?.search) sp.set('or', `(name.ilike.*${p.search}*,email.ilike.*${p.search}*)`)
  if (p?.status) sp.set('status', `eq.${p.status}`)
  if (p?.workspaceId) sp.set('workspace_id', `eq.${p.workspaceId}`)
  if (p?.categoryId) sp.set('category_id', `eq.${p.categoryId}`)
  if (p?.difficulty) sp.set('difficulty', `eq.${p.difficulty}`)
  if (p?.isActive !== undefined) sp.set('is_active', `eq.${p.isActive}`)
  const page = parseInt(p?.page) || 1
  const limit = parseInt(p?.limit) || 100
  sp.set('offset', (page - 1) * limit)
  sp.set('limit', limit)
  const qs = sp.toString()
  const data = await serverFetch('GET', `/db/${table}${qs ? '?' + qs : ''}`)
  return { data: Array.isArray(data) ? data : [], total: Array.isArray(data) ? data.length : 0, page, limit, totalPages: 1 }
}

async function getRaw(table, id) {
  const data = await serverFetch('GET', `/db/${table}/${id}`)
  return data
}

async function createRaw(table, body) {
  const data = await serverFetch('POST', `/db/${table}`, body)
  return data
}

async function updateRaw(table, id, body) {
  const data = await serverFetch('PUT', `/db/${table}/${id}`, body)
  return data
}

async function deleteRaw(table, id) {
  await serverFetch('DELETE', `/db/${table}/${id}`)
  return null
}

async function countRaw(table, filters = {}) {
  const sp = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) sp.set(k, `eq.${v}`) })
  const qs = sp.toString()
  const data = await serverFetch('GET', `/db/${table}${qs ? '?' + qs : ''}`)
  return Array.isArray(data) ? data.length : 0
}

function getTable(resource) {
  const map = {
    students: 'students', workspace: 'workspaces',
    'workspace-requests': 'workspace_requests',
    'quiz-categories': 'quiz_categories', questions: 'questions',
    'quiz-results': 'quiz_results', meetings: 'meetings',
    chat: 'chat_histories', notifications: 'notifications',
    settings: 'settings',
  }
  return map[resource] || null
}

// ====== AI proxy ======
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user || null
  } catch {
    return null
  }
}

async function serverFetch(method, path, body) {
  try {
    const token = await getAuthToken()
    const url = `${AI_PROXY_URL}${path}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
    if (body && method !== 'GET') options.body = JSON.stringify(body)
    const res = await fetch(url, options)
    const json = await res.json()
    if (!json.success) throw new ApiError(json.error || 'Server proxy error')
    return json.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Server proxy unavailable')
  }
}

async function aiProxySendMessage(chatId, message) {
  try {
    const token = await getAuthToken()
    const res = await fetch(`${AI_PROXY_URL}/chat/${chatId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    })
    const json = await res.json()
    if (!json.success) throw new ApiError(json.error || 'AI proxy error')
    return json.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('AI proxy unavailable')
  }
}

async function aiProxyCreateChat(data) {
  try {
    const token = await getAuthToken()
    const res = await fetch(`${AI_PROXY_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new ApiError(json.error || 'AI proxy error')
    return json.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('AI proxy unavailable')
  }
}

// ====== Route dispatcher ======
async function route(method, url, body) {
  const clean = url.replace(/^\/?api\//, '').replace(/^\//, '').replace(/\/+$/, '')
  const parts = clean.split('/').filter(Boolean)
  if (!parts.length) throw new ApiError('Invalid URL')

  const [resource, id, action] = parts

  // --- AI Chat Proxy (all proxied through server with auth + service_role_key) ---
  if (resource === 'chat') {
    if (method === 'POST' && !id) return aiProxyCreateChat(body)
    if (action === 'message' && id) return aiProxySendMessage(id, body?.message)
    if (method === 'GET' && id === 'search') {
      const data = await serverFetch('GET', `/chat/search/${parts.slice(2).join('/')}`)
      return { chats: Array.isArray(data) ? data : [] }
    }
    if (method === 'GET' && !id) {
      const data = await serverFetch('GET', '/chat')
      return { chats: Array.isArray(data) ? data : [] }
    }
    if (method === 'GET' && id) {
      const data = await serverFetch('GET', `/chat/${id}`)
      return data || { messages: [] }
    }
    if (id && action === 'rename') {
      await serverFetch('PUT', `/chat/${id}/rename`, { title: body?.title })
      return { success: true }
    }
    if (method === 'DELETE' && id) {
      await serverFetch('DELETE', `/chat/${id}`)
      return { success: true }
    }
    throw new ApiError('Unknown chat route')
  }

  // --- Auth routes ---
  if (resource === 'auth') {
    if (method === 'GET' && id === 'me') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new ApiError('Not authenticated', 401)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return profile || user
    }
      if (method === 'PUT' && id === 'me') {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new ApiError('Not authenticated', 401)
        const { error } = await supabase.from('profiles').update(body).eq('id', user.id)
        if (error) throw new ApiError(error.message)
        return body
      }
    if ((method === 'PUT' || method === 'POST') && (id === 'change-password' || id === 'forgot-password')) {
      if (id === 'change-password') {
        const { error } = await supabase.auth.updateUser({ password: body?.password })
        if (error) throw new ApiError(error.message)
        return { message: 'Password updated' }
      }
      const { error } = await supabase.auth.resetPasswordForEmail(body?.email)
      if (error) throw new ApiError(error.message)
      return { message: 'Check your email' }
    }
    throw new ApiError('Unknown auth route')
  }

  // --- Admin routes ---
  if (resource === 'admin') {
    if (id === 'dashboard') {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
      const isSuperAdmin = profile?.role === 'superadmin'

      if (isSuperAdmin) {
        const [totalWorkspaces, totalStudents, totalAdmins, pendingRequests, totalMeetings, totalChats, totalQuizAttempts] = await Promise.all([
          countRaw('workspaces'), countRaw('students'),
          countRaw('profiles', { role: 'admin' }),
          countRaw('workspace_requests', { status: 'pending' }),
          countRaw('meetings'), countRaw('chat_histories'), countRaw('quiz_results'),
        ])
        const approved = await countRaw('workspace_requests')
        return { totalWorkspaces, totalStudents, totalAdmins, pendingRequests, approvedRequests: approved - pendingRequests, totalMeetings, totalChats, totalQuizAttempts, workspaceGrowth: [], requestsByMonth: [], recentActivity: [] }
      }

      const wid = profile?.workspace_id
      const [totalStudents, totalMeetings, totalChats] = await Promise.all([
        wid ? countRaw('students', { workspace_id: wid }) : 0,
        wid ? countRaw('meetings', { workspace_id: wid }) : 0,
        wid ? countRaw('chat_histories', { workspace_id: wid }) : 0,
      ])
      const { count: quizAttempts } = wid
        ? await supabase.from('quiz_results').select('*', { count: 'exact', head: true }).eq('workspace_id', wid)
        : { count: 0 }
      const recentStudents = wid
        ? await listRaw('students', { params: { workspace_id: wid, limit: 5 } }).then(r => r.data)
        : []
      return { stats: { totalStudents, totalMeetings, totalChats, quizAttempts: quizAttempts || 0, todayActivity: 0 }, activityData: [], quizPerformance: [], recentStudents: recentStudents || [] }
    }
    if (id === 'requests') {
      const result = await listRaw('workspace_requests')
      return { requests: result.data, total: result.total, totalPages: result.totalPages }
    }
    if (id && action === 'approve') {
      const { data: req } = await supabase.from('workspace_requests').select('*').eq('id', id).single()
      if (!req) throw new ApiError('Request not found', 404)
      const ws = await createRaw('workspaces', {
        name: req.organization_name, email: req.organization_email,
        admin_id: req.admin_id, address: req.address, phone: req.phone,
        total_students: req.number_of_students,
      })
      await supabase.from('workspace_requests').update({ status: 'approved', workspace_id: ws.id }).eq('id', id)
      await supabase.from('profiles').update({ workspace_id: ws.id }).eq('id', req.admin_id)
      return ws
    }
    if (id && action === 'reject') {
      await supabase.from('workspace_requests').update({ status: 'rejected', rejection_reason: body?.reason || body?.rejectionReason || '' }).eq('id', id)
      return { message: 'Request rejected' }
    }
    if (id === 'analytics') {
      const { data } = await supabase.from('quiz_results').select('*, students(name, student_id), quiz_categories(name)')
      const total = data?.length || 0
      const avgPercentage = total > 0 ? data.reduce((s, r) => s + (r.percentage || 0), 0) / total : 0
      return { total, avgPercentage, results: data || [] }
    }
    if (id === 'system-health') {
      const [users, workspaces] = await Promise.all([countRaw('profiles'), countRaw('workspaces')])
      return { totalUsers: users, activeWorkspaces: workspaces, status: 'healthy' }
    }
    if (id === 'profile') {
      const { data: { user } } = await supabase.auth.getUser()
      if (method === 'GET') {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
        return profile
      }
      await supabase.from('profiles').update(body).eq('id', user?.id)
      return body
    }
    if (id === 'change-password') {
      const { error } = await supabase.auth.updateUser({ password: body?.password })
      if (error) throw new ApiError(error.message)
      return { message: 'Password updated' }
    }
    throw new ApiError('Unknown admin route')
  }

  // --- Settings ---
  if (resource === 'settings') {
    const user = await getCurrentUser()
    if (!user?.id) {
      return { settings: { siteName: 'AI Learning Platform', logo: '', primaryColor: '#6366f1', defaultQuizTime: 30, maxStudents: 100, aiModel: 'gpt-4', jitsiServer: 'meet.jit.si' } }
    }

    const { data: profile } = await supabase.from('profiles').select('*, workspaces(settings)').eq('id', user.id).maybeSingle()
    if (method === 'GET') {
      const wsSettings = profile?.workspaces?.settings || profile?.workspace_settings || {}
      return { settings: { siteName: 'AI Learning Platform', logo: '', primaryColor: '#6366f1', defaultQuizTime: 30, maxStudents: 100, aiModel: 'gpt-4', jitsiServer: 'meet.jit.si', ...wsSettings } }
    }
    if (method === 'PUT' && profile?.workspace_id) {
      await supabase.from('workspaces').update({ settings: body }).eq('id', profile.workspace_id)
      return { settings: body }
    }
    throw new ApiError('Settings route error')
  }

  // --- Quiz routes (proxied through server with service_role_key) ---
  if (resource === 'quiz') {
    if (id === 'categories') {
      if (method === 'GET') return serverFetch('GET', '/quiz/categories')
      if (method === 'POST') return serverFetch('POST', '/quiz/categories', body)
      if (method === 'PUT') return serverFetch('PUT', `/quiz/categories/${action}`, body)
      if (method === 'DELETE') return serverFetch('DELETE', `/quiz/categories/${action}`)
    }
    if (id === 'questions') {
      if (method === 'GET') return serverFetch('GET', '/quiz/questions')
      if (method === 'POST') return serverFetch('POST', '/quiz/questions', body)
      if (method === 'PUT') return serverFetch('PUT', `/quiz/questions/${action}`, body)
      if (method === 'DELETE') return serverFetch('DELETE', `/quiz/questions/${action}`)
    }
    if (id === 'results') return serverFetch('GET', '/quiz/results')
    if (id === 'leaderboard') return serverFetch('POST', '/quiz/leaderboard', body || {})
    if (id === 'analytics') return serverFetch('POST', '/quiz/analytics', body || {})
    if (id === 'start') return serverFetch('POST', '/quiz/start', body)
    if (id === 'submit') return serverFetch('POST', '/quiz/submit', body)
    if (id === 'ai-generate') return serverFetch('POST', '/quiz/ai-generate', body)
    throw new ApiError('Unknown quiz route')
  }

  // --- Meetings ---
  if (resource === 'meetings') {
    if (id && action === 'join') return getRaw('meetings', id)
    if (id && action === 'end') {
      await supabase.from('meetings').update({ status: 'completed' }).eq('id', id)
      return null
    }
    if (method === 'GET') return listRaw('meetings').then(r => r.data)
    if (method === 'POST') return createRaw('meetings', body)
    if (method === 'PUT' && id) return updateRaw('meetings', id, body)
    if (method === 'DELETE' && id) return deleteRaw('meetings', id)
    throw new ApiError('Unknown meetings route')
  }

  // --- Workspace ---
  if (resource === 'workspace') {
    if (id && action) {
      if (['activate', 'deactivate', 'suspend'].includes(action)) {
        await supabase.from('workspaces').update({ is_active: action === 'activate' }).eq('id', id)
        return null
      }
    }
    if (method === 'GET') {
      const r = await listRaw('workspaces')
      return { workspaces: r.data, total: r.total, totalPages: r.totalPages }
    }
    if (method === 'PUT' && id) return updateRaw('workspaces', id, body)
    throw new ApiError('Unknown workspace route')
  }

  // --- Students ---
  if (resource === 'students') {
    if (id === 'bulk' && method === 'POST') {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user?.id).single()
      const wid = body?.workspaceId || profile?.workspace_id
      const records = (body?.students || []).map(s => ({
        student_id: s.studentId || s.student_id || '', name: s.name, email: s.email,
        workspace_id: wid, phone: s.phone || '',
      }))
      if (!records.length) throw new ApiError('No students provided')
      const { data, error } = await supabase.from('students').insert(records).select()
      if (error) throw new ApiError(error.message)
      return data
    }
    if (id === 'dashboard' && action === 'me') {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: student } = await supabase.from('students').select('*').eq('email', user?.email).single()
      if (!student) throw new ApiError('Student not found', 404)
      const { data: recentResults } = await supabase.from('quiz_results').select('*, quiz_categories(name)').eq('student_id', student.id).order('completed_at', { ascending: false }).limit(5)
      const totalQuizzes = await countRaw('quiz_results', { student_id: student.id })
      const { data: results } = await supabase.from('quiz_results').select('percentage').eq('student_id', student.id)
      const avgPct = results?.length > 0 ? results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length : 0
      return { student, recentResults: recentResults || [], totalQuizzes, avgPercentage: avgPct }
    }
    if (method === 'GET') return listRaw('students').then(r => r.data)
    if (method === 'POST') {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user?.id).maybeSingle()
      const studentId = 'STU' + Math.floor(100000 + Math.random() * 900000)
      const newBody = {
        ...body,
        student_id: body.studentId || body.student_id || studentId,
        workspace_id: body.workspaceId || body.workspace_id || profile?.workspace_id,
      }
      return createRaw('students', newBody)
    }
    if (method === 'PUT' && id) return updateRaw('students', id, body)
    if (method === 'DELETE' && id) return deleteRaw('students', id)
    throw new ApiError('Unknown students route')
  }

  // --- Generic CRUD fallback ---
  const table = getTable(resource)
  if (!table) throw new ApiError(`Unknown resource: ${resource}`)
  if (method === 'GET') return id ? getRaw(table, id) : listRaw(table).then(r => r.data)
  if (method === 'POST') return createRaw(table, body)
  if (method === 'PUT' && id) return updateRaw(table, id, body)
  if (method === 'DELETE' && id) return deleteRaw(table, id)
  throw new ApiError(`Unsupported: ${method} ${url}`)
}

// ====== Exported API ======
const api = {
  async get(url, config) {
    const body = config || {}
    const result = await route('GET', url, body)
    return { data: result }
  },
  async post(url, body) {
    const result = await route('POST', url, body)
    return { data: result }
  },
  async put(url, body) {
    const result = await route('PUT', url, body)
    return { data: result }
  },
  async delete(url) {
    const result = await route('DELETE', url, null)
    return { data: result }
  },

  // Named resource API
  students: {
    list: (p) => listRaw('students', p).then(r => ({ success: true, data: r.data, pagination: r })),
    get: (id) => getRaw('students', id).then(d => ({ success: true, data: d })),
    create: (b) => createRaw('students', b).then(d => ({ success: true, data: d })),
    update: (id, b) => updateRaw('students', id, b).then(d => ({ success: true, data: d })),
    delete: (id) => deleteRaw('students', id).then(() => ({ success: true, data: null })),
    count: (f) => countRaw('students', f).then(c => ({ success: true, data: c })),
  },
  workspaces: {
    list: (p) => listRaw('workspaces', p).then(r => ({ success: true, data: r.data, pagination: r })),
    get: (id) => getRaw('workspaces', id).then(d => ({ success: true, data: d })),
    create: (b) => createRaw('workspaces', b).then(d => ({ success: true, data: d })),
    update: (id, b) => updateRaw('workspaces', id, b).then(d => ({ success: true, data: d })),
    delete: (id) => deleteRaw('workspaces', id).then(() => ({ success: true, data: null })),
    count: (f) => countRaw('workspaces', f).then(c => ({ success: true, data: c })),
  },
  workspaceRequests: {
    list: (p) => listRaw('workspace_requests', p).then(r => ({ success: true, data: r.data, pagination: r })),
    get: (id) => getRaw('workspace_requests', id).then(d => ({ success: true, data: d })),
    create: (b) => createRaw('workspace_requests', b).then(d => ({ success: true, data: d })),
    update: (id, b) => updateRaw('workspace_requests', id, b).then(d => ({ success: true, data: d })),
    delete: (id) => deleteRaw('workspace_requests', id).then(() => ({ success: true, data: null })),
    count: (f) => countRaw('workspace_requests', f).then(c => ({ success: true, data: c })),
  },
  quizCategories: {
    list: () => serverFetch('GET', '/quiz/categories').then(d => ({ success: true, data: d })),
    get: (id) => serverFetch('GET', `/quiz/categories/${id}`).then(d => ({ success: true, data: Array.isArray(d) ? d[0] : d })),
    create: (b) => serverFetch('POST', '/quiz/categories', b).then(d => ({ success: true, data: d })),
    update: (id, b) => serverFetch('PUT', `/quiz/categories/${id}`, b).then(d => ({ success: true, data: d })),
    delete: (id) => serverFetch('DELETE', `/quiz/categories/${id}`).then(() => ({ success: true, data: null })),
  },
  questions: {
    list: () => serverFetch('GET', '/quiz/questions').then(d => ({ success: true, data: d })),
    get: (id) => serverFetch('GET', `/quiz/questions/${id}`).then(d => ({ success: true, data: Array.isArray(d) ? d[0] : d })),
    create: (b) => serverFetch('POST', '/quiz/questions', b).then(d => ({ success: true, data: d })),
    update: (id, b) => serverFetch('PUT', `/quiz/questions/${id}`, b).then(d => ({ success: true, data: d })),
    delete: (id) => serverFetch('DELETE', `/quiz/questions/${id}`).then(() => ({ success: true, data: null })),
  },
  quizResults: {
    list: (p) => listRaw('quiz_results', p).then(r => ({ success: true, data: r.data })),
    create: (b) => createRaw('quiz_results', b).then(d => ({ success: true, data: d })),
    count: (f) => countRaw('quiz_results', f).then(c => ({ success: true, data: c })),
  },
  meetings: {
    list: (p) => listRaw('meetings', p).then(r => ({ success: true, data: r.data })),
    get: (id) => getRaw('meetings', id).then(d => ({ success: true, data: d })),
    create: (b) => createRaw('meetings', b).then(d => ({ success: true, data: d })),
    update: (id, b) => updateRaw('meetings', id, b).then(d => ({ success: true, data: d })),
    delete: (id) => deleteRaw('meetings', id).then(() => ({ success: true, data: null })),
    count: (f) => countRaw('meetings', f).then(c => ({ success: true, data: c })),
  },
  chatHistories: {
    list: (p) => listRaw('chat_histories', p).then(r => ({ success: true, data: r.data })),
    get: (id) => getRaw('chat_histories', id).then(d => ({ success: true, data: d })),
    create: (b) => createRaw('chat_histories', b).then(d => ({ success: true, data: d })),
    update: (id, b) => updateRaw('chat_histories', id, b).then(d => ({ success: true, data: d })),
    delete: (id) => deleteRaw('chat_histories', id).then(() => ({ success: true, data: null })),
    count: (f) => countRaw('chat_histories', f).then(c => ({ success: true, data: c })),
  },
  notifications: {
    list: (p) => listRaw('notifications', p).then(r => ({ success: true, data: r.data })),
    create: (b) => createRaw('notifications', b).then(d => ({ success: true, data: d })),
    markRead: (id) => updateRaw('notifications', id, { is_read: true }).then(() => ({ success: true })),
    markAllRead: async (userId) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
      if (error) throw new ApiError(error.message)
      return { success: true }
    },
    unreadCount: async (userId) => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false)
      return { success: true, data: count || 0 }
    },
    delete: (id) => deleteRaw('notifications', id).then(() => ({ success: true })),
  },
  profiles: {
    get: (id) => getRaw('profiles', id).then(d => ({ success: true, data: d })),
    update: (id, b) => updateRaw('profiles', id, b).then(d => ({ success: true, data: d })),
  },

  getDashboardStats: async () => {
    const [totalWorkspaces, pendingRequests, totalStudents, totalAdmins, totalMeetings, totalChats, totalQuizAttempts] = await Promise.all([
      countRaw('workspaces'), countRaw('workspace_requests', { status: 'pending' }),
      countRaw('students'), countRaw('profiles', { role: 'admin' }),
      countRaw('meetings'), countRaw('chat_histories'), countRaw('quiz_results'),
    ])
    return { success: true, data: { totalWorkspaces, pendingRequests, totalStudents, totalAdmins, totalMeetings, totalChats, totalQuizAttempts } }
  },

  getLeaderboard: async (workspaceId) => {
    const { data, error } = await supabase.from('quiz_results').select('student_id, score, total_questions, percentage, students(name, student_id)').eq('workspace_id', workspaceId).order('percentage', { ascending: false }).limit(50)
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  },

  getPerformanceAnalytics: async (workspaceId) => {
    const { data, error } = await supabase.from('quiz_results').select('*').eq('workspace_id', workspaceId)
    if (error) return { success: false, error: error.message }
    const total = data?.length || 0
    const avgPct = total > 0 ? data.reduce((s, r) => s + (r.percentage || 0), 0) / total : 0
    return { success: true, data: { total, avgPercentage: avgPct, results: data || [] } }
  },

  createChat: (data) => aiProxyCreateChat(data),
  sendMessage: (chatId, message) => aiProxySendMessage(chatId, message),

  getSystemHealth: async () => {
    const [users, workspaces] = await Promise.all([countRaw('profiles'), countRaw('workspaces')])
    return { success: true, data: { totalUsers: users, activeWorkspaces: workspaces, status: 'healthy' } }
  },

  raw: async (table, select = '*', filters = {}, options = {}) => {
    let q = supabase.from(table).select(select)
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) q = q.eq(k, v) })
    if (options?.orderBy) q = q.order(options.orderBy, { ascending: options.ascending || false })
    if (options?.limit) q = q.limit(options.limit)
    const { data, error } = await q
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  },
}

export default api
