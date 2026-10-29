import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Clock,
  Layers,
  ArrowRight,
  BookMarked,
  Trash2,
  FileText
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { Button } from "../components/common/Button";
import { ProgressBar } from "../components/common/ProgressBar";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { storageService } from "../services/storageService";
import { useToast } from "../context/ToastContext";
import { api, resolveBackendUrl } from "../services/api";

export const MyTextbooks = () => {
  const { textbooks, summaries, refreshLearningData } = useLearning();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredTextbooks = textbooks.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.subject?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "All" || book.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const findMatchingSummary = (book) => {
    if (!book || !summaries) return null;
    return (
      summaries.find(
        (s) =>
          (s.bookId && s.bookId === book.id) ||
          (s.book_id && s.book_id === book.id) ||
          (s.textbookId && s.textbookId === book.id) ||
          (s.bookTitle && book.title && s.bookTitle.toLowerCase() === book.title.toLowerCase())
      ) || null
    );
  };

  const handleContinueLearning = (e, book) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const matchingSummary = findMatchingSummary(book);
    if (matchingSummary && matchingSummary.id) {
      navigate(`/summaries/${matchingSummary.id}`);
    } else {
      navigate("/summaries");
    }
  };

  const handleOpenPdf = async (e, book) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (!book) {
      showError("Textbook details not found.");
      return;
    }

    // 1. Immediately pre-open new tab synchronously to satisfy popup blockers
    let preOpenedTab = null;
    try {
      preOpenedTab = window.open("", "_blank");
      if (preOpenedTab) {
        preOpenedTab.document.write(
          "<!DOCTYPE html><html><head><title>Loading PDF...</title><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;'><div style='text-align:center;'><div style='width:36px;height:36px;border:3px solid #334155;border-top-color:#38bdf8;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;'></div><p style='font-size:15px;font-weight:500;margin:0;'>Opening textbook PDF...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></body></html>"
        );
      }
    } catch {}

    try {
      // 2. Fetch the PDF as a Blob so the browser's built-in PDF viewer renders it inline without downloading
      const pdfBlob = await api.getBookPdfBlob(book);
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (preOpenedTab && !preOpenedTab.closed) {
        preOpenedTab.location.href = blobUrl;
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      }

      // Safe Blob URL lifecycle management:
      // Allow browser tab's native PDF reader 60 seconds to parse and ingest the blob before revoking memory
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 60000);
    } catch (blobErr) {
      // 3. Fallback: Direct navigation if blob fetch was not successful
      let rawUrl = book.fileUrl || book.file_url || book.pdfUrl || book.pdf_url;
      if (!rawUrl && book.fileName) {
        rawUrl = `/uploads/${book.fileName}`;
      }

      if (rawUrl && typeof rawUrl === "string" && rawUrl.trim()) {
        const targetUrl = resolveBackendUrl(rawUrl);
        if (targetUrl) {
          if (preOpenedTab && !preOpenedTab.closed) {
            preOpenedTab.location.href = targetUrl;
          } else {
            window.open(targetUrl, "_blank", "noopener,noreferrer");
          }
          return;
        }
      }

      if (preOpenedTab && !preOpenedTab.closed) {
        preOpenedTab.close();
      }
      showError(`Original PDF is not available for "${book.title}".`);
    }
  };

  const handleDelete = async (e, bookId, bookTitle) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove "${bookTitle}"?`)) {
      return;
    }
    try {
      await api.deleteTextbook(bookId);
      storageService.deleteTextbook(bookId);
      await refreshLearningData();
      showSuccess(`"${bookTitle}" removed from library.`);
    } catch (err) {
      showError(err.message || `Failed to delete "${bookTitle}".`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Textbooks
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your ingested curriculum, detected chapters, and reading progress.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => navigate("/upload")}
        >
          Upload New Textbook
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, subject or author..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["All", "In Progress", "Completed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterStatus === status
                  ? "bg-brand-600 text-white shadow-soft-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      {filteredTextbooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTextbooks.map((book) => (
            <div
              key={book.id}
              onClick={(e) => handleOpenPdf(e, book)}
              className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-soft-sm hover:shadow-soft-lg hover:border-brand-300 transition-all duration-200 flex flex-col justify-between cursor-pointer"
              title={`Click to open original PDF for ${book.title}`}
            >
              <div>
                {/* Book Cover Image */}
                <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                  <img
                    src={book.coverUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80"}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3.5 left-3.5">
                    <Badge
                      variant={book.status === "Completed" ? "success" : "brand"}
                      size="sm"
                    >
                      {book.status}
                    </Badge>
                  </div>

                  {/* Delete Action */}
                  <button
                    onClick={(e) => handleDelete(e, book.id, book.title)}
                    className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-slate-900/60 hover:bg-rose-600 text-white backdrop-blur-md transition-colors"
                    title="Delete Textbook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Subject Tag */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                      {book.subject}
                    </span>
                    <h3 className="text-base font-extrabold text-white leading-tight line-clamp-1">
                      {book.title}
                    </h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {book.chaptersCount || 4} Chapters
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {book.lastStudied || "Recently"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <ProgressBar
                    value={book.progress || 0}
                    size="sm"
                    color={book.progress >= 80 ? "emerald" : "brand"}
                    label="Overall Mastery"
                  />

                  {/* Detected Topics Tags */}
                  {book.topics && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Key Topics:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {book.topics.slice(0, 3).map((top) => (
                          <span
                            key={top.id}
                            className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                          >
                            {top.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-5 pt-0 flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  icon={FileText}
                  onClick={(e) => handleOpenPdf(e, book)}
                  className="flex-1 font-semibold text-slate-700 hover:text-brand-700 hover:border-brand-300 transition-colors"
                  title="Open original textbook PDF"
                >
                  Open PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={(e) => handleContinueLearning(e, book)}
                  className="flex-1 font-semibold group-hover:bg-brand-600 group-hover:text-white transition-colors"
                  title="Continue textbook summary and quizzes"
                >
                  Continue Learning
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No textbooks yet"
          description="Upload your first textbook or lecture notes PDF to start generating multilingual summaries and quizzes."
          actionText="Upload Textbook"
          onAction={() => navigate("/upload")}
        />
      )}
    </div>
  );
};
