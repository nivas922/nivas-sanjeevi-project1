import React from "react";
import { Activity, Clock } from "lucide-react";

export const RecentActivity = ({ activities = [] }) => {
  if (activities.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft-sm text-center py-10">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">No Recent Activity</h4>
        <p className="text-xs text-slate-400 mt-1">Upload a textbook or take a quiz to start building your learning record.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-soft-sm space-y-4">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <Activity className="w-4 h-4 text-brand-600" />
        <span>Recent Learning Activity</span>
      </h3>
      <div className="space-y-3">
        {activities.slice(0, 5).map((act, idx) => (
          <div key={act.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-sm font-semibold text-slate-800">{act.title}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {act.time || "Recently"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default RecentActivity;
