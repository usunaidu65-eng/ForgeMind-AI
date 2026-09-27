# ForgeMind AI — Cloudflare deployment setup

This setup keeps the existing Node.js backend in `ForgeMind-AI/server/server.mjs` untouched for local development.

Added for Cloudflare Workers:
- `worker/index.js` — API Worker with the six existing AI routes plus `/api/health`
- `wrangler.jsonc` — Workers Static Assets + Worker configuration

The frontend stays in `ForgeMind-AI/`. For the deployed site, its API calls should use relative `/api/...` URLs instead of `http://localhost:3000/api/...`.

## Commands

From the project root:

```powershell
npx.cmd wrangler --version
npx.cmd wrangler secret put GEMINI_API_KEY
npx.cmd wrangler deploy --dry-run
npx.cmd wrangler deploy
```

The `GEMINI_API_KEY` secret is entered directly into the Wrangler prompt and is not stored in `wrangler.jsonc`.

