import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';

const ARTICLE_CATEGORIES = ['Semua', 'Akademik', 'Teknologi', 'Karier', 'Kampus', 'Umum'];

const INITIAL_ADMIN_ARTICLES = [
  {
    id: 16,
    title: 'Tips Lolos Seleksi Magang',
    category: 'Karier',
    status: 'published',
    created_at: '18 Nov 2026',
    updated_at: '20 Nov 2026',
    image_url: '',
  },
  {
    id: 15,
    title: 'Panduan Registrasi Mata Kuliah',
    category: 'Akademik',
    status: 'published',
    created_at: '17 Nov 2026',
    updated_at: '17 Nov 2026',
    image_url: '',
  },
  {
    id: 14,
    title: 'Jadwal UTS Semester Ganjil',
    category: 'Akademik',
    status: 'archived',
    created_at: '15 Nov 2026',
    updated_at: '19 Nov 2026',
    image_url: '',
  },
  {
    id: 13,
    title: 'Pengumuman Lomba Karya Tulis',
    category: 'Kampus',
    status: 'published',
    created_at: '14 Nov 2026',
    updated_at: '14 Nov 2026',
    image_url: '',
  },
  {
    id: 12,
    title: 'Opini Kampus Mahasiswa',
    category: 'Umum',
    status: 'archived',
    created_at: '12 Nov 2026',
    updated_at: '12 Nov 2026',
    image_url: '',
  },
  {
    id: 11,
    title: 'Belajar Desain UI untuk Pemula',
    category: 'Teknologi',
    status: 'published',
    created_at: '10 Nov 2026',
    updated_at: '10 Nov 2026',
    image_url: '',
  },
  {
    id: 10,
    title: 'Cara Belajar Laravel dari Nol',
    category: 'Teknologi',
    status: 'published',
    created_at: '08 Nov 2026',
    updated_at: '09 Nov 2026',
    image_url: '',
  },
  {
    id: 9,
    title: 'Review Buku Basis Data',
    category: 'Akademik',
    status: 'published',
    created_at: '05 Nov 2026',
    updated_at: '05 Nov 2026',
    image_url: '',
  },
  {
    id: 8,
    title: 'Catatan Kuliah Jaringan Komputer',
    category: 'Akademik',
    status: 'published',
    created_at: '03 Nov 2026',
    updated_at: '03 Nov 2026',
    image_url: '',
  },
  {
    id: 7,
    title: 'Panduan Aktif di Organisasi Kampus',
    category: 'Kampus',
    status: 'published',
    created_at: '01 Nov 2026',
    updated_at: '01 Nov 2026',
    image_url: '',
  },
  {
    id: 6,
    title: 'Persiapan Wawancara Kerja Bidang IT',
    category: 'Karier',
    status: 'published',
    created_at: '29 Okt 2026',
    updated_at: '30 Okt 2026',
    image_url: '',
  },
];

function ArticleThumbnail({ imageUrl, title }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
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

export default function AdminArticlesPage() {
  const location = useLocation();

  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (location.state?.toast) {
      setToastMessage(location.state.toast);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().slice(0, 100));
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;

    const loadArticles = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await api.get('/api/admin/articles', {
          params: { limit: 100 }
        });
        if (!isMounted) return;
        setArticles(response.data.articles || []);
      } catch (err) {
        console.error('Gagal mengambil daftar artikel:', err);
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadArticles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage('');
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const counts = useMemo(() => {
    const published = articles.filter((a) => a.status === 'published').length;
    const archived = articles.filter((a) => a.status === 'archived').length;
    return {
      all: articles.length,
      published,
      archived,
    };
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      const matchStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;
      const matchCategory =
        categoryFilter === 'Semua'
          ? true
          : item.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchSearch =
        !debouncedSearch
          ? true
          : item.title.toLowerCase().includes(debouncedSearch.toLowerCase());

      return matchStatus && matchCategory && matchSearch;
    });
  }, [articles, statusFilter, categoryFilter, debouncedSearch]);

  const totalItems = filteredArticles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedArticles = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredArticles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredArticles, safePage]);

  const startRange = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRange = Math.min(safePage * itemsPerPage, totalItems);

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/articles/${deleteTarget.id}`);
      setArticles((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToastMessage('Artikel dihapus');
    } catch (err) {
      console.error('Gagal menghapus artikel:', err);
      setDeleteTarget(null);
      setHasError(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering =
    statusFilter !== 'all' || categoryFilter !== 'Semua' || debouncedSearch !== '';

  return (
    <AdminLayout pageTitle="Kelola Artikel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight mb-1">
            Kelola Artikel
          </h1>
          <p className="text-sm text-[#4B5563]">
            Terbit: tampil di portal. Arsip: disembunyikan dari portal tetapi tetap tersimpan.
          </p>
        </div>

        <Link
          to="/admin/articles/new"
          className="h-11 px-4.5 rounded-md bg-[#0369A1] hover:bg-[#0C4A6E] text-white text-sm font-semibold inline-flex items-center justify-center shrink-0 transition-colors"
        >
          + Tambah Artikel
        </Link>
      </div>

      <div className="flex flex-col min-[900px]:flex-row min-[900px]:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleStatusChange('all')}
            className={`px-4 py-1.75 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#0369A1] text-white border-[#0369A1]'
                : 'bg-white text-[#1F2937] border-[#D1D5DB] hover:bg-gray-50'
            }`}
          >
            Semua ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('published')}
            className={`px-4 py-1.75 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-[#0369A1] text-white border-[#0369A1]'
                : 'bg-white text-[#1F2937] border-[#D1D5DB] hover:bg-gray-50'
            }`}
          >
            Terbit ({counts.published})
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('archived')}
            className={`px-4 py-1.75 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
              statusFilter === 'archived'
                ? 'bg-[#0369A1] text-white border-[#0369A1]'
                : 'bg-white text-[#1F2937] border-[#D1D5DB] hover:bg-gray-50'
            }`}
          >
            Arsip ({counts.archived})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            maxLength={100}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul artikel..."
            aria-label="Cari judul artikel"
            className="w-full min-[900px]:w-65 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#0369A1]"
          />

          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            aria-label="Filter Kategori"
            className="w-full min-[900px]:w-40 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#1F2937] outline-none focus:border-[#0369A1] cursor-pointer"
          >
            {ARTICLE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Semua' ? 'Kategori: Semua' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="h-14 bg-[#E5E7EB] rounded-lg" />
            ))}
          </div>
        ) : hasError ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            Data gagal dimuat. Coba lagi.
          </div>
        ) : paginatedArticles.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3">
            <p className="text-sm text-[#4B5563]">
              {isFiltering
                ? 'Tidak ada artikel yang cocok.'
                : 'Belum ada artikel. Mulai dengan menambahkan artikel pertama.'}
            </p>
            {!isFiltering && (
              <Link
                to="/admin/articles/new"
                className="h-11 px-4.5 rounded-md bg-[#0369A1] hover:bg-[#0C4A6E] text-white text-sm font-semibold inline-flex items-center justify-center transition-colors"
              >
                + Tambah Artikel
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-215 border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[13px] font-bold text-[#4B5563]">
                    <th className="w-90 px-3 py-2.5">Artikel</th>
                    <th className="w-32.5 px-3 py-2.5">Kategori</th>
                    <th className="w-27.5 px-3 py-2.5">Status</th>
                    <th className="w-42.5 px-3 py-2.5">Tanggal Terbit</th>
                    <th className="w-40.5 px-3 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArticles.map((article) => {
                    const isPublished = article.status === 'published';
                    const isEdited =
                      article.updated_at && article.updated_at !== article.created_at;

                    return (
                      <tr
                        key={article.id}
                        className="h-16 border-b border-[#F3F4F6] last:border-b-0 text-sm text-[#1F2937]"
                      >
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-3">
                            <ArticleThumbnail
                              imageUrl={article.image_url}
                              title={article.title}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[#1F2937] line-clamp-2 leading-snug">
                                {article.title}
                              </div>
                              <div className="text-xs text-[#4B5563] mt-0.5">
                                ID {article.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span className="inline-block uppercase text-xs font-bold px-3 py-1.25 rounded-full bg-[#E0F2FE] text-[#0C4A6E]">
                            {article.category}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <span
                            className={`inline-block uppercase text-xs font-bold px-3 py-1.25 rounded-full ${
                              isPublished
                                ? 'bg-[#DCFCE7] text-[#166534]'
                                : 'bg-[#E5E7EB] text-[#374151]'
                            }`}
                          >
                            {isPublished ? 'TERBIT' : 'ARSIP'}
                          </span>
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <div className="text-sm text-[#1F2937]">
                            {article.created_at}
                          </div>
                          {isEdited && (
                            <div className="text-xs text-[#4B5563] mt-0.5">
                              Diperbarui {article.updated_at}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/admin/articles/${article.id}/edit`}
                              className="h-7.5 px-4.5 rounded-md bg-white border border-[#0369A1] text-[#0369A1] text-sm font-semibold inline-flex items-center justify-center hover:bg-[#E0F2FE] transition-colors"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(article)}
                              className="h-7.5 px-4.5 rounded-md bg-white border border-[#B91C1C] text-[#B91C1C] text-sm font-semibold inline-flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
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

            <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] text-[#4B5563]">
                Menampilkan {startRange}–{endRange} dari {totalItems} artikel, urut tanggal terbit terbaru
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
                    className={`min-w-9 h-9 px-2 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                      safePage === page
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

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-article-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-105 bg-white rounded-[14px] p-7 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <h3
              id="modal-delete-article-title"
              className="text-xl font-bold text-[#1F2937] mb-2"
            >
              Hapus artikel ini?
            </h3>
            <p className="text-sm leading-[1.6] text-[#4B5563] mb-5.5">
              Artikel dan seluruh komentarnya akan dihapus permanen. Jika hanya ingin
              menyembunyikan, ubah status menjadi Arsip.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="h-10.5 px-5 rounded-lg bg-white border border-[#9CA3AF] text-sm font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-10.5 px-5 rounded-lg bg-[#B91C1C] hover:bg-red-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-[#1F2937] text-white text-sm px-4 py-3 rounded-lg shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </AdminLayout>
  );
}