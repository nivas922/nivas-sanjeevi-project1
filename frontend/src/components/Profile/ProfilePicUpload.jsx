import React, { useRef } from "react";
import { Camera, Upload, Image as ImageIcon } from "lucide-react";

export const ProfilePicUpload = ({ avatarUrl, onImageChange, onUseGoogleAvatar }) => {
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(reader.result, file);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative group">
        <img
          src={avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100 shadow-soft-md"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 rounded-full bg-slate-900/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Camera className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Upload</span>
        </button>
      </div>

      <div className="space-y-2 text-center sm:text-left">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload from Device</span>
          </button>
          <button
            type="button"
            onClick={onUseGoogleAvatar}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Google Avatar</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">Supports JPG, PNG, WEBP, or SVG (Max 5MB)</p>
      </div>
    </div>
  );
};
export default ProfilePicUpload;
