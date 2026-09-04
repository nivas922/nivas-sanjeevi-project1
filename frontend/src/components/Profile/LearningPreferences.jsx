import React from "react";
import { Globe, Sliders } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../../utils/constants";

export const LearningPreferences = ({ preferredLanguage, onLanguageChange, preferredDifficulty, onDifficultyChange }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          <Globe className="w-3.5 h-3.5 text-purple-600" />
          <span>Default Language</span>
        </label>
        <select
          value={preferredLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name} ({lang.native})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          <Sliders className="w-3.5 h-3.5 text-brand-600" />
          <span>Default Difficulty</span>
        </label>
        <select
          value={preferredDifficulty || "Intermediate"}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
        >
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>
    </div>
  );
};
export default LearningPreferences;
