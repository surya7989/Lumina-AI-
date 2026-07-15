import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Film,
  Brain,
  Settings,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  BookOpen,
  Activity,
  Zap,
  Target,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { LineChartCard, BarChartCard, PieChartCard } from '../../components/ui/Charts';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';

const quickLinks = [
  {
    label: 'AI Chat',
    icon: MessageSquare,
    href: '/super-admin/chat',
    desc: 'Chat with AI assistant',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    label: 'Video Analysis',
    icon: Film,
    href: '/super-admin/video-analysis',
    desc: 'Upload & analyze video/audio',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    label: 'Quiz Practice',
    icon: Brain,
    href: '/super-admin/quiz-practice',
    desc: 'Test your knowledge',
    color: 'from-amber-500 to-orange-600',
  },
  {
    label: 'Quiz Manage',
    icon: Settings,
    href: '/super-admin/quiz',
    desc: 'Create & manage quizzes',
    color: 'from-rose-500 to-pink-600',
  },
];

const statsCards = [
  { label: 'Total Users', value: '1,284', change: '+12%', icon: Users, color: 'from-indigo-500 to-purple-600' },
  { label: 'Active Sessions', value: '48', change: '+8%', icon: Activity, color: 'from-emerald-500 to-teal-600' },
  { label: 'Avg. Score', value: '76%', change: '+5%', icon: Target, color: 'from-amber-500 to-orange-600' },
  { label: 'Quizzes Taken', value: '3,621', change: '+18%', icon: Zap, color: 'from-rose-500 to-pink-600' },
];

const weeklyActivity = [
  { name: 'Mon', chats: 42, quizzes: 28, videos: 12 },
  { name: 'Tue', chats: 55, quizzes: 35, videos: 18 },
  { name: 'Wed', chats: 48, quizzes: 42, videos: 15 },
  { name: 'Thu', chats: 62, quizzes: 38, videos: 22 },
  { name: 'Fri', chats: 58, quizzes: 45, videos: 20 },
  { name: 'Sat', chats: 35, quizzes: 22, videos: 10 },
  { name: 'Sun', chats: 28, quizzes: 18, videos: 8 },
];

const quizPerformance = [
  { name: 'Math', average: 82, attempts: 120 },
  { name: 'Science', average: 74, attempts: 95 },
  { name: 'History', average: 68, attempts: 78 },
  { name: 'English', average: 88, attempts: 110 },
  { name: 'Tech', average: 79, attempts: 65 },
];

const categoryDistribution = [
  { name: 'Active Users', value: 450 },
  { name: 'New Users', value: 180 },
  { name: 'Inactive', value: 120 },
  { name: 'Pending', value: 65 },
];

const today = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();
  const [loading, setLoading] = useState(true);
  const siteName = settings?.siteName || 'AI Learning Platform';

  useEffect(() => {
    if (!settings) loadSettings();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 lg:p-8"
        >
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <p className="text-gray-500 text-sm">{today}</p>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
              Welcome, {user?.name || 'Admin'}
            </h1>
            <p className="text-gray-500 text-sm max-w-2xl">
              Manage your {siteName} from one place.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <span className="text-xs text-gray-400">{stat.change} vs last week</span>
                  </div>
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, idx) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 + 0.2 }}
            >
              <Link to={link.href}>
                <Card hover className="group cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {link.label}
                      </p>
                      <p className="text-sm text-gray-400">{link.desc}</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-2.5 group-hover:scale-110 transition-transform">
                      <link.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChartCard
            title="Weekly Activity"
            data={weeklyActivity}
            lines={[
              { dataKey: 'chats', color: '#6366f1', name: 'Chats' },
              { dataKey: 'quizzes', color: '#a855f7', name: 'Quizzes' },
              { dataKey: 'videos', color: '#ec4899', name: 'Videos' },
            ]}
          />
          <BarChartCard
            title="Quiz Performance by Category"
            data={quizPerformance}
            bars={[
              { dataKey: 'average', color: '#6366f1', name: 'Avg Score %' },
              { dataKey: 'attempts', color: '#f43f5e', name: 'Attempts' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PieChartCard
            title="User Distribution"
            data={categoryDistribution}
          />

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Getting Started</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm font-bold">1</div>
                <p className="text-sm text-gray-400">Start a conversation with the <Link to="/super-admin/chat" className="text-white hover:underline">AI Chat</Link></p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm font-bold">2</div>
                <p className="text-sm text-gray-400">Upload a video for <Link to="/super-admin/video-analysis" className="text-white hover:underline">AI Analysis</Link></p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm font-bold">3</div>
                <p className="text-sm text-gray-400">Create quiz categories & questions in <Link to="/super-admin/quiz" className="text-white hover:underline">Quiz Manage</Link></p>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm font-bold">4</div>
                <p className="text-sm text-gray-400">Test yourself with <Link to="/super-admin/quiz-practice" className="text-white hover:underline">Quiz Practice</Link></p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Platform Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-gray-500">Login Email</span>
                <Badge variant="info">{user?.email || 'superadmin@aiplatform.com'}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-gray-500">Role</span>
                <Badge variant="warning">Super Admin</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-gray-500">AI Model</span>
                <Badge variant="info">Groq (Llama 3.3 70B)</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <span className="text-sm text-gray-500">Video Analysis</span>
                <Badge variant="info">Whisper + LLM</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-white" />
              <h3 className="text-lg font-semibold text-white">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-gray-500 mt-1">Workspaces</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-2xl font-bold text-white">48</p>
                <p className="text-xs text-gray-500 mt-1">Students</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-2xl font-bold text-white">6</p>
                <p className="text-xs text-gray-500 mt-1">Admins</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] text-center">
                <p className="text-2xl font-bold text-white">156</p>
                <p className="text-xs text-gray-500 mt-1">Total Chats</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
