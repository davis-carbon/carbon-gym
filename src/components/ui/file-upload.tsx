"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface FileUploadProps {
  bucket: "avatars" | "exercise-media" | "resources" | "message-attachments" | "uploads";
  path?: string;
  accept?: string;
  label?: string;
  currentUrl?: string | null;
  onUploaded: (url: string, path: string) => void;
  maxSizeMB?: number;
}

export function FileUpload({
  bucket,
  path,
  accept,
  label = "Upload a file",
  currentUrl,
  onUploaded,
  maxSizeMB = 100,
}: FileUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentUrl ?? null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast("error", `File too large. Max ${maxSizeMB}MB`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);
      if (path) formData.append("path", path);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const { url, path: uploadedPath } = await res.json();
      setUploadedUrl(url);
      onUploaded(url, uploadedPath);
      toast("success", "File uploaded");
    } catch (err: any) {
      toast("error", err.message);
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isImage = accept?.includes("image") || uploadedUrl?.match(/\.(png|jpg|jpeg|gif|webp)$/i);
  const isVideo = accept?.includes("video") || uploadedUrl?.match(/\.(mp4|mov|webm)$/i);

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploadedUrl ? (
        <div className="relative rounded-lg border border-stone-200 overflow-hidden">
          {isImage ? (
            <img src={uploadedUrl} alt="Uploaded" className="w-full h-40 object-cover" />
          ) : isVideo ? (
            <video src={uploadedUrl} controls className="w-full h-40 object-cover" />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-stone-50">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm truncate">{uploadedUrl.split("/").pop()}</span>
            </div>
          )}
          <button
            onClick={() => { setUploadedUrl(null); onUploaded("", ""); }}
            className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            dragOver ? "border-stone-600 bg-stone-50" : uploading ? "border-stone-300 bg-stone-50" : "border-stone-300 hover:border-stone-400"
          } p-6 text-center`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </div>
          ) : (
            <>
              <Upload className="h-5 w-5 text-stone-400 mx-auto mb-2" />
              <p className="text-sm text-stone-600">{label}</p>
              <p className="text-xs text-stone-400 mt-1">Drag & drop or click to select · Max {maxSizeMB}MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
