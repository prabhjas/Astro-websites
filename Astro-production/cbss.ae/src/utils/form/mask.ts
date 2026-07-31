export function maskSensitiveValue(value: string, type: 'email' | 'phone' = 'email'): string {
  if (!value) return value;
  if (type === 'email') {
    const [local, domain] = value.split('@');
    if (!domain) return '***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
}
