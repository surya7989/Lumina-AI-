import { create } from 'zustand'
import api from '../utils/api'

const useSettingsStore = create((set) => ({
  settings: null,
  loading: true,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get('/settings')
      set({ settings: data?.settings || null, loading: false })
    } catch (err) {
      set({ error: err?.message || 'Failed to load settings', loading: false })
    }
  },

  saveSettings: async (newSettings) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put('/settings', newSettings)
      set({ settings: data?.settings || newSettings, loading: false })
      return true
    } catch (err) {
      set({ error: err?.message || 'Failed to save settings', loading: false })
      return false
    }
  },
}))

export const getSiteName = (settings) => settings?.siteName || 'AI Learning Platform'

export default useSettingsStore
