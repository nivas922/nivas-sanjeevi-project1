import React from "react";
import { Modal } from "../common/Modal";
import { Sparkles, ArrowRight, Lightbulb, BookOpen } from "lucide-react";
import { Button } from "../common/Button";
import { TextToSpeech } from "../tts/TextToSpeech";

export const SimplifyModal = ({
  isOpen,
  onClose,
  originalText = "",
  simplifiedText = "",
  topic = ""
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✨ AI Simplified Explanation"
      subtitle={`Converting complex academic language in "${topic}" to beginner-friendly intuition`}
      maxWidth="max-w-3xl"
      footer={
        <Button onClick={onClose} variant="primary">
          Got It, Continue
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Visual Callout */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-brand-500/10 to-transparent border border-purple-200/80 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0 shadow-soft-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-purple-900">
              Intuitive Mental Model
            </h5>
            <p className="text-xs text-purple-800 mt-0.5">
              The AI replaces dense technical jargon with analogies, everyday metaphors, and plain English descriptions.
            </p>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Text */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Original Textbook Text</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic">
              "{originalText}"
            </p>
          </div>

          {/* Simplified Explanation */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simplified Intuition</span>
            </div>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              {simplifiedText}
            </p>
          </div>
        </div>

        {/* Audio Narration for Simplified Text */}
        <div className="pt-2">
          <TextToSpeech
            text={simplifiedText}
            title="Listen to Simplified Explanation"
            compact={false}
          />
        </div>
      </div>
    </Modal>
  );
};
