import React from "react";
import { Sigma } from "lucide-react";

export const FormulasCard = ({ formulas = [] }) => {
  if (!formulas || formulas.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft-sm">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <Sigma className="w-4 h-4 text-emerald-600" />
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Key Equations & Mathematical Formulas
        </h4>
      </div>
      <div className="space-y-4">
        {formulas.map((f, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-mono"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-800 font-sans">{f.name}</span>
            </div>
            <div className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs sm:text-sm font-bold tracking-wide overflow-x-auto">
              {f.formula}
            </div>
            {f.description && (
              <p className="text-xs text-slate-500 font-sans mt-2 italic">
                {f.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
