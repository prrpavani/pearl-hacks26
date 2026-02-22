import React, { useState } from "react";

const Admin = () => {
  // Static SOL balance
  const solBalance = "12.34 SOL";
  const [files, setFiles] = useState<File[]>([]);

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #a445ee 0%, #f58529 50%, #fdc800 75%, #ff61a6 100%)"
      }}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="text-center mb-12">
          <span className="text-6xl font-bold text-foreground">SOL Balance: {solBalance}</span>
        </div>
        <div
          className="flex flex-col items-center justify-center rounded-3xl bg-white/80 w-[520px] h-[340px] mx-auto shadow-xl border border-[#a445ee]/30"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          {/* Icon */}
          <svg className="w-24 h-24 mb-6 mt-4" viewBox="0 0 64 64" fill="none">
            <rect x="16" y="24" width="32" height="16" rx="4" fill="#a445ee" fillOpacity="0.15" />
            <rect x="24" y="16" width="16" height="16" rx="4" fill="#a445ee" fillOpacity="0.25" />
            <path d="M32 32v8" stroke="#a445ee" strokeWidth="2" strokeLinecap="round" />
            <path d="M32 36l2-2m-2 2l-2-2" stroke="#a445ee" strokeWidth="2" strokeLinecap="round" />
            <circle cx="48" cy="40" r="4" fill="#a445ee" fillOpacity="0.15" />
          </svg>
          {/* Upload button */}
          <label htmlFor="file-upload" className="mt-2">
            <button
              className="px-10 py-4 rounded-2xl bg-gradient-to-r from-[#a445ee] to-[#f58529] text-white font-semibold text-xl shadow-md flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <svg className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 17V7" strokeLinecap="round" />
                <path d="M8 11l4-4 4 4" strokeLinecap="round" />
                <rect x="4" y="17" width="16" height="2" rx="1" fill="white" />
              </svg>
              Upload
            </button>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <div className="text-md text-[#a445ee] mt-6">
            {files.length > 0 ? `${files.length} file(s) ready to upload` : "Drag and drop or select images"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
