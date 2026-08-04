#!/usr/bin/env node
/**
 * Back-compat wrapper — prefers scripts/prepare-page.mjs homepage <flags>
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = ['prepare-page.mjs', 'homepage', ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { cwd: join(__dirname), stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
