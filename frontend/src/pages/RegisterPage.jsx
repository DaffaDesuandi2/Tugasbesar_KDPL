import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const savedData = location.state?.savedFormData;

  const [formData, setFormData] = useState({
    name: savedData?.name || '',
    email: savedData?.email || '',
    password: savedData?.password || '',
    password_confirmation: savedData?.password_confirmation || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateClientSide = () => {
    const newErrors = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Nama minimal 2 karakter.';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password minimal 8 karakter.';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password harus mengandung minimal 1 huruf besar (A-Z).';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password harus mengandung minimal 1 huruf kecil (a-z).';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password harus mengandung minimal 1 angka (0-9).';
    }

    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Konfirmasi password tidak cocok.';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');

    const clientErrors = validateClientSide();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      await api.post('/api/auth/send-otp', {
        name: formData.name.trim(),
        email: cleanEmail,
      });

      navigate('/verify-otp', {
        state: {
          registrationData: {
            ...formData,
            email: cleanEmail,
          },
        },
      });
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 409) {
        setErrors({ email: detail || 'Email sudah terdaftar.' });
      } else if (status === 404) {
        navigate('/verify-otp', {
          state: {
            registrationData: {
              ...formData,
              email: cleanEmail,
            },
          },
        });
      } else {
        setGeneralError(detail || 'Gagal mengirim kode verifikasi ke email.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputClass = (hasError) =>
    `w-full h-11 px-3 bg-[#FFFFFF] text-[15px] text-[#1F2937] placeholder:text-[#9CA3AF] border rounded-md outline-none transition ${
      hasError
        ? 'border-[#B91C1C] focus:border-[#B91C1C] focus:shadow-[0_0_0_3px_rgba(185,28,28,0.15)]'
        : 'border-[#9CA3AF] focus:border-[#0369A1] focus:shadow-[0_0_0_3px_rgba(3,105,161,0.2)]'
    }`;

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
            Daftar Akun PosTera
          </h1>
          <p className="text-[14px] font-normal text-[#4B5563] mt-1 mb-6">
            Portal Artikel & Diskusi Mahasiswa Kampus
          </p>

          {generalError && (
            <div className="mb-4 bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] px-4 py-3 rounded-md text-[14px]">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="reg-name" className="block text-[14px] font-semibold text-[#1F2937] mb-1.5">
                Nama Lengkap
              </label>
              <input
                id="reg-name"
                type="text"
                name="name"
                autoComplete="name"
                maxLength={100}
                value={formData.name}
                onChange={handleChange}
                placeholder="Ragil Bayu Saputra"
                required
                className={getInputClass(Boolean(errors.name))}
              />
              {errors.name && <p className="text-[13px] text-[#B91C1C] mt-1">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-[14px] font-semibold text-[#1F2937] mb-1.5">
                Email Kampus / Aktif
              </label>
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@student.itera.ac.id"
                required
                className={getInputClass(Boolean(errors.email))}
              />
              {errors.email && <p className="text-[13px] text-[#B91C1C] mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-[14px] font-semibold text-[#1F2937] mb-1.5">
                Password
              </label>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 karakter (huruf besar, kecil & angka)"
                required
                className={getInputClass(Boolean(errors.password))}
              />
              {errors.password && <p className="text-[13px] text-[#B91C1C] mt-1">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-[14px] font-semibold text-[#1F2937] mb-1.5">
                Konfirmasi Password
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                name="password_confirmation"
                autoComplete="new-password"
                value={formData.password_confirmation}
                onChange={handleChange}
                placeholder="Ulangi password"
                required
                className={getInputClass(Boolean(errors.password_confirmation))}
              />
              {errors.password_confirmation && (
                <p className="text-[13px] text-[#B91C1C] mt-1">{errors.password_confirmation}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="register-show-password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-4 h-4 rounded border-[#9CA3AF] accent-[#0369A1] cursor-pointer"
              />
              <label htmlFor="register-show-password" className="text-[14px] font-normal text-[#4B5563] cursor-pointer select-none">
                Tampilkan password
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11.5 bg-[#0369A1] hover:bg-[#075985] disabled:bg-[#0369A1] disabled:opacity-60 disabled:cursor-not-allowed text-[#FFFFFF] text-[15px] font-semibold rounded-md border-0 transition cursor-pointer"
            >
              {isSubmitting ? 'Mengirim OTP...' : 'Daftar Sekarang'}
            </button>

            <p className="text-[14px] font-normal text-[#4B5563] text-center mt-1">
              Sudah punya akun?{' '}
              <Link to="/login" className="font-semibold text-[#0369A1] hover:underline">
                Masuk di sini
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}