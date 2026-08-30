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
  BookOpen
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { QuizCard } from "../components/quiz/QuizCard";
import { QuizProgress } from "../components/quiz/QuizProgress";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import { EmptyState } from "../components/common/EmptyState";

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

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        title="No quiz available"
        description="Upload a textbook or open a summary to generate personalized quizzes."
        actionText="Upload Textbook"
        onAction={() => navigate("/upload")}
      />
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelectOption = (optionIndex) => {
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
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg">
              {quiz.subject}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Difficulty: {quiz.difficulty} • {totalQuestions} Questions
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {quiz.title}
          </h1>
        </div>

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
    </div>
  );
};
