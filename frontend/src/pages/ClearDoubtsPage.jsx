import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquareQuote,
  Send,
  Sparkles,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  Languages,
  Bot,
  User,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Download,
  Flame,
  AlertCircle
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { useToast } from "../context/ToastContext";
import { SUPPORTED_LANGUAGES } from "../data/translations";
import { aiTutorService } from "../services/aiTutorService";
import { speechService } from "../services/speechService";
import { Button } from "../components/common/Button";
import { VoiceInputButton } from "../components/chat/VoiceInputButton";

export const ClearDoubtsPage = () => {
  const { user } = useAuth();
  const { activeLanguage, textbooks, currentBook, setCurrentBook } = useLearning();
  const { showSuccess, showInfo, showWarning, showError } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const queryBookId = searchParams.get("bookId");
  const queryQuestion = searchParams.get("question");

  const [selectedLanguage, setSelectedLanguage] = useState(activeLanguage || "en");
  const [selectedBookId, setSelectedBookId] = useState(
    location.state?.bookId || queryBookId || currentBook?.id || ""
  );
  const [inputQuery, setInputQuery] = useState(location.state?.question || queryQuestion || "");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlBookId = location.state?.bookId || params.get("bookId");
    const urlQuestion = location.state?.question || params.get("question");

    // 1. If explicit bookId in URL or state, prioritize it
    if (urlBookId && urlBookId !== selectedBookId) {
      handleSelectBook(urlBookId);
    }
    // 2. If currentBook is valid within available textbooks, select it
    else if (!selectedBookId && currentBook?.id && textbooks?.some((b) => b.id === currentBook.id)) {
      handleSelectBook(currentBook.id);
    }
    // 3. If no book selected and exactly one textbook exists, auto-select it
    else if (!selectedBookId && textbooks && textbooks.length === 1) {
      handleSelectBook(textbooks[0].id);
    }
    // 4. If selectedBookId points to a book no longer in available textbooks, clear it
    else if (selectedBookId && textbooks && textbooks.length > 0 && !textbooks.some((b) => b.id === selectedBookId)) {
      handleSelectBook(textbooks.length === 1 ? textbooks[0].id : "");
    }

    if (urlQuestion && !inputQuery) {
      setInputQuery(urlQuestion);
    }
  }, [location.state?.bookId, location.search, currentBook, textbooks, selectedBookId]);

  const messagesEndRef = useRef(null);

  // Initial welcome message
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `👋 **Hello ${user?.name ? user.name.split(" ")[0] : "Student"}!** I am your **AI Academic Doubt Solver & Study Assistant**.

Ask me any concept, formula, coding question, or textbook doubt from your uploaded textbook. I will retrieve exact textbook sections and explain step-by-step in **English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), or Bengali (বাংলা)**!

Select a textbook from the dropdown above to start.`,
      relatedTopics: [
        "Explain key concepts from this textbook",
        "Summarize main formulas",
        "What are top exam questions on this textbook?"
      ]
    }
  ]);

  const handleSelectBook = (newBookId) => {
    if (newBookId === selectedBookId) return;
    speechService.stop();
    setSpeakingId(null);
    setSelectedBookId(newBookId);

    const targetBook = textbooks?.find((b) => b.id === newBookId);
    if (targetBook && typeof setCurrentBook === "function") {
      setCurrentBook(targetBook);
    }

    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: newBookId
          ? `📚 Switched to textbook: **${targetBook?.title || "Selected Textbook"}**.\n\nAll subsequent questions will be retrieved strictly from this book's passages with exact chapter and page citations.`
          : `👋 Please select a textbook from the dropdown above to start asking doubts.`,
        relatedTopics: [
          `Explain key concepts in ${targetBook?.title || "this book"}`,
          "Summarize the main formulas and definitions",
          "What are top exam questions from this book?"
        ]
      }
    ]);

    if (newBookId) {
      showInfo(`Active textbook switched to "${targetBook?.title || "selected book"}". Previous chat context cleared.`);
    }
  };

  const quickPrompts = [
    { title: "📖 Key Concepts", prompt: "Explain the core concepts covered in this textbook chapter-by-chapter." },
    { title: "📐 Formulas & Theorems", prompt: "List and explain all major formulas and theorems in this textbook." },
    { title: "❓ Important Q&A", prompt: "What are the most important exam questions and answers from this textbook?" },
    { title: "⚡ Quick Summary", prompt: "Provide a comprehensive summary of the main topics in this textbook." }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend = inputQuery) => {
    if (!textToSend || textToSend.trim().length === 0) return;

    if (!selectedBookId) {
      showWarning("Please select a textbook first before asking doubts.");
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);

    try {
      // Gather minimum necessary conversation history for continuity
      const historyForBackend = messages
        .filter((m) => !m.id.startsWith("welcome-"))
        .slice(-4)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          text: m.text
        }));

      const response = await aiTutorService.askDoubt(textToSend, selectedLanguage, selectedBookId, historyForBackend);
      const aiResponse = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.answer,
        topic: response.topic,
        source: response.sources || response.source || [],
        sources: response.sources || response.source || [],
        confidence: response.confidence,
        insufficientEvidence: Boolean(response.insufficientEvidence),
        hasRelevantContent: response.hasRelevantContent,
        relatedTopics: response.followUpSuggestions || response.relatedTopics || []
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      showInfo(err.message || "AI tutor is currently unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showSuccess("Copied doubt explanation to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id, text) => {
    if (speakingId === id) {
      speechService.stop();
      setSpeakingId(null);
      return;
    }

    speechService.stop();
    setSpeakingId(id);
    speechService.speak({
      text: text.replace(/[*_#`~\[\]()]/g, " "),
      lang: selectedLanguage,
      rate: 1.0,
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
      onError: (err) => {
        setSpeakingId(null);
        if (err && err.message) {
          showError(err.message);
        }
      }
    });
  };

  const handleClearChat = () => {
    speechService.stop();
    setMessages([
      {
        id: "welcome-fresh",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✨ Chat cleared! Ask me your next textbook doubt or pick a starter prompt below.`,
        relatedTopics: [
          "Explain TCP 3-Way Handshake step-by-step",
          "Difference between Process and Thread",
          "Explain Database Normalization"
        ]
      }
    ]);
    showSuccess("Chat session reset.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-soft-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>24/7 AI Multilingual Academic Tutor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Clear Your Doubts with AI
          </h1>
          <p className="text-sm text-white/80 max-w-xl">
            Get instant, step-by-step conceptual breakdowns, math formulas, code samples, and voice audio narration in your preferred Indian language.
          </p>
        </div>

        {/* Textbook & Language selector bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/15">
          {textbooks && textbooks.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl border border-white/20">
              <BookOpen className="w-4 h-4 text-white" />
              <select
                id="doubt-textbook-select"
                value={selectedBookId}
                onChange={(e) => handleSelectBook(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="" className="text-slate-900 font-semibold">
                  -- Select Uploaded Textbook --
                </option>
                {textbooks.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900 font-semibold">
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-white/70 text-xs">
              <BookOpen className="w-4 h-4" />
              <span>No textbooks found</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl border border-white/20">
            <Languages className="w-4 h-4 text-white/80" />
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                showSuccess(`Tutor language set to ${SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)?.name}`);
              }}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="text-slate-900 font-semibold">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
            title="Reset Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Textbook Status & Selection Banners */}
      {!selectedBookId && textbooks && textbooks.length > 1 && (
        <div className="bg-gradient-to-r from-brand-50 to-indigo-50 p-4 sm:p-5 rounded-2xl border border-brand-200/90 shadow-soft-sm space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-900 uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span>Select a textbook to ask doubts from:</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {textbooks.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBook(b.id)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-brand-600 text-slate-800 hover:text-white border border-slate-200 hover:border-brand-600 transition-all cursor-pointer shadow-soft-xs flex items-center gap-2 group"
              >
                <BookOpen className="w-4 h-4 text-brand-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">{b.title}</span>
                {b.subject && (
                  <span className="text-[10px] opacity-75 font-medium bg-slate-100 group-hover:bg-brand-500 group-hover:text-white px-2 py-0.5 rounded-md transition-colors">
                    {b.subject}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {(!textbooks || textbooks.length === 0) && (
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200/90 text-amber-900 text-xs shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-sm text-amber-950">No Textbooks Available Yet</p>
              <p className="text-amber-800 text-xs leading-relaxed">
                LearnAI AI Academic Tutor provides verified, chapter-grounded answers with citations from your uploaded textbooks. Please upload a textbook to start asking doubts.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate("/upload")}
            className="shrink-0 rounded-xl"
          >
            Upload Textbook
          </Button>
        </div>
      )}

      {selectedBookId && (
        <div className="bg-emerald-50/80 px-4 py-2.5 rounded-2xl border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-soft-xs">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-emerald-800">
              Active Context: <strong className="font-bold text-emerald-950">{textbooks?.find(b => b.id === selectedBookId)?.title || "Selected Textbook"}</strong>
            </span>
            <span className="hidden sm:inline text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full font-semibold">
              Strictly Grounded
            </span>
          </div>
          <button
            onClick={() => handleSelectBook("")}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 underline cursor-pointer"
          >
            Switch Book
          </button>
        </div>
      )}

      {/* Suggested Quick Prompt Chips */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Quick Topic Doubts & Starters:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200/80 hover:border-brand-200 transition-all cursor-pointer shadow-soft-xs"
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft-md flex flex-col h-[600px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center text-sm font-bold shadow-soft-sm ${
                    isUser
                      ? "bg-brand-600 text-white"
                      : "gradient-brand text-white"
                  }`}
                >
                  {isUser ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Bot className="w-5 h-5" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 space-y-3 ${
                    isUser
                      ? "bg-brand-600 text-white rounded-tr-xs shadow-soft-md"
                      : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-soft-xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-2 text-[11px] font-semibold opacity-75">
                    <span>{isUser ? user?.name || "You" : "AI Academic Tutor"}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Formatted Content */}
                  <div className={`text-sm leading-relaxed whitespace-pre-line font-medium ${isUser ? "text-white" : "text-slate-800"}`}>
                    {msg.text}
                  </div>

                  {/* AI Action Toolbar */}
                  {!isUser && (
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Read Aloud Button */}
                        <button
                          type="button"
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            speakingId === msg.id
                              ? "bg-emerald-600 text-white shadow-soft-sm animate-pulse"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{speakingId === msg.id ? "🔊 Speaking..." : "Read Aloud"}</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <span className="text-[11px] font-bold text-slate-400">
                        {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                      </span>
                    </div>
                  )}

                  {/* Insufficient Evidence Warning Notice */}
                  {!isUser && msg.insufficientEvidence && (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Textbook Grounding Notice:</span>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          The selected textbook does not contain sufficient passages to answer this doubt. LearnAI will not invent answers outside the textbook.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Source Traceability Badges */}
                  {!isUser && msg.source && msg.source.length > 0 && !msg.insufficientEvidence && (
                    <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                          <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                          Textbook Source Citations:
                        </span>
                        {msg.confidence && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            msg.confidence === "high" ? "bg-emerald-100 text-emerald-800" :
                            msg.confidence === "medium" ? "bg-sky-100 text-sky-800" :
                            "bg-slate-200 text-slate-700"
                          }`}>
                            {msg.confidence} confidence
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.source.map((s, idx) => (
                          <div key={idx} className="bg-brand-50/80 hover:bg-brand-100 text-brand-800 font-semibold px-2.5 py-1 rounded-xl border border-brand-200/80 text-[11px] flex items-center gap-1.5 transition-colors">
                            <span className="font-bold">{s.chapter || 'Overview'}</span>
                            <span className="text-brand-400">•</span>
                            <span>{s.section || 'General'}</span>
                            <span className="text-brand-400">•</span>
                            <span className="font-mono text-[10px] bg-brand-200/60 text-brand-900 px-1.5 py-0.5 rounded">
                              p. {s.pageStart}{s.pageEnd && s.pageEnd !== s.pageStart ? `-${s.pageEnd}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up question chips */}
                  {!isUser && msg.relatedTopics && msg.relatedTopics.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suggested Follow-ups:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.relatedTopics.map((topic, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(topic)}
                            className="text-left text-xs font-semibold px-3 py-1 rounded-lg bg-white hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 transition-colors cursor-pointer"
                          >
                            ↳ {topic}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3 text-slate-500 animate-in fade-in">
              <div className="w-9 h-9 rounded-2xl gradient-brand text-white flex items-center justify-center">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-100 rounded-tl-xs border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
                <span>Thinking about your question...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Type or speak your textbook doubt (answering in ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || "English"})...`}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-soft-xs"
            />
            <VoiceInputButton
              language={selectedLanguage}
              currentValue={inputQuery}
              onTranscriptChange={(text) => setInputQuery(text)}
              onTranscriptFinal={(finalText) => setInputQuery(finalText)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!inputQuery.trim() || loading}
              icon={Send}
              className="px-6 py-3 rounded-2xl shadow-soft-sm"
            >
              Ask Doubt
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
