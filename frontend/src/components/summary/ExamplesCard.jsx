import React, { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export const ExamplesCard = ({ examples = [] }) => {
  const { showSuccess } = useToast();
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!examples || examples.length === 0) return null;

  const handleCopy = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    showSuccess("Code copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft-sm">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <Code2 className="w-4 h-4 text-amber-600" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Practical Examples & Code Snippets
        </h4>
      </div>
      <div className="space-y-4">
        {examples.map((ex, idx) => (
          <div key={idx} className="rounded-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">{ex.title}</span>
              <button
                onClick={() => handleCopy(ex.code, idx)}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed">
              <code>{ex.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
