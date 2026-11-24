import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'postera_last_activity';
const LOGOUT_EVENT_KEY = 'postera_logout_event';
const ACTIVITY_SYNC_THROTTLE_MS = 5000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const idleTimerRef = useRef(null);
  const lastSyncRef = useRef(0);

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    const handleUnauthorized = () => {
      setUser(null);
      setSessionMessage('Sesi Anda telah berakhir. Silakan masuk kembali.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const handleIdleLogout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      void 0;
    } finally {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
      setUser(null);
      setSessionMessage('Sesi Anda telah berakhir karena tidak aktif selama 30 menit.');
    }
  }, []);

  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const scheduleIdleTimer = (remainingMs = IDLE_TIMEOUT_MS) => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        handleIdleLogout();
      }, Math.max(0, remainingMs));
    };

    const recordUserActivity = () => {
      scheduleIdleTimer(IDLE_TIMEOUT_MS);

      const now = Date.now();
      if (now - lastSyncRef.current >= ACTIVITY_SYNC_THROTTLE_MS) {
        lastSyncRef.current = now;
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      }
    };

    const handleStorageSync = (event) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const lastTimestamp = Number(event.newValue);
        if (!Number.isNaN(lastTimestamp)) {
          const elapsed = Date.now() - lastTimestamp;
          scheduleIdleTimer(IDLE_TIMEOUT_MS - elapsed);
        }
      }

      if (event.key === LOGOUT_EVENT_KEY && event.newValue) {
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        setUser(null);
        setSessionMessage('Sesi Anda telah berakhir. Silakan masuk kembali.');
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, recordUserActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorageSync);

    const savedActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    if (!Number.isNaN(savedActivity) && savedActivity > 0) {
      const elapsed = Date.now() - savedActivity;
      if (elapsed >= IDLE_TIMEOUT_MS) {
        handleIdleLogout();
      } else {
        scheduleIdleTimer(IDLE_TIMEOUT_MS - elapsed);
      }
    } else {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      scheduleIdleTimer(IDLE_TIMEOUT_MS);
    }

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordUserActivity);
      });
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [user, handleIdleLogout]);

  const register = async (name, email, password) => {
    setSessionMessage('');
    const response = await api.post('/api/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    setSessionMessage('Registrasi berhasil! Silakan masuk menggunakan akun Anda.');
    return response.data;
  };

  const login = async (email, password) => {
    setSessionMessage('');
    const response = await api.post('/api/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
      setUser(null);
      setSessionMessage('Anda telah berhasil keluar dari sistem.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionMessage,
        clearSessionMessage: () => setSessionMessage(''),
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);