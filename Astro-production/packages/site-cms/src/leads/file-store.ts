import { mkdir, readdir, readFile, stat, appendFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { LeadDeliveryAttemptRecord, LeadStoreEvent, LeadSubmissionRecord } from './types';

type StoreKind = 'submissions' | 'attempts';

type FileLeadStoreOptions = {
  rootDir: string;
  maxFileBytes: number;
};

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path));
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmpPath, path);
}

function getPeriodKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function getDateKey(dateIso: string): string {
  return dateIso.slice(0, 10);
}

async function resolveWritableFile(baseDir: string, kind: StoreKind, dateIso: string, maxFileBytes: number): Promise<string> {
  const monthDir = join(baseDir, kind, getPeriodKey(dateIso));
  await ensureDir(monthDir);

  const prefix = `${kind}-${getDateKey(dateIso)}-`;
  const files = (await readdir(monthDir).catch(() => []))
    .filter((name) => name.startsWith(prefix) && name.endsWith('.ndjson'))
    .sort();

  if (files.length > 0) {
    const latest = join(monthDir, files[files.length - 1]);
    const latestStat = await stat(latest).catch(() => null);
    if (latestStat && latestStat.size < maxFileBytes) return latest;
  }

  const nextIndex = files.length + 1;
  return join(monthDir, `${prefix}${String(nextIndex).padStart(3, '0')}.ndjson`);
}

async function appendEvent(path: string, event: LeadStoreEvent): Promise<void> {
  await ensureDir(dirname(path));
  await appendFile(path, `${JSON.stringify(event)}\n`, 'utf8');
}

async function listFilesRecursive(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(fullPath, extension);
      return entry.name.endsWith(extension) ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

export class FileLeadStore {
  private readonly rootDir: string;
  private readonly maxFileBytes: number;

  constructor(options: FileLeadStoreOptions) {
    this.rootDir = options.rootDir;
    this.maxFileBytes = options.maxFileBytes;
  }

  private statePath(publicId: string): string {
    return join(this.rootDir, 'state', `${publicId}.json`);
  }

  async getSubmission(publicId: string): Promise<LeadSubmissionRecord | null> {
    const path = this.statePath(publicId);
    try {
      const raw = await readFile(path, 'utf8');
      return JSON.parse(raw) as LeadSubmissionRecord;
    } catch {
      return null;
    }
  }

  async listSubmissions(): Promise<LeadSubmissionRecord[]> {
    const stateDir = join(this.rootDir, 'state');
    const names = await readdir(stateDir).catch(() => []);
    const records = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          try {
            const raw = await readFile(join(stateDir, name), 'utf8');
            return JSON.parse(raw) as LeadSubmissionRecord;
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
    const attemptsDir = join(this.rootDir, 'attempts');
    const files = await listFilesRecursive(attemptsDir, '.ndjson');
    const records: LeadDeliveryAttemptRecord[] = [];
    for (const file of files) {
      const raw = await readFile(file, 'utf8').catch(() => '');
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

  async listDueRetries(nowIso: string): Promise<LeadSubmissionRecord[]> {
    const submissions = await this.listSubmissions();
    return submissions.filter(
      (record) =>
        record.deliveryStatus === 'retry_scheduled' &&
        Boolean(record.nextRetryAt) &&
        String(record.nextRetryAt) <= nowIso,
    );
  }

  async storeSubmission(record: LeadSubmissionRecord): Promise<void> {
    const createdAt = record.createdAt || new Date().toISOString();
    const submissionsFile = await resolveWritableFile(this.rootDir, 'submissions', createdAt, this.maxFileBytes);
    await appendEvent(submissionsFile, {
      type: 'lead_submission_stored',
      record,
      createdAt,
    });
    await writeJsonAtomic(this.statePath(record.publicId), record);
  }

  async updateSubmission(record: LeadSubmissionRecord): Promise<void> {
    const updatedAt = record.updatedAt || new Date().toISOString();
    const submissionsFile = await resolveWritableFile(this.rootDir, 'submissions', updatedAt, this.maxFileBytes);
    await appendEvent(submissionsFile, {
      type: 'lead_delivery_updated',
      record,
      createdAt: updatedAt,
    });
    await writeJsonAtomic(this.statePath(record.publicId), record);
  }

  async storeAttempt(record: LeadDeliveryAttemptRecord): Promise<void> {
    const attemptsFile = await resolveWritableFile(this.rootDir, 'attempts', record.createdAt, this.maxFileBytes);
    await appendEvent(attemptsFile, {
      type: 'lead_delivery_attempt',
      record,
      createdAt: record.createdAt,
    });
  }
}
