// Vercel serverless entrypoint — TEMPORARY DEBUG VERSION.
//
// The app is imported dynamically INSIDE the handler so that any
// initialization error (e.g. a missing env var that makes config.ts throw, or
// a module-resolution problem) is caught and surfaced in the HTTP response and
// logs — instead of an opaque FUNCTION_INVOCATION_FAILED with no detail.
//
// Revert to the clean `export default app` form once the root cause is known.
export default async function handler(req: any, res: any): Promise<void> {
  try {
    const mod = await import('../server/dist/app.js');
    const app = (mod as any).app ?? (mod as any).default;
    if (typeof app !== 'function') {
      throw new Error(
        `Imported app is not a request handler (type: ${typeof app}; keys: ${Object.keys(mod).join(',')})`,
      );
    }
    return app(req, res);
  } catch (err) {
    const e = err as Error;
    console.error('Function boot error:', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        bootError: e?.message ?? String(err),
        name: e?.name,
        stack: e?.stack?.split('\n').slice(0, 6),
      }),
    );
  }
}
