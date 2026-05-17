"use client";

import { useEffect, useState } from "react";
import { generateSignedUrl, getEvidence } from "@/lib/actions/evidence.actions";
import type { GoalEvidence } from "@/lib/database.types";

interface EvidenceViewerProps {
  goalId: string;
}

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

function getPreviewType(fileType: string): "pdf" | "image" | "none" {
  if (fileType.includes("pdf")) return "pdf";
  if (fileType.includes("image")) return "image";
  return "none";
}

export default function EvidenceViewer({ goalId }: EvidenceViewerProps) {
  const [evidence, setEvidence] = useState<GoalEvidence[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvidence() {
      try {
        const data = await getEvidence(goalId);
        setEvidence(data);

        if (data.length > 0) {
          const paths = data.map((e) => e.file_path);
          const urls: Record<string, string> = {};
          for (const path of paths) {
            try {
              const url = await generateSignedUrl(path, 3600);
              urls[path] = url;
            } catch (err) {
              console.error(`Failed to generate URL for ${path}:`, err);
            }
          }
          setSignedUrls(urls);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load evidence");
      } finally {
        setLoading(false);
      }
    }
    loadEvidence();
  }, [goalId]);

  if (loading) {
    return (
      <div className="p-md text-on-surface-variant text-label-sm">
        Loading evidence...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-label-sm font-[500] text-error p-sm">
        {error}
      </p>
    );
  }

  if (evidence.length === 0) {
    return (
      <div className="p-md text-center border border-dashed border-on-surface-variant">
        <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
          attach_file
        </span>
        <p className="text-label-sm text-on-surface-variant mt-xs">
          No evidence attached
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm">
      <p className="text-label-bold font-[700] text-on-surface uppercase text-[10px] tracking-[0.05em]">
        Evidence ({evidence.length})
      </p>
      <div className="flex flex-col gap-xs">
        {evidence.map((file) => {
          const url = signedUrls[file.file_path];
          const previewType = getPreviewType(file.file_type);
          const isExpanded = expandedPreview === file.id;

          return (
            <div
              key={file.id}
              className="bg-surface-container-high border border-on-surface-variant overflow-hidden"
            >
              <div className="flex items-center justify-between p-sm">
                <div className="flex items-center gap-sm min-w-0">
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
                <div className="flex items-center gap-xs shrink-0">
                  {previewType !== "none" && url && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPreview(isExpanded ? null : file.id)
                      }
                      className="px-sm py-xs text-label-sm font-[500] text-primary hover:bg-primary/10 border border-primary transition-colors"
                    >
                      {isExpanded ? "Close" : "Preview"}
                    </button>
                  )}
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-sm py-xs text-label-sm font-[500] text-on-surface bg-surface-container-low border border-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-xs"
                      download={file.file_name}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        download
                      </span>
                      Download
                    </a>
                  ) : (
                    <span className="text-label-sm text-on-surface-variant px-sm">
                      Loading...
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && url && (
                <div className="border-t border-on-surface-variant">
                  {previewType === "pdf" && (
                    <iframe
                      src={url}
                      className="w-full h-[400px]"
                      title={`Preview: ${file.file_name}`}
                    />
                  )}
                  {previewType === "image" && (
                    <div className="p-md flex justify-center bg-surface-container-low">
                      <img
                        src={url}
                        alt={`Preview: ${file.file_name}`}
                        className="max-w-full max-h-[400px] object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}