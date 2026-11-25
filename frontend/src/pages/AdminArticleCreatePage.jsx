import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const CATEGORIES = [
  { label: 'Umum', value: 'umum' },
  { label: 'Akademik', value: 'akademik' },
  { label: 'Teknologi', value: 'teknologi' },
  { label: 'Karier', value: 'karier' },
  { label: 'Kampus', value: 'kampus' },
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function SafeMarkdownPreview({ content }) {
  if (!content.trim()) {
    return (
      <p className="text-sm text-[#4B5563] italic">
        Belum ada isi artikel untuk dipratinjau.
      </p>
    );
  }

  const lines = content.split('\n');

  return (
    <div className="space-y-3 text-[16px] leading-[1.85] text-[#1F2937] wrap-break-word">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={index} className="text-lg font-bold text-[#1F2937]">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={index} className="text-xl font-bold text-[#1F2937]">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={index} className="text-2xl font-bold text-[#1F2937]">
              {trimmed.slice(2)}
            </h1>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={index} className="flex items-start gap-2 pl-2">
              <span className="font-bold text-[#0369A1]">•</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className="border-l-4 border-[#0369A1] pl-3 text-[#4B5563] italic"
            >
              {trimmed.slice(2)}
            </blockquote>
          );
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export default function AdminArticleCreatePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('umum');
  const [coverTab, setCoverTab] = useState('upload');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [status, setStatus] = useState('published');
  const [editorTab, setEditorTab] = useState('write');
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const isDirty =
    title.trim() !== '' ||
    category !== 'umum' ||
    uploadedFile !== null ||
    imageUrlInput.trim() !== '' ||
    status !== 'published' ||
    description.trim() !== '';

  useEffect(() => {
    return () => {
      if (uploadedFile?.previewUrl) {
        URL.revokeObjectURL(uploadedFile.previewUrl);
      }
    };
  }, [uploadedFile]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleProcessFile = (file) => {
    if (!file) return;

    setErrors((prev) => ({ ...prev, image: '' }));

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: 'Format harus JPG, PNG, atau WebP',
      }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        image: 'Ukuran gambar melebihi 2 MB',
      }));
      return;
    }

    setIsUploadingImage(true);
    setUploadProgress(25);

    const timer1 = setTimeout(() => setUploadProgress(70), 150);
    const timer2 = setTimeout(() => {
      const previewUrl = URL.createObjectURL(file);
      setUploadedFile({
        rawFile: file,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        previewUrl,
      });
      setUploadProgress(100);
      setIsUploadingImage(false);
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  };

  const handleRemoveUploadedFile = () => {
    if (uploadedFile?.previewUrl) {
      URL.revokeObjectURL(uploadedFile.previewUrl);
    }
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValidHttpsUrl = (value) => {
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    const trimmedTitle = title.trim();

    if (trimmedTitle.length < 3) {
      nextErrors.title = 'Judul minimal 3 karakter';
    } else if (trimmedTitle.length > 150) {
      nextErrors.title = 'Judul maksimal 150 karakter';
    }

    if (coverTab === 'upload') {
      if (!uploadedFile) {
        nextErrors.image = 'Gambar sampul wajib diunggah';
      }
    } else {
      const trimmedUrl = imageUrlInput.trim();
      if (!trimmedUrl) {
        nextErrors.image = 'Tautan URL gambar wajib diisi';
      } else if (!isValidHttpsUrl(trimmedUrl)) {
        nextErrors.image = 'Gunakan tautan https:// yang valid';
      }
    }

    if (!description.trim()) {
      nextErrors.description = 'Isi artikel tidak boleh kosong';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      navigate('/admin/articles', {
        replace: true,
        state: {
          toast:
            status === 'published'
              ? 'Artikel diterbitkan'
              : 'Artikel disimpan sebagai arsip',
        },
      });
    } catch {
      setErrors((prev) => ({
        ...prev,
        submit: 'Gagal menyimpan artikel. Coba lagi.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      navigate('/admin/articles');
    }
  };

  const inputFocusClass =
    'focus:border-[#0369A1] focus:shadow-[0_0_0_3px_rgba(3,105,161,0.2)]';

  return (
    <AdminLayout pageTitle="Kelola Artikel">
      <div>
        <h1 className="text-[26px] font-bold text-[#1F2937] leading-tight mb-1">
          Tambah Artikel
        </h1>
        <p className="text-sm text-[#4B5563]">
          Buat artikel baru untuk portal.
        </p>
      </div>

      <div className="flex flex-col min-[1100px]:flex-row gap-5 items-stretch min-[1100px]:items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 min-w-0 bg-white rounded-[10px] p-6.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] flex flex-col gap-4.5"
        >
          {errors.submit && (
            <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] px-4 py-3 rounded-md text-sm">
              {errors.submit}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="article-title"
                className="text-sm font-semibold text-[#1F2937]"
              >
                Judul Artikel
              </label>
              <span className="text-xs text-[#4B5563]">
                {title.length}/150
              </span>
            </div>
            <input
              id="article-title"
              type="text"
              maxLength={150}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="Judul artikel..."
              className={`w-full min-h-11 px-3 bg-white border rounded-md text-[15px] text-[#1F2937] placeholder:text-[#4B5563] outline-none transition ${errors.title
                  ? 'border-[#B91C1C]'
                  : `border-[#9CA3AF] ${inputFocusClass}`
                }`}
            />
            {errors.title ? (
              <p className="text-[13px] text-[#B91C1C] mt-1">{errors.title}</p>
            ) : (
              <p className="text-xs text-[#4B5563] mt-1">
                Minimal 3, maksimal 150 karakter.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="article-category"
              className="block text-sm font-semibold text-[#1F2937] mb-1.5"
            >
              Kategori
            </label>
            <select
              id="article-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`w-full min-h-11 px-3 bg-white border border-[#9CA3AF] rounded-md text-[15px] text-[#1F2937] outline-none transition cursor-pointer ${inputFocusClass}`}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#4B5563] mt-1">
              Bawaan: Umum
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-[#1F2937]">
                Gambar Sampul
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCoverTab('upload');
                    setErrors((prev) => ({ ...prev, image: '' }));
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors cursor-pointer ${coverTab === 'upload'
                      ? 'bg-[#E0F2FE] text-[#0C4A6E]'
                      : 'bg-transparent text-[#4B5563] hover:bg-gray-100'
                    }`}
                >
                  Unggah File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverTab('url');
                    setErrors((prev) => ({ ...prev, image: '' }));
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors cursor-pointer ${coverTab === 'url'
                      ? 'bg-[#E0F2FE] text-[#0C4A6E]'
                      : 'bg-transparent text-[#4B5563] hover:bg-gray-100'
                    }`}
                >
                  Tautan URL
                </button>
              </div>
            </div>

            {coverTab === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleProcessFile(e.target.files?.[0])}
                  className="hidden"
                />

                {isUploadingImage ? (
                  <div className="h-37.5 border-2 border-dashed border-[#0369A1] rounded-[10px] bg-[#F9FAFB] px-6 flex flex-col items-center justify-center gap-2.5">
                    <span className="text-sm font-semibold text-[#0369A1]">
                      Mengunggah...
                    </span>
                    <div className="w-full max-w-65 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                      <div
                        className="h-full bg-[#0369A1] transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : uploadedFile ? (
                  <div className="border border-[#9CA3AF] rounded-[10px] bg-[#F9FAFB] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <img
                      src={uploadedFile.previewUrl}
                      alt="Pratinjau sampul"
                      className="w-50 h-28 rounded-lg object-cover shrink-0 border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1F2937] truncate">
                        {uploadedFile.name}
                      </div>
                      <div className="text-xs text-[#4B5563] mt-0.5">
                        {uploadedFile.sizeLabel}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 px-3.5 rounded-md bg-white border border-[#0369A1] text-[#0369A1] text-[13px] font-semibold hover:bg-[#E0F2FE] transition-colors cursor-pointer"
                        >
                          Ganti Gambar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveUploadedFile}
                          className="h-8 px-3.5 rounded-md bg-white border border-[#B91C1C] text-[#B91C1C] text-[13px] font-semibold hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleProcessFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`h-37.5 rounded-[10px] px-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors ${isDragging
                        ? 'border-2 border-solid border-[#0369A1] bg-[#E0F2FE]'
                        : errors.image
                          ? 'border-2 border-dashed border-[#B91C1C] bg-[#F9FAFB]'
                          : 'border-2 border-dashed border-[#9CA3AF] bg-[#F9FAFB] hover:border-[#0369A1]'
                      }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0369A1"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>

                    <div className="text-sm text-[#1F2937]">
                      Tarik gambar ke sini atau{' '}
                      <span className="font-bold text-[#0369A1]">
                        pilih dari perangkat
                      </span>
                    </div>

                    <div className="text-xs text-[#4B5563]">
                      JPG, PNG, atau WebP · maksimal 2 MB · disarankan rasio 16:9
                    </div>
                  </div>
                )}

                {errors.image ? (
                  <p className="text-[13px] text-[#B91C1C] mt-1">{errors.image}</p>
                ) : (
                  <p className="text-xs text-[#4B5563] mt-1">
                    Gambar diperiksa server sebelum disimpan.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => {
                    setImageUrlInput(e.target.value);
                    if (errors.image) setErrors((prev) => ({ ...prev, image: '' }));
                  }}
                  placeholder="https://..."
                  className={`w-full min-h-11 px-3 bg-white border rounded-md text-[15px] text-[#1F2937] placeholder:text-[#4B5563] outline-none transition ${errors.image
                      ? 'border-[#B91C1C]'
                      : `border-[#9CA3AF] ${inputFocusClass}`
                    }`}
                />
                {errors.image ? (
                  <p className="text-[13px] text-[#B91C1C] mt-1">{errors.image}</p>
                ) : (
                  <p className="text-xs text-[#4B5563] mt-1">
                    Gunakan tautan https
                  </p>
                )}

                {isValidHttpsUrl(imageUrlInput) && (
                  <div className="mt-2.5">
                    <img
                      src={imageUrlInput.trim()}
                      alt="Pratinjau tautan gambar"
                      className="w-50 h-28 rounded-lg object-cover border border-gray-200"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <span className="block text-sm font-semibold text-[#1F2937] mb-1.5">
              Status Publikasi
            </span>
            <div className="flex flex-col sm:flex-row gap-3.5">
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`flex-1 text-left rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${status === 'published'
                    ? 'border-2 border-[#0369A1] bg-[#E0F2FE] p-3.5'
                    : 'border border-[#9CA3AF] bg-white p-3.75 hover:bg-gray-50'
                  }`}
              >
                <span
                  className={`w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center shrink-0 mt-0.5 ${status === 'published'
                      ? 'border-[#0369A1]'
                      : 'border-[#9CA3AF]'
                    }`}
                >
                  {status === 'published' && (
                    <span className="w-2 h-2 rounded-full bg-[#0369A1]" />
                  )}
                </span>
                <div>
                  <div className="text-[15px] font-bold text-[#1F2937]">
                    Terbit
                  </div>
                  <div className="text-[13px] leading-normal text-[#4B5563] mt-0.5">
                    Tampil di portal untuk semua pengunjung.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus('archived')}
                className={`flex-1 text-left rounded-lg flex items-start gap-3 transition-colors cursor-pointer ${status === 'archived'
                    ? 'border-2 border-[#0369A1] bg-[#E0F2FE] p-3.5'
                    : 'border border-[#9CA3AF] bg-white p-3.75 hover:bg-gray-50'
                  }`}
              >
                <span
                  className={`w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center shrink-0 mt-0.5 ${status === 'archived'
                      ? 'border-[#0369A1]'
                      : 'border-[#9CA3AF]'
                    }`}
                >
                  {status === 'archived' && (
                    <span className="w-2 h-2 rounded-full bg-[#0369A1]" />
                  )}
                </span>
                <div>
                  <div className="text-[15px] font-bold text-[#1F2937]">
                    Arsip
                  </div>
                  <div className="text-[13px] leading-normal text-[#4B5563] mt-0.5">
                    Disembunyikan dari portal, tetap tersimpan dan bisa diterbitkan lagi.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="article-description"
                className="text-sm font-semibold text-[#1F2937]"
              >
                Isi Artikel
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditorTab('write')}
                  className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors cursor-pointer ${editorTab === 'write'
                      ? 'bg-[#E0F2FE] text-[#0C4A6E]'
                      : 'bg-transparent text-[#4B5563] hover:bg-gray-100'
                    }`}
                >
                  Tulis
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors cursor-pointer ${editorTab === 'preview'
                      ? 'bg-[#E0F2FE] text-[#0C4A6E]'
                      : 'bg-transparent text-[#4B5563] hover:bg-gray-100'
                    }`}
                >
                  Pratinjau
                </button>
              </div>
            </div>

            {editorTab === 'write' ? (
              <textarea
                id="article-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({ ...prev, description: '' }));
                  }
                }}
                placeholder="Tulis isi artikel dengan Markdown..."
                className={`w-full min-h-42.5 px-3.75 py-3 bg-white border rounded-md text-[15px] leading-[1.7] text-[#1F2937] placeholder:text-[#4B5563] outline-none resize-y transition ${errors.description
                    ? 'border-[#B91C1C]'
                    : `border-[#9CA3AF] ${inputFocusClass}`
                  }`}
              />
            ) : (
              <div className="w-full min-h-42.5 px-3.75 py-3 bg-[#F9FAFB] border border-[#9CA3AF] rounded-md">
                <SafeMarkdownPreview content={description} />
              </div>
            )}

            {errors.description ? (
              <p className="text-[13px] text-[#B91C1C] mt-1">
                {errors.description}
              </p>
            ) : (
              <p className="text-xs text-[#4B5563] mt-1">
                Mendukung Markdown. Tag HTML mentah tidak dijalankan.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11.5 px-4.5 rounded-md bg-[#0369A1] hover:bg-[#0C4A6E] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {isSubmitting
                ? 'Menyimpan...'
                : status === 'published'
                  ? 'Terbitkan Artikel'
                  : 'Simpan sebagai Arsip'}
            </button>

            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="h-11.5 px-4.5 rounded-md bg-white border border-[#9CA3AF] text-[#1F2937] text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>

        <aside className="w-full min-[1100px]:w-70 shrink-0 bg-white rounded-[10px] p-5.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <h2 className="text-base font-bold text-[#1F2937] mb-3">
            Panduan Pengisian
          </h2>
          <ul className="space-y-2.5">
            {[
              'Judul 3–150 karakter.',
              'Gambar JPG, PNG, atau WebP, maksimal 2 MB.',
              'Isi artikel ditulis dengan Markdown.',
              'Terbit tampil di portal, Arsip disembunyikan.',
              'Perubahan tercatat di Audit Log.',
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm leading-normal text-[#4B5563]"
              >
                <span className="font-extrabold text-[#0369A1]">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {showDiscardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-discard-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-105 bg-white rounded-[14px] p-7 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <h3
              id="modal-discard-title"
              className="text-xl font-bold text-[#1F2937] mb-2"
            >
              Buang perubahan?
            </h3>
            <p className="text-sm leading-[1.6] text-[#4B5563] mb-5.5">
              Isi artikel yang baru Anda tulis belum disimpan dan akan hilang jika keluar sekarang.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardModal(false)}
                className="h-10.5 px-5 rounded-lg bg-white border border-[#9CA3AF] text-sm font-semibold text-[#1F2937] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Lanjut mengedit
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/articles')}
                className="h-10.5 px-5 rounded-lg bg-[#B91C1C] hover:bg-red-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Buang
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}