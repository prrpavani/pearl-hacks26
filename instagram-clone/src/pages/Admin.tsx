import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  BarChart2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Play,
  RotateCcw,
  ImageIcon,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TENANT = "Instagram";

interface ImageData {
  image_url: string;
  ground_truth: string | null;
  wrong_options: string[];
  votes: Record<string, number>;
  verified_label: string | null;
  total_votes: number;
  threshold: number;
}

const Admin = () => {
  // ── SOL balance ──────────────────────────────────────────────────────────
  const [solBalance, setSolBalance] = useState("...");
  useEffect(() => {
    fetch(`${API}/sol-balance`)
      .then((r) => r.json())
      .then((d) => setSolBalance(`${d.balance} SOL`))
      .catch(() => setSolBalance("Unavailable"));
  }, []);

  // ── Upload form ──────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [groundTruth, setGroundTruth] = useState("");
  const [wrongOpt1, setWrongOpt1] = useState("");
  const [wrongOpt2, setWrongOpt2] = useState("");
  const [wrongOpt3, setWrongOpt3] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploadMsg(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return setUploadMsg({ text: "Select an image first.", ok: false });
    if (!groundTruth.trim() || !wrongOpt1.trim() || !wrongOpt2.trim() || !wrongOpt3.trim())
      return setUploadMsg({ text: "Fill in all four label fields.", ok: false });

    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append("tenant_name", TENANT);
      form.append("file", file);
      form.append("ground_truth", groundTruth.trim());
      form.append("wrong_option_1", wrongOpt1.trim());
      form.append("wrong_option_2", wrongOpt2.trim());
      form.append("wrong_option_3", wrongOpt3.trim());
      const res = await fetch(`${API}/admin/upload`, { method: "POST", body: form });
      if (res.ok) {
        setUploadMsg({ text: "Image uploaded and ready in Earn tab!", ok: true });
        setFile(null);
        setPreview(null);
        setGroundTruth("");
        setWrongOpt1("");
        setWrongOpt2("");
        setWrongOpt3("");
        await loadImages();
      } else {
        const err = await res.text();
        setUploadMsg({ text: `Upload failed: ${err}`, ok: false });
      }
    } catch {
      setUploadMsg({ text: "Upload failed — is the backend running?", ok: false });
    } finally {
      setUploading(false);
    }
  };

  // ── Dashboard ────────────────────────────────────────────────────────────
  const [images, setImages] = useState<ImageData[]>([]);
  const [threshold, setThreshold] = useState(5);
  const [loadingImages, setLoadingImages] = useState(false);
  const [simulatingUrl, setSimulatingUrl] = useState<string | null>(null);
  const [resettingUrl, setResettingUrl] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const res = await fetch(`${API}/admin/images?tenant_name=${TENANT}`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images ?? []);
        setThreshold(data.threshold ?? 5);
      }
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleSimulate = async (imageUrl: string) => {
    setSimulatingUrl(imageUrl);
    try {
      const form = new FormData();
      form.append("tenant_name", TENANT);
      form.append("image_url", imageUrl);
      form.append("count", "5");
      await fetch(`${API}/admin/simulate-votes`, { method: "POST", body: form });
      await loadImages();
    } finally {
      setSimulatingUrl(null);
    }
  };

  const handleReset = async (imageUrl: string) => {
    setResettingUrl(imageUrl);
    try {
      const form = new FormData();
      form.append("tenant_name", TENANT);
      form.append("image_url", imageUrl);
      await fetch(`${API}/admin/reset-votes`, { method: "POST", body: form });
      await loadImages();
    } finally {
      setResettingUrl(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <div className="border-b border-border px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#a445ee] to-[#f58529] bg-clip-text text-transparent">
            Vaultic Data Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload labeled images · Track crowd votes · Power the Earn tab
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Payout wallet balance</p>
          <p className="text-base font-mono font-semibold text-[#f58529]">{solBalance}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Upload Panel ── */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#a445ee]" />
            Add New Image
          </h2>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#a445ee] transition-colors min-h-[160px]"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="max-h-40 max-w-full rounded-lg object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ImageIcon className="w-8 h-8 opacity-40" />
                <span className="text-sm">Drag & drop or click to select</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Ground truth */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-green-400 uppercase tracking-wide">
              Correct label (ground truth)
            </label>
            <input
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              placeholder="e.g. golden retriever"
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-green-400"
            />
          </div>

          {/* Wrong options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-red-400 uppercase tracking-wide">
              3 plausible-but-wrong options
            </label>
            {[
              [wrongOpt1, setWrongOpt1, "Wrong option 1"],
              [wrongOpt2, setWrongOpt2, "Wrong option 2"],
              [wrongOpt3, setWrongOpt3, "Wrong option 3"],
            ].map(([val, setter, ph]) => (
              <input
                key={ph as string}
                value={val as string}
                onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                placeholder={ph as string}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-red-400"
              />
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#a445ee] to-[#f58529] disabled:opacity-40 transition-opacity"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Upload Image"}
          </button>

          {uploadMsg && (
            <p
              className={`text-xs text-center ${
                uploadMsg.ok ? "text-green-400" : "text-red-400"
              }`}
            >
              {uploadMsg.text}
            </p>
          )}
        </div>

        {/* ── Vote Tracker Panel ── */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#f58529]" />
              Image Vote Tracker
            </h2>
            <button
              onClick={loadImages}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 text-muted-foreground ${loadingImages ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <p className="text-xs text-muted-foreground -mt-2">
            Threshold: <span className="font-semibold text-foreground">{threshold} votes</span> to
            verify an image · Green = correct · Red = wrong
          </p>

          <div className="flex flex-col gap-3 overflow-y-auto max-h-[520px] pr-1">
            {images.length === 0 && !loadingImages && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ImageIcon className="w-8 h-8 opacity-30" />
                <p className="text-sm">No images yet — upload one!</p>
              </div>
            )}

            {images.map((img) => {
              const filename = img.image_url.split("/").pop() ?? img.image_url;
              const allOptions = img.ground_truth
                ? [img.ground_truth, ...img.wrong_options]
                : img.wrong_options;
              const progressPct = Math.min((img.total_votes / threshold) * 100, 100);

              return (
                <div
                  key={img.image_url}
                  className="rounded-xl border border-border bg-background p-4 flex flex-col gap-3"
                >
                  {/* Image header row */}
                  <div className="flex items-start gap-3">
                    <img
                      src={`${API}${img.image_url}`}
                      alt={filename}
                      className="w-14 h-14 rounded-lg object-cover border border-border shrink-0 bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate max-w-[140px]">{filename}</p>
                        {img.verified_label ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 font-semibold shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">Pending</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {img.total_votes} / {threshold} votes
                        {img.verified_label && ` · "${img.verified_label}"`}
                      </p>
                      {/* Progress bar toward threshold */}
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progressPct}%`,
                            background: img.verified_label
                              ? "#4ade80"
                              : "linear-gradient(90deg,#a445ee,#f58529)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSimulate(img.image_url)}
                        disabled={
                          simulatingUrl === img.image_url ||
                          resettingUrl === img.image_url ||
                          !!img.verified_label
                        }
                        title="Simulate 5 crowd votes"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-[#a445ee]/10 text-[#a445ee] hover:bg-[#a445ee]/20 disabled:opacity-40 transition-colors"
                      >
                        {simulatingUrl === img.image_url ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        Simulate
                      </button>
                      <button
                        onClick={() => handleReset(img.image_url)}
                        disabled={
                          resettingUrl === img.image_url || simulatingUrl === img.image_url
                        }
                        title="Reset votes — image re-appears in Earn tab"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground hover:bg-border disabled:opacity-40 transition-colors"
                      >
                        {resettingUrl === img.image_url ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Vote bars per option */}
                  {allOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {allOptions.map((opt) => {
                        const count = img.votes[opt] ?? 0;
                        const pct = img.total_votes > 0 ? (count / img.total_votes) * 100 : 0;
                        const isCorrect = opt === img.ground_truth;
                        const isWinner = opt === img.verified_label;
                        return (
                          <div key={opt} className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: isCorrect ? "#4ade80" : "#f87171" }}
                            />
                            <span className="text-xs text-muted-foreground truncate w-32 shrink-0">
                              {opt}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  background: isWinner
                                    ? "#4ade80"
                                    : isCorrect
                                    ? "#86efac"
                                    : "#f87171",
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono w-5 text-right shrink-0 text-muted-foreground">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
