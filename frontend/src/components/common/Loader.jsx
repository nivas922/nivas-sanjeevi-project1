import React from "react";
import { Loader2 } from "lucide-react";

export const Loader = ({ label = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      <span className="text-xs font-bold text-slate-500">{label}</span>
    </div>
  );
};
export default Loader;
