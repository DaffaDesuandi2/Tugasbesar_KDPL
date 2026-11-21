import { Link } from 'react-router-dom';

const COVER_VARIANTS = [
  { bg: 'bg-[#BAE6FD]', text: 'text-[#0C4A6E]' }, // id % 4 === 0
  { bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]' }, // id % 4 === 1
  { bg: 'bg-[#0369A1]', text: 'text-[#E0F2FE]' }, // id % 4 === 2
  { bg: 'bg-[#0C4A6E]', text: 'text-[#BAE6FD]' }, // id % 4 === 3
];

export default function ArticleCard({
  article,
  isFeatured = false,
  compactCover = false,
}) {
  const variant = COVER_VARIANTS[article.id % 4];
  const initialLetter = article.title ? article.title.trim().charAt(0).toUpperCase() : 'P';

  return (
    <Link
      to={`/artikel/${article.slug}`}
      className={`group block rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_6px_18px_rgba(0,0,0,0.12)] ${
        isFeatured ? 'bg-[#0C4A6E]' : 'bg-white'
      }`}
    >
      <div
        className={`relative rounded-lg flex items-center justify-center select-none ${
          compactCover ? 'h-27.5' : 'h-37.5'
        } ${variant.bg}`}
      >
        <span className="absolute top-2.5 left-2.5 bg-white text-[#0C4A6E] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
          {article.category}
        </span>

        <span
          className={`font-bold leading-none ${
            compactCover ? 'text-[36px]' : 'text-[44px]'
          } ${variant.text}`}
        >
          {initialLetter}
        </span>
      </div>

      <div className="px-1 pb-1">
        <h2
          className={`mt-3.5 text-base font-bold leading-[1.35] line-clamp-1 ${
            isFeatured ? 'text-white' : 'text-[#1F2937]'
          }`}
        >
          {article.title}
        </h2>

        <p
          className={`mt-1.5 text-[13px] leading-normal line-clamp-2 min-h-9.75 ${
            isFeatured ? 'text-[#E0F2FE]' : 'text-[#4B5563]'
          }`}
        >
          {article.excerpt}
        </p>

        <div
          className={`mt-2.5 text-xs flex items-center gap-1.5 ${
            isFeatured ? 'text-[#BAE6FD]' : 'text-[#4B5563]'
          }`}
        >
          <span>{article.author_name || 'Admin PosTera'}</span>
          <span>•</span>
          <span>{article.published_date}</span>
          <span>•</span>
          <span>{article.comments_count} komentar</span>
        </div>
      </div>
    </Link>
  );
}