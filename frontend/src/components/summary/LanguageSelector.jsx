import React from "react";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../../utils/constants";

export const LanguageSelector = ({ selectedLanguage, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <select
        value={selectedLanguage}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name} ({lang.native})
          </option>
        ))}
      </select>
    </div>
  );
};
export default LanguageSelector;
