import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquareQuote,
  X,
  Send,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Bot,
  User,
  RotateCcw,
  Languages,
  Maximize2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { aiTutorService } from "../../services/aiTutorService";
import { speechService } from "../../services/speechService";
import { useAuth } from "../../context/AuthContext";
import { useLearning } from "../../context/LearningContext";
import { useToast } from "../../context/ToastContext";
import { SUPPORTED_LANGUAGES } from "../../data/translations";

export const FloatingDoubtSolver = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const { user } = useAuth();
  const { activeLanguage } = useLearning();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeLanguage) {
      setSelectedLanguage(activeLanguage);
    }
  }, [activeLanguage]);

  const [messages, setMessages] = useState([
    {
      id: "float-welcome",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `👋 Got a doubt while reading? Ask me anything and I'll explain step-by-step in your chosen language!`
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (query = inputQuery) => {
    if (!query || query.trim().length === 0) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await aiTutorService.askDoubt(query, selectedLanguage);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: res.answer,
        relatedTopics: res.relatedTopics
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      //
    } finally {
      setLoading(false);
    }
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
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null)
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-soft-lg hover:shadow-glow-brand transition-all cursor-pointer group scale-100 hover:scale-105"
          title="Clear Doubts with AI Tutor"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span>Clear Doubts (AI Tutor)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[550px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Top Bar */}
          <div className="p-3.5 bg-gradient-to-r from-brand-600 to-indigo-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black">AI Doubt Solver</h4>
                <p className="text-[10px] text-white/80">Multilingual Academic Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-white/20 text-white text-[11px] font-bold px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="text-slate-900 font-semibold">
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/doubts");
                }}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  speechService.stop();
                  setIsOpen(false);
                }}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/50">
            {messages.map((m) => {
              const isUsr = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isUsr ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 ${
                      isUsr
                        ? "bg-brand-600 text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-soft-xs"
                    }`}
                  >
                    <div className="whitespace-pre-line font-medium leading-relaxed">
                      {m.text}
                    </div>

                    {!isUsr && (
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleSpeak(m.id, m.text)}
                          className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{speakingId === m.id ? "🔊 Stop" : "Read Aloud"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <div className="w-2 h-2 rounded-full bg-brand-600 animate-ping" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200/80 flex gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask any doubt..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
