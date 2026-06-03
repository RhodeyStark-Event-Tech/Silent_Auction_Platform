// Vercel serverless entrypoint.
//
// Vercel invokes the default export as the request handler. An Express app is
// a `(req, res)` handler, so we export it directly. We import the COMPILED app
// from `server/dist` (produced by `npm run build`) rather than the TS source so
// the bundler resolves the ESM `.js` import paths against real files.
//
// All routes are mounted under `/api/*` inside the app, and `vercel.json`
// rewrites every `/api/*` request here, so paths line up without changes.
//
// Note: your editor may flag the import below as missing until `npm run build`
// has produced `server/dist` (a gitignored build artifact). It resolves fine in
// the Vercel build, where the server is compiled first.
import { app } from '../server/dist/app.js';

export default app;
