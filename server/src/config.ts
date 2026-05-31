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
} as const;
