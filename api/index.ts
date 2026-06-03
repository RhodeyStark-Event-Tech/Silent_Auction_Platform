// Vercel serverless entrypoint.
//
// Vercel invokes the default export as the request handler. An Express app is
// a `(req, res)` handler, so we can export it directly. We import the COMPILED
// app from `server/dist` (produced by `npm run build`) rather than the TS
// source so the bundler resolves the ESM `.js` import paths against real files.
//
// All routes are mounted under `/api/*` inside the app, and `vercel.json`
// rewrites every `/api/*` request here, so paths line up without changes.
//
// Note: until you run `npm run build`, your editor may flag the import below as
// missing — that's expected (`server/dist` is a build artifact and gitignored).
// It resolves fine in the Vercel build, where the server is compiled first.
import { app } from '../server/dist/app.js';

export default app;
