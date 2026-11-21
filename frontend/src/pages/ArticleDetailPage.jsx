import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ArticleCard from '../components/ArticleCard';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { MOCK_ARTICLES, MOCK_COMMENTS } from '../data/mockArticles';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();

  const article = useMemo(
    () => MOCK_ARTICLES.find((item) => item.slug === slug),
    [slug]
  );

  const [comments, setComments] = useState(() =>
    MOCK_COMMENTS.filter((c) => c.article_slug === slug)
  );
  const [showAllComments, setShowAllComments] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const relatedArticles = useMemo(() => {
    if (!article) return [];
    const others = MOCK_ARTICLES.filter((item) => item.id !== article.id);
    const sameCategory = others.filter((item) => item.category === article.category);
    const diffCategory = others.filter((item) => item.category !== article.category);
    return [...sameCategory, ...diffCategory].slice(0, 3);
  }, [article]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  };

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <Navbar />
        <main className="flex-1 w-full max-w-190 mx-auto px-4 md:px-0 pt-8 pb-12 flex flex-col items-center justify-center text-center">
          <div className="w-full bg-white rounded-xl p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col items-center gap-4">
            <span className="bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold px-3 py-1 rounded-full uppercase">
              404 • HALAMAN TIDAK TERSEDIA
            </span>
            <h1 className="text-[28px] font-extrabold text-[#0C4A6E]">
              Artikel tidak ditemukan
            </h1>
            <p className="text-sm text-[#4B5563] max-w-md">
              Artikel yang Anda cari mungkin telah dihapus atau tautan yang dibuka tidak valid.
            </p>
            <Link
              to="/artikel"
              className="mt-2 px-5.5 py-2.5 rounded-full bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0C4A6E] transition-colors"
            >
              ← Kembali ke artikel
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const visibleComments = showAllComments ? comments : comments.slice(0, 4);
  const initialTitleLetter = article.title.trim().charAt(0).toUpperCase();

  const handleAddComment = (e) => {
    e.preventDefault();
    const trimmed = newComment.trim().slice(0, 500);
    if (!trimmed || !user) return;

    const created = {
      id: Date.now(),
      article_slug: article.slug,
      user_id: user.id,
      author_name: user.name,
      time_ago: 'Baru saja',
      content: trimmed,
    };
    setComments([created, ...comments]);
    setNewComment('');
  };

  const handleStartEdit = (comment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
  };

  const handleSaveEdit = (id) => {
    const trimmed = editingText.trim().slice(0, 500);
    if (!trimmed) return;
    setComments(
      comments.map((item) =>
        item.id === id ? { ...item, content: trimmed, time_ago: 'Diedit baru saja' } : item
      )
    );
    setEditingId(null);
    setEditingText('');
  };

  const handleDeleteComment = (id) => {
    setComments(comments.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <main className="flex-1 w-full max-w-190 mx-auto px-4 md:px-0 pt-2 flex flex-col gap-5.5">
        <header className="flex flex-col items-start gap-3">
          <Link
            to="/artikel"
            className="text-sm font-semibold text-[#0369A1] hover:text-[#0C4A6E] transition-colors"
          >
            ← Kembali ke artikel
          </Link>

          <span className="bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold uppercase px-3 py-1.25 rounded-full">
            {article.category}
          </span>

          <h1 className="text-[28px] md:text-[36px] font-extrabold leading-tight text-[#0C4A6E]">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[#4B5563]">
            <div className="w-8 h-8 rounded-full bg-[#0C4A6E] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {getInitials(article.author_name)}
            </div>
            <span className="font-bold text-[#1F2937]">{article.author_name}</span>
            <span>•</span>
            <span>{article.published_date}</span>
            <span>•</span>
            <span>{comments.length} komentar</span>
          </div>
        </header>

        <article className="flex flex-col gap-5.5">
          <div className="w-full h-50 rounded-[14px] bg-[#BAE6FD] flex items-center justify-center select-none">
            <span className="text-[84px] font-extrabold leading-none text-[#0C4A6E]">
              {initialTitleLetter}
            </span>
          </div>

          <div className="flex flex-col gap-5.5 text-base leading-[1.85] text-[#1F2937]">
            {article.paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </article>

        <hr className="border-t border-[#D1D5DB]" />

        <section aria-label="Bagian Komentar" className="flex flex-col gap-5.5">
          <h2 className="text-[22px] font-bold text-[#1F2937]">
            Komentar ({comments.length})
          </h2>

          {!user ? (
            <div className="bg-[#E0F2FE] rounded-xl px-6.5 py-5.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start md:items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0C4A6E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#0C4A6E]">
                    Ingin ikut berdiskusi?
                  </h3>
                  <p className="text-sm text-[#4B5563] leading-normal mt-0.5">
                    Masuk atau daftar untuk menulis komentar. Anda tetap bisa membaca semua
                    komentar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to={`/login?redirect=${encodeURIComponent(`/artikel/${article.slug}`)}`}
                  className="px-5.5 py-2.5 rounded-full bg-white text-[#0C4A6E] border border-gray-400 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-5.5 py-2.5 rounded-full bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0C4A6E] transition-colors"
                >
                  Daftar
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleAddComment}
              className="bg-white rounded-[10px] p-4.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col gap-3"
            >
              <textarea
                rows={3}
                maxLength={500}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Tulis komentar Anda di sini..."
                className="w-full rounded-lg border border-gray-300 p-3 text-sm text-[#1F2937] focus:border-[#0369A1] outline-none resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#4B5563]">
                  {newComment.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-5.5 py-2 rounded-full bg-[#0369A1] text-white text-sm font-semibold hover:bg-[#0C4A6E] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Kirim Komentar
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-5.5">
            {visibleComments.map((comment) => {
              const isOwner = user && user.id === comment.user_id;

              return (
                <div
                  key={comment.id}
                  className="bg-white rounded-[10px] px-4.5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex items-start gap-3.5"
                >
                  <div className="w-9.5 h-9.5 rounded-full bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {getInitials(comment.author_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center">
                        <span className="text-sm font-bold text-[#1F2937]">
                          {comment.author_name}
                        </span>
                        {isOwner && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0C4A6E] text-[11px] font-bold">
                            Anda
                          </span>
                        )}
                        <span className="text-xs text-[#4B5563] ml-2">
                          {comment.time_ago}
                        </span>
                      </div>

                      {isOwner && editingId !== comment.id && (
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(comment)}
                            className="text-[#0369A1] hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === comment.id ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-[#1F2937] outline-none focus:border-[#0369A1]"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 rounded-full border border-gray-300 text-xs font-semibold text-[#4B5563] cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(comment.id)}
                            className="px-3.5 py-1 rounded-full bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
                          >
                            Simpan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm leading-[1.6] text-[#1F2937] wrap-break-word">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {comments.length > 4 && !showAllComments && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowAllComments(true)}
                className="text-sm font-semibold text-[#0369A1] hover:text-[#0C4A6E] transition-colors cursor-pointer"
              >
                Lihat komentar lainnya
              </button>
            </div>
          )}
        </section>

        <section aria-label="Artikel Lainnya" className="pt-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold text-[#1F2937]">Artikel Lainnya</h2>
            <Link
              to="/artikel"
              className="text-sm font-semibold text-[#0369A1] hover:text-[#0C4A6E] transition-colors"
            >
              Lihat semua
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedArticles.map((item) => (
              <ArticleCard
                key={item.id}
                article={item}
                isFeatured={false}
                compactCover={true}
              />
            ))}
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}