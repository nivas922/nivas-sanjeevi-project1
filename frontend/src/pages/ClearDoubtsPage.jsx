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
  Flame
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLearning } from "../context/LearningContext";
import { useToast } from "../context/ToastContext";
import { SUPPORTED_LANGUAGES } from "../data/translations";
import { aiTutorService } from "../services/aiTutorService";
import { speechService } from "../services/speechService";
import { Button } from "../components/common/Button";

export const ClearDoubtsPage = () => {
  const { user } = useAuth();
  const { activeLanguage, textbooks, currentBook } = useLearning();
  const { showSuccess, showInfo, showWarning } = useToast();
  const location = useLocation();

  const [selectedLanguage, setSelectedLanguage] = useState(activeLanguage || "en");
  const [selectedBookId, setSelectedBookId] = useState(
    location.state?.bookId || currentBook?.id || (textbooks && textbooks.length === 1 ? textbooks[0].id : "")
  );
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);

  useEffect(() => {
    if (location.state?.bookId) {
      setSelectedBookId(location.state.bookId);
    } else if (!selectedBookId && currentBook?.id) {
      setSelectedBookId(currentBook.id);
    } else if (!selectedBookId && textbooks && textbooks.length === 1) {
      setSelectedBookId(textbooks[0].id);
    }
  }, [location.state?.bookId, currentBook, textbooks]);

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
      const response = await aiTutorService.askDoubt(textToSend, selectedLanguage, selectedBookId);
      const aiResponse = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.answer,
        topic: response.topic,
        source: response.source || [],
        relatedTopics: response.relatedTopics
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
      onError: () => setSpeakingId(null)
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
          {textbooks && textbooks.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl border border-white/20">
              <BookOpen className="w-4 h-4 text-white" />
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="" className="text-slate-900 font-semibold">
                  -- Select Textbook --
                </option>
                {textbooks.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900 font-semibold">
                    {b.title}
                  </option>
                ))}
              </select>
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

                  {/* Source Traceability Badges */}
                  {!isUser && msg.source && msg.source.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                        Textbook Source Traceability:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.source.map((s, idx) => (
                          <span key={idx} className="bg-brand-50 text-brand-700 font-semibold px-2.5 py-1 rounded-lg border border-brand-200 text-[11px]">
                            {s.chapter || 'Overview'} • {s.section || 'General'} (Pages {s.pageStart}-{s.pageEnd})
                          </span>
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
              placeholder={`Type your textbook doubt or academic question here (answering in ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name})...`}
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-soft-xs"
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
