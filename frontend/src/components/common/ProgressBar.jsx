import React from "react";

export const ProgressBar = ({
  value = 0,
  max = 100,
  showLabel = true,
  label = "",
  size = "md",
  color = "brand",
  className = ""
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5"
  };

  const colorClasses = {
    brand: "bg-brand-500",
    purple: "bg-accent-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    blue: "bg-blue-500"
  };

  const selectedColor = colorClasses[color] || colorClasses.brand;

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
          <span>{label}</span>
          {showLabel && <span className="font-bold text-slate-800">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${selectedColor} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
