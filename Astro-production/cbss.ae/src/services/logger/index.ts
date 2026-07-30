import { getServerEnv } from '../../env/server';
import { maskSensitiveValue } from '../../utils/form/mask';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  try {
    const configured = (getServerEnv().logLevel || 'info').toLowerCase() as LogLevel;
    return LEVELS[level] >= (LEVELS[configured] ?? LEVELS.info);
  } catch {
    return level !== 'debug';
  }
}

function write(level: LogLevel, payload: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const line = JSON.stringify(entry, (_key, value) => {
    if (typeof value === 'string' && value.includes('@')) {
      return maskSensitiveValue(value, 'email');
    }
    return value;
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logInfo(event: string, data: Record<string, unknown> = {}): void {
  write('info', { event, ...data });
}

export function logWarn(event: string, data: Record<string, unknown> = {}): void {
  write('warn', { event, ...data });
}

export function logDebug(event: string, data: Record<string, unknown> = {}): void {
  write('debug', { event, ...data });
}

export function logFormFailure(data: Record<string, unknown>): void {
  write('error', { event: 'form_submission_failed', ...data });
}

export function logPipedriveFailure(data: Record<string, unknown>): void {
  write('error', { event: 'pipedrive_lead_submission_failed', ...data });
}

export function logFormSuccess(data: Record<string, unknown>): void {
  write('info', { event: 'form_submission_success', ...data });
}
