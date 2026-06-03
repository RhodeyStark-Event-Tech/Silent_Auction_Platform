// Vercel serverless entrypoint.
//
// IMPORTANT: we do NOT use `export default app`. Exporting the Express app
// directly hits an ESM default-export interop issue on Vercel and the function
// crashes with FUNCTION_INVOCATION_FAILED. Instead we import the compiled app
// lazily inside the handler and invoke it explicitly, which works reliably.
//
// The app is imported from `server/dist` (produced by `npm run build`); your
// editor may flag the import until that build artifact exists. `vercel.json`
// rewrites every `/api/*` request here, and all routes are mounted under
// `/api/*` inside the app, so paths line up without changes.

// Cached across warm invocations; only set on a successful import.
let cachedApp: ((req: unknown, res: unknown) => void) | null = null;

export default async function handler(req: unknown, res: any): Promise<void> {
  try {
    if (!cachedApp) {
      const mod = await import('../server/dist/app.js');
      cachedApp = (mod as any).app ?? (mod as any).default;
    }
    return cachedApp!(req, res);
  } catch (err) {
    console.error('Serverless handler error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error.' }));
    }
  }
}
