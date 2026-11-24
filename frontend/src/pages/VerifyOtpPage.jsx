import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const OTP_EXPIRE_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESEND_ATTEMPTS = 5;

export default function VerifyOtpPage() {
  const { register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const registrationData = location.state?.registrationData || null;
  const email = registrationData?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendCount, setResendCount] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!registrationData?.email) {
      navigate('/register', { replace: true });
    }
  }, [registrationData, navigate]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (isSuccess || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, timeLeft]);

  useEffect(() => {
    if (isSuccess || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, resendCooldown]);

  const formatTime = (totalSeconds) => {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleChange = (index, value) => {
    if (isSuccess) return;
    const digit = value.replace(/\D/g, '').slice(-1);

    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setErrorMessage('');

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyDown = (index, e) => {
    if (isSuccess) return;
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const nextOtp = [...otp];
        nextOtp[index] = '';
        setOtp(nextOtp);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    if (isSuccess) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextOtp = ['', '', '', '', '', ''];
    pasted.split('').forEach((char, idx) => {
      nextOtp[idx] = char;
    });
    setOtp(nextOtp);
    setErrorMessage('');

    const focusTarget = Math.min(pasted.length, 5);
    inputRefs.current[focusTarget]?.focus();
    setActiveIndex(focusTarget);
  };

  const handleChangeEmail = () => {
    navigate('/register', {
      state: { savedFormData: registrationData },
    });
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isSuccess) return;

    if (resendCount >= MAX_RESEND_ATTEMPTS) {
      setErrorMessage('Batas maksimal pengiriman ulang OTP tercapai. Silakan coba beberapa saat lagi.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');

    try {
      await api.post('/api/auth/send-otp', { email });

      setOtp(['', '', '', '', '', '']);
      setTimeLeft(OTP_EXPIRE_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendCount((prev) => prev + 1);
      setInfoMessage('Kode OTP baru telah dikirim ke email Anda.');
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Gagal mengirim ulang kode OTP.'
      );
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');

    if (timeLeft <= 0) {
      setErrorMessage('Kode OTP telah kedaluwarsa. Silakan klik "Kirim ulang".');
      return;
    }
    if (code.length < 6) {
      setErrorMessage('Masukkan 6 digit kode verifikasi terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      await api.post('/api/auth/verify-otp', {
        email,
        otp: code,
      });

      await register(
        registrationData.name,
        registrationData.email,
        registrationData.password
      );
      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'Kode verifikasi salah atau sudah kedaluwarsa.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCodeComplete = otp.every((digit) => digit !== '');
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / OTP_EXPIRE_SECONDS) * 100));

  if (!registrationData?.email) return null;

  return (
    <div className="min-h-screen bg-[#F3F4F6] pt-10 pb-10 px-4 flex justify-center items-start">
      <div className="w-full max-w-120 bg-[#FFFFFF] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden text-center">
        <div className="bg-[#E0F2FE] pt-8 pb-7 px-4 flex flex-col items-center justify-center gap-3">
          <div className="text-[18px] font-bold text-[#0C4A6E] leading-none">
            PosTera
          </div>

          <div
            className={`w-19 h-19 rounded-full flex items-center justify-center transition-colors ${
              isSuccess
                ? 'bg-[#16A34A] shadow-[0_0_0_8px_rgba(22,163,74,0.15)]'
                : 'bg-[#0C4A6E] shadow-[0_0_0_8px_rgba(3,105,161,0.15)]'
            }`}
          >
            {isSuccess ? (
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            )}
          </div>
        </div>

        <div className="px-5 py-6 min-[520px]:pt-8 min-[520px]:px-11 min-[520px]:pb-9 flex flex-col gap-5">
          <div>
            <h1 className="text-[26px] font-bold text-[#1F2937] leading-[1.3] mb-2">
              Cek Email Anda
            </h1>
            <p className="text-[15px] text-[#4B5563] leading-[1.6]">
              Kami telah mengirim kode verifikasi. Masukkan kode tersebut untuk melanjutkan.
            </p>
          </div>

          <div className="w-full bg-[#E0F2FE] rounded-lg py-3 px-4 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0">
              <div className="text-[12px] text-[#4B5563]">Kode dikirim ke</div>
              <div className="text-[15px] font-bold text-[#0C4A6E] truncate">
                {email}
              </div>
            </div>
            <button
              type="button"
              onClick={handleChangeEmail}
              className="shrink-0 text-[13px] font-semibold text-[#0369A1] hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              Ubah
            </button>
          </div>

          {infoMessage && !errorMessage && (
            <div className="bg-[#F0F9FF] border border-[#7DD3FC] text-[#0369A1] px-3 py-2 rounded-md text-[13px]">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleVerify} className="flex flex-col gap-5">
            <div>
              <label className="block text-[14px] font-semibold text-[#1F2937] mb-2.5">
                Masukkan 6 digit kode
              </label>

              <div
                onPaste={handlePaste}
                className="flex justify-center gap-2 min-[520px]:gap-2.5"
              >
                {otp.map((digit, idx) => {
                  const hasError = Boolean(errorMessage);
                  const isFocused = activeIndex === idx;
                  const isFilled = digit !== '';

                  let boxStyle = 'border border-[#9CA3AF] bg-[#FFFFFF]';
                  if (hasError) {
                    boxStyle = 'border-2 border-[#B91C1C] bg-[#FEF2F2]';
                  } else if (isFocused) {
                    boxStyle =
                      'border-2 border-[#0369A1] bg-[#FFFFFF] shadow-[0_0_0_3px_rgba(3,105,161,0.2)]';
                  } else if (isFilled) {
                    boxStyle = 'border border-[#0369A1] bg-[#FFFFFF]';
                  }

                  return (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      value={digit}
                      disabled={isSuccess || isSubmitting}
                      onFocus={() => setActiveIndex(idx)}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      aria-label={`Digit OTP ke-${idx + 1}`}
                      className={`w-11 h-13.5 min-[520px]:w-13.5 min-[520px]:h-15.5 rounded-lg text-center text-[26px] font-bold text-[#1F2937] outline-none transition ${boxStyle}`}
                    />
                  );
                })}
              </div>

              {errorMessage && (
                <p className="text-[13px] text-[#B91C1C] mt-2">
                  {errorMessage}
                </p>
              )}

              <div className="mt-4">
                <div className="w-full h-1.5 bg-[#E5E7EB] rounded-[3px] overflow-hidden">
                  <div
                    className={`h-full rounded-[3px] transition-all duration-500 ${
                      isSuccess ? 'bg-[#16A34A]' : 'bg-[#0369A1]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-[12px] text-[#4B5563] text-right mt-1.5">
                  Sisa waktu {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isCodeComplete || isSubmitting || isSuccess || timeLeft <= 0}
              className="w-full h-12 bg-[#0369A1] hover:bg-[#075985] disabled:bg-[#0369A1] disabled:opacity-60 disabled:cursor-not-allowed text-[#FFFFFF] text-[15px] font-semibold rounded-md border-0 transition cursor-pointer"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Verifikasi Kode'}
            </button>
          </form>

          <p className="text-[14px] text-[#4B5563]">
            Belum menerima kode?{' '}
            {resendCooldown > 0 ? (
              <>
                <span className="text-[#9CA3AF] font-semibold cursor-not-allowed">
                  Kirim ulang
                </span>{' '}
                dalam{' '}
                <span className="font-bold text-[#0C4A6E]">
                  {formatTime(resendCooldown)}
                </span>
              </>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-[#0369A1] font-semibold hover:underline bg-transparent border-0 p-0 cursor-pointer"
              >
                Kirim ulang
              </button>
            )}
          </p>

          <Link
            to="/login"
            className="w-full h-11.5 bg-[#FFFFFF] hover:bg-[#F3F4F6] border border-[#9CA3AF] rounded-md text-[#1F2937] text-[15px] font-semibold flex items-center justify-center transition"
          >
            ← Kembali ke Masuk
          </Link>
        </div>
      </div>

      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-95 bg-[#FFFFFF] rounded-2xl p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="text-[20px] font-bold text-[#1F2937] mb-2">
              Registrasi Berhasil!
            </h2>
            <p className="text-[14px] text-[#4B5563] leading-relaxed mb-6">
              Email <span className="font-semibold text-[#0C4A6E]">{email}</span> telah berhasil diverifikasi. Silakan masuk menggunakan akun Anda.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full h-11.5 bg-[#0369A1] hover:bg-[#075985] text-[#FFFFFF] text-[15px] font-semibold rounded-md border-0 transition cursor-pointer"
            >
              Lanjut ke Halaman Masuk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}