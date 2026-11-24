import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';
import Footer from '../components/Footer';
import api from '../api/axios';

const CATEGORIES = ['Semua', 'Akademik', 'Kemahasiswaan', 'Beasiswa', 'Kompetisi', 'Pengumuman'];

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  const queryCategory = searchParams.get('category') || 'Semua';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [searchInput, setSearchInput] = useState(querySearch);
  const [articles, setArticles] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setSearchInput(querySearch);
  }, [querySearch]);

  useEffect(() => {
    let isMounted = true;

    const fetchArticles = async () => {
      setLoading(true);
      setErrorMsg('');

      try {
        const params = {
          page: currentPage,
          limit: 9,
        };
        if (querySearch.trim()) {
          params.search = querySearch.trim();
        }
        if (queryCategory && queryCategory !== 'Semua') {
          params.category = queryCategory.toLowerCase();
        }

        const res = await api.get('/api/articles', { params });
        if (!isMounted) return;

        setArticles(Array.isArray(res.data?.articles) ? res.data.articles : []);
        setTotalPages(Math.max(1, res.data?.totalPages || 1));
      } catch (err) {
        if (!isMounted) return;
        setArticles([]);
        setTotalPages(1);
        setErrorMsg(err.message || 'Gagal memuat daftar artikel.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchArticles();

    return () => {
      isMounted = false;
    };
  }, [querySearch, queryCategory, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim().slice(0, 100);
    const nextParams = new URLSearchParams(searchParams);
    if (trimmed) {
      nextParams.set('search', trimmed);
    } else {
      nextParams.delete('search');
    }
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const handleCategoryChange = (category) => {
    const nextParams = new URLSearchParams(searchParams);
    if (category === 'Semua') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', category);
    }
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  const handlePageChange = (page) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', String(page));
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />

      <main className="flex-1 w-full max-w-300 mx-auto px-5 sm:px-8 lg:px-14 flex flex-col gap-6.5">
        <section className="pt-4.5 pb-1 flex flex-col items-center text-center gap-3.5">
          <span className="bg-[#E0F2FE] text-[#0C4A6E] text-xs font-bold tracking-[0.4px] px-3 py-1.25 rounded-full uppercase">
            KATALOG PUBLIKASI
          </span>

          <h1 className="text-[30px] sm:text-[38px] font-extrabold leading-[1.15] text-[#0C4A6E]">
            Semua Artikel
          </h1>

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
              const isActive = queryCategory.toLowerCase() === category.toLowerCase();
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryChange(category)}
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

        <section>
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
          ) : errorMsg ? (
            <div className="max-w-md mx-auto bg-white rounded-xl p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[15px] font-semibold text-red-600">{errorMsg}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="max-w-md mx-auto bg-white rounded-xl p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              <p className="text-[15px] font-semibold text-[#1F2937]">
                Tidak ada artikel yang cocok. Coba kata kunci lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isFeatured={
                    currentPage === 1 &&
                    index === 0 &&
                    !querySearch &&
                    queryCategory === 'Semua'
                  }
                />
              ))}
            </div>
          )}
        </section>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <Footer />
      </main>
    </div>
  );
}