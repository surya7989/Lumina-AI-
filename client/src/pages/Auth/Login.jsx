import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useSettingsStore from '../../store/settingsStore';

export default function Login() {
  const { settings, loadSettings } = useSettingsStore();
  const siteName = settings?.siteName || 'AI Learning Platform';

  useEffect(() => {
    if (!settings) loadSettings();
  }, []);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('superadmin@aiplatform.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user?.role === 'superadmin') navigate('/super-admin', { replace: true });
      else if (user?.role === 'admin') navigate('/admin', { replace: true });
      else navigate('/super-admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950">
      <div className="absolute inset-0 bg-grid" />
      <motion.div className="absolute w-[450px] h-[450px] rounded-full bg-white/[0.02] blur-[110px] -top-32 -right-20 animate-float" />
      <motion.div className="absolute w-[350px] h-[350px] rounded-full bg-white/[0.02] blur-[90px] bottom-20 left-10 animate-float-delayed" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="rounded-2xl p-8 md:p-10 border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl shadow-white/5">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-gradient-blue mb-2">
              {siteName}
            </h1>
            <p className="text-gray-500 text-sm">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-gray-100 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/10 outline-none transition-all text-sm placeholder:text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-white/10 bg-white/5 text-gray-100 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/10 outline-none transition-all text-sm placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-white/5 rounded-lg py-2 border border-white/10">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-gray-200 focus:ring-2 focus:ring-white/40 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
