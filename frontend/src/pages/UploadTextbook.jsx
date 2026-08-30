import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  File,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  Loader2,
  Languages,
  Layers,
  Sliders,
  HelpCircle,
  Scan
} from "lucide-react";
import { Button } from "../components/common/Button";
import { ProgressBar } from "../components/common/ProgressBar";
import { useToast } from "../context/ToastContext";
import { useLearning } from "../context/LearningContext";
import { SUPPORTED_LANGUAGES } from "../data/translations";
import { api } from "../services/api";

export const UploadTextbook = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const { refreshLearningData, activeLanguage } = useLearning();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState(activeLanguage || "en");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [summaryLength, setSummaryLength] = useState("Detailed");
  const [questionCount, setQuestionCount] = useState(5);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    const allowedExtensions = [".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png"];
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      showError("Unsupported file format. Please upload PDF, DOCX, TXT, JPG, or PNG.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showError("File size exceeds 50MB.");
      return;
    }

    setSelectedFile(file);
    showSuccess(`File "${file.name}" selected!`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-8 h-8 text-rose-500" />;
    if (ext === "jpg" || ext === "png" || ext === "jpeg") return <ImageIcon className="w-8 h-8 text-emerald-500" />;
    return <File className="w-8 h-8 text-brand-500" />;
  };

  const isScanned = selectedFile && (
    selectedFile.name.endsWith(".png") ||
    selectedFile.name.endsWith(".jpg") ||
    selectedFile.name.endsWith(".jpeg")
  );

  const handleGenerateSummary = async () => {
    if (!selectedFile) {
      showWarning("Please select a textbook file before generating summary.");
      return;
    }

    setIsProcessing(true);
    setProgressPercent(10);

    const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage) || SUPPORTED_LANGUAGES[0];

    try {
      const res = await api.uploadTextbook(
        selectedFile,
        {
          targetLanguage,
          targetLanguageName: targetLangObj.name,
          difficulty,
          summaryLength,
          questionCount: parseInt(questionCount, 10)
        },
        (stage) => {
          setCurrentStage(stage);
          setProgressPercent(stage.percent);
        }
      );

      refreshLearningData();
      showSuccess(`Textbook processed into ${targetLangObj.name} and AI summary created!`);

      setTimeout(() => {
        navigate(`/summaries/${res.summary.id}`);
      }, 900);
    } catch (err) {
      showError("Unable to generate summary. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Page Title & Intro */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-3 border border-brand-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multilingual AI Ingestion Pipeline</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Upload your textbook
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-2">
          Upload your textbook and let AI transform it into personalized learning material in your preferred Indian language.
        </p>
      </div>

      {!isProcessing ? (
        <div className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed transition-all duration-200 ${
              dragActive
                ? "border-brand-500 bg-brand-50/60 scale-[1.01]"
                : "border-slate-300 hover:border-brand-400 bg-white hover:bg-slate-50/50 shadow-soft-sm"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 shadow-soft-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
              Click to upload or drag & drop textbook
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
              Supported formats: PDF (selectable & scanned), DOCX, TXT, JPG, PNG (Max 50MB)
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
              <Scan className="w-3.5 h-3.5 text-brand-600" />
              <span>Automatic OCR for scanned pages</span>
            </div>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-soft-sm flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  {getFileIcon(selectedFile.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || "Document"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Remove File"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Configuration Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft-sm">
            {/* Target Language */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                <Languages className="w-4 h-4 text-brand-600" />
                <span>Primary Language</span>
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Difficulty */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Difficulty</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Beginner">Beginner (Foundations)</option>
                <option value="Intermediate">Intermediate (Standard)</option>
                <option value="Advanced">Advanced (Deep Dive)</option>
              </select>
            </div>

            {/* Summary Length */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Summary Length</span>
              </label>
              <select
                value={summaryLength}
                onChange={(e) => setSummaryLength(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Short">Short (Core Bullets)</option>
                <option value="Medium">Medium (Balanced)</option>
                <option value="Detailed">Detailed (Full Breakdown)</option>
              </select>
            </div>

            {/* Quiz Questions Count (5, 10, 15, 20) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Quiz Length</span>
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value={5}>5 Questions (Quick Quiz)</option>
                <option value={10}>10 Questions (Standard Test)</option>
                <option value={15}>15 Questions (Thorough Review)</option>
                <option value={20}>20 Questions (Full Assessment)</option>
              </select>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-2">
            <Button
              size="lg"
              variant="primary"
              icon={Sparkles}
              iconPosition="right"
              onClick={handleGenerateSummary}
              disabled={!selectedFile}
              className="px-10 py-4 shadow-soft-md"
            >
              Generate AI Summary & Adaptive Plan
            </Button>
          </div>
        </div>
      ) : (
        /* Processing 8-step screen */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-soft-lg text-center space-y-8 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto relative">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Processing Document & Synthesizing Knowledge
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Extracting chapters, generating summaries, translating audio, and preparing your {questionCount}-question quiz.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <ProgressBar
              value={progressPercent}
              size="lg"
              color="brand"
              label={currentStage?.label || "Processing..."}
            />
          </div>

          {isScanned && (
            <div className="max-w-md mx-auto p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center gap-2">
              <Scan className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Scanned document detected. Extracting text using OCR...</span>
            </div>
          )}

          <div className="max-w-md mx-auto text-left grid grid-cols-1 gap-2 pt-4 border-t border-slate-100">
            {[
              "1. Uploading document",
              "2. Extracting text (PyMuPDF / Tesseract OCR)",
              "3. Detecting chapters",
              "4. Detecting topics",
              `5. Generating summary in ${SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.name || "Language"}`,
              "6. Synthesizing multilingual audio",
              `7. Creating ${questionCount}-question adaptive quiz`,
              "8. Preparing personalized learning plan"
            ].map((stepText, idx) => {
              const isCompleted = currentStage && currentStage.step > idx + 1;
              const isCurrent = currentStage && currentStage.step === idx + 1;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 text-xs py-1 transition-colors ${
                    isCompleted
                      ? "text-emerald-700 font-bold"
                      : isCurrent
                      ? "text-brand-600 font-bold animate-pulse"
                      : "text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span>{stepText}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
