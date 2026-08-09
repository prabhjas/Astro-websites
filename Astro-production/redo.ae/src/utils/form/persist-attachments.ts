import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { assertValidPublicId, resolveContainedPath } from '@connect/site-cms/leads/public-id';

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

function attachmentDirectory(leadStoreDir: string, submissionId: string): string {
  assertValidPublicId(submissionId);
  const attachmentsRoot = resolveContainedPath(leadStoreDir, 'attachments');
  return resolveContainedPath(attachmentsRoot, submissionId);
}

function decodeBase64Strict(data: string): Buffer | null {
  const compact = data.replace(/\s+/g, '');
  if (!compact || compact.length % 4 !== 0) return null;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) return null;

  const buffer = Buffer.from(compact, 'base64');
  const canonical = buffer.toString('base64').replace(/=+$/, '');
  return canonical === compact.replace(/=+$/, '') ? buffer : null;
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

  const attachmentId = submissionId || randomUUID();
  assertValidPublicId(attachmentId);

  const candidates = files.filter((file) => file instanceof File && file.size > 0);
  for (const file of candidates) {
    const err = validateMeta(file.name, file.size);
    if (err) return { attachments: [], error: err };
  }

  // Complete validation and reads before making any filesystem changes.
  const prepared = await Promise.all(
    candidates.map(async (file) => ({ file, buffer: Buffer.from(await file.arrayBuffer()) })),
  );
  const dir = attachmentDirectory(leadStoreDir, attachmentId);
  await mkdir(dir, { recursive: true, mode: 0o750 });

  const attachments: StoredContactAttachment[] = [];
  for (const { file, buffer } of prepared) {
    const storedName = `${randomUUID()}-${safeFileName(file.name)}`;
    const storedPath = resolveContainedPath(dir, storedName);
    await writeFile(storedPath, buffer, { mode: 0o640, flag: 'wx' });
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

  const attachmentId = submissionId || randomUUID();
  assertValidPublicId(attachmentId);

  const prepared: Array<{ originalName: string; mimeType: string; buffer: Buffer }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { attachments: [], error: 'Invalid file upload data.' };
    }
    const originalName = String(item.name || 'upload.bin').slice(0, 255);
    const data = String(item.data || '');
    if (!data) continue;

    // Reject oversized input before allocating the decoded buffer.
    const compactData = data.replace(/\s+/g, '');
    const paddingBytes = compactData.endsWith('==') ? 2 : compactData.endsWith('=') ? 1 : 0;
    const estimatedBytes = Math.max(0, Math.floor((compactData.length * 3) / 4) - paddingBytes);
    const metaError = validateMeta(originalName, estimatedBytes);
    if (metaError) return { attachments: [], error: metaError };

    const buffer = decodeBase64Strict(data);
    if (!buffer) return { attachments: [], error: 'Invalid file upload data.' };
    const err = validateMeta(originalName, buffer.length);
    if (err) return { attachments: [], error: err };
    prepared.push({
      originalName,
      mimeType: String(item.type || 'application/octet-stream').slice(0, 120),
      buffer,
    });
  }

  // Every item and the public ID is valid before creating the directory.
  const dir = attachmentDirectory(leadStoreDir, attachmentId);
  await mkdir(dir, { recursive: true, mode: 0o750 });

  const attachments: StoredContactAttachment[] = [];
  for (const { originalName, mimeType, buffer } of prepared) {
    const storedName = `${randomUUID()}-${safeFileName(originalName)}`;
    const storedPath = resolveContainedPath(dir, storedName);
    await writeFile(storedPath, buffer, { mode: 0o640, flag: 'wx' });
    attachments.push({
      storedPath,
      originalName,
      mimeType,
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
