import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';

const ACTION_OPTIONS = [
  'Semua',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'CREATE',
  'UPDATE',
  'DELETE',
  'TOGGLE_USER',
];

const ENTITY_OPTIONS = ['Semua', 'users', 'articles', 'article_comments'];

const ACTION_BADGE_STYLES = {
  LOGIN_SUCCESS: 'bg-[#DCFCE7] text-[#166534]',
  LOGIN_FAILED: 'bg-[#FEE2E2] text-[#B91C1C]',
  CREATE: 'bg-[#E0F2FE] text-[#0C4A6E]',
  UPDATE: 'bg-[#E0F2FE] text-[#0C4A6E]',
  DELETE: 'bg-[#FEE2E2] text-[#B91C1C]',
  TOGGLE_USER: 'bg-[#FEF3C7] text-[#92400E]',
};

const INITIAL_AUDIT_LOGS = [
  {
    id: 5402,
    created_at_wib: '21 Nov 2026 10:42:15',
    iso_date: '2026-11-21',
    user_name: 'Super Admin PosTera',
    action: 'TOGGLE_USER',
    entity_type: 'users',
    entity_label: 'users #3',
    detail: 'Menonaktifkan akun fajarnur',
    ip_address: '203.0.113.10',
  },
  {
    id: 5401,
    created_at_wib: '21 Nov 2026 10:31:02',
    iso_date: '2026-11-21',
    user_name: 'ragilbayu12',
    action: 'LOGIN_SUCCESS',
    entity_type: 'users',
    entity_label: 'users #1',
    detail: 'Login berhasil',
    ip_address: '203.0.113.45',
  },
  {
    id: 5400,
    created_at_wib: '21 Nov 2026 10:28:47',
    iso_date: '2026-11-21',
    user_name: null,
    action: 'LOGIN_FAILED',
    entity_type: 'users',
    entity_label: 'users',
    detail: 'Kredensial tidak cocok',
    ip_address: '198.51.100.23',
  },
  {
    id: 5399,
    created_at_wib: '21 Nov 2026 10:15:09',
    iso_date: '2026-11-21',
    user_name: 'Super Admin PosTera',
    action: 'UPDATE',
    entity_type: 'articles',
    entity_label: 'articles #14',
    detail: 'Mengubah artikel Jadwal UTS Semester Ganjil',
    ip_address: '203.0.113.10',
  },
  {
    id: 5398,
    created_at_wib: '21 Nov 2026 09:50:21',
    iso_date: '2026-11-21',
    user_name: 'Super Admin PosTera',
    action: 'DELETE',
    entity_type: 'article_comments',
    entity_label: 'article_comments #482',
    detail: 'Menghapus komentar (moderasi)',
    ip_address: '203.0.113.10',
  },
  {
    id: 5397,
    created_at_wib: '21 Nov 2026 09:20:11',
    iso_date: '2026-11-21',
    user_name: 'Super Admin PosTera',
    action: 'CREATE',
    entity_type: 'articles',
    entity_label: 'articles #16',
    detail: 'Menambah artikel Tips Lolos Seleksi Magang',
    ip_address: '203.0.113.10',
  },
  {
    id: 5396,
    created_at_wib: '21 Nov 2026 09:02:54',
    iso_date: '2026-11-21',
    user_name: 'Super Admin PosTera',
    action: 'DELETE',
    entity_type: 'articles',
    entity_label: 'articles #9',
    detail: 'Menghapus artikel',
    ip_address: '203.0.113.10',
  },
  {
    id: 5395,
    created_at_wib: '20 Nov 2026 18:14:30',
    iso_date: '2026-11-20',
    user_name: 'Super Admin PosTera',
    action: 'TOGGLE_USER',
    entity_type: 'users',
    entity_label: 'users #103',
    detail: 'Mengaktifkan akun sariintan',
    ip_address: '203.0.113.10',
  },
];

export default function AdminAuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialAction = ACTION_OPTIONS.includes(searchParams.get('action'))
    ? searchParams.get('action')
    : 'Semua';
  const initialEntity = ENTITY_OPTIONS.includes(searchParams.get('entity'))
    ? searchParams.get('entity')
    : 'Semua';
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';
  const initialSearch = (searchParams.get('search') || '').slice(0, 100);
  const initialPage = Math.max(1, Number(searchParams.get('page')) || 1);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [actionFilter, setActionFilter] = useState(initialAction);
  const [entityFilter, setEntityFilter] = useState(initialEntity);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().slice(0, 100));
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (actionFilter !== 'Semua') nextParams.set('action', actionFilter);
    if (entityFilter !== 'Semua') nextParams.set('entity', entityFilter);
    if (fromDate) nextParams.set('from', fromDate);
    if (toDate) nextParams.set('to', toDate);
    if (debouncedSearch) nextParams.set('search', debouncedSearch);
    if (currentPage > 1) nextParams.set('page', String(currentPage));

    setSearchParams(nextParams, { replace: true });
  }, [
    actionFilter,
    entityFilter,
    fromDate,
    toDate,
    debouncedSearch,
    currentPage,
    setSearchParams,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadAuditLogs = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await api.get('/api/admin/audit-logs', {
          params: { limit: 100 }
        });
        if (!isMounted) return;
        setLogs(response.data.logs || []);
      } catch (err) {
        console.error('Gagal memuat audit logs:', err);
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAuditLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      const matchAction =
        actionFilter === 'Semua' ? true : item.action === actionFilter;
      const matchEntity =
        entityFilter === 'Semua' ? true : item.entity_type === entityFilter;
      const matchFrom = !fromDate ? true : item.iso_date >= fromDate;
      const matchTo = !toDate ? true : item.iso_date <= toDate;

      const keyword = debouncedSearch.toLowerCase();
      const matchSearch =
        !keyword
          ? true
          : (item.user_name || '').toLowerCase().includes(keyword) ||
          item.ip_address.toLowerCase().includes(keyword);

      return matchAction && matchEntity && matchFrom && matchTo && matchSearch;
    });
  }, [logs, actionFilter, entityFilter, fromDate, toDate, debouncedSearch]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, safePage]);

  const startRange = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRange = Math.min(safePage * itemsPerPage, totalItems);

  const hasActiveFilter =
    actionFilter !== 'Semua' ||
    entityFilter !== 'Semua' ||
    fromDate !== '' ||
    toDate !== '' ||
    debouncedSearch !== '';

  const handleResetFilters = () => {
    setActionFilter('Semua');
    setEntityFilter('Semua');
    setFromDate('');
    setToDate('');
    setSearchInput('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  return (
    <AdminLayout pageTitle="Audit Log">
      <div>
        <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight mb-1">
          Audit Log
        </h1>
        <p className="text-sm text-[#4B5563]">
          Catatan aktivitas penting sistem.
        </p>
      </div>

      <div className="bg-[#E0F2FE] text-[#0C4A6E] rounded-lg px-4 py-3 text-[13px]">
        <strong className="font-bold">Hanya baca.</strong> Audit log bersifat append-only
        dan tidak dapat diubah atau dihapus.
      </div>

      <div className="flex flex-col min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center justify-between gap-3">
        <div className="flex flex-col min-[900px]:flex-row min-[900px]:flex-wrap items-stretch min-[900px]:items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter Aksi"
            className="w-full min-[900px]:w-45 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#4B5563] outline-none focus:border-[#0369A1] cursor-pointer"
          >
            {ACTION_OPTIONS.map((act) => (
              <option key={act} value={act}>
                {act === 'Semua' ? 'Aksi: Semua' : act}
              </option>
            ))}
          </select>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter Entitas"
            className="w-full min-[900px]:w-45 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#4B5563] outline-none focus:border-[#0369A1] cursor-pointer"
          >
            {ENTITY_OPTIONS.map((ent) => (
              <option key={ent} value={ent}>
                {ent === 'Semua' ? 'Entitas: Semua' : ent}
              </option>
            ))}
          </select>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Tanggal mulai"
              title="Dari tanggal"
              className="w-full min-[900px]:w-42.5 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#4B5563] outline-none focus:border-[#0369A1]"
            />
            <span className="hidden sm:inline text-xs text-[#4B5563]">s/d</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Tanggal akhir"
              title="Sampai tanggal"
              className="w-full min-[900px]:w-42.5 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#4B5563] outline-none focus:border-[#0369A1]"
            />
          </div>

          <input
            type="text"
            maxLength={100}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari pengguna atau IP..."
            aria-label="Cari pengguna atau IP"
            className="w-full min-[900px]:w-70 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#0369A1]"
          />
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="self-start min-[900px]:self-auto text-sm font-semibold text-[#0369A1] hover:underline cursor-pointer"
          >
            Atur ulang filter
          </button>
        )}
      </div>

      <section className="bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
              <div key={row} className="h-12.5 bg-[#E5E7EB] rounded-lg" />
            ))}
          </div>
        ) : hasError ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            Data gagal dimuat. Coba lagi.
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            Tidak ada catatan yang cocok.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-225 border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[13px] font-bold text-[#4B5563]">
                    <th className="min-w-37.5 px-3 py-2.5">Waktu (WIB)</th>
                    <th className="min-w-37.5 px-3 py-2.5">Pengguna</th>
                    <th className="min-w-40 px-3 py-2.5">Aksi</th>
                    <th className="min-w-42.5 px-3 py-2.5">Entitas</th>
                    <th className="min-w-45 px-3 py-2.5">Detail</th>
                    <th className="min-w-30 px-3 py-2.5">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => {
                    const badgeClass =
                      ACTION_BADGE_STYLES[log.action] ||
                      'bg-gray-100 text-[#1F2937]';

                    return (
                      <tr
                        key={log.id}
                        className="h-12.5 border-b border-[#F3F4F6] last:border-b-0 text-sm text-[#1F2937]"
                      >
                        <td className="px-3 py-2.5 align-middle text-[13px] text-[#4B5563] whitespace-nowrap">
                          {log.created_at_wib}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-sm text-[#1F2937]">
                          {log.user_name || '—'}
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span
                            className={`inline-block font-mono text-xs font-bold tracking-[0.4px] px-3 py-1.25 rounded-full ${badgeClass}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 align-middle font-mono text-xs font-bold text-[#1F2937] whitespace-nowrap">
                          {log.entity_label}
                        </td>

                        <td className="px-3 py-2.5 align-middle text-sm text-[#1F2937]">
                          {log.detail}
                        </td>

                        <td className="px-3 py-2.5 align-middle font-mono text-[13px] text-[#1F2937] whitespace-nowrap">
                          {log.ip_address}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] text-[#4B5563]">
                Menampilkan {startRange}–{endRange} dari{' '}
                {totalItems.toLocaleString('id-ID')} catatan
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
    </AdminLayout>
  );
}