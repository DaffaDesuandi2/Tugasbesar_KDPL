import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const INITIAL_USERS = [
  {
    id: 106,
    name: 'ragilbayu',
    email: 'ragilbayu@student.itera.ac.id',
    role: 'mahasiswa',
    failed_login_attempts: 0,
    created_at: '12 Okt 2026',
    is_active: true,
  },
  {
    id: 105,
    name: 'dinaputri',
    email: 'dinaputri@student.itera.ac.id',
    role: 'mahasiswa',
    failed_login_attempts: 0,
    created_at: '14 Okt 2026',
    is_active: true,
  },
  {
    id: 104,
    name: 'fajarnur',
    email: 'fajarnur@student.itera.ac.id',
    role: 'mahasiswa',
    failed_login_attempts: 3,
    created_at: '20 Okt 2026',
    is_active: true,
  },
  {
    id: 103,
    name: 'sariintan',
    email: 'sariintan@student.itera.ac.id',
    role: 'mahasiswa',
    failed_login_attempts: 0,
    created_at: '02 Nov 2026',
    is_active: false,
  },
  {
    id: 102,
    name: 'budisantoso',
    email: 'budisantoso@student.itera.ac.id',
    role: 'mahasiswa',
    failed_login_attempts: 5,
    created_at: '05 Nov 2026',
    is_active: true,
  },
  {
    id: 1,
    name: 'Super Admin PosTera',
    email: 'admin@postera.ac.id',
    role: 'admin',
    failed_login_attempts: 0,
    created_at: '01 Okt 2026',
    is_active: true,
  },
];

function getInitials(name) {
  if (!name) return 'U';
  const cleaned = name.trim();
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

function getFailedLoginColor(count) {
  if (count >= 5) return 'text-[#B91C1C]';
  if (count >= 3) return 'text-[#B45309]';
  return 'text-[#4B5563]';
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [togglingUserId, setTogglingUserId] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().slice(0, 100));
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Mengambil daftar pengguna dari backend API saat halaman pertama kali dibuka
  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        // Memanggil endpoint backend GET /api/admin/users
        const response = await api.get('/api/admin/users');
        if (!isMounted) return;

        // Simpan daftar pengguna asli dari database ke state
        setUsers(response.data.users || []);
      } catch (err) {
        console.error('Gagal mengambil data pengguna dari backend:', err);
        if (isMounted) {
          // Fallback: Jika backend offline, tetap tampilkan data awal agar UI tidak crash
          setUsers(INITIAL_USERS);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(() => {
    const active = users.filter((u) => u.is_active).length;
    const inactive = users.filter((u) => !u.is_active).length;
    return {
      all: users.length,
      active,
      inactive,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? item.is_active
            : !item.is_active;

      const keyword = debouncedSearch.toLowerCase();
      const matchSearch =
        !keyword
          ? true
          : item.name.toLowerCase().includes(keyword) ||
          item.email.toLowerCase().includes(keyword);

      return matchStatus && matchSearch;
    });
  }, [users, statusFilter, debouncedSearch]);

  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, safePage]);

  const startRange = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRange = Math.min(safePage * itemsPerPage, totalItems);

  const handleStatusFilterChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
  };

  const updateUserStatus = async (targetUser, nextIsActive) => {
    setTogglingUserId(targetUser.id);
    try {
      await api.patch(`/api/admin/users/${targetUser.id}/status`, {
        is_active: nextIsActive
      });

      setUsers((prev) =>
        prev.map((item) =>
          item.id === targetUser.id ? { ...item, is_active: nextIsActive } : item
        )
      );

      // Tampilkan notifikasi toast sukses
      setToast({
        message: nextIsActive
          ? `Akun ${targetUser.name} berhasil diaktifkan.`
          : `Akun ${targetUser.name} berhasil dinonaktifkan.`,
        variant: 'default',
      });

    } catch (err) {
      console.error('Gagal memperbarui status pengguna:', err);
      // Tampilkan pesan galat spesifik dari backend jika gagal
      const errorMsg = err.response?.data?.detail || 'Gagal mengubah status pengguna. Coba lagi.';
      setToast({
        message: errorMsg,
        variant: 'error',
      });
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleSwitchClick = (targetUser) => {
    if (targetUser.role === 'admin') return;
    if (togglingUserId === targetUser.id) return;

    if (targetUser.is_active) {
      setDeactivateTarget(targetUser);
    } else {
      updateUserStatus(targetUser, true);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;
    const target = deactivateTarget;
    setDeactivateTarget(null);
    await updateUserStatus(target, false);
  };

  const isCurrentLoggedInUser = (rowUser) => {
    if (!currentUser) return rowUser.role === 'admin';
    return (
      rowUser.id === currentUser.id ||
      rowUser.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
  };

  return (
    <AdminLayout pageTitle="Kelola Pengguna">
      <div>
        <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight mb-1">
          Kelola Pengguna
        </h1>
        <p className="text-sm text-[#4B5563]">
          Lihat daftar akun dan ubah status keaktifan.
        </p>
      </div>

      <div className="flex flex-col min-[900px]:flex-row min-[900px]:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleStatusFilterChange('all')}
            className={`px-4 py-1.75 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${statusFilter === 'all'
              ? 'bg-[#0369A1] text-white border-[#0369A1]'
              : 'bg-white text-[#1F2937] border-[#D1D5DB] hover:bg-gray-50'
              }`}
          >
            Semua ({counts.all.toLocaleString('id-ID')})
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange('active')}
            className={`px-4 py-1.75 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${statusFilter === 'active'
              ? 'bg-[#0369A1] text-white border-[#0369A1]'
              : 'bg-white text-[#1F2937] border-[#D1D5DB] hover:bg-gray-50'
              }`}
          >
            Aktif ({counts.active.toLocaleString('id-ID')})
          </button>

          <button
            type="button"
            onClick={() => handleStatusFilterChange('inactive')}
            className={`px-4 py-1.75 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${statusFilter === 'inactive'
              ? 'bg-[#0369A1] text-white border-[#0369A1]'
              : 'bg-white text-[#1F2937] border-[#D1D5DB] hover:bg-gray-50'
              }`}
          >
            Nonaktif ({counts.inactive.toLocaleString('id-ID')})
          </button>
        </div>

        <input
          type="text"
          maxLength={100}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari nama atau email..."
          aria-label="Cari nama atau email"
          className="w-full min-[900px]:w-75 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#0369A1]"
        />
      </div>

      <section className="bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="h-13.5 bg-[#E5E7EB] rounded-lg" />
            ))}
          </div>
        ) : hasError ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            Data gagal dimuat. Coba lagi.
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            Tidak ada pengguna yang cocok.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[13px] font-bold text-[#4B5563]">
                    <th className="w-62.5 px-3 py-2.5">Pengguna</th>
                    <th className="w-62.5 px-3 py-2.5">Email</th>
                    <th className="w-25 px-3 py-2.5">Peran</th>
                    <th className="w-25 px-3 py-2.5">Login Gagal</th>
                    <th className="w-30 px-3 py-2.5">Terdaftar</th>
                    <th className="w-28 px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((rowUser) => {
                    const isAdminRole = rowUser.role === 'admin';
                    const isSelf = isCurrentLoggedInUser(rowUser);
                    const isRowToggling = togglingUserId === rowUser.id;

                    return (
                      <tr
                        key={rowUser.id}
                        className="h-13.75 border-b border-[#F3F4F6] last:border-b-0 text-sm text-[#1F2937]"
                      >
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-8.5 h-8.5 rounded-full bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {getInitials(rowUser.name)}
                              </span>
                              <span className="font-bold text-[#1F2937] truncate">
                                {rowUser.name}
                              </span>
                            </div>

                            {isSelf && (
                              <span className="px-3 py-1.25 rounded-full bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold shrink-0">
                                ANDA
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 align-middle text-[#1F2937] truncate max-w-62.5">
                          {rowUser.email}
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          {isAdminRole ? (
                            <span className="inline-block uppercase px-3 py-1.25 rounded-full bg-[#0C4A6E] text-white text-xs font-bold">
                              ADMIN
                            </span>
                          ) : (
                            <span className="inline-block uppercase px-3 py-1.25 rounded-full bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold">
                              MAHASISWA
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span
                            className={`text-sm font-bold ${getFailedLoginColor(
                              rowUser.failed_login_attempts
                            )}`}
                          >
                            {rowUser.failed_login_attempts}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap text-[#1F2937]">
                          {rowUser.created_at}
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <div
                            title={
                              isAdminRole
                                ? 'Akun Admin tidak dapat dinonaktifkan dari panel ini'
                                : undefined
                            }
                            className={`inline-flex items-center gap-2 ${isAdminRole
                              ? 'opacity-45 cursor-not-allowed'
                              : isRowToggling
                                ? 'opacity-60 cursor-not-allowed'
                                : ''
                              }`}
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={rowUser.is_active}
                              aria-label={`Ubah status aktif untuk ${rowUser.name}`}
                              disabled={isAdminRole || isRowToggling}
                              onClick={() => handleSwitchClick(rowUser)}
                              className={`relative w-10 h-5.5 rounded-[11px] transition-colors shrink-0 ${rowUser.is_active ? 'bg-[#0369A1]' : 'bg-[#9CA3AF]'
                                } ${isAdminRole || isRowToggling
                                  ? 'cursor-not-allowed'
                                  : 'cursor-pointer'
                                }`}
                            >
                              <span
                                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${rowUser.is_active ? 'left-5' : 'left-0.5'
                                  }`}
                              />
                            </button>

                            <span
                              className={`text-[13px] font-semibold ${rowUser.is_active
                                ? 'text-[#166534]'
                                : 'text-[#4B5563]'
                                }`}
                            >
                              {rowUser.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3.5 bg-[#E0F2FE] text-[#0C4A6E] rounded-lg px-4 py-3 text-[13px]">
              Akun Admin tidak dapat dinonaktifkan dari panel ini.
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] text-[#4B5563]">
                Menampilkan {startRange}–{endRange} dari{' '}
                {totalItems.toLocaleString('id-ID')} pengguna
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Halaman sebelumnya"
                  className="min-w-9 h-9 px-2 rounded-full bg-white border border-gray-300 text-sm font-semibold text-[#1F2937] disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-9 h-9 px-2 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${safePage === page
                      ? 'bg-[#0C4A6E] text-white border-[#0C4A6E]'
                      : 'bg-white text-[#1F2937] border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Halaman berikutnya"
                  className="min-w-9 h-9 px-2 rounded-full bg-white border border-gray-300 text-sm font-semibold text-[#1F2937] disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {deactivateTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-deactivate-user-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-105 bg-white rounded-[14px] p-7 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <h3
              id="modal-deactivate-user-title"
              className="text-xl font-bold text-[#1F2937] mb-2"
            >
              Nonaktifkan akun {deactivateTarget.name}?
            </h3>
            <p className="text-sm leading-[1.6] text-[#4B5563] mb-5.5">
              Pengguna tidak dapat masuk ke PosTera sampai akunnya diaktifkan kembali.
              Tindakan ini dicatat di Audit Log.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="h-10.5 px-5 rounded-lg bg-white border border-[#9CA3AF] text-sm font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                className="h-10.5 px-5 rounded-lg bg-[#B91C1C] hover:bg-red-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg ${toast.variant === 'error' ? 'bg-[#B91C1C]' : 'bg-[#1F2937]'
            }`}
        >
          {toast.message}
        </div>
      )}
    </AdminLayout>
  );
}