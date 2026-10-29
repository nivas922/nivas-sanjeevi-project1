import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  X,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  BookOpen
} from "lucide-react";
import { api } from "../services/api";
import { storageService } from "../services/storageService";
import { studyTracker } from "../services/studyTracker";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";

// Configure PDF.js worker using Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const ReadTextbook = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Textbook and Document States
  const [book, setBook] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [scale, setScale] = useState(1.15);
  const [fitWidth, setFitWidth] = useState(false);

  // Status States
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);

  // Search States
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState([]); // array of page numbers with matches
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);

  // DOM Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // 1. Load Textbook Metadata & PDF Document
  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      if (!id) {
        setError("Invalid textbook identifier.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Retrieve textbook metadata
        let bookData = null;
        try {
          bookData = await api.getBookById(id);
        } catch {
          bookData = storageService.getTextbookById(id);
        }

        if (!bookData) {
          bookData = storageService.getTextbookById(id);
        }

        if (!isCancelled) {
          setBook(bookData || { id, title: "Textbook", subject: "Curriculum" });
        }

        // Fetch PDF bytes through authenticated backend proxy
        const arrayBuffer = await api.getBookPdfArrayBuffer(id, bookData);
        if (isCancelled) return;

        // Initialize PDF.js document from typed binary array
        const u8Data = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({
          data: u8Data,
          cMapUrl: "https://unpkg.com/pdfjs-dist@6.4.299/cmaps/",
          cMapPacked: true
        });

        const loadedDoc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);
        setPageInput("1");
        setLoading(false);
      } catch (err) {
        console.error("Failed to load PDF into viewer:", err);
        if (!isCancelled) {
          setError(err.message || "Failed to load textbook PDF.");
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Track active study time when reading textbook
  useEffect(() => {
    if (pdfDoc && !loading) {
      studyTracker.startSession("textbook");
    }
    return () => {
      studyTracker.stopSession();
    };
  }, [pdfDoc, loading]);

  // 2. Render Page to Canvas
  const renderPage = useCallback(
    async (pageNumber, currentScale, isFitWidth) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        setRendering(true);

        // Cancel previous rendering task if running
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNumber);

        // Calculate scale if Fit to Width is selected
        let effectiveScale = currentScale;
        if (isFitWidth && containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 48; // padding
          const unscaledVp = page.getViewport({ scale: 1.0 });
          if (containerWidth > 0 && unscaledVp.width > 0) {
            effectiveScale = Math.max(0.6, Math.min(2.5, containerWidth / unscaledVp.width));
          }
        }

        const viewport = page.getViewport({ scale: effectiveScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });

        // High-DPI support for crisp text rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (renderErr) {
        if (renderErr?.name !== "RenderingCancelledException") {
          console.warn("PDF Page render warning:", renderErr.message);
        }
      } finally {
        setRendering(false);
      }
    },
    [pdfDoc]
  );

  // Trigger page render when page, scale, or fit mode changes
  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage, scale, fitWidth);
    }
  }, [pdfDoc, currentPage, scale, fitWidth, renderPage]);

  // 3. Page Navigation Helpers
  const goToPage = (newPage) => {
    if (!pdfDoc) return;
    const bounded = Math.max(1, Math.min(newPage, numPages));
    setCurrentPage(bounded);
    setPageInput(String(bounded));
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      goToPage(currentPage + 1);
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      goToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // 4. Zoom Controls
  const handleZoomIn = () => {
    setFitWidth(false);
    setScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setFitWidth(false);
    setScale((prev) => Math.max(0.6, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setFitWidth(false);
    setScale(1.15);
  };

  const toggleFitWidth = () => {
    setFitWidth((prev) => !prev);
  };

  // 5. In-Document Text Search
  const performSearch = async (query) => {
    if (!pdfDoc || !query || !query.trim()) {
      setMatches([]);
      setCurrentMatchIdx(-1);
      return;
    }

    setIsSearching(true);
    const cleanQuery = query.trim().toLowerCase();
    const foundPageMatches = [];

    try {
      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((i) => i.str).join(" ").toLowerCase();
        if (pageText.includes(cleanQuery)) {
          foundPageMatches.push(p);
        }
      }

      setMatches(foundPageMatches);
      if (foundPageMatches.length > 0) {
        setCurrentMatchIdx(0);
        goToPage(foundPageMatches[0]);
      } else {
        setCurrentMatchIdx(-1);
      }
    } catch (searchErr) {
      console.warn("PDF search encountered an issue:", searchErr);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNextMatch = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matches.length;
    setCurrentMatchIdx(nextIdx);
    goToPage(matches[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matches.length) % matches.length;
    setCurrentMatchIdx(prevIdx);
    goToPage(matches[prevIdx]);
  };

  // 6. Keyboard Shortcuts (Left/Right arrow for navigation)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in search or page input
      if (e.target.tagName === "INPUT") return;

      if (e.key === "ArrowLeft" || e.key === "p" || e.key === "PageUp") {
        handlePrevPage();
      } else if (e.key === "ArrowRight" || e.key === "n" || e.key === "PageDown") {
        handleNextPage();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages]);

  // Find linked summary if available
  const summaries = storageService.getSummaries();
  const linkedSummary = summaries.find(
    (s) => s.bookId === id || s.book_id === id || s.title?.toLowerCase() === book?.title?.toLowerCase()
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -mt-2 -mb-6 space-y-3 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate("/textbooks")}
            className="shrink-0 text-slate-600 hover:text-slate-900"
            title="Back to My Textbooks"
          >
            Back
          </Button>

          <div className="h-5 w-px bg-slate-200 shrink-0 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate" title={book?.title}>
                {book?.title || "Textbook Reader"}
              </h1>
              {book?.subject && (
                <Badge variant="brand" size="sm" className="hidden sm:inline-flex shrink-0">
                  {book.subject}
                </Badge>
              )}
            </div>
            {book?.fileName && (
              <p className="text-[11px] text-slate-400 truncate max-w-sm">
                Original file: {book.fileName.split("/").pop()}
              </p>
            )}
          </div>
        </div>

        {/* Right: AI Summary Link */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {linkedSummary ? (
            <Button
              variant="secondary"
              size="sm"
              icon={Sparkles}
              onClick={() => navigate(`/summaries/${linkedSummary.id}`)}
              className="font-semibold text-xs text-brand-700 bg-brand-50 hover:bg-brand-100"
            >
              Open AI Summary
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={() => navigate("/summaries")}
              className="text-xs text-slate-600"
            >
              Summaries
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar: Navigation, Zoom & Search */}
      <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-soft-sm flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        {/* Page Navigation Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading || rendering}
            className="p-1.5 h-8 w-8 text-slate-700 disabled:opacity-30"
            title="Previous Page (Left Arrow)"
          />

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              disabled={loading || numPages === 0}
              className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-slate-500 font-medium">of {numPages || "–"}</span>
          </form>

          <Button
            variant="ghost"
            size="sm"
            icon={ChevronRight}
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading || rendering}
            className="p-1.5 h-8 w-8 text-slate-700 disabled:opacity-30"
            title="Next Page (Right Arrow)"
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={handleZoomOut}
            disabled={loading || scale <= 0.6}
            className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-30"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span
            onClick={handleResetZoom}
            className="px-2 font-mono text-[11px] font-bold text-slate-700 cursor-pointer hover:text-brand-600"
            title="Click to reset zoom (100%)"
          >
            {fitWidth ? "Fit" : `${Math.round(scale * 100)}%`}
          </span>

          <button
            onClick={handleZoomIn}
            disabled={loading || scale >= 2.5}
            className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-30"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <button
            onClick={toggleFitWidth}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              fitWidth ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-white"
            }`}
            title="Fit to Width"
          >
            <Maximize2 className="w-3 h-3 inline mr-1" />
            Fit
          </button>
        </div>

        {/* Search Bar Toggle */}
        <div className="flex items-center gap-2">
          {!searchOpen ? (
            <Button
              variant="outline"
              size="sm"
              icon={Search}
              onClick={() => setSearchOpen(true)}
              className="text-xs text-slate-600 hover:text-slate-900"
              title="Search text in textbook"
            >
              Search
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 animate-in fade-in">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && performSearch(searchQuery)}
                placeholder="Find in textbook..."
                autoFocus
                className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-32 sm:w-44"
              />
              <button
                onClick={() => performSearch(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 disabled:opacity-40"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Find"}
              </button>

              {matches.length > 0 && (
                <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 text-[11px] text-slate-500">
                  <span>
                    {currentMatchIdx + 1}/{matches.length}
                  </span>
                  <button
                    onClick={handlePrevMatch}
                    className="p-0.5 hover:bg-white rounded text-slate-600"
                    title="Previous match"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleNextMatch}
                    className="p-0.5 hover:bg-white rounded text-slate-600"
                    title="Next match"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                  setMatches([]);
                  setCurrentMatchIdx(-1);
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main PDF Canvas Viewer Container */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-900/5 rounded-3xl border border-slate-200/80 overflow-auto p-4 sm:p-8 flex justify-center items-start min-h-0 shadow-inner relative"
      >
        {/* Loading Spinner State */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-3xl z-20">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" />
            <h3 className="text-base font-bold text-slate-900">Loading Original Textbook PDF</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
              Fetching textbook bytes through secure authenticated proxy and initializing PDF reader...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-3xl p-6 text-center z-20">
            <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Unable to Open Textbook PDF</h3>
            <p className="text-sm text-slate-600 max-w-md mb-6">{error}</p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="md" onClick={() => navigate("/textbooks")}>
                Return to Textbooks
              </Button>
              <Button variant="primary" size="md" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Rendering Indicator (Page switch) */}
        {rendering && !loading && (
          <div className="absolute top-4 right-4 bg-slate-900/70 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 z-10">
            <Loader2 className="w-3 h-3 animate-spin" />
            Rendering page {currentPage}...
          </div>
        )}

        {/* The PDF Canvas */}
        <div className={`transition-opacity duration-150 ${rendering ? "opacity-90" : "opacity-100"}`}>
          <canvas
            ref={canvasRef}
            className="shadow-soft-xl rounded-xl bg-white border border-slate-200/70 block max-w-none"
          />
        </div>
      </div>
    </div>
  );
};
