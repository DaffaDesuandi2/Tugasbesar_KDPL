import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Gagal logout:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8">
      <div className="max-w-225 mx-auto bg-[#FFFFFF] rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="bg-[#0C4A6E] px-6 py-4 flex items-center justify-between">
          <span className="text-[20px] font-bold text-white">PosTera</span>
          <span className="text-xs font-semibold uppercase tracking-wider bg-white/15 text-[#E0F2FE] px-3 py-1 rounded-full">
            Portal Mahasiswa (User)
          </span>
        </div>

        <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-[22px] font-bold text-[#1F2937]">
            Selamat Datang di Website PosTera (User)
          </h1>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-10.5 px-5 bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-md transition cursor-pointer shrink-0"
          >
            {isLoggingOut ? 'Keluar...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}