import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');

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
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
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