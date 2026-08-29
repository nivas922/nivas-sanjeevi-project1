import React from "react";
import { Loader2 } from "lucide-react";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon = null,
  iconPosition = "left",
  className = "",
  onClick,
  type = "button",
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl select-none";

  const sizeStyles = {
    xs: "text-xs px-2.5 py-1.5 gap-1.5",
    sm: "text-xs font-semibold px-3 py-2 gap-1.5",
    md: "text-sm font-semibold px-4 py-2.5 gap-2",
    lg: "text-base font-semibold px-5 py-3 gap-2.5"
  };

  const variantStyles = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-soft-sm hover:shadow-glow-brand focus:ring-brand-500",
    secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 focus:ring-brand-400",
    purple: "bg-accent-600 hover:bg-accent-700 text-white shadow-soft-sm focus:ring-accent-500",
    outline: "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-400 shadow-soft-sm",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-300",
    danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-soft-sm",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-soft-sm",
    dark: "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-800 shadow-soft-sm"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === "left" && <Icon className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
      {!loading && Icon && iconPosition === "right" && <Icon className="w-4 h-4 shrink-0" />}
    </button>
  );
};
