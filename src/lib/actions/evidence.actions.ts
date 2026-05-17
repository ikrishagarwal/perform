"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { GoalEvidence, Database } from "@/lib/database.types";
import { randomUUID } from "crypto";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".png", ".txt"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BUCKET_NAME = "evidence_attachments";

function sanitizeFileName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const baseName = name.replace(`.${ext}`, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${baseName}.${ext}`;
}

function isValidFileType(fileName: string): boolean {
  const ext = "." + fileName.split(".").pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

export async function uploadEvidence(
  goalId: string,
  sheetId: string,
  file: File
): Promise<GoalEvidence> {
  if (!isValidFileType(file.name)) {
    throw new Error(
      `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 10MB limit`);
  }

  const adminClient = createAdminClient();

  const fileId = randomUUID();
  const sanitizedName = sanitizeFileName(file.name);
  const filePath = `${sheetId}/${goalId}/${fileId}-${sanitizedName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const evidenceRecord: GoalEvidence = {
    id: fileId,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type || "application/octet-stream",
    file_size: file.size,
    uploaded_at: new Date().toISOString(),
  };

  // @ts-ignore - Database type doesn't have new column yet
  const { data: goal, error: fetchError } = await adminClient
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (fetchError || !goal) {
    await adminClient.storage.from(BUCKET_NAME).remove([filePath]);
    throw new Error("Goal not found");
  }

  // @ts-ignore - Database type doesn't have new column yet
  const existingEvidence = ((goal as Record<string, unknown>).evidence_url as GoalEvidence[] | null) || [];
  const updatedEvidence = [...existingEvidence, evidenceRecord];

  // @ts-ignore - Database type doesn't have new column yet
  const { error: updateError } = await adminClient
    .from("goals")
    // @ts-ignore - Database type doesn't have new column yet
    .update({ evidence_url: updatedEvidence })
    .eq("id", goalId);

  if (updateError) {
    await adminClient.storage.from(BUCKET_NAME).remove([filePath]);
    throw new Error("Failed to save evidence record");
  }

  return evidenceRecord;
}

export async function getEvidence(
  goalId: string
): Promise<GoalEvidence[]> {
  const serverClient = await createServerClient();

  // @ts-ignore - Database type doesn't have new column yet
  const { data: goal, error } = await serverClient
    .from("goals")
    .select("evidence_url")
    .eq("id", goalId)
    .single();

  if (error || !goal) {
    throw new Error("Failed to fetch evidence");
  }

  // @ts-ignore - Database type doesn't have new column yet
  return ((goal as Record<string, unknown>).evidence_url as GoalEvidence[] | null) || [];
}

export async function deleteEvidence(
  goalId: string,
  evidenceId: string
): Promise<void> {
  const adminClient = createAdminClient();

  // @ts-ignore - Database type doesn't have new column yet
  const { data: goal, error: fetchError } = await adminClient
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (fetchError || !goal) {
    throw new Error("Goal not found");
  }

  // @ts-ignore - Database type doesn't have new column yet
  const existingEvidence = ((goal as Record<string, unknown>).evidence_url as GoalEvidence[] | null) || [];
  const evidenceToDelete = existingEvidence.find((e) => e.id === evidenceId);

  if (!evidenceToDelete) {
    throw new Error("Evidence file not found");
  }

  const { error: deleteError } = await adminClient.storage
    .from(BUCKET_NAME)
    .remove([evidenceToDelete.file_path]);

  if (deleteError) {
    console.error("Failed to delete file from storage:", deleteError);
  }

  const updatedEvidence = existingEvidence.filter((e) => e.id !== evidenceId);

  // @ts-ignore - Database type doesn't have new column yet
  const { error: updateError } = await adminClient
    .from("goals")
    // @ts-ignore - Database type doesn't have new column yet
    .update({ evidence_url: updatedEvidence })
    .eq("id", goalId);

  if (updateError) {
    throw new Error("Failed to update evidence record");
  }
}

export async function generateSignedUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function generateMultipleSignedUrls(
  filePaths: string[]
): Promise<Record<string, string>> {
  const adminClient = createAdminClient();
  const result: Record<string, string> = {};

  for (const path of filePaths) {
    try {
      const { data, error } = await adminClient.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 3600);

      if (!error && data) {
        result[path] = data.signedUrl;
      }
    } catch (err) {
      console.error(`Failed to generate signed URL for ${path}:`, err);
    }
  }

  return result;
}