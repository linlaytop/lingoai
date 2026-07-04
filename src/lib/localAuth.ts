// Local authentication system - replaces Firebase Auth
// Uses localStorage for user storage and session management

export interface LocalUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: 'admin' | 'user';
  createdAt: number;
  lastLoginAt: number;
}

interface StoredUser extends LocalUser {
  password: string;
}

const USERS_KEY = 'lingoai_users';
const SESSION_KEY = 'lingoai_session';
const DEFAULT_ADMIN = { email: 'admin@lingoai.com', password: 'admin123', displayName: 'Administrator' };

// Simple hash function (not cryptographically secure, but sufficient for demo)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return String(hash);
}

function getUsers(): StoredUser[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    // Initialize with default admin
    const adminUser: StoredUser = {
      uid: 'admin-001',
      email: DEFAULT_ADMIN.email,
      displayName: DEFAULT_ADMIN.displayName,
      photoURL: null,
      role: 'admin',
      createdAt: Date.now(),
      lastLoginAt: 0,
      password: simpleHash(DEFAULT_ADMIN.password),
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
    return [adminUser];
  }
  return JSON.parse(data);
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toPublicUser(user: StoredUser): LocalUser {
  const { password, ...publicUser } = user;
  return publicUser;
}

// Event system to mimic Firebase auth state changes
type AuthCallback = (user: LocalUser | null) => void;
const listeners: Set<AuthCallback> = new Set();

function notifyListeners(user: LocalUser | null) {
  listeners.forEach(cb => cb(user));
}

export const localAuth = {
  getCurrentUser(): LocalUser | null {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      return JSON.parse(session) as LocalUser;
    } catch {
      return null;
    }
  },

  onAuthStateChanged(callback: AuthCallback): () => void {
    listeners.add(callback);
    // Immediately call with current state
    callback(this.getCurrentUser());
    return () => listeners.delete(callback);
  },

  async signInWithEmail(email: string, password: string): Promise<LocalUser> {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('用户不存在，请先注册');
    }
    if (user.password !== simpleHash(password)) {
      throw new Error('密码错误');
    }
    user.lastLoginAt = Date.now();
    saveUsers(users);
    const publicUser = toPublicUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
    notifyListeners(publicUser);
    return publicUser;
  },

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<LocalUser> {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('该邮箱已被注册');
    }
    if (password.length < 6) {
      throw new Error('密码至少需要6个字符');
    }
    const newUser: StoredUser = {
      uid: 'user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      email,
      displayName: displayName || email.split('@')[0],
      photoURL: null,
      role: 'user',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      password: simpleHash(password),
    };
    users.push(newUser);
    saveUsers(users);
    const publicUser = toPublicUser(newUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(publicUser));
    notifyListeners(publicUser);
    return publicUser;
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    notifyListeners(null);
  },

  // Admin functions
  getAllUsers(): LocalUser[] {
    return getUsers().map(toPublicUser);
  },

  deleteUser(uid: string): void {
    const users = getUsers();
    const filtered = users.filter(u => u.uid !== uid);
    saveUsers(filtered);
  },

  setUserRole(uid: string, role: 'admin' | 'user'): void {
    const users = getUsers();
    const user = users.find(u => u.uid === uid);
    if (user) {
      user.role = role;
      saveUsers(users);
    }
  },

  updateUserProfile(uid: string, data: Partial<Pick<LocalUser, 'displayName' | 'photoURL'>>): void {
    const users = getUsers();
    const user = users.find(u => u.uid === uid);
    if (user) {
      if (data.displayName) user.displayName = data.displayName;
      if (data.photoURL !== undefined) user.photoURL = data.photoURL;
      saveUsers(users);
      // Update session if current user
      const current = this.getCurrentUser();
      if (current && current.uid === uid) {
        const updated = toPublicUser(user);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
        notifyListeners(updated);
      }
    }
  },
};
