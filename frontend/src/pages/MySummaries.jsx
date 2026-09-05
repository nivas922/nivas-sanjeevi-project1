import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  BookOpen,
  Volume2,
  Globe,
  Download,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { TranslationModal } from "../components/summary/TranslationModal";
import { exportService } from "../services/exportService";
import { useToast } from "../context/ToastContext";

export const MySummaries = () => {
  const { summaries } = useLearning();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTranslationSummary, setActiveTranslationSummary] = useState(null);

  const filteredSummaries = summaries.filter((sum) => {
    return (
      sum.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sum.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sum.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleDownload = (e, sum) => {
    e.stopPropagation();
    exportService.exportSummaryAsMarkdown(sum);
    showSuccess(`Summary for "${sum.topic}" downloaded as Markdown!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Summaries
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your AI-synthesized textbook summaries, key definitions, formulas, and multilingual audio notes.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Sparkles}
          onClick={() => navigate("/upload")}
        >
          Generate New Summary
        </Button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search summaries by topic, chapter, or book..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Summaries List */}
      {filteredSummaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSummaries.map((sum) => (
            <div
              key={sum.id}
              onClick={() => navigate(`/summaries/${sum.id}`)}
              className="group bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-soft-sm hover:shadow-soft-lg hover:border-brand-300 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {sum.difficulty || "Intermediate"}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-400">
                      {sum.readTime || "5 min read"}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {sum.createdDate}
                  </span>
                </div>

                {/* Book & Chapter details */}
                <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
                  {sum.bookTitle}
                </p>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug mb-2 group-hover:text-brand-600 transition-colors">
                  {sum.topic}
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-4">
                  {sum.chapterTitle}
                </p>

                {/* Summary Snippet */}
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed mb-6">
                  {sum.summaryText}
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Translate Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTranslationSummary(sum);
                    }}
                    className="p-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-brand-50 border border-slate-200 transition-colors"
                    title="Translate to Indian Languages"
                  >
                    <Globe className="w-4 h-4" />
                  </button>

                  {/* Download Action */}
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, sum)}
                    className="p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors"
                    title="Download Summary (Markdown)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Read Full Summary
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No summaries generated yet"
          description="Upload a textbook chapter to extract structured key points, formulas, definitions, and audio summaries."
          actionText="Upload Textbook"
          onAction={() => navigate("/upload")}
        />
      )}

      {/* Multilingual Translation Modal */}
      {activeTranslationSummary && (
        <TranslationModal
          isOpen={Boolean(activeTranslationSummary)}
          onClose={() => setActiveTranslationSummary(null)}
          summary={activeTranslationSummary}
        />
      )}
    </div>
  );
};
