import React, { useState, useRef, useEffect } from "react";

const Admin = () => {
  // Real SOL balance
  const [solBalance, setSolBalance] = useState<string>("...");
    useEffect(() => {
      fetch("http://localhost:8000/sol-balance")
        .then(res => res.json())
        .then(data => {
          setSolBalance(`${data.balance} SOL`);
        })
        .catch(() => setSolBalance("Error fetching balance"));
    }, []);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("Instagram"); // Default to seeded tenant

  // Drag and drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleSubmit = async () => {
    if (!files.length) {
      setUploadStatus("No files selected.");
      return;
    }
    setUploadStatus("Uploading...");
    try {
      const formData = new FormData();
      formData.append("tenant_name", tenantName);
      files.forEach((file) => {
        formData.append("files", file); // send all files in one request
      });
      const res = await fetch("http://localhost:8000/tenant/upload-image", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setUploadStatus(`Uploaded ${files.length} of ${files.length} images.`);
      } else {
        setUploadStatus("Upload failed.");
      }
    } catch (err) {
      setUploadStatus("Upload failed.");
    }
    setFiles([]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files || []));
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
          <button
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-[#a445ee] to-[#f58529] text-white font-semibold text-xl shadow-md flex items-center gap-2 hover:scale-105 transition-transform mt-2"
            onClick={handleUploadClick}
          >
            <svg className="w-6 h-6" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 17V7" strokeLinecap="round" />
              <path d="M8 11l4-4 4 4" strokeLinecap="round" />
              <rect x="4" y="17" width="16" height="2" rx="1" fill="white" />
            </svg>
            Upload
          </button>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-md text-[#a445ee] mt-6">
            {files.length > 0 ? `${files.length} file(s) ready to upload` : "Drag and drop or select images"}
          </div>
          {/* Tenant name input */}
          <input
            type="text"
            value={tenantName}
            onChange={e => setTenantName(e.target.value)}
            placeholder="Tenant name"
            className="mt-2 px-4 py-2 rounded-xl border border-[#a445ee]"
          />
          {/* Submit button */}
          <button
            className="mt-4 px-8 py-3 rounded-xl bg-[#a445ee] text-white font-semibold text-lg shadow-md hover:scale-105 transition-transform"
            onClick={handleSubmit}
            disabled={files.length === 0}
          >
            Submit Images
          </button>
          <div className="mt-2 text-sm text-[#a445ee]">{uploadStatus}</div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
