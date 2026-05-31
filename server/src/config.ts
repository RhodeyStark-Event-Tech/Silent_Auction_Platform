import 'dotenv/config';

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. See server/.env.example.`,
    );
  }
  return value;
}

/**
 * Centralised, validated configuration. Throws early on boot if anything
 * critical is missing so we fail fast instead of mid-request.
 */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // Comma-separated list of allowed front-end origins for CORS.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  supabase: {
    url: required('SUPABASE_URL', process.env.SUPABASE_URL),
    serviceRoleKey: required(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
  },

  admin: {
    // Only this single email may access the CRUD dashboard.
    email: (process.env.ADMIN_EMAIL ?? 'omaurbliss@gmail.com').toLowerCase(),
    // Plaintext compared in constant time. Override in production via env.
    password: required('ADMIN_PASSWORD', process.env.ADMIN_PASSWORD),
  },

  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
  // Admin session lifetime.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',

  // Upstash Redis (REST) — optional. When set, rate limiting is shared across
  // all serverless instances. When unset, we fall back to per-instance memory.
  upstash: {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },

  // Per-IP rate limits. Generous by default because at a live event many
  // bidders share one public IP (venue WiFi/NAT) — a low ceiling would throttle
  // the whole room. Tunable via env without a redeploy.
  rateLimit: {
    bidsPerMinute: Number(process.env.RATE_LIMIT_BIDS_PER_MIN ?? 300),
    loginPer15Min: Number(process.env.RATE_LIMIT_LOGIN_PER_15MIN ?? 20),
  },
} as const;
