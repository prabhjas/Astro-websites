import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
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

function decodedBase64Size(data: string): number | null {
  if (!data || data.length % 4 !== 0) return null;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) return null;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const paddingBytes = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
  if (paddingBytes === 2 && (alphabet.indexOf(data[data.length - 3]) & 0x0f) !== 0) return null;
  if (paddingBytes === 1 && (alphabet.indexOf(data[data.length - 2]) & 0x03) !== 0) return null;
  return Math.floor((data.length * 3) / 4) - paddingBytes;
}

async function persistPreparedAttachments(
  leadStoreDir: string,
  attachmentId: string,
  prepared: Array<{ originalName: string; mimeType: string; size: number; read: () => Promise<Buffer> }>,
): Promise<StoredContactAttachment[]> {
  const finalDir = attachmentDirectory(leadStoreDir, attachmentId);
  const attachmentsRoot = resolveContainedPath(leadStoreDir, 'attachments');
  await mkdir(attachmentsRoot, { recursive: true, mode: 0o750 });
  const stagingDir = resolveContainedPath(attachmentsRoot, `.pending-${attachmentId}-${randomUUID()}`);
  await mkdir(stagingDir, { mode: 0o750 });

  const attachments: StoredContactAttachment[] = [];
  try {
    for (const item of prepared) {
      const storedName = `${randomUUID()}-${safeFileName(item.originalName)}`;
      const stagingPath = resolveContainedPath(stagingDir, storedName);
      const storedPath = resolveContainedPath(finalDir, storedName);
      const buffer = await item.read();
      if (buffer.length !== item.size) throw new Error('Attachment size changed during processing');
      await writeFile(stagingPath, buffer, { mode: 0o640, flag: 'wx' });
      attachments.push({
        storedPath,
        originalName: item.originalName,
        mimeType: item.mimeType,
        size: item.size,
      });
    }
    await rename(stagingDir, finalDir);
    return attachments;
  } catch (error) {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
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

  const prepared = candidates.map((file) => ({
    originalName: file.name.slice(0, 255),
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    read: async () => Buffer.from(await file.arrayBuffer()),
  }));
  return { attachments: await persistPreparedAttachments(leadStoreDir, attachmentId, prepared) };
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

  const prepared: Array<{ originalName: string; mimeType: string; size: number; read: () => Promise<Buffer> }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      return { attachments: [], error: 'Invalid file upload data.' };
    }
    const originalName = String(item.name || 'upload.bin').slice(0, 255);
    const data = String(item.data || '');
    if (!data) continue;

    // Validate syntax, canonical padding bits, and decoded size without first
    // allocating a second full-size buffer.
    const decodedSize = decodedBase64Size(data);
    if (decodedSize === null) return { attachments: [], error: 'Invalid file upload data.' };
    const metaError = validateMeta(originalName, decodedSize);
    if (metaError) return { attachments: [], error: metaError };
    prepared.push({
      originalName,
      mimeType: String(item.type || 'application/octet-stream').slice(0, 120),
      size: decodedSize,
      read: async () => Buffer.from(data, 'base64'),
    });
  }

  // Every item and the public ID is valid before creating the staging tree.
  return { attachments: await persistPreparedAttachments(leadStoreDir, attachmentId, prepared) };
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
