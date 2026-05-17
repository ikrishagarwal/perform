"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadEvidence, deleteEvidence, getEvidence } from "@/lib/actions/evidence.actions";
import type { GoalEvidence } from "@/lib/database.types";

interface EvidenceUploaderProps {
  goalId: string;
  sheetId: string;
  onEvidenceChange?: (evidence: GoalEvidence[]) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "text/plain",
];

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".png", ".txt"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "picture_as_pdf";
  if (fileType.includes("word") || fileType.includes("document")) return "description";
  if (fileType.includes("sheet") || fileType.includes("excel")) return "table_chart";
  if (fileType.includes("image")) return "image";
  return "insert_drive_file";
}

export default function EvidenceUploader({
  goalId,
  sheetId,
  onEvidenceChange,
}: EvidenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<GoalEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEvidence = useCallback(async () => {
    try {
      const data = await getEvidence(goalId);
      setEvidence(data);
      onEvidenceChange?.(data);
    } catch (err) {
      console.error("Failed to load evidence:", err);
    } finally {
      setLoading(false);
    }
  }, [goalId, onEvidenceChange]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit`;
    }
    return null;
  };

  const handleUpload = async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      setUploading(true);
      try {
        const uploaded = await uploadEvidence(goalId, sheetId, file);
        const updated = [...evidence, uploaded];
        setEvidence(updated);
        onEvidenceChange?.(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (evidenceId: string) => {
    try {
      await deleteEvidence(goalId, evidenceId);
      const updated = evidence.filter((e) => e.id !== evidenceId);
      setEvidence(updated);
      onEvidenceChange?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [evidence]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files);
      }
    },
    [evidence]
  );

  if (loading) {
    return (
      <div className="p-md text-on-surface-variant text-label-sm">
        Loading evidence...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm">
      <div
        className={`border-2 border-dashed p-lg text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-on-surface-variant hover:border-on-surface hover:bg-surface-container-high"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant">
          cloud_upload
        </span>
        <p className="text-label-md font-[500] text-on-surface mt-sm">
          {uploading ? "Uploading..." : "Drop files here or click to upload"}
        </p>
        <p className="text-label-sm text-on-surface-variant mt-xs">
          PDF, DOCX, XLSX, PNG, TXT (max 10MB)
        </p>
      </div>

      {error && (
        <p className="text-label-sm font-[500] text-error bg-error/10 p-sm border-2 border-error">
          {error}
        </p>
      )}

      {evidence.length > 0 && (
        <div className="flex flex-col gap-xs mt-sm">
          <p className="text-label-bold font-[700] text-on-surface uppercase text-[10px] tracking-[0.05em]">
            Attached Files ({evidence.length})
          </p>
          {evidence.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-sm bg-surface-container-high border border-on-surface-variant"
            >
              <div className="flex items-center gap-sm overflow-hidden">
                <span className="material-symbols-outlined text-on-surface-variant shrink-0">
                  {getFileIcon(file.file_type)}
                </span>
                <div className="min-w-0">
                  <p className="text-label-md font-[500] text-on-surface truncate">
                    {file.file_name}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(file.id)}
                className="p-xs hover:bg-error-container rounded transition-colors"
                title="Delete file"
              >
                <span className="material-symbols-outlined text-[20px] text-error">
                  delete
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}