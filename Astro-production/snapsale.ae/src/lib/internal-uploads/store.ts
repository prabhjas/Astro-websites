import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

export type InternalUploadRecord = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
};

type InternalUploadStoreOptions = {
  rootDir: string;
};

function sanitiseFilename(name: string): string {
  return basename(name).replace(/[^\w.-]+/g, '_') || 'upload.bin';
}

export class InternalUploadStore {
  private readonly rootDir: string;

  constructor(options: InternalUploadStoreOptions) {
    this.rootDir = options.rootDir;
  }

  private filesDir() {
    return join(this.rootDir, 'files');
  }

  private metaDir() {
    return join(this.rootDir, 'meta');
  }

  private metaPath(id: string) {
    return join(this.metaDir(), `${id}.json`);
  }

  private filePath(storedName: string) {
    return join(this.filesDir(), storedName);
  }

  async list(): Promise<InternalUploadRecord[]> {
    const names = await readdir(this.metaDir()).catch(() => []);
    const records = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          try {
            const raw = await readFile(join(this.metaDir(), name), 'utf8');
            return JSON.parse(raw) as InternalUploadRecord;
          } catch {
            return null;
          }
        }),
    );
    return records
      .filter((record): record is InternalUploadRecord => Boolean(record))
      .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  }

  async get(id: string): Promise<InternalUploadRecord | null> {
    try {
      const raw = await readFile(this.metaPath(id), 'utf8');
      return JSON.parse(raw) as InternalUploadRecord;
    } catch {
      return null;
    }
  }

  async save(file: File, uploadedBy: string): Promise<InternalUploadRecord> {
    const originalName = sanitiseFilename(file.name || 'upload.bin');
    const id = crypto.randomUUID();
    const storedName = `${id}${extname(originalName) || '.bin'}`;
    const record: InternalUploadRecord = {
      id,
      originalName,
      storedName,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
    };

    await mkdir(this.filesDir(), { recursive: true });
    await mkdir(this.metaDir(), { recursive: true });
    await writeFile(this.filePath(storedName), Buffer.from(await file.arrayBuffer()));
    await writeFile(this.metaPath(id), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    return record;
  }

  async delete(id: string): Promise<void> {
    const record = await this.get(id);
    if (!record) return;
    await rm(this.metaPath(id), { force: true });
    await rm(this.filePath(record.storedName), { force: true });
  }

  async readBinary(id: string): Promise<{ record: InternalUploadRecord; buffer: Buffer } | null> {
    const record = await this.get(id);
    if (!record) return null;
    try {
      const buffer = await readFile(this.filePath(record.storedName));
      return { record, buffer };
    } catch {
      return null;
    }
  }

  async exists(id: string): Promise<boolean> {
    const record = await this.get(id);
    if (!record) return false;
    const fileStat = await stat(this.filePath(record.storedName)).catch(() => null);
    return Boolean(fileStat);
  }
}
