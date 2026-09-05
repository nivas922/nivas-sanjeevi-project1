import React from "react";

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  colorScheme = "brand"
}) => {
  const colorMaps = {
    brand: {
      bg: "bg-brand-50 text-brand-600",
      border: "hover:border-brand-300"
    },
    purple: {
      bg: "bg-purple-50 text-purple-600",
      border: "hover:border-purple-300"
    },
    amber: {
      bg: "bg-amber-50 text-amber-600",
      border: "hover:border-amber-300"
    },
    emerald: {
      bg: "bg-emerald-50 text-emerald-600",
      border: "hover:border-emerald-300"
    },
    rose: {
      bg: "bg-rose-50 text-rose-600",
      border: "hover:border-rose-300"
    }
  };

  const scheme = colorMaps[colorScheme] || colorMaps.brand;

  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-soft-sm transition-all duration-200 hover:shadow-soft-md ${scheme.border} flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl ${scheme.bg}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</span>
          {trend && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              trendPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}>
              {trend}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
