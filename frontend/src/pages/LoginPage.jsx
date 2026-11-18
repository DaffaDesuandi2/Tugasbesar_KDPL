import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, sessionMessage, clearSessionMessage } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => clearSessionMessage();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    clearSessionMessage();
    setIsSubmitting(true);

    try {
      const data = await login(email, password);
      if (data?.user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (err) {
      const status = err.response?.status;

      if (status === 429) {
        setErrorMessage('Terlalu banyak percobaan login. Silakan tunggu 1 menit sebelum mencoba lagi.');
      } else if (status === 401 || status === 422) {
        setErrorMessage('Email atau Password tidak valid.');
      } else if (status === 403) {
        setErrorMessage('Akun Anda telah dinonaktifkan oleh Administrator.');
      } else {
        setErrorMessage('Gagal terhubung ke server. Periksa koneksi Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-225 bg-[#FFFFFF] rounded-[10px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row">
        
        <div className="w-full md:w-75 shrink-0 bg-[#0C4A6E] px-6 py-5 md:py-10 md:px-8 flex flex-col justify-start">
          <div className="text-[24px] font-bold text-white leading-tight">
            PosTera
          </div>
          <p className="mt-3 text-[15px] font-normal leading-[1.6] text-[#E0F2FE]">
            Portal artikel & diskusi mahasiswa kampus.
          </p>
        </div>

        <div className="w-full md:w-150 p-6 md:p-9">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#4B5563] hover:text-[#0369A1] mb-4 transition"
          >
            <span>←</span> Kembali ke Beranda
          </Link>

          <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight">
            Masuk ke PosTera
          </h1>
          <p className="text-[14px] font-normal text-[#4B5563] mt-1 mb-6">
            Silakan masuk menggunakan akun terdaftar Anda
          </p>

          {sessionMessage && !errorMessage && (
            <div className="mb-4 bg-[#F0F9FF] border border-[#7DD3FC] text-[#0369A1] px-4 py-3 rounded-md text-[14px]">
              {sessionMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] px-4 py-3 rounded-md text-[14px]">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-[14px] font-semibold text-[#1F2937] mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@student.itera.ac.id"
                required
                className="w-full h-11 px-3 bg-[#FFFFFF] text-[15px] text-[#1F2937] placeholder:text-[#9CA3AF] border border-[#9CA3AF] rounded-md outline-none transition focus:border-[#0369A1] focus:shadow-[0_0_0_3px_rgba(3,105,161,0.2)]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[14px] font-semibold text-[#1F2937] mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full h-11 px-3 bg-[#FFFFFF] text-[15px] text-[#1F2937] placeholder:text-[#9CA3AF] border border-[#9CA3AF] rounded-md outline-none transition focus:border-[#0369A1] focus:shadow-[0_0_0_3px_rgba(3,105,161,0.2)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="login-show-password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-4 h-4 rounded border-[#9CA3AF] accent-[#0369A1] cursor-pointer"
              />
              <label
                htmlFor="login-show-password"
                className="text-[14px] font-normal text-[#4B5563] cursor-pointer select-none"
              >
                Tampilkan password
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11.5 bg-[#0369A1] hover:bg-[#075985] disabled:bg-[#0369A1] disabled:opacity-60 disabled:cursor-not-allowed text-[#FFFFFF] text-[15px] font-semibold rounded-md border-0 transition cursor-pointer"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Masuk'}
            </button>

            <p className="text-[14px] font-normal text-[#4B5563] text-center mt-1">
              Belum punya akun?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#0369A1] hover:underline"
              >
                Daftar di sini
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}