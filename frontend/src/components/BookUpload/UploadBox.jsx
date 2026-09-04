import React, { useRef } from "react";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";

export const UploadBox = ({ onFileSelected, selectedFile, isProcessing }) => {
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) onFileSelected(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-brand-50/20"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,image/*"
        onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
        className="hidden"
      />
      <div className="max-w-md mx-auto space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center">
          <UploadCloud className="w-7 h-7" />
        </div>
        {selectedFile ? (
          <div>
            <p className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{selectedFile.name}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-bold text-slate-800">Drag & drop your textbook, notes or slides here</p>
            <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, or scanned images (up to 50MB)</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default UploadBox;
