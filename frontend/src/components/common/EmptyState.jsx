import React from "react";
import { BookOpen } from "lucide-react";
import { Button } from "./Button";

export const EmptyState = ({
  icon: Icon = BookOpen,
  title = "No data found",
  description = "Get started by adding your first item.",
  actionText = "Get Started",
  onAction = null,
  secondaryActionText = null,
  onSecondaryAction = null,
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-soft-sm ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 shadow-soft-sm">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onAction && (
          <Button onClick={onAction} variant="primary">
            {actionText}
          </Button>
        )}
        {onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="outline">
            {secondaryActionText}
          </Button>
        )}
      </div>
    </div>
  );
};
