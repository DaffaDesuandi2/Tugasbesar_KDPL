import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_MENU = [
  { label: 'Dashboard', to: '/admin/dashboard', end: true },
  { label: 'Kelola Artikel', to: '/admin/articles', end: false },
  { label: 'Kelola Pengguna', to: '/admin/users', end: false },
  { label: 'Moderasi Komentar', to: '/admin/comments', end: false },
  { label: 'Audit Log', to: '/admin/audit-logs', end: false },
];

export default function AdminLayout({ pageTitle = 'Dashboard', children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const adminName = user?.name || 'Admin PosTera';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const renderMenuItems = (onItemClick) => (
    <nav aria-label="Menu Admin" className="flex flex-col gap-1">
      {ADMIN_MENU.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onItemClick}
          className={({ isActive }) =>
            `h-11 px-4 rounded-lg text-[15px] flex items-center transition-colors ${
              isActive
                ? 'bg-white/16 text-white font-semibold'
                : 'bg-transparent text-[#E0F2FE] font-normal hover:bg-white/10'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      {/* Sidebar Desktop (>= 1024px): lebar 240px (w-60), tidak menyusut */}
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 bg-[#0C4A6E] px-4 py-6">
        <div className="text-[22px] font-extrabold text-white px-4 pb-6">
          PosTera
        </div>
        <div className="text-xs font-bold tracking-[1px] text-[#BAE6FD] px-4 pb-2 uppercase">
          MENU ADMIN
        </div>
        {renderMenuItems(undefined)}
      </aside>

      {/* Drawer Sidebar Mobile/Tablet (< 1024px) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50"
            aria-hidden="true"
          />
          <aside className="relative z-10 w-60 shrink-0 bg-[#0C4A6E] px-4 py-6 flex flex-col">
            <div className="flex items-center justify-between px-4 pb-6">
              <span className="text-[22px] font-extrabold text-white">PosTera</span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Tutup Menu Admin"
                className="text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="text-xs font-bold tracking-[1px] text-[#BAE6FD] px-4 pb-2 uppercase">
              MENU ADMIN
            </div>
            {renderMenuItems(() => setSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Kolom Konten Utama */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar tinggi 64px (h-16) */}
        <header className="h-16 bg-white px-4 sm:px-8 shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka Menu Admin"
              className="lg:hidden w-9.5 h-9.5 rounded-md border border-gray-300 flex items-center justify-center text-[#0C4A6E] text-lg font-bold cursor-pointer"
            >
              ≡
            </button>
            <span className="text-lg font-bold text-[#1F2937]">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold tracking-[0.4px] px-3 py-1.25 rounded-full uppercase">
              PANEL ADMINISTRATOR
            </span>
            <span className="hidden md:inline-block text-sm text-[#4B5563]">
              {adminName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="h-9.5 px-4 rounded-md bg-[#B91C1C] hover:bg-red-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Area Isi: padding 28px 32px (px-4 sm:px-8 py-7), jarak antar bagian 20px (gap-5) */}
        <main className="flex-1 w-full max-w-260 px-4 sm:px-8 py-7 flex flex-col gap-5">
          {children}
        </main>
      </div>
    </div>
  );
}