import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, BookOpen, Calendar, Trash2, ArrowLeft,
  Search, Crown, User as UserIcon, Mail, Clock, Database,
  TrendingUp, Layers, AlertTriangle, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { localAuth, type LocalUser } from '../lib/localAuth';
import { localDb } from '../lib/localDb';
import { cn } from '../lib/utils';

interface AdminPageProps {
  currentUser: LocalUser;
  onBack: () => void;
}

interface UserWithStats extends LocalUser {
  stats: { flashcards: number; history: number; checkIns: number };
}

export function AdminPage({ currentUser, onBack }: AdminPageProps) {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'overview' | 'dictionary'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const refreshUsers = () => {
    const allUsers = localAuth.getAllUsers();
    const usersWithStats = allUsers.map(u => ({
      ...u,
      stats: localDb.getUserStats(u.uid),
    }));
    setUsers(usersWithStats);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalFlashcards = users.reduce((sum, u) => sum + u.stats.flashcards, 0);
  const totalHistory = users.reduce((sum, u) => sum + u.stats.history, 0);
  const totalCheckIns = users.reduce((sum, u) => sum + u.stats.checkIns, 0);
  const adminCount = users.filter(u => u.role === 'admin').length;

  const handleDeleteUser = (uid: string) => {
    if (uid === currentUser.uid) {
      alert('不能删除当前登录的管理员账户！');
      return;
    }
    localDb.clearUserData(uid);
    localAuth.deleteUser(uid);
    refreshUsers();
    setDeleteConfirm(null);
  };

  const handleToggleRole = (uid: string, currentRole: 'admin' | 'user') => {
    if (uid === currentUser.uid) {
      alert('不能修改当前管理员的角色！');
      return;
    }
    localAuth.setUserRole(uid, currentRole === 'admin' ? 'user' : 'admin');
    refreshUsers();
  };

  // Dictionary words
  const dictWords = [
    'hello', 'world', 'learn', 'book', 'water', 'time', 'friend',
    'happy', 'school', 'food'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <nav className="fixed top-0 w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="返回主页"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <span className="font-bold text-lg">管理后台</span>
              <span className="text-xs text-gray-400 ml-2">LingoAI Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl">
              <Crown size={14} className="text-amber-400" />
              <span className="text-sm font-bold">{currentUser.displayName}</span>
            </div>
            <button
              onClick={refreshUsers}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="刷新数据"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 max-w-6xl mx-auto px-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'overview' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <TrendingUp size={16} /> 总览
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'users' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Users size={16} /> 用户管理
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'dictionary' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <BookOpen size={16} /> 词库管理
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="总用户数" value={users.length} color="from-blue-500 to-blue-600" bgColor="bg-blue-50" iconColor="text-blue-600" />
                <StatCard icon={Layers} label="闪卡总数" value={totalFlashcards} color="from-purple-500 to-purple-600" bgColor="bg-purple-50" iconColor="text-purple-600" />
                <StatCard icon={Clock} label="学习记录" value={totalHistory} color="from-green-500 to-green-600" bgColor="bg-green-50" iconColor="text-green-600" />
                <StatCard icon={Calendar} label="打卡天数" value={totalCheckIns} color="from-orange-500 to-orange-600" bgColor="bg-orange-50" iconColor="text-orange-600" />
              </div>

              {/* Admin info */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                  <Shield size={20} className="text-amber-500" /> 系统信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown size={16} className="text-amber-500" />
                      <span className="text-xs font-bold text-gray-500 uppercase">管理员数量</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{adminCount}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={16} className="text-blue-500" />
                      <span className="text-xs font-bold text-gray-500 uppercase">内置词条</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{dictWords.length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} className="text-green-500" />
                      <span className="text-xs font-bold text-gray-500 uppercase">系统状态</span>
                    </div>
                    <p className="text-2xl font-black text-green-600">正常运行</p>
                  </div>
                </div>
              </div>

              {/* Recent Users */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                  <Clock size={20} className="text-blue-500" /> 最近活跃用户
                </h3>
                <div className="space-y-3">
                  {[...users]
                    .sort((a, b) => b.lastLoginAt - a.lastLoginAt)
                    .slice(0, 5)
                    .map((user, i) => (
                    <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                          user.role === 'admin' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {user.displayName[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{user.displayName}</span>
                            {user.role === 'admin' && (
                              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">ADMIN</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {user.lastLoginAt > 0
                          ? new Date(user.lastLoginAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '从未登录'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="搜索单词或邮箱..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <span className="text-sm font-black text-gray-900">{filteredUsers.length}</span>
                  <span className="text-xs text-gray-400 font-bold">USERS</span>
                </div>
              </div>

              {/* User list */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">
                  <div className="col-span-4">用户</div>
                  <div className="col-span-2">角色</div>
                  <div className="col-span-2">闪卡</div>
                  <div className="col-span-2">注册时间</div>
                  <div className="col-span-2 text-right">操作</div>
                </div>
                {filteredUsers.map((user, i) => (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                        user.role === 'admin' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {user.displayName[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 truncate">{user.displayName}</span>
                          {user.uid === currentUser.uid && (
                            <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">YOU</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail size={10} />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold border border-amber-100">
                          <Crown size={12} /> 管理员
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold border border-blue-100">
                          <UserIcon size={12} /> 用户
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm font-black text-gray-900">{user.stats.flashcards}</span>
                      <span className="text-xs text-gray-400 ml-1">张</span>
                    </div>
                    <div className="col-span-2 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleRole(user.uid, user.role)}
                        disabled={user.uid === currentUser.uid}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={user.role === 'admin' ? '降级为用户' : '升级为管理员'}
                      >
                        <Crown size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user.uid)}
                        disabled={user.uid === currentUser.uid}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="删除用户"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    未找到匹配的用户
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Dictionary Tab */}
          {activeTab === 'dictionary' && (
            <motion.div
              key="dictionary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
                    <BookOpen size={20} className="text-purple-500" /> 内置词库
                  </h3>
                  <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-lg font-bold">
                    {dictWords.length} 个词条
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dictWords.map((word, i) => (
                    <motion.div
                      key={word}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 capitalize">{word}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">内置完整分析</p>
                        </div>
                        <CheckCircle2 size={18} className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1">关于词库说明</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      当前为本地模式，内置了常用英语单词的完整分析数据（音标、翻译、例句、记忆韵文等）。
                      未收录的单词将返回基础模板供用户练习。如需完整 AI 分析功能，请配置 Gemini API 密钥。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">确认删除用户？</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      此操作将永久删除该用户及其所有学习数据，不可恢复。
                    </p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleDeleteUser(deleteConfirm)}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> 删除
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor, iconColor }: {
  icon: any; label: string; value: number; color: string; bgColor: string; iconColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden", bgColor)}
    >
      <div className="relative z-10">
        <div className={cn("w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm")}>
          <Icon size={20} className={iconColor} />
        </div>
        <p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">{label}</p>
      </div>
      <Icon size={80} className="absolute -right-3 -bottom-3 opacity-5 text-gray-900" />
    </motion.div>
  );
}
