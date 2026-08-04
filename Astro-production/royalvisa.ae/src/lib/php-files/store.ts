import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

export type PhpDeploymentRecord = {
  id: string;
  fileName: string;
  versionLabel: string;
  storedPath: string;
  deployedPath: string;
  uploadedAt: string;
  uploadedBy: string;
  live: boolean;
};

function safePhpName(name: string): string {
  const base = basename(name).replace(/[^\w.-]+/g, '_');
  return base.endsWith('.php') ? base : `${base}.php`;
}

export class PhpFileStore {
  constructor(
    private readonly adminRootDir: string,
    private readonly liveDir: string,
  ) {}

  private versionsDir() {
    return join(this.adminRootDir, 'php-files', 'versions');
  }

  private manifestPath() {
    return join(this.adminRootDir, 'php-files', 'manifest.json');
  }

  private async readManifest(): Promise<PhpDeploymentRecord[]> {
    try {
      const raw = await readFile(this.manifestPath(), 'utf8');
      const parsed = JSON.parse(raw) as PhpDeploymentRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeManifest(records: PhpDeploymentRecord[]): Promise<void> {
    await mkdir(dirname(this.manifestPath()), { recursive: true });
    await writeFile(this.manifestPath(), `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }

  async list(): Promise<PhpDeploymentRecord[]> {
    const records = await this.readManifest();
    return records.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  }

  async deploy(file: File, uploadedBy: string): Promise<PhpDeploymentRecord> {
    const fileName = safePhpName(file.name || 'script.php');
    const id = crypto.randomUUID();
    const versionLabel = new Date().toISOString().replace(/[:.]/g, '-');
    const storedPath = join(this.versionsDir(), `${fileName}.${versionLabel}${extname(fileName)}`);
    const deployedPath = join(this.liveDir, fileName);

    await mkdir(dirname(storedPath), { recursive: true });
    await mkdir(this.liveDir, { recursive: true });
    await writeFile(storedPath, Buffer.from(await file.arrayBuffer()));
    await copyFile(storedPath, deployedPath);

    const records = await this.readManifest();
    const nextRecord: PhpDeploymentRecord = {
      id,
      fileName,
      versionLabel,
      storedPath,
      deployedPath,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      live: true,
    };
    const next = records
      .map((record) => (record.fileName === fileName ? { ...record, live: false } : record))
      .concat(nextRecord);
    await this.writeManifest(next);
    return nextRecord;
  }

  async readLiveFile(fileName: string): Promise<string | null> {
    try {
      return await readFile(join(this.liveDir, safePhpName(fileName)), 'utf8');
    } catch {
      return null;
    }
  }

  async saveEditedLiveFile(fileName: string, content: string, uploadedBy: string): Promise<PhpDeploymentRecord> {
    const safeName = safePhpName(fileName);
    const id = crypto.randomUUID();
    const versionLabel = new Date().toISOString().replace(/[:.]/g, '-');
    const storedPath = join(this.versionsDir(), `${safeName}.${versionLabel}.php`);
    const deployedPath = join(this.liveDir, safeName);

    await mkdir(dirname(storedPath), { recursive: true });
    await mkdir(this.liveDir, { recursive: true });
    await writeFile(storedPath, content, 'utf8');
    await writeFile(deployedPath, content, 'utf8');

    const records = await this.readManifest();
    const nextRecord: PhpDeploymentRecord = {
      id,
      fileName: safeName,
      versionLabel,
      storedPath,
      deployedPath,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      live: true,
    };
    const next = records
      .map((record) => (record.fileName === safeName ? { ...record, live: false } : record))
      .concat(nextRecord);
    await this.writeManifest(next);
    return nextRecord;
  }

  async readLiveFiles(): Promise<Array<{ fileName: string; size: number; updatedAt: string }>> {
    const names = await readdir(this.liveDir).catch(() => []);
    const files = await Promise.all(
      names
        .filter((name) => name.endsWith('.php'))
        .map(async (name) => {
          const fileStat = await stat(join(this.liveDir, name));
          return {
            fileName: name,
            size: fileStat.size,
            updatedAt: fileStat.mtime.toISOString(),
          };
        }),
    );
    return files.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
}
