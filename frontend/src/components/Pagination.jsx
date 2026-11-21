export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage, '...', totalPages];
  };

  return (
    <nav aria-label="Navigasi Halaman" className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Halaman Sebelumnya"
        className={`min-w-9 h-9 px-2.5 rounded-full text-sm font-semibold flex items-center justify-center transition-colors ${
          currentPage === 1
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#0C4A6E] text-white hover:bg-[#0369A1]'
        }`}
      >
        ‹
      </button>

      {getPages().map((item, idx) =>
        item === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="min-w-9 h-9 rounded-full bg-white border border-gray-300 text-[#1F2937] text-sm font-semibold flex items-center justify-center select-none"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`min-w-9 h-9 px-2.5 rounded-full text-sm font-semibold flex items-center justify-center transition-colors ${
              currentPage === item
                ? 'bg-[#0C4A6E] text-white'
                : 'bg-white border border-gray-300 text-[#1F2937] hover:border-[#0369A1]'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Halaman Berikutnya"
        className={`min-w-9 h-9 px-2.5 rounded-full text-sm font-semibold flex items-center justify-center transition-colors ${
          currentPage === totalPages
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-white border border-gray-300 text-[#1F2937] hover:border-[#0369A1]'
        }`}
      >
        ›
      </button>
    </nav>
  );
}