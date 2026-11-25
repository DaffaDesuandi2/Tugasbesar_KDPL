import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../api/axios';

const INITIAL_COMMENTS = [
  {
    id: 404,
    content: '<script>alert(1)</script>',
    author_name: 'fajarnur',
    article_id: 16,
    article_title: 'Tips Lolos Seleksi Magang bagi Mahasiswa',
    created_date: '21 Nov 2026',
    created_time: '10:20',
    is_edited: false,
  },
  {
    id: 403,
    content: 'Artikel ini kurang bermanfaat, jangan baca.',
    author_name: 'budisantoso',
    article_id: 14,
    article_title: 'Jadwal UTS Semester Ganjil',
    created_date: '21 Nov 2026',
    created_time: '09:48',
    is_edited: false,
  },
  {
    id: 402,
    content: 'Terima kasih tipsnya, sangat membantu!',
    author_name: 'dinaputri',
    article_id: 16,
    article_title: 'Tips Lolos Seleksi Magang bagi Mahasiswa',
    created_date: '21 Nov 2026',
    created_time: '09:15',
    is_edited: true,
  },
  {
    id: 401,
    content: 'Ada referensi lanjutan untuk bab jaringan?',
    author_name: 'sariintan',
    article_id: 13,
    article_title: 'Pengumuman Lomba Karya Tulis',
    created_date: '20 Nov 2026',
    created_time: '16:40',
    is_edited: false,
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

export default function AdminCommentsPage() {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim().slice(0, 100));
      setCurrentPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;

    const loadComments = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await api.get('/api/admin/comments', {
          params: { limit: 100 }
        });
        if (!isMounted) return;
        setComments(response.data.comments || []);
      } catch (err) {
        console.error('Gagal memuat komentar admin:', err);
        if (isMounted) setHasError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadComments();
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

  const filteredComments = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase();
    if (!keyword) return comments;

    return comments.filter(
      (item) =>
        item.content.toLowerCase().includes(keyword) ||
        item.author_name.toLowerCase().includes(keyword)
    );
  }, [comments, debouncedSearch]);

  const totalItems = filteredComments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedComments = useMemo(() => {
    const startIndex = (safePage - 1) * itemsPerPage;
    return filteredComments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredComments, safePage]);

  const startRange = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endRange = Math.min(safePage * itemsPerPage, totalItems);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/comments/${deleteTarget.id}`);

      setComments((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({
        message: 'Komentar dihapus',
        variant: 'default',
      });
    } catch (err) {
      console.error('Gagal menghapus komentar:', err);
      setDeleteTarget(null);
      setToast({
        message: 'Gagal menghapus komentar. Coba lagi.',
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isSearching = debouncedSearch !== '';

  return (
    <AdminLayout pageTitle="Moderasi Komentar">
      <div>
        <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight mb-1">
          Moderasi Komentar
        </h1>
        <p className="text-sm text-[#4B5563]">
          Hapus komentar yang melanggar aturan. Isi komentar tidak dapat diedit oleh Admin.
        </p>
      </div>

      <div className="flex flex-col min-[900px]:flex-row min-[900px]:items-center justify-between gap-2.5">
        <input
          type="text"
          maxLength={100}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari isi komentar atau penulis..."
          aria-label="Cari isi komentar atau penulis"
          className="w-full min-[900px]:w-85 h-10.5 px-3 bg-white border border-[#9CA3AF] rounded-md text-sm text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#0369A1]"
        />

        <p className="text-[13px] text-[#4B5563]">
          Komentar tampil sebagai teks biasa
        </p>
      </div>

      <section className="bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-15.5 bg-[#E5E7EB] rounded-lg" />
            ))}
          </div>
        ) : hasError ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            Data gagal dimuat. Coba lagi.
          </div>
        ) : paginatedComments.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#4B5563]">
            {isSearching ? 'Tidak ada komentar yang cocok.' : 'Belum ada komentar.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-left text-[13px] font-bold text-[#4B5563]">
                    <th className="w-85 px-3 py-2.5">Komentar</th>
                    <th className="w-42.5 px-3 py-2.5">Penulis</th>
                    <th className="w-52.5 px-3 py-2.5">Artikel</th>
                    <th className="w-30 px-3 py-2.5">Dibuat</th>
                    <th className="w-23 px-3 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComments.map((comment) => (
                    <tr
                      key={comment.id}
                      className="min-h-15.5 border-b border-[#F3F4F6] last:border-b-0 text-sm text-[#1F2937]"
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <div className="max-w-79 flex flex-wrap items-center gap-2">
                          <span className="text-sm leading-normal text-[#1F2937] line-clamp-3 wrap-break-word">
                            {comment.content}
                          </span>
                          {comment.is_edited && (
                            <span className="inline-block uppercase px-3 py-1.25 rounded-full bg-[#F3F4F6] text-[#374151] text-xs font-bold shrink-0">
                              DIEDIT
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7.5 h-7.5 rounded-full bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(comment.author_name)}
                          </span>
                          <span className="text-sm font-bold text-[#1F2937] truncate">
                            {comment.author_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <Link
                          to={`/artikel/${comment.article_id}`}
                          className="text-sm font-semibold text-[#0369A1] hover:underline line-clamp-2 leading-snug"
                        >
                          {comment.article_title}
                        </Link>
                        <div className="text-xs text-[#4B5563] mt-0.5">
                          ID {comment.article_id}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                        <div className="text-sm text-[#1F2937]">
                          {comment.created_date}
                        </div>
                        <div className="text-xs text-[#4B5563] mt-0.5">
                          {comment.created_time}
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(comment)}
                          className="h-7.5 px-4.5 rounded-md bg-white border border-[#B91C1C] text-[#B91C1C] text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[13px] text-[#4B5563]">
                Menampilkan {startRange}–{endRange} dari{' '}
                {totalItems.toLocaleString('id-ID')} komentar, urut terbaru
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
          aria-labelledby="modal-delete-comment-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-105 bg-white rounded-[14px] p-7 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <h3
              id="modal-delete-comment-title"
              className="text-xl font-bold text-[#1F2937] mb-2"
            >
              Hapus komentar ini?
            </h3>
            <p className="text-sm leading-[1.6] text-[#4B5563] mb-5.5">
              Komentar dari {deleteTarget.author_name} akan dihapus permanen dan tidak
              dapat dikembalikan. Tindakan ini dicatat di Audit Log.
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
                className="h-10.5 px-5 rounded-lg bg-[#B91C1C] hover:bg-red-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 text-white text-sm px-4 py-3 rounded-lg shadow-lg ${
            toast.variant === 'error' ? 'bg-[#B91C1C]' : 'bg-[#1F2937]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </AdminLayout>
  );
}