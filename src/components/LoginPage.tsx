import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, Mail, Lock, User, LogIn, UserPlus, AlertCircle, Eye, EyeOff, Sparkles, BookOpen, Gamepad2, Zap } from 'lucide-react';
import { localAuth } from '../lib/localAuth';
import { cn } from '../lib/utils';

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await localAuth.signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          setError('请输入用户名');
          setLoading(false);
          return;
        }
        await localAuth.signUpWithEmail(email, password, displayName);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BookOpen, title: '智能闪卡', desc: '间隔复习，高效记忆', color: 'text-purple-600 bg-purple-50' },
    { icon: Gamepad2, title: '趣味闯关', desc: '边玩边学，轻松提升', color: 'text-amber-600 bg-amber-50' },
    { icon: Zap, title: 'AI 连读', desc: '口语连读，地道发音', color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col space-y-8 p-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Languages size={32} />
            </div>
            <span className="font-bold text-3xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">LingoAI</span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-black text-gray-900 leading-tight">
              开启你的<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">AI 英语学习</span>之旅
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              智能闪卡、趣味闯关、连读练习……让你的英语学习不再枯燥。
            </p>
          </div>

          <div className="space-y-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white shadow-sm"
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", f.color)}>
                  <f.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right side - Auth form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl shadow-blue-100 p-8 border border-gray-100"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <Languages size={24} />
            </div>
            <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">LingoAI</span>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                mode === 'login' ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LogIn size={16} /> 登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                mode === 'register' ? "bg-white shadow-sm text-purple-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <UserPlus size={16} /> 注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">用户名</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="输入你的用户名"
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少6个字符' : '输入密码'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60",
                mode === 'login'
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 shadow-blue-200 hover:shadow-blue-300"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 shadow-purple-200 hover:shadow-purple-300"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {mode === 'login' ? '登录' : '注册'}
                </>
              )}
            </button>
          </form>

        </motion.div>
      </div>
    </div>
  );
}
