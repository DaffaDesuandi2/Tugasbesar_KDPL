import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard';

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col">
      <header className="bg-[#0C4A6E] text-white shadow-sm">
        <div className="max-w-225 mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-[22px] font-bold tracking-tight">
            PosTera
          </Link>

          <nav className="flex items-center gap-3">
            {user ? (
              <Link
                to={dashboardPath}
                className="px-4 py-2 bg-[#0369A1] hover:bg-[#075985] text-white text-[14px] font-semibold rounded-md transition"
              >
                Ke Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-[#E0F2FE] hover:text-white text-[14px] font-semibold transition"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#0369A1] hover:bg-[#075985] text-white text-[14px] font-semibold rounded-md transition"
                >
                  Daftar
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

    </div>
  );
}