import React from "react";
import { BookMarked } from "lucide-react";

export const DefinitionsCard = ({ definitions = [] }) => {
  if (!definitions || definitions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft-sm">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <BookMarked className="w-4 h-4 text-purple-600" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Important Definitions & Glossary
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {definitions.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-purple-50/40 border border-purple-100/80 hover:bg-purple-50/70 transition-colors"
          >
            <span className="text-xs font-bold text-purple-900 block mb-1">
              {item.term}
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {item.definition}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
