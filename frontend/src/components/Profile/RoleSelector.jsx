import React from "react";
import { School } from "lucide-react";
import { DEPARTMENTS } from "../../utils/constants";

export const RoleSelector = ({ selectedRole, onChange }) => {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
        <School className="w-3.5 h-3.5 text-brand-600" />
        <span>Department / Academic Role</span>
      </label>
      <select
        value={selectedRole}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
      >
        {DEPARTMENTS.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>
    </div>
  );
};
export default RoleSelector;
