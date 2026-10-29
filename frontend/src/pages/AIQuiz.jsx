import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  Layers,
  BookOpen,
  PlusCircle,
  Sliders,
  CheckCircle2
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { QuizCard } from "../components/quiz/QuizCard";
import { QuizProgress } from "../components/quiz/QuizProgress";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { studyTracker } from "../services/studyTracker";
import { EmptyState } from "../components/common/EmptyState";

export const AIQuiz = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { quizzes, textbooks, currentBook, refreshLearningData } = useLearning();
  const { showWarning, showSuccess } = useToast();

  const quizId = searchParams.get("id");
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Available textbooks & Textbook Selection states
  const [availableBooks, setAvailableBooks] = useState(textbooks || []);
  const [selectedBookId, setSelectedBookId] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // 1. Fetch latest textbooks from API on mount
  useEffect(() => {
    let isMounted = true;
    const fetchBooks = async () => {
      try {
        const books = await api.getTextbooks();
        if (isMounted && Array.isArray(books) && books.length > 0) {
          setAvailableBooks(books);
        }
      } catch (e) {
        console.warn("Could not fetch textbooks for quiz generation:", e.message);
      }
    };
    fetchBooks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update available books if context textbooks change
  useEffect(() => {
    if (textbooks && textbooks.length > 0) {
      setAvailableBooks(textbooks);
    }
  }, [textbooks]);

  // 2. Pre-select textbook based on search params, currentBook, or first available
  useEffect(() => {
    const paramBookId = searchParams.get("textbookId") || searchParams.get("bookId");
    if (paramBookId && availableBooks.some((b) => b.id === paramBookId)) {
      setSelectedBookId(paramBookId);
    } else if (currentBook && availableBooks.some((b) => b.id === currentBook.id)) {
      setSelectedBookId(currentBook.id);
    } else if (availableBooks.length > 0 && (!selectedBookId || !availableBooks.some((b) => b.id === selectedBookId))) {
      setSelectedBookId(availableBooks[0].id);
    }
  }, [searchParams, availableBooks, currentBook, selectedBookId]);

  // 3. Load active quiz on mount or URL change
  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      if (quizId) {
        let found = quizzes.find((q) => q.id === quizId);
        if (!found) {
          try {
            found = await api.getQuizById(quizId);
          } catch (e) {
            console.warn("Could not fetch quiz by id:", e.message);
          }
        }
        if (found) {
          setQuiz(found);
          const limit = found.timeLimitMinutes || Math.max(5, Math.ceil((found.questions?.length || 5) * 1.5));
          setTimeLeft(limit * 60);
          setLoading(false);
          return;
        }
      }

      if (quizzes.length > 0) {
        setQuiz(quizzes[0]);
        setTimeLeft(quizzes[0].timeLimitMinutes * 60);
      } else {
        // When no quiz exists, open textbook quiz generator panel by default
        setShowConfigPanel(true);
      }
      setLoading(false);
    };

    loadQuiz();
  }, [quizId, quizzes]);

  // 4. Countdown timer
  useEffect(() => {
    if (!quiz || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, quiz]);

  // 5. Track active study time when taking quiz
  useEffect(() => {
    if (quiz && !loading) {
      studyTracker.startSession("quiz");
    }
    return () => {
      studyTracker.stopSession();
    };
  }, [quiz, loading]);

  // 6. Generate Quiz from Selected Textbook
  const handleGenerateQuizFromTextbook = async (e) => {
    if (e) e.preventDefault();
    if (!selectedBookId) {
      showWarning("Please select a textbook first.");
      return;
    }

    const selectedBook = availableBooks.find((b) => b.id === selectedBookId);
    if (!selectedBook) {
      showWarning("Selected textbook could not be found.");
      return;
    }

    setIsGenerating(true);
    try {
      const parsedCount = parseInt(questionCount, 10) || 5;
      const newQuiz = await api.generateQuiz({
        textbookId: selectedBook.id,
        bookId: selectedBook.id,
        topic: selectedBook.subject || selectedBook.title || "Academic Concepts",
        subject: selectedBook.title || selectedBook.subject || "Textbook",
        difficulty: difficulty || "Intermediate",
        questionCount: parsedCount
      });

      if (!newQuiz || !Array.isArray(newQuiz.questions) || newQuiz.questions.length === 0) {
        throw new Error("No questions were generated from this textbook. Please try again.");
      }

      refreshLearningData();
      setQuiz(newQuiz);
      setCurrentIndex(0);
      setSelectedAnswers({});
      const limit = newQuiz.timeLimitMinutes || Math.max(5, Math.ceil(newQuiz.questions.length * 1.5));
      setTimeLeft(limit * 60);
      setShowConfigPanel(false);
      showSuccess(`Successfully generated ${newQuiz.questions.length}-question AI quiz from "${selectedBook.title}"!`);
      navigate(`/quiz?id=${newQuiz.id}`);
    } catch (err) {
      const errMsg = err?.message || "Failed to generate quiz from textbook content.";
      showWarning(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. Submit Quiz Handler
  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    const totalQuestions = quiz.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;

    if (answeredCount < totalQuestions && timeLeft > 0) {
      const confirmSubmit = confirm(
        `You have answered ${answeredCount} of ${totalQuestions} questions. Submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    try {
      studyTracker.stopSession();
      const timeSpent = quiz.timeLimitMinutes * 60 - timeLeft;
      const result = await api.submitQuiz({
        quizId: quiz.id,
        selectedAnswers,
        timeSpentSeconds: timeSpent > 0 ? timeSpent : 120,
        topic: quiz.topic,
        subject: quiz.subject,
        quizTitle: quiz.title,
        summaryId: quiz.summaryId || quiz.summary_id,
        bookId: quiz.bookId || quiz.book_id || quiz.textbookId
      });

      refreshLearningData();
      showSuccess("Quiz submitted and evaluated by Adaptive Learning Engine!");
      navigate("/quiz/results", { state: { result } });
    } catch (err) {
      showWarning("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
        <p className="text-slate-500 font-semibold">Loading quiz experience...</p>
      </div>
    );
  }

  const currentQuestion = quiz?.questions && quiz.questions[currentIndex];
  const totalQuestions = quiz?.questions ? quiz.questions.length : 0;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (optionIndex) => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Action & Textbook Quiz Generator Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg">
                {quiz?.subject || "AI Textbook Quiz"}
              </span>
              {quiz?.bookTitle && (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-brand-600" />
                  {quiz.bookTitle}
                </span>
              )}
              <span className="text-xs font-semibold text-slate-400">
                Difficulty: {quiz?.difficulty || "Intermediate"} • {totalQuestions} Questions
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {quiz?.title || "AI Knowledge Quiz"}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={Sliders}
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              id="toggle-quiz-generator-btn"
            >
              {showConfigPanel ? "Close Generator" : "⚙️ Generate Quiz from Textbook"}
            </Button>
            {quiz && (
              <Button
                variant="danger"
                size="sm"
                icon={Send}
                loading={isSubmitting}
                onClick={handleSubmitQuiz}
                className="shadow-soft-sm"
              >
                Submit Quiz
              </Button>
            )}
          </div>
        </div>

        {/* Expandable / Visible Textbook Quiz Generator Panel */}
        {(showConfigPanel || !quiz) && (
          <form
            onSubmit={handleGenerateQuizFromTextbook}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Generate AI Quiz from Selected Textbook</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Grounded in actual textbook content
              </span>
            </div>

            {/* Error or Loading Banner during generation */}
            {isGenerating && (
              <div className="p-3.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-brand-600 animate-spin shrink-0" />
                <p className="text-xs font-semibold text-brand-900">
                  Retrieving textbook chapters and generating AI quiz questions... Please wait.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Select Textbook */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-brand-600" />
                  <span>Select Textbook</span>
                </label>
                {availableBooks.length > 0 ? (
                  <select
                    id="select-textbook-dropdown"
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {availableBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} {b.subject ? `• ${b.subject}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                    <span>No textbooks uploaded.</span>
                    <button
                      type="button"
                      onClick={() => navigate("/upload")}
                      className="text-xs font-bold text-brand-700 underline hover:text-brand-800 cursor-pointer"
                    >
                      Upload
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Number of Questions (5, 10, 15, 20) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-600" />
                  <span>Number of Questions</span>
                </label>
                <select
                  id="select-question-count"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="5">5 Questions</option>
                  <option value="10">10 Questions</option>
                  <option value="15">15 Questions</option>
                  <option value="20">20 Questions</option>
                </select>
              </div>

              {/* 3. Difficulty Level (Easy, Intermediate, Hard) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand-600" />
                  <span>Difficulty Level</span>
                </label>
                <select
                  id="select-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Easy">Easy (Foundational)</option>
                  <option value="Intermediate">Intermediate (Standard)</option>
                  <option value="Hard">Hard (Challenge)</option>
                </select>
              </div>

              {/* 4. Question Type (MCQ) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Question Type</span>
                </label>
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Multiple-choice (MCQs)</span>
                  <span className="text-[10px] text-brand-700 bg-brand-50 font-bold px-1.5 py-0.5 rounded border border-brand-200">
                    4 Options
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
              <p className="text-[11px] text-slate-500">
                Each question includes 4 options, 1 verified correct answer, and an academic explanation.
              </p>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Sparkles}
                loading={isGenerating}
                disabled={availableBooks.length === 0 || isGenerating}
                id="generate-quiz-btn"
              >
                Generate Quiz from Textbook
              </Button>
            </div>
          </form>
        )}
      </div>

      {quiz && currentQuestion ? (
        <>
          {/* Progress Bar & Question Selector */}
          <QuizProgress
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            answeredCount={answeredCount}
            timeLeftSeconds={timeLeft}
            onJumpToQuestion={(idx) => setCurrentIndex(idx)}
          />

          {/* Current Question Card */}
          <QuizCard
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            selectedOptionIndex={selectedAnswers[currentQuestion.id]}
            onSelectOption={handleSelectOption}
          />

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <Button
              variant="outline"
              size="md"
              icon={ArrowLeft}
              disabled={currentIndex === 0}
              onClick={handlePrevious}
            >
              Previous
            </Button>

            <div className="text-xs font-bold text-slate-400">
              {answeredCount} of {totalQuestions} answered
            </div>

            {currentIndex < totalQuestions - 1 ? (
              <Button
                variant="primary"
                size="md"
                icon={ArrowRight}
                iconPosition="right"
                onClick={handleNext}
              >
                Next Question
              </Button>
            ) : (
              <Button
                variant="success"
                size="md"
                icon={Send}
                iconPosition="right"
                loading={isSubmitting}
                onClick={handleSubmitQuiz}
              >
                Submit Quiz
              </Button>
            )}
          </div>
        </>
      ) : availableBooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Textbooks Available"
          description="Please upload a textbook to generate an AI quiz based on its actual content."
          actionText="Upload Textbook"
          onAction={() => navigate("/upload")}
        />
      ) : (
        <EmptyState
          icon={HelpCircle}
          title="Ready to Generate a Quiz"
          description="Select a textbook from the panel above and click 'Generate Quiz from Textbook' to begin."
          actionText="Generate Quiz"
          onAction={() => handleGenerateQuizFromTextbook()}
        />
      )}
    </div>
  );
};
