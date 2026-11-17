import { createContext, useContext, useState, useEffect } from 'react';
import api, { getCsrfCookie } from '../api/axios';

const AuthContext = createContext(null);

// Ubah menjadi false jika backend Laravel sudah siap dijalankan
const USE_MOCK_AUTH = true;

const DEFAULT_MOCK_USERS = [
  {
    id: 1,
    username: 'admin_postera',
    email: 'admin@itera.ac.id',
    password: 'admin12345',
    role: 'admin',
    is_active: true,
  },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');

  const fetchUser = async () => {
    if (USE_MOCK_AUTH) {
      const savedMockUser = sessionStorage.getItem('mock_user');
      if (savedMockUser) {
        setUser(JSON.parse(savedMockUser));
      }
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/user');
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    // Menangani sesi habis otomatis (SR-SESS-02: Idle Timeout 30 menit)
    const handleUnauthorized = () => {
      setUser(null);
      sessionStorage.removeItem('mock_user');
      setSessionMessage('Sesi Anda telah berakhir karena tidak ada aktivitas. Silakan masuk kembali.');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const register = async (username, email, password, password_confirmation) => {
    setSessionMessage('');
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (USE_MOCK_AUTH) {
      const storedUsers = JSON.parse(localStorage.getItem('mock_users_db')) || DEFAULT_MOCK_USERS;

      const isDuplicate = storedUsers.some(
        (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername.toLowerCase()
      );
      if (isDuplicate) {
        throw {
          response: {
            status: 422,
            data: {
              errors: {
                email: ['Email atau username sudah terdaftar.'],
              },
            },
          },
        };
      }

      const newUser = {
        id: Date.now(),
        username: cleanUsername,
        email: cleanEmail,
        password,
        role: 'user',
        is_active: true,
      };

      localStorage.setItem('mock_users_db', JSON.stringify([...storedUsers, newUser]));
      const { password: _, ...safeUser } = newUser;
      sessionStorage.setItem('mock_user', JSON.stringify(safeUser));
      setUser(safeUser);
      return { user: safeUser };
    }

    await getCsrfCookie();
    const response = await api.post('/api/register', {
      username: cleanUsername,
      email: cleanEmail,
      password,
      password_confirmation,
    });
    await fetchUser();
    return response.data;
  };

  const login = async (email, password) => {
    setSessionMessage('');
    const cleanEmail = email.trim().toLowerCase();

    if (USE_MOCK_AUTH) {
      const storedUsers = JSON.parse(localStorage.getItem('mock_users_db')) || DEFAULT_MOCK_USERS;
      const foundUser = storedUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === password
      );

      if (!foundUser) {
        throw {
          response: {
            status: 401,
            data: { message: 'Kredensial yang diberikan tidak cocok dengan catatan kami.' },
          },
        };
      }

      if (!foundUser.is_active) {
        throw { response: { status: 403 } };
      }

      const { password: _, ...safeUser } = foundUser;
      sessionStorage.setItem('mock_user', JSON.stringify(safeUser));
      setUser(safeUser);
      return { user: safeUser };
    }

    await getCsrfCookie();
    const response = await api.post('/api/login', {
      email: cleanEmail,
      password,
    });
    await fetchUser();
    return response.data;
  };

  const logout = async () => {
    try {
      if (!USE_MOCK_AUTH) {
        await api.post('/api/logout');
      }
    } finally {
      // Pastikan sesi lokal selalu dibersihkan meskipun jaringan sedang bermasalah
      sessionStorage.removeItem('mock_user');
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