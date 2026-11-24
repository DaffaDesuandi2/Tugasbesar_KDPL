import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ArticleCard from '../components/ArticleCard';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

function formatRelativeOrDate(dateString) {
  if (!dateString) return 'Baru saja';
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;

  const diffMs = Date.now() - parsed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Kemarin';

  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function UserDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [myComments, setMyComments] = useState([]);
  const [totalCommentsCount, setTotalCommentsCount] = useState(0);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [showAllComments, setShowAllComments] = useState(false);

  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUserComments = async () => {
      setIsLoadingComments(true);
      try {
        const res = await api.get('/articles/user/my-comments');
        if (!isMounted) return;

        const rawComments = res.data?.data || res.data || [];
        const normalizedComments = Array.isArray(rawComments)
          ? rawComments.map((item) => ({
              id: item.id,
              article_id: item.article_id,
              article_slug: item.article_slug || item.slug || String(item.article_id),
              article_title: item.article_title || item.title || 'Artikel',
              content: item.content,
              time_ago: item.is_edited
                ? `Diedit • ${formatRelativeOrDate(item.updated_at || item.created_at)}`
                : formatRelativeOrDate(item.created_at),
            }))
          : [];

        setMyComments(normalizedComments);
        setTotalCommentsCount(normalizedComments.length);
      } catch (err) {
        if (!isMounted) return;
        if (err.response?.status === 401) {
          await logout();
          navigate('/login', { replace: true });
        }
      } finally {
        if (isMounted) setIsLoadingComments(false);
      }
    };

    const loadRecommendedArticles = async () => {
      setIsLoadingArticles(true);
      try {
        const res = await api.get('/articles', { params: { limit: 3 } });
        if (!isMounted) return;

        const rawArticles = res.data?.data || res.data || [];
        const normalizedArticles = Array.isArray(rawArticles)
          ? rawArticles.slice(0, 3).map((item) => ({
              ...item,
              slug: item.slug || String(item.id),
              category: item.category || 'Umum',
              image_url: item.image_url || item.thumbnail || '',
              excerpt: item.excerpt || item.content?.slice(0, 140) || '',
              author_name: item.author_name || item.author || 'Admin PosTera',
              published_at: item.published_at || item.created_at,
            }))
          : [];

        setRecommendedArticles(normalizedArticles);
      } catch {
        if (isMounted) setRecommendedArticles([]);
      } finally {
        if (isMounted) setIsLoadingArticles(false);
      }
    };

    loadUserComments();
    loadRecommendedArticles();

    return () => {
      isMounted = false;
    };
  }, [logout, navigate]);

  const formatJoinDate = (createdAt) => {
    if (!createdAt) return '-';
    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return createdAt;
    return parsed.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStartEdit = (comment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (commentId) => {
    const trimmed = editingText.trim().slice(0, 500);
    if (!trimmed) return;

    setIsSavingEdit(true);
    try {
      await api.put(`/articles/comments/${commentId}`, { content: trimmed });

      setMyComments((prev) =>
        prev.map((item) =>
          item.id === commentId
            ? { ...item, content: trimmed, time_ago: 'Diedit baru saja' }
            : item
        )
      );
      setEditingId(null);
      setEditingText('');
    } catch (err) {
      if (err.response?.status === 401) {
        await logout();
        navigate('/login', { replace: true });
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      await api.delete(`/articles/comments/${deleteTargetId}`);

      setMyComments((prev) => prev.filter((item) => item.id !== deleteTargetId));
      setTotalCommentsCount((prev) => Math.max(0, prev - 1));
      setDeleteTargetId(null);
    } catch (err) {
      if (err.response?.status === 401) {
        await logout();
        navigate('/login', { replace: true });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedComments = showAllComments ? myComments : myComments.slice(0, 5);
  const displayName = user?.name || 'Mahasiswa';
  const joinDateText = formatJoinDate(user?.created_at);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <main className="flex-1 w-full max-w-300 mx-auto px-4 sm:px-8 lg:px-14 pt-2 flex flex-col gap-6.5">
        <section className="bg-[#0C4A6E] rounded-2xl px-6 py-6.5 sm:px-9 sm:py-7.5 text-white flex flex-col min-[900px]:flex-row min-[900px]:items-center justify-between gap-6">
          <div className="flex flex-col items-start">
            <span className="bg-[#DCFCE7] text-[#166534] text-xs font-bold px-3 py-1.25 rounded-full uppercase mb-3">
              AKUN AKTIF
            </span>

            <h1 className="text-[24px] sm:text-[30px] font-extrabold leading-tight mb-1.5">
              Halo, {displayName}
            </h1>

            <p className="text-[15px] text-[#E0F2FE] mb-4.5">
              Baca artikel terbaru dan ikuti diskusi di kolom komentar.
            </p>

            <Link
              to="/artikel"
              className="bg-white text-[#0C4A6E] px-5.5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#E0F2FE] transition-colors"
            >
              Jelajahi Artikel
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-4 shrink-0">
            <div className="bg-white/14 rounded-xl px-6.5 py-4.5 text-center min-w-34">
              <div className="text-[24px] sm:text-[28px] font-extrabold leading-tight">
                {totalCommentsCount}
              </div>
              <div className="text-[13px] text-[#E0F2FE] mt-1">
                Komentar Saya
              </div>
            </div>

            <div className="bg-white/14 rounded-xl px-6.5 py-4.5 text-center min-w-40">
              <div className="text-[22px] sm:text-[28px] font-extrabold leading-tight">
                {joinDateText}
              </div>
              <div className="text-[13px] text-[#E0F2FE] mt-1">
                Bergabung
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-lg font-bold text-[#1F2937]">Komentar Saya</h2>
            {myComments.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllComments((prev) => !prev)}
                className="text-sm font-semibold text-[#0369A1] hover:underline cursor-pointer"
              >
                {showAllComments ? 'Tampilkan ringkas' : 'Lihat semua'}
              </button>
            )}
          </div>

          {isLoadingComments ? (
            <div className="divide-y divide-[#F3F4F6]">
              {[1, 2, 3].map((skeleton) => (
                <div key={skeleton} className="py-3.5 flex justify-between gap-4 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-[#E5E7EB] rounded" />
                    <div className="h-4 w-3/4 bg-[#E5E7EB] rounded" />
                    <div className="h-3 w-20 bg-[#E5E7EB] rounded" />
                  </div>
                  <div className="h-4 w-20 bg-[#E5E7EB] rounded" />
                </div>
              ))}
            </div>
          ) : displayedComments.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-[#4B5563]">
                Anda belum menulis komentar. Mulai berdiskusi di artikel pilihan Anda.
              </p>
              <Link
                to="/artikel"
                className="px-5.5 py-2.5 rounded-full bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0C4A6E] transition-colors"
              >
                Jelajahi Artikel
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6]">
              {displayedComments.map((comment) => {
                const isEditing = editingId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="py-3.5 first:pt-2 last:pb-1 flex flex-col min-[900px]:flex-row min-[900px]:items-start justify-between gap-3 min-[900px]:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/artikel/${comment.article_slug}`}
                        className="text-sm font-bold text-[#0C4A6E] hover:underline"
                      >
                        {comment.article_title}
                      </Link>

                      {isEditing ? (
                        <div className="mt-2 flex flex-col gap-2.5">
                          <textarea
                            maxLength={500}
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full min-h-20 border border-[#9CA3AF] rounded-lg p-3 text-sm text-[#1F2937] outline-none focus:border-[#0369A1]"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] text-[#4B5563]">
                              {editingText.length}/500
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isSavingEdit}
                                className="h-8.5 px-4 rounded-md border border-[#9CA3AF] bg-white text-[13px] font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(comment.id)}
                                disabled={isSavingEdit || !editingText.trim()}
                                className="h-8.5 px-4 rounded-md bg-[#0369A1] hover:bg-[#0C4A6E] disabled:opacity-50 text-white text-[13px] font-semibold transition-colors cursor-pointer"
                              >
                                {isSavingEdit ? 'Menyimpan...' : 'Simpan'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm leading-normal text-[#1F2937] wrap-break-word">
                            {comment.content}
                          </p>
                          <p className="mt-1 text-xs text-[#4B5563]">
                            {comment.time_ago}
                          </p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-3.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comment)}
                          className="text-[13px] font-semibold text-[#0369A1] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(comment.id)}
                          className="text-[13px] font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="Artikel untuk Dibaca" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold text-[#1F2937]">
              Artikel untuk Dibaca
            </h2>
            <Link
              to="/artikel"
              className="text-sm font-semibold text-[#0369A1] hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          {isLoadingArticles ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-64 bg-white rounded-[10px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] animate-pulse"
                />
              ))}
            </div>
          ) : recommendedArticles.length === 0 ? (
            <div className="bg-white rounded-[10px] p-8 text-center text-sm text-[#4B5563] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              Belum ada artikel yang tersedia saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {recommendedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isFeatured={false}
                  compactCover={true}
                />
              ))}
            </div>
          )}
        </section>

        <Footer />
      </main>

      {deleteTargetId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-105 bg-white rounded-[14px] p-7 shadow-xl">
            <h3
              id="modal-delete-title"
              className="text-xl font-bold text-[#1F2937]"
            >
              Hapus komentar ini?
            </h3>
            <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">
              Komentar yang sudah dihapus tidak dapat dikembalikan lagi.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                disabled={isDeleting}
                className="h-10.5 px-5 rounded-lg border border-[#9CA3AF] bg-white text-sm font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer"
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
    </div>
  );
}