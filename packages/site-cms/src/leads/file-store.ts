import { constants } from 'node:fs';
import { mkdir, open, readdir, lstat, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import type { LeadDeliveryAttemptRecord, LeadStoreEvent, LeadSubmissionRecord } from './types';
import { assertValidPublicId, isValidPublicId, resolveContainedPath } from './public-id';
import { normaliseDeliveries } from './destinations/types';

type StoreKind = 'submissions' | 'attempts';

type FileLeadStoreOptions = {
  rootDir: string;
  maxFileBytes: number;
};

async function ensureDir(path: string): Promise<void> {
  // Lead records contain PII. Explicit modes keep newly-created paths private
  // even when a service inherits the host's permissive default umask.
  await mkdir(path, { recursive: true, mode: 0o750 });
}

function assertCanonicalTimestamp(value: string, fieldName: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new TypeError(`Invalid ${fieldName}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError(`Invalid ${fieldName}`);
  }
  return value;
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  const tmpPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o640,
    flag: 'wx',
  });
  await rename(tmpPath, path);
}

async function readUtf8NoFollow(path: string): Promise<string> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    return await handle.readFile('utf8');
  } finally {
    await handle.close();
  }
}

function getPeriodKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function getDateKey(dateIso: string): string {
  return dateIso.slice(0, 10);
}

async function resolveWritableFile(baseDir: string, kind: StoreKind, dateIso: string, maxFileBytes: number): Promise<string> {
  assertCanonicalTimestamp(dateIso, `${kind} timestamp`);
  const kindDir = resolveContainedPath(baseDir, kind);
  const monthDir = resolveContainedPath(kindDir, getPeriodKey(dateIso));
  await ensureDir(monthDir);

  const prefix = `${kind}-${getDateKey(dateIso)}-`;
  const files = (await readdir(monthDir).catch(() => []))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.ndjson'))
    .sort();

  if (files.length > 0) {
    const latest = resolveContainedPath(monthDir, files[files.length - 1]);
    const latestStat = await lstat(latest).catch(() => null);
    if (latestStat?.isFile() && latestStat.size < maxFileBytes) return latest;
  }

  const nextIndex = files.length + 1;
  return resolveContainedPath(monthDir, `${prefix}${String(nextIndex).padStart(3, '0')}.ndjson`);
}

async function appendEvent(path: string, event: LeadStoreEvent): Promise<void> {
  await ensureDir(dirname(path));
  const handle = await open(
    path,
    constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o640,
  );
  try {
    await handle.writeFile(`${JSON.stringify(event)}\n`, 'utf8');
  } finally {
    await handle.close();
  }
}

async function listFilesRecursive(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isSymbolicLink()) return [];
      if (entry.isDirectory()) return listFilesRecursive(fullPath, extension);
      return entry.isFile() && entry.name.endsWith(extension) ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

export class FileLeadStore {
  private readonly rootDir: string;
  private readonly maxFileBytes: number;

  constructor(options: FileLeadStoreOptions) {
    this.rootDir = resolve(options.rootDir);
    this.maxFileBytes = options.maxFileBytes;
  }

  private statePath(publicId: string): string {
    assertValidPublicId(publicId);
    const stateDir = resolveContainedPath(this.rootDir, 'state');
    return resolveContainedPath(stateDir, `${publicId}.json`);
  }

  async getSubmission(publicId: string): Promise<LeadSubmissionRecord | null> {
    if (!isValidPublicId(publicId)) return null;
    const path = this.statePath(publicId);
    try {
      const raw = await readUtf8NoFollow(path);
      return JSON.parse(raw) as LeadSubmissionRecord;
    } catch {
      return null;
    }
  }

  async listSubmissions(): Promise<LeadSubmissionRecord[]> {
    const stateDir = join(this.rootDir, 'state');
    const entries = await readdir(stateDir, { withFileTypes: true }).catch(() => []);
    const records = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.endsWith('.json'))
        .map(async (entry) => {
          try {
            const raw = await readUtf8NoFollow(resolveContainedPath(stateDir, entry.name));
            const record = JSON.parse(raw) as LeadSubmissionRecord;
            return isValidPublicId(record.publicId) ? record : null;
          } catch {
            return null;
          }
        }),
    );

    return records
      .filter((record): record is LeadSubmissionRecord => Boolean(record))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async listAttempts(publicId?: string): Promise<LeadDeliveryAttemptRecord[]> {
    if (publicId !== undefined && !isValidPublicId(publicId)) return [];
    const attemptsDir = join(this.rootDir, 'attempts');
    const files = await listFilesRecursive(attemptsDir, '.ndjson');
    const records: LeadDeliveryAttemptRecord[] = [];
    for (const file of files) {
      const raw = await readUtf8NoFollow(file).catch(() => '');
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as LeadStoreEvent;
          if (event.type !== 'lead_delivery_attempt') continue;
          if (publicId && event.record.publicId !== publicId) continue;
          records.push(event.record);
        } catch {
          // Ignore malformed log lines so one bad record does not block the dashboard.
        }
      }
    }
    return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /**
   * Leads with at least one destination whose retry is due.
   *
   * This deliberately does NOT filter on the record-level deliveryStatus and
   * nextRetryAt any more. Those are aliases of the Pipedrive destination, so a
   * lead where only Flow was owed a retry carried no top-level nextRetryAt and
   * would never have been picked up.
   */
  async listDueRetries(nowIso: string): Promise<LeadSubmissionRecord[]> {
    const submissions = await this.listSubmissions();
    return submissions.filter((record) => {
      const deliveries = normaliseDeliveries(record);
      return Object.values(deliveries).some(
        (delivery) =>
          delivery.status === 'retry_scheduled' &&
          Boolean(delivery.nextRetryAt) &&
          String(delivery.nextRetryAt) <= nowIso,
      );
    });
  }

  async storeSubmission(record: LeadSubmissionRecord): Promise<void> {
    assertValidPublicId(record.publicId);
    const createdAt = assertCanonicalTimestamp(record.createdAt || new Date().toISOString(), 'createdAt');
    const submissionsFile = await resolveWritableFile(this.rootDir, 'submissions', createdAt, this.maxFileBytes);
    await appendEvent(submissionsFile, {
      type: 'lead_submission_stored',
      record,
      createdAt,
    });
    await writeJsonAtomic(this.statePath(record.publicId), record);
  }

  async updateSubmission(record: LeadSubmissionRecord): Promise<void> {
    assertValidPublicId(record.publicId);
    const updatedAt = assertCanonicalTimestamp(record.updatedAt || new Date().toISOString(), 'updatedAt');
    const submissionsFile = await resolveWritableFile(this.rootDir, 'submissions', updatedAt, this.maxFileBytes);
    await appendEvent(submissionsFile, {
      type: 'lead_delivery_updated',
      record,
      createdAt: updatedAt,
    });
    await writeJsonAtomic(this.statePath(record.publicId), record);
  }

  async storeAttempt(record: LeadDeliveryAttemptRecord): Promise<void> {
    assertValidPublicId(record.publicId);
    const createdAt = assertCanonicalTimestamp(record.createdAt, 'createdAt');
    const attemptsFile = await resolveWritableFile(this.rootDir, 'attempts', createdAt, this.maxFileBytes);
    await appendEvent(attemptsFile, {
      type: 'lead_delivery_attempt',
      record,
      createdAt: record.createdAt,
    });
  }
}
