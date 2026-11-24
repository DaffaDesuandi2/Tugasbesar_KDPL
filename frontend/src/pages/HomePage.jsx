import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ArticleCard from '../components/ArticleCard';
import Footer from '../components/Footer';
import api from '../api/axios';

const CATEGORIES = ['Semua', 'Akademik', 'Kemahasiswaan', 'Beasiswa', 'Kompetisi', 'Pengumuman'];

export default function HomePage() {
  const [searchInput, setSearchInput] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchLatestArticles = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/articles', {
          params: { page: 1, limit: 6 },
        });
        if (!isMounted) return;
        setArticles(Array.isArray(res.data?.articles) ? res.data.articles : []);
      } catch {
        if (isMounted) setArticles([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLatestArticles();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim().slice(0, 100);
    if (trimmed) {
      navigate(`/artikel?search=${encodeURIComponent(trimmed)}&page=1`);
    } else {
      navigate('/artikel');
    }
  };

  const handleCategoryClick = (category) => {
    if (category === 'Semua') {
      navigate('/artikel');
    } else {
      navigate(`/artikel?category=${encodeURIComponent(category)}&page=1`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <main className="flex-1 w-full max-w-300 mx-auto px-5 sm:px-8 lg:px-14 flex flex-col gap-6.5">
        <section className="pt-4.5 pb-1 flex flex-col items-center text-center gap-3.5">
          <span className="bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold tracking-[0.4px] px-3 py-1.25 rounded-full uppercase">
            PORTAL ARTIKEL KAMPUS
          </span>

          <h1 className="text-[32px] sm:text-[46px] font-extrabold leading-[1.1] text-[#0C4A6E]">
            Artikel Terbaru
          </h1>

          <p className="text-base leading-[1.6] text-[#4B5563] max-w-140">
            Informasi akademik dan kemahasiswaan terkini dari kampus, dibaca dan didiskusikan
            bersama.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-140 h-13.5 bg-white border border-gray-300 rounded-full pl-5.5 pr-1.25 flex items-center shadow-[0_1px_6px_rgba(0,0,0,0.05)] focus-within:border-[#0369A1] transition-colors"
          >
            <input
              type="text"
              maxLength={100}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari judul atau isi artikel..."
              aria-label="Cari judul atau isi artikel"
              className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1F2937] placeholder:text-[#4B5563]"
            />
            <button
              type="submit"
              className="px-5.5 py-2.5 rounded-full bg-sky-700 hover:bg-[#0C4A6E] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Cari
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            {CATEGORIES.map((category) => {
              const isActive = category === 'Semua';
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  className={`px-4 py-1.75 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#0369A1] text-white border border-[#0369A1]'
                      : 'bg-white text-[#1F2937] border border-gray-300 hover:border-[#0369A1]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Daftar Artikel Terbaru">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-3 shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col gap-3"
                >
                  <div className="h-37.5 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="max-w-md mx-auto bg-white rounded-xl p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[15px] font-semibold text-[#1F2937]">
                Belum ada artikel yang dipublikasikan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isFeatured={index === 0}
                />
              ))}
            </div>
          )}

          <div className="mt-7 flex justify-center">
            <Link
              to="/artikel"
              className="px-6 py-2.5 rounded-full bg-white text-[#0C4A6E] border border-gray-300 hover:border-[#0369A1] hover:bg-sky-50 text-sm font-semibold shadow-xs transition-colors"
            >
              Lihat Semua Artikel →
            </Link>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}