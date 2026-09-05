import React from "react";

export const Badge = ({
  children,
  variant = "default",
  size = "md",
  icon: Icon = null,
  className = ""
}) => {
  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    strong: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
    good: "bg-blue-100 text-blue-800 border-blue-300 font-bold",
    needs_improvement: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
    weak: "bg-rose-100 text-rose-800 border-rose-300 font-bold"
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2"
  };

  const selectedVariant = variantStyles[variant.toLowerCase().replace(/\s+/g, "_")] || variantStyles.default;

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${selectedVariant} ${sizeStyles[size]} ${className}`}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};
