# achu telemetry worker

Anonymous usage telemetry receiver for achu. It runs as a Cloudflare Worker with D1.
The ping endpoint is `POST https://telemetry.achu.app/v1/ping`.

## What is stored

Each install can send one ping per UTC day. Stored fields are a random install UUID,
the app and Electron versions, operating system, CPU architecture, release channel,
locale, first-run flag, coarse feature counts, and the country code Cloudflare reports.
The day and timestamp are assigned by the server.

The receiver never stores images, text or prompts, filesystem paths, API keys or other
secrets, or IP addresses. An IP address is used only as the rate-limit key.

## First-time deployment

```bash
cd telemetry-worker
npm ci
npx wrangler d1 create achu-telemetry
```

Paste the database ID printed by Wrangler into `d1_databases[0].database_id` in
`wrangler.jsonc`. Keep the D1 binding name as `DB`. The committed all-zero ID is a
placeholder until the database is created.

```bash
npx wrangler d1 migrations apply achu-telemetry --remote
# Generate a token with: openssl rand -hex 32
npx wrangler secret put STATS_TOKEN
npx wrangler deploy
```

The custom domain `telemetry.achu.app` requires the `achu.app` zone to be on Cloudflare.

## Future migrations

Always apply database migrations before deploying code that depends on them:

```bash
npm ci
npx wrangler d1 migrations apply achu-telemetry --remote
npx wrangler deploy
```

## Viewing stats

- JSON: `curl -H "Authorization: Bearer $STATS_TOKEN" https://telemetry.achu.app/v1/stats`
- HTML: open `https://telemetry.achu.app/stats` and enter the token once. The secure,
  HttpOnly cookie lasts 30 days.

The stats login form is limited to 5 attempts per minute per IP.

Both stats endpoints require `STATS_TOKEN`. The HTML page is titled "achu telemetry".

## Testing

```bash
npm ci
npm run typecheck
npm test
npm run deploy:dry
```
