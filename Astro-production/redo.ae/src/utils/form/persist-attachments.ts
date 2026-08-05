import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export type StoredContactAttachment = {
  storedPath: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type IncomingBase64Attachment = {
  name?: string;
  type?: string;
  data?: string;
};

const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'webp']);
const MAX_FILES = 5;
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB each

function safeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120);
  return base || 'upload.bin';
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

function validateMeta(originalName: string, size: number): string | undefined {
  if (size > MAX_FILE_BYTES) {
    return `Each file must be under ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB.`;
  }
  const ext = extOf(originalName);
  if (!ALLOWED_EXT.has(ext)) {
    return 'Allowed file types: pdf, jpg, jpeg, png, doc, docx, webp.';
  }
  return undefined;
}

/**
 * Persist CF7 / multistep file inputs under the lead store for Pipedrive upload.
 */
export async function persistContactAttachments(
  leadStoreDir: string,
  submissionId: string,
  files: File[],
): Promise<{ attachments: StoredContactAttachment[]; error?: string }> {
  if (!files.length) return { attachments: [] };
  if (files.length > MAX_FILES) {
    return { attachments: [], error: `Please attach at most ${MAX_FILES} files.` };
  }

  const dir = join(leadStoreDir, 'attachments', submissionId || randomUUID());
  await mkdir(dir, { recursive: true });

  const attachments: StoredContactAttachment[] = [];
  for (const file of files) {
    if (!(file instanceof File) || !file.size) continue;
    const err = validateMeta(file.name, file.size);
    if (err) return { attachments: [], error: err };
    const storedName = `${randomUUID()}-${safeFileName(file.name)}`;
    const storedPath = join(dir, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storedPath, buffer);
    attachments.push({
      storedPath,
      originalName: file.name.slice(0, 255),
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    });
  }

  return { attachments };
}

/** Persist files sent as base64 in the JSON contact payload (avoids Astro form CSRF). */
export async function persistBase64Attachments(
  leadStoreDir: string,
  submissionId: string,
  items: IncomingBase64Attachment[],
): Promise<{ attachments: StoredContactAttachment[]; error?: string }> {
  if (!items.length) return { attachments: [] };
  if (items.length > MAX_FILES) {
    return { attachments: [], error: `Please attach at most ${MAX_FILES} files.` };
  }

  const dir = join(leadStoreDir, 'attachments', submissionId || randomUUID());
  await mkdir(dir, { recursive: true });

  const attachments: StoredContactAttachment[] = [];
  for (const item of items) {
    const originalName = String(item.name || 'upload.bin').slice(0, 255);
    const data = String(item.data || '');
    if (!data) continue;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(data, 'base64');
    } catch {
      return { attachments: [], error: 'Invalid file upload data.' };
    }
    const err = validateMeta(originalName, buffer.length);
    if (err) return { attachments: [], error: err };
    const storedName = `${randomUUID()}-${safeFileName(originalName)}`;
    const storedPath = join(dir, storedName);
    await writeFile(storedPath, buffer);
    attachments.push({
      storedPath,
      originalName,
      mimeType: String(item.type || 'application/octet-stream').slice(0, 120),
      size: buffer.length,
    });
  }

  return { attachments };
}

export function collectFilesFromFormData(formData: FormData): File[] {
  const files: File[] = [];
  formData.forEach((value) => {
    if (value instanceof File && value.size > 0 && value.name) {
      files.push(value);
    }
  });
  return files;
}
