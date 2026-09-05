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
import { EmptyState } from "../components/common/EmptyState";
import { DEPARTMENTS } from "../data/translations";

export const AIQuiz = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { quizzes, refreshLearningData } = useLearning();
  const { showWarning, showSuccess } = useToast();

  const quizId = searchParams.get("id");
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Custom Quiz Generator Panel states
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [customSubject, setCustomSubject] = useState("Computer Science & Engineering");
  const [customTopic, setCustomTopic] = useState("Core Concepts & System Architecture");
  const [customDifficulty, setCustomDifficulty] = useState("Intermediate");
  const [customQuestionInput, setCustomQuestionInput] = useState("5");
  const [customNumberValue, setCustomNumberValue] = useState(7);
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      setLoading(true);
      if (quizId) {
        const found = quizzes.find((q) => q.id === quizId);
        if (found) {
          setQuiz(found);
          setTimeLeft(found.timeLimitMinutes * 60);
          setLoading(false);
          return;
        }
      }

      if (quizzes.length > 0) {
        setQuiz(quizzes[0]);
        setTimeLeft(quizzes[0].timeLimitMinutes * 60);
      } else {
        // Auto generate foundational quiz if user is taking their first quiz
        const autoQuiz = await api.generateQuiz({
          topic: "Computer Science & Engineering Fundamentals",
          subject: "Engineering Fundamentals",
          difficulty: "Intermediate",
          questionCount: 5
        });
        setQuiz(autoQuiz);
        setTimeLeft(autoQuiz.timeLimitMinutes * 60);
        refreshLearningData();
      }
      setLoading(false);
    };

    loadQuiz();
  }, [quizId, quizzes]);

  // Countdown timer
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

  const getEffectiveCustomCount = () => {
    if (customQuestionInput === "custom") {
      const parsed = parseInt(customNumberValue, 10);
      return isNaN(parsed) || parsed < 1 ? 5 : Math.min(parsed, 30);
    }
    return parseInt(customQuestionInput, 10) || 5;
  };

  const handleGenerateCustomQuiz = async (e) => {
    e.preventDefault();
    setIsGeneratingCustom(true);
    const count = getEffectiveCustomCount();

    try {
      const newQuiz = await api.generateQuiz({
        topic: customTopic || "Academic Fundamentals",
        subject: customSubject || "Engineering",
        difficulty: customDifficulty,
        questionCount: count
      });

      refreshLearningData();
      setQuiz(newQuiz);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setTimeLeft(newQuiz.timeLimitMinutes * 60);
      setShowConfigPanel(false);
      showSuccess(`Generated customized quiz with ${count} questions!`);
      navigate(`/quiz?id=${newQuiz.id}`);
    } catch (err) {
      showWarning("Failed to generate custom quiz.");
    } finally {
      setIsGeneratingCustom(false);
    }
  };

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
      const timeSpent = quiz.timeLimitMinutes * 60 - timeLeft;
      const result = await api.submitQuiz({
        quizId: quiz.id,
        selectedAnswers,
        timeSpentSeconds: timeSpent > 0 ? timeSpent : 120
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
        <p className="text-slate-500">Preparing AI Quiz questions...</p>
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
      {/* Top Action & Custom Quiz Generator Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg">
                {quiz?.subject || "Adaptive Quiz"}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Difficulty: {quiz?.difficulty || "Intermediate"} • {totalQuestions} Questions
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {quiz?.title || "AI Knowledge Quiz"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sliders}
              onClick={() => setShowConfigPanel(!showConfigPanel)}
            >
              {showConfigPanel ? "Close Generator" : "⚙️ Custom Quiz Options"}
            </Button>
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
          </div>
        </div>

        {/* Expandable Custom Quiz Config Panel */}
        {showConfigPanel && (
          <form onSubmit={handleGenerateCustomQuiz} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Configure Custom Number of Quiz Questions</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">Type any question count from 1 to 30</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Topic / Subject
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. TCP/IP Handshake, OOP"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Difficulty Level
                </label>
                <select
                  value={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Beginner">Beginner (Foundational)</option>
                  <option value="Intermediate">Intermediate (Standard)</option>
                  <option value="Advanced">Advanced (Challenge)</option>
                </select>
              </div>

              {/* Number of Questions Selector + Custom Input */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Number of Questions
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={customQuestionInput}
                    onChange={(e) => setCustomQuestionInput(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                    <option value="custom">✍️ Custom Number...</option>
                  </select>

                  {customQuestionInput === "custom" && (
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={customNumberValue}
                      onChange={(e) => setCustomNumberValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="Count"
                      className="w-20 p-2 bg-white border-2 border-brand-500 text-slate-900 font-black text-xs rounded-xl focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Sparkles}
                loading={isGeneratingCustom}
              >
                Generate & Start {getEffectiveCustomCount()}-Question Quiz
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
      ) : (
        <EmptyState
          icon={HelpCircle}
          title="No questions generated"
          description="Click 'Custom Quiz Options' above to generate questions on any topic."
          actionText="Open Quiz Options"
          onAction={() => setShowConfigPanel(true)}
        />
      )}
    </div>
  );
};
