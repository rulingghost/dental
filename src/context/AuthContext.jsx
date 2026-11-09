import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchUsersFromSupabase, saveUsersToSupabase } from '../services/supabaseService';

const AuthContext = createContext(null);

export const USERS_STORAGE_KEY = 'dentallab_demo_users_v1';
export const SESSION_STORAGE_KEY = 'dentallab_demo_session_v1';

export const ADMIN_CREDENTIALS = {
  id: 'user-admin',
  username: 'demo',
  password: '1234',
  name: 'Yusuf (Demo Yönetici)'
};

export const ROLES = {
  admin: 'admin',
  operator: 'operator',
  company: 'company'
};

export function hashPassword(plain) {
  try {
    return btoa(unescape(encodeURIComponent(`dlp-v1:${plain || ''}`)));
  } catch {
    return `dlp-v1:${plain || ''}`;
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function mergeUsers(localList = [], remoteList = []) {
  const map = new Map();
  (localList || []).forEach(u => {
    if (u?.username) map.set((u.username || '').toLowerCase(), u);
  });
  (remoteList || []).forEach(u => {
    if (u?.username) {
      const key = (u.username || '').toLowerCase();
      const local = map.get(key);
      map.set(key, local ? { ...local, ...u } : u);
    }
  });
  let list = Array.from(map.values());
  list = list.map(u => {
    if (u.role === ROLES.admin || u.id === ADMIN_CREDENTIALS.id || (u.username || '').toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase()) {
      return {
        ...u,
        id: ADMIN_CREDENTIALS.id,
        username: ADMIN_CREDENTIALS.username,
        passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
        name: ADMIN_CREDENTIALS.name,
        role: ROLES.admin,
        companyId: null
      };
    }
    return u;
  });
  if (!list.some(u => u.role === ROLES.admin)) {
    list.unshift({
      id: ADMIN_CREDENTIALS.id,
      username: ADMIN_CREDENTIALS.username,
      passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
      name: ADMIN_CREDENTIALS.name,
      role: ROLES.admin,
      companyId: null,
      createdAt: new Date().toISOString()
    });
  }
  return list;
}

function seedUsers() {
  return [
    {
      id: ADMIN_CREDENTIALS.id,
      username: ADMIN_CREDENTIALS.username,
      passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
      name: ADMIN_CREDENTIALS.name,
      role: ROLES.admin,
      companyId: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-operator',
      username: 'kullanici',
      passwordHash: hashPassword('1234'),
      name: 'Örnek Laboratuvar Kullanıcısı',
      role: ROLES.operator,
      companyId: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-comp-1',
      username: 'dentart',
      passwordHash: hashPassword('1234'),
      name: 'DentArt Ağız ve Diş Sağlığı Polikliniği',
      role: ROLES.company,
      companyId: 'comp-1',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-comp-2',
      username: 'gulus',
      passwordHash: hashPassword('1234'),
      name: 'Gülüş Estetiği Diş Hastanesi',
      role: ROLES.company,
      companyId: 'comp-2',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-comp-3',
      username: 'novadental',
      passwordHash: hashPassword('1234'),
      name: 'Nova Dental İmplantoloji Merkezi',
      role: ROLES.company,
      companyId: 'comp-3',
      createdAt: new Date().toISOString()
    }
  ];
}

function loadUsers() {
  let list = [];
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (e) {}

  if (list.length === 0) {
    list = seedUsers();
  }

  // Admin kullanıcısını her zaman sabit 'yusuf' / 'yusuf2026' olarak zorla ve garantiye al
  let hasAdmin = false;
  list = list.map(u => {
    if (u.role === ROLES.admin || u.id === ADMIN_CREDENTIALS.id || u.username === 'admin' || u.username === ADMIN_CREDENTIALS.username) {
      hasAdmin = true;
      return {
        ...u,
        id: ADMIN_CREDENTIALS.id,
        username: ADMIN_CREDENTIALS.username,
        passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
        name: ADMIN_CREDENTIALS.name,
        role: ROLES.admin,
        companyId: null
      };
    }
    return u;
  });

  if (!hasAdmin) {
    list.unshift({
      id: ADMIN_CREDENTIALS.id,
      username: ADMIN_CREDENTIALS.username,
      passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
      name: ADMIN_CREDENTIALS.name,
      role: ROLES.admin,
      companyId: null,
      createdAt: new Date().toISOString()
    });
  }

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}

  return list;
}

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(loadUsers);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionId) return null;
      const all = loadUsers();
      return all.find(u => u.id === sessionId) || null;
    } catch (e) {
      return null;
    }
  });

  const applyRemoteUsers = (remoteUsers) => {
    if (!Array.isArray(remoteUsers) || remoteUsers.length === 0) return;
    setUsers(prev => {
      const merged = mergeUsers(prev, remoteUsers);
      if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  };

  const syncUsersWithCloud = async () => {
    try {
      const remoteUsers = await fetchUsersFromSupabase();
      if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        applyRemoteUsers(remoteUsers);
      } else {
        // Eğer bulutta henüz kullanıcı kaydı yoksa yereldeki mevcut firma hesaplarını buluta aktar
        setUsers(prev => {
          if (prev.some(u => u.role === ROLES.company)) {
            saveUsersToSupabase(prev);
          }
          return prev;
        });
      }
    } catch (e) {
      console.warn('Kullanıcı senkronizasyon hatası:', e);
    }
  };

  useEffect(() => {
    syncUsersWithCloud();
    const handleFocus = () => syncUsersWithCloud();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {}
  }, [users]);

  const persistSession = (user) => {
    try {
      if (user) localStorage.setItem(SESSION_STORAGE_KEY, user.id);
      else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
  };

  const login = async (username, password) => {
    const uname = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Yönetici doğrudan sabit kimlik ile de kontrol edilebilir
    if (
      (uname === ADMIN_CREDENTIALS.username.toLowerCase() && cleanPass === ADMIN_CREDENTIALS.password) ||
      (uname === 'yusuf' && cleanPass === 'yusuf2026')
    ) {
      const adminObj = users.find(u => u.role === ROLES.admin) || {
        id: ADMIN_CREDENTIALS.id,
        username: ADMIN_CREDENTIALS.username,
        passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
        name: ADMIN_CREDENTIALS.name,
        role: ROLES.admin,
        companyId: null
      };
      setCurrentUser(adminObj);
      persistSession(adminObj);
      return { ok: true, user: adminObj };
    }

    // 1. Önce mevcut yerel bellekteki kullanıcılardan kontrol et
    let user = users.find(u => (u.username || '').toLowerCase() === uname);
    if (user && user.passwordHash === hashPassword(cleanPass)) {
      setCurrentUser(user);
      persistSession(user);
      return { ok: true, user };
    }

    // 2. Başka bilgisayardan veya gizli sekmeden girilmiş olabilir; Supabase buluttan çekip hemen doğrula!
    try {
      const remoteUsers = await fetchUsersFromSupabase();
      if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        const merged = mergeUsers(users, remoteUsers);
        setUsers(merged);
        try {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
        } catch (e) {}

        const remoteUser = merged.find(u => (u.username || '').toLowerCase() === uname);
        if (remoteUser && remoteUser.passwordHash === hashPassword(cleanPass)) {
          setCurrentUser(remoteUser);
          persistSession(remoteUser);
          return { ok: true, user: remoteUser };
        }
      }
    } catch (err) {
      console.warn('Giriş anında bulut sorgulama hatası:', err);
    }

    return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
  };

  const logout = () => {
    setCurrentUser(null);
    persistSession(null);
  };

  const saveUser = (payload) => {
    const username = (payload.username || '').trim().toLowerCase();
    if (!username) return { ok: false, error: 'Kullanıcı adı gerekli.' };

    // Admin kullanıcı adı ve şifresinin değiştirilmesini kesinlikle engelle
    if (payload.id === ADMIN_CREDENTIALS.id || payload.role === ROLES.admin) {
      return { ok: false, error: 'Yönetici kullanıcı adı ve şifresi sabittir, değiştirilemez.' };
    }

    if (username === ADMIN_CREDENTIALS.username.toLowerCase()) {
      return { ok: false, error: `"${ADMIN_CREDENTIALS.username}" kullanıcı adı yöneticiye aittir.` };
    }

    const duplicate = users.find(u =>
      (u.username || '').toLowerCase() === username && u.id !== payload.id
    );
    if (duplicate) return { ok: false, error: 'Bu kullanıcı adı zaten kullanılıyor.' };

    let savedObj = null;
    let nextUsersList = [];

    setUsers(prev => {
      const exists = payload.id && prev.some(u => u.id === payload.id);
      if (exists) {
        nextUsersList = prev.map(u => {
          if (u.id !== payload.id) return u;
          const next = {
            ...u,
            username,
            name: payload.name || u.name,
            role: payload.role || u.role,
            companyId: payload.companyId !== undefined ? payload.companyId : u.companyId
          };
          if (payload.password) next.passwordHash = hashPassword(payload.password);
          savedObj = next;
          return next;
        });
        return nextUsersList;
      }

      savedObj = {
        id: payload.id || makeId('user'),
        username,
        passwordHash: hashPassword(payload.password || '1234'),
        name: payload.name || username,
        role: payload.role || ROLES.operator,
        companyId: payload.companyId || null,
        createdAt: new Date().toISOString()
      };
      nextUsersList = [savedObj, ...prev];
      return nextUsersList;
    });

    if (nextUsersList.length > 0) {
      saveUsersToSupabase(nextUsersList);
    }

    return { ok: true, user: savedObj };
  };

  const deleteUser = (id) => {
    if (id === ADMIN_CREDENTIALS.id) {
      return { ok: false, error: 'Yönetici hesabı silinemez.' };
    }
    const target = users.find(u => u.id === id);
    if (!target) return { ok: false, error: 'Kullanıcı bulunamadı.' };
    if (target.role === ROLES.admin) {
      return { ok: false, error: 'Yönetici hesabı silinemez.' };
    }
    if (currentUser?.id === id) {
      return { ok: false, error: 'Oturum açmış kullanıcı silinemez.' };
    }
    let nextUsersList = [];
    setUsers(prev => {
      nextUsersList = prev.filter(u => u.id !== id);
      return nextUsersList;
    });
    if (nextUsersList.length > 0) {
      saveUsersToSupabase(nextUsersList);
    }
    return { ok: true };
  };

  const upsertCompanyUser = (companyId, username, password, displayName) => {
    if (!companyId || !username) return { ok: false, error: 'Firma kullanıcısı için kullanıcı adı gerekli.' };
    const existing = users.find(u => String(u.companyId) === String(companyId) && u.role === ROLES.company);
    return saveUser({
      id: existing?.id,
      username,
      password,
      name: displayName || username,
      role: ROLES.company,
      companyId
    });
  };

  const deleteUsersByCompanyId = (companyId) => {
    let nextUsersList = [];
    setUsers(prev => {
      nextUsersList = prev.filter(u => u.companyId !== companyId);
      return nextUsersList;
    });
    if (nextUsersList.length > 0) {
      saveUsersToSupabase(nextUsersList);
    }
  };

  const clearAdminRecovery = () => {
    // Admin her zaman 'yusuf' / 'yusuf2026'
    try {
      sessionStorage.removeItem('dentallab_email_otp_v1');
    } catch (e) {}
  };

  const getAdminUser = () => users.find(u => u.role === ROLES.admin) || {
    id: ADMIN_CREDENTIALS.id,
    username: ADMIN_CREDENTIALS.username,
    passwordHash: hashPassword(ADMIN_CREDENTIALS.password),
    name: ADMIN_CREDENTIALS.name,
    role: ROLES.admin,
    companyId: null
  };

  const isAdmin = currentUser?.role === ROLES.admin;
  const isOperator = currentUser?.role === ROLES.operator;
  const isCompany = currentUser?.role === ROLES.company;

  return (
    <AuthContext.Provider
      value={{
        users,
        currentUser,
        isAuthenticated: !!currentUser,
        isAdmin,
        isOperator,
        isCompany,
        adminAccount: getAdminUser(),
        adminCredentials: ADMIN_CREDENTIALS,
        login,
        logout,
        saveUser,
        deleteUser,
        upsertCompanyUser,
        deleteUsersByCompanyId,
        clearAdminRecovery,
        syncUsersWithCloud,
        applyRemoteUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
};
