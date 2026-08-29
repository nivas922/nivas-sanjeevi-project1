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
  Layers
} from "lucide-react";
import { useLearning } from "../context/LearningContext";
import { QuizCard } from "../components/quiz/QuizCard";
import { QuizProgress } from "../components/quiz/QuizProgress";
import { Button } from "../components/common/Button";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export const AIQuiz = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { quizzes, refreshLearningData } = useLearning();
  const { showWarning, showSuccess } = useToast();

  const quizId = searchParams.get("id") || "quiz-1";
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const found = quizzes.find((q) => q.id === quizId) || quizzes[0];
    if (found) {
      setQuiz(found);
      setTimeLeft(found.timeLimitMinutes * 60);
    }
  }, [quizId, quizzes]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitQuiz();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  if (!quiz) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
        <p className="text-slate-500">Preparing AI Quiz questions...</p>
      </div>
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

  const handleSubmitQuiz = async () => {
    if (answeredCount < totalQuestions && timeLeft > 0) {
      const confirmSubmit = confirm(
        `You have only answered ${answeredCount} of ${totalQuestions} questions. Submit anyway?`
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
      showSuccess("Quiz submitted and evaluated by Adaptive Engine!");
      navigate("/quiz/results", { state: { result } });
    } catch (err) {
      showWarning("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
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
              Difficulty: {quiz.difficulty}
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

      {/* Progress Bar & Question Bubble Selector */}
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
