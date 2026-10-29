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

    // 1. Locate genuine PDF file URL or fileName from book record
    let rawUrl = book.fileUrl || book.file_url || book.pdfUrl || book.pdf_url;
    if (!rawUrl && book.fileName) {
      rawUrl = `/uploads/${book.fileName}`;
    }

    // 2. If not stored locally on client, check backend server record
    if (!rawUrl && book.id) {
      try {
        const serverBook = await api.getBookById(book.id);
        if (serverBook) {
          rawUrl = serverBook.fileUrl || serverBook.file_url || serverBook.pdfUrl || serverBook.pdf_url;
          if (!rawUrl && serverBook.fileName) {
            rawUrl = `/uploads/${serverBook.fileName}`;
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve book metadata from server:", err);
      }
    }

    // 3. Gracefully notify if original PDF is genuinely not available
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      showError(`Original PDF is not available for "${book.title}".`);
      return;
    }

    // 4. Resolve fully qualified URL safely
    const targetUrl = resolveBackendUrl(rawUrl);
    if (!targetUrl) {
      showError(`Unable to resolve PDF link for "${book.title}".`);
      return;
    }

    // 5. Open genuine original PDF in a new browser tab/viewer
    try {
      const link = document.createElement("a");
      link.href = targetUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (openErr) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDelete = (e, bookId, bookTitle) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove "${bookTitle}"?`)) {
      storageService.deleteTextbook(bookId);
      refreshLearningData();
      showSuccess(`"${bookTitle}" removed from library.`);
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
