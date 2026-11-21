import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
  const loginTarget =
    location.pathname.startsWith('/artikel/')
      ? `/login?redirect=${encodeURIComponent(location.pathname)}`
      : '/login';

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="w-full bg-gray-100">
      <div className="max-w-300 mx-auto px-4 sm:px-8 lg:px-14 h-19 flex items-center justify-between">
        <div className="lg:w-75 flex items-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-[9px] bg-[#0C4A6E] flex items-center justify-center text-white font-extrabold text-lg leading-none">
              P
            </div>
            <span className="text-xl font-extrabold text-[#0C4A6E] tracking-tight">
              PosTera
            </span>
          </Link>
        </div>

        <nav
          aria-label="Navigasi Utama"
          className="hidden sm:flex items-center bg-white rounded-full p-1.25 gap-0.5 shadow-[0_1px_6px_rgba(0,0,0,0.08)]"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-5.5 py-2.25 rounded-full text-sm transition-colors ${
                isActive
                  ? 'bg-[#0C4A6E] text-white font-semibold'
                  : 'bg-transparent text-[#1F2937] font-normal hover:text-[#0C4A6E]'
              }`
            }
          >
            Beranda
          </NavLink>
          <NavLink
            to="/artikel"
            className={({ isActive }) =>
              `px-5.5 py-2.25 rounded-full text-sm transition-colors ${
                isActive
                  ? 'bg-[#0C4A6E] text-white font-semibold'
                  : 'bg-transparent text-[#1F2937] font-normal hover:text-[#0C4A6E]'
              }`
            }
          >
            Artikel
          </NavLink>
          {user && (
            <NavLink
              to={dashboardPath}
              className={({ isActive }) =>
                `px-5.5 py-2.25 rounded-full text-sm transition-colors ${
                  isActive
                    ? 'bg-[#0C4A6E] text-white font-semibold'
                    : 'bg-transparent text-[#1F2937] font-normal hover:text-[#0C4A6E]'
                }`
              }
            >
              Dashboard
            </NavLink>
          )}
        </nav>

        {/* Kanan: Masuk/Daftar (Belum Login) atau Avatar 34px #0369A1 + Nama + Logout #B91C1C (Sudah Login) */}
        <div className="hidden sm:flex lg:w-75 items-center justify-end gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-full bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {getInitials(user.name)}
                </div>
                <span className="text-sm font-semibold text-[#1F2937] max-w-32 truncate">
                  {user.name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="h-9.5 px-4 rounded-md bg-[#B91C1C] hover:bg-red-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to={loginTarget}
                className="px-5.5 py-2.5 rounded-full bg-white text-[#0C4A6E] border border-gray-400 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="px-5.5 py-2.5 rounded-full bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0C4A6E] transition-colors"
              >
                Daftar
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Buka Menu"
          className="sm:hidden w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[#0C4A6E] text-xl font-bold shadow-xs"
        >
          {mobileMenuOpen ? '✕' : '≡'}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pb-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col gap-2">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-full text-sm text-center ${
                  isActive
                    ? 'bg-[#0C4A6E] text-white font-semibold'
                    : 'text-[#1F2937] hover:bg-gray-100'
                }`
              }
            >
              Beranda
            </NavLink>
            <NavLink
              to="/artikel"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-full text-sm text-center ${
                  isActive
                    ? 'bg-[#0C4A6E] text-white font-semibold'
                    : 'text-[#1F2937] hover:bg-gray-100'
                }`
              }
            >
              Artikel
            </NavLink>
            {user && (
              <NavLink
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-full text-sm text-center ${
                    isActive
                      ? 'bg-[#0C4A6E] text-white font-semibold'
                      : 'text-[#1F2937] hover:bg-gray-100'
                  }`
                }
              >
                Dashboard
              </NavLink>
            )}
            <hr className="border-gray-200 my-1" />
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-9.5 rounded-md bg-[#B91C1C] text-white text-sm font-semibold text-center"
              >
                Logout ({user.name})
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={loginTarget}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-full bg-white text-[#0C4A6E] border border-gray-400 text-sm font-semibold text-center"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-full bg-[#0369A1] text-white text-sm font-semibold text-center"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}