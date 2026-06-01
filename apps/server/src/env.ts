/**
 * Centralised environment variable parsing and validation.
 * Throws early on startup if a required variable is missing.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
  jwtSecret: required('JWT_SECRET'),
  port: Number(optional('PORT', '3000')),
  webOrigin: optional('WEB_ORIGIN', 'http://localhost:5173'),
  smtp: {
    host: optional('SMTP_HOST', ''),
    port: Number(optional('SMTP_PORT', '587')),
    secure: optional('SMTP_SECURE', 'false') === 'true',
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('SMTP_FROM', 'Rate My Professor <no-reply@example.com>'),
  },
} as const
