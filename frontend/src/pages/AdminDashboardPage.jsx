import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';

function ArticleThumbnail({ imageUrl, title }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={title}
        onError={() => setImgError(true)}
        className="w-16 h-11 rounded-md object-cover shrink-0"
      />
    );
  }

  return (
    <div className="w-16 h-11 rounded-md bg-[#BAE6FD] flex items-center justify-center shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0369A1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    total_students: 0,
    published_articles: 0,
    total_comments: 0,
    failed_logins_24h: 0,
  });
  const [articles, setArticles] = useState([]);
  const [logs, setLogs] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const res = await api.get('/api/admin/dashboard-stats');
        if (!isMounted) return;

        setStats(
          res.data?.stats || {
            total_students: 0,
            published_articles: 0,
            total_comments: 0,
            failed_logins_24h: 0,
          }
        );
        setArticles(res.data?.recent_articles || []);
        setLogs(res.data?.recent_logs || []);
      } catch {
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num ?? 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return { label: 'TERBIT', className: 'bg-[#DCFCE7] text-[#166534]' };
      case 'archived':
        return { label: 'ARSIP', className: 'bg-[#E5E7EB] text-[#374151]' };
      case 'rejected':
        return { label: 'DITOLAK', className: 'bg-[#FEE2E2] text-[#B91C1C]' };
      default:
        return {
          label: String(status || 'TERBIT').toUpperCase(),
          className: 'bg-[#E5E7EB] text-[#374151]',
        };
    }
  };

  const getLogDotColor = (action) => {
    switch (action) {
      case 'CREATE':
      case 'UPDATE':
        return 'bg-[#0369A1]';
      case 'DELETE':
      case 'LOGIN_FAILED':
        return 'bg-[#B91C1C]';
      case 'TOGGLE_USER':
      case 'TOGGLE_USER_STATUS':
        return 'bg-[#B45309]';
      case 'LOGIN_SUCCESS':
        return 'bg-[#16A34A]';
      default:
        return 'bg-[#4B5563]';
    }
  };

  const handleConfirmDeleteArticle = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/articles/${deleteTarget.id}`);

      setArticles((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      if (deleteTarget.status === 'published') {
        setStats((prev) => ({
          ...prev,
          published_articles: Math.max(0, prev.published_articles - 1),
        }));
      }
      setLogs((prev) => [
        {
          id: Date.now(),
          action: 'DELETE',
          details: `Menghapus artikel #${deleteTarget.id}`,
          time: 'Baru saja',
        },
        ...prev.slice(0, 4),
      ]);
      setDeleteTarget(null);
    } catch {
      setDeleteTarget(null);
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const statCards = [
    {
      label: 'Total Mahasiswa',
      value: formatNumber(stats.total_students),
      borderColor: 'border-t-[#0369A1]',
    },
    {
      label: 'Artikel Terbit',
      value: formatNumber(stats.published_articles),
      borderColor: 'border-t-[#0C4A6E]',
    },
    {
      label: 'Total Komentar',
      value: formatNumber(stats.total_comments),
      borderColor: 'border-t-[#0369A1]',
    },
    {
      label: 'Login Gagal (24 jam)',
      value: formatNumber(stats.failed_logins_24h),
      borderColor: 'border-t-[#B45309]',
    },
  ];

  return (
    <AdminLayout pageTitle="Dashboard">
      <div>
        <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight mb-1">
          Selamat Datang di PosTera (Admin)
        </h1>
        <p className="text-sm text-[#4B5563]">
          Ringkasan portal hari ini.
        </p>
      </div>

      <section
        aria-label="Statistik Portal"
        className="grid grid-cols-1 sm:grid-cols-2 min-[900px]:grid-cols-4 gap-5"
      >
        {isLoading
          ? [1, 2, 3, 4].map((skeleton) => (
              <div
                key={skeleton}
                className="bg-white rounded-[10px] px-5 py-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-t-4 border-t-[#E5E7EB] animate-pulse"
              >
                <div className="h-4 w-28 bg-[#E5E7EB] rounded" />
                <div className="h-7 w-20 bg-[#E5E7EB] rounded mt-2" />
              </div>
            ))
          : statCards.map((card) => (
              <div
                key={card.label}
                className={`bg-white rounded-[10px] px-5 py-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] border-t-4 ${card.borderColor}`}
              >
                <div className="text-sm text-[#4B5563]">{card.label}</div>
                <div className="text-[28px] font-bold text-[#1F2937] mt-1 leading-tight">
                  {card.value}
                </div>
              </div>
            ))}
      </section>

      <div className="flex flex-col xl:flex-row gap-5 items-stretch xl:items-start">
        <section className="flex-3 min-w-0 bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-lg font-bold text-[#1F2937]">Artikel Terbaru</h2>
            <Link
              to="/admin/articles"
              className="text-sm font-semibold text-[#0369A1] hover:underline"
            >
              Kelola artikel
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-2 animate-pulse">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-14 bg-[#E5E7EB] rounded-lg" />
              ))}
            </div>
          ) : hasError ? (
            <div className="py-8 text-center text-sm text-[#4B5563]">
              Data gagal dimuat. Coba lagi.
            </div>
          ) : articles.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#4B5563]">
              Belum ada artikel
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[13px] font-bold text-[#4B5563]">
                    <th className="px-3 py-2.5">Artikel</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Diperbarui</th>
                    <th className="px-3 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => {
                    const badge = getStatusBadge(article.status);

                    return (
                      <tr
                        key={article.id}
                        className="border-b border-[#F3F4F6] last:border-b-0 text-sm text-[#1F2937]"
                      >
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-3">
                            <ArticleThumbnail
                              imageUrl={article.image_url}
                              title={article.title}
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-[#1F2937] leading-snug">
                                {article.title}
                              </div>
                              <div className="text-xs text-[#4B5563] mt-0.5">
                                ID {article.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full uppercase text-xs font-bold px-3 py-1.25 ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 align-middle text-[#4B5563] whitespace-nowrap">
                          {article.updated_at}
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/admin/articles/${article.id}/edit`}
                              className="h-7.5 px-3 rounded-md bg-white border border-[#0369A1] text-[#0369A1] text-[13px] font-semibold inline-flex items-center justify-center hover:bg-[#E0F2FE] transition-colors"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(article)}
                              className="h-7.5 px-3 rounded-md bg-white border border-[#B91C1C] text-[#B91C1C] text-[13px] font-semibold inline-flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex-2 min-w-0 bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-lg font-bold text-[#1F2937]">Aktivitas Terbaru</h2>
            <Link
              to="/admin/audit-logs"
              className="text-sm font-semibold text-[#0369A1] hover:underline"
            >
              Audit log
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-2 animate-pulse">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="h-11 bg-[#E5E7EB] rounded-lg" />
              ))}
            </div>
          ) : hasError ? (
            <div className="py-8 text-center text-sm text-[#4B5563]">
              Data gagal dimuat. Coba lagi.
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#4B5563]">
              Belum ada aktivitas
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {logs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 first:pt-1.5 last:pb-0.5 flex items-start gap-3"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.25 ${getLogDotColor(
                      log.action
                    )}`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs font-bold text-[#1F2937]">
                      {log.action}
                    </div>
                    <p className="text-[13px] text-[#4B5563] leading-[1.45] wrap-break-word">
                      {log.details}
                    </p>
                  </div>

                  <span className="text-xs text-[#4B5563] whitespace-nowrap shrink-0">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-article-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-105 bg-white rounded-[14px] p-7 shadow-xl">
            <h3
              id="modal-delete-article-title"
              className="text-xl font-bold text-[#1F2937]"
            >
              Hapus artikel ini?
            </h3>
            <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">
              Artikel <span className="font-semibold text-[#1F2937]">"{deleteTarget.title}"</span> akan
              dihapus secara permanen beserta komentar di dalamnya.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="h-10.5 px-5 rounded-lg border border-[#9CA3AF] bg-white text-sm font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteArticle}
                disabled={isDeleting}
                className="h-10.5 px-5 rounded-lg bg-[#B91C1C] hover:bg-red-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}