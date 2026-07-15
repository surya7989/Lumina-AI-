import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'
import Login from './pages/Auth/Login'

import SuperAdminDashboard from './pages/SuperAdmin/Dashboard'
import SuperAdminSettings from './pages/SuperAdmin/Settings'

import AdminQuiz from './pages/Admin/Quiz'

import StudentAiChat from './pages/Student/AiChat'
import StudentVideoAnalysis from './pages/Student/VideoAnalysis'
import StudentQuiz from './pages/Student/Quiz'

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/super-admin" element={<ProtectedRoute roles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/super-admin/chat" element={<ProtectedRoute roles={['superadmin']}><StudentAiChat /></ProtectedRoute>} />
      <Route path="/super-admin/video-analysis" element={<ProtectedRoute roles={['superadmin']}><StudentVideoAnalysis /></ProtectedRoute>} />
      <Route path="/super-admin/quiz-practice" element={<ProtectedRoute roles={['superadmin']}><StudentQuiz /></ProtectedRoute>} />
      <Route path="/super-admin/quiz" element={<ProtectedRoute roles={['superadmin']}><AdminQuiz /></ProtectedRoute>} />
      <Route path="/super-admin/settings" element={<ProtectedRoute roles={['superadmin']}><SuperAdminSettings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
