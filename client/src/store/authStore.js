import { create } from 'zustand'
import supabase from '../utils/supabase'

const SUPERADMIN_EMAIL = 'superadmin@aiplatform.com'
const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || '/api'
const FALLBACK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Super Admin',
  email: SUPERADMIN_EMAIL,
  role: 'superadmin',
  avatar: null,
}

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!error && profile) {
          set({ user: profile, session, isAuthenticated: true, isLoading: false })
          return
        }
      }
    } catch {}

    const stored = localStorage.getItem('opencode_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        set({ user, isAuthenticated: true, isLoading: false })
        return
      } catch {}
    }

    set({ user: FALLBACK_USER, isAuthenticated: true, isLoading: false })
  },

  login: async (email, password) => {
    if (email !== SUPERADMIN_EMAIL) {
      throw new Error('Invalid credentials')
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profile) {
          set({ user: profile, session: data.session, isAuthenticated: true })
          localStorage.setItem('opencode_user', JSON.stringify(profile))
          return profile
        }
      }
    } catch {}

    const mockUser = FALLBACK_USER
    set({ user: mockUser, isAuthenticated: true })
    localStorage.setItem('opencode_user', JSON.stringify(mockUser))

    try {
      await fetch(`${AI_PROXY_URL}/db/setup`, { method: 'POST' })
    } catch {}

    return mockUser
  },

  updateProfile: async (updates) => {
    const current = get().user
    if (!current) throw new Error('You are not signed in')

    // Demo mode has no Supabase session. Keep its local profile editable while
    // ensuring signed-in users do not see a success message before persistence.
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
      if (error) throw error
    }

    const updated = { ...current, ...updates }
    set({ user: updated })
    localStorage.setItem('opencode_user', JSON.stringify(updated))
    return updated
  },

  logout: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('opencode_user')
    set({ user: null, session: null, isAuthenticated: false })
  },
}))

export default useAuthStore
