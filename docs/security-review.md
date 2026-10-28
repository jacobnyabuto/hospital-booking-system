# Security Review

Review date: (fill in). Scope: Express API, React client, MongoDB Atlas, AI integration. All data is fictional demo data.

## Checks performed

| Check | Result |
|---|---|
| Real secrets in current files (`git grep`) | None found |
| `.env` ever committed (`git log -- **/.env`) | Never |
| Tracked `.env`, `node_modules`, temp files | None |
| `gsk_` search in history | Only a fake test key and a leak-check pattern |
| Unsafe React APIs (`dangerouslySetInnerHTML`, `innerHTML`, `eval`) | None |
| Secrets inside the production build (`dist`) | None |
| `npm audit --omit=dev` (client) | 0 vulnerabilities |
| `npm audit --omit=dev` (server) | 1 high finding in body-parser, fixed with `npm audit fix`; now 0 |
| Express version | 5.x (simple query parser: operator objects in query strings are not created) |

## Findings and fixes

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | High (deployment) | IP-based rate limits behind a proxy see one shared IP | Fix at deployment: `app.set("trust proxy", 1)` (Step 39) |
| 2 | High (deployment) | Local test limits (`AUTH_RATE_LIMIT=200`, `AI_RATE_LIMIT=200`) would weaken production | Never set them on the host; defaults are 10 |
| 3 | Medium | No general limit on appointment routes | Fixed: `appointmentsLimiter` (300 per 15 minutes) |
| 4 | Medium | Known demo account emails and shared passwords | Mitigation: strong unique demo passwords on the live site, documented as demo accounts |
| 5 | Medium | Database user had access to any database | Fixed: development user limited to readWrite on hospital_booking, production user limited to readWrite on hospital_booking_prod (verified with connectionStatus and refused cross-database reads) |
| 6 | Medium | Atlas may need 0.0.0.0/0 for Render's changing IPs | Accepted: strong password, review at deployment |
| 7 | Low | Test scripts write to the configured database | Run only against the development database |
| 8 | Low | No process-level error handlers | Fixed: unhandledRejection and uncaughtException log briefly and exit |
| 9 | Low | CORS origin must match exactly | Exact origin, no trailing slash, https in production (Step 41) |
| 10 | Dependency | body-parser denial-of-service advisory | Fixed with `npm audit fix` |

## Controls proven by automated tests

- Passwords hashed with bcrypt; login failures are identical and timing-equalised.
- JWT algorithm pinned to HS256; expired, forged, wrong-secret and `alg: none` tokens rejected.
- Roles enforced on the server (401 vs 403); ownership enforced with identical 404 for strangers.
- Request bodies whitelisted with `pick`; non-string query and body values rejected.
- Double booking prevented by a partial unique index; verified with a simultaneous-request test.
- Error responses contain no stack traces, connection strings or provider details.
- AI: login required, per-user rate limit, emergency check before any AI call, output validated, every doctor ID verified against MongoDB, personal identifiers redacted before the provider call.
- The AI API key exists only in `server/.env` and never appears in responses or in the client build.

## Accepted risks

1. The JWT is stored in `localStorage`, so an XSS flaw could expose it. Mitigations: 1-day expiry, no raw HTML rendering, helmet headers.
2. Logout only deletes the token on the client; a stolen token stays valid until it expires.
3. Registration reveals whether an email exists (409), as approved in the API contract.
4. Rate limits are in memory: they reset on restart and are not shared between instances.
5. The emergency keyword list is a safety net, not a medical device. It can miss urgent phrasing and can over-trigger.
6. Names and street addresses are not redacted before the AI call; users are told to use fictional details.
7. A third-party AI provider receives the cleaned message text.
8. One clinic time zone, no email or SMS, no real insurance or payment features.

## Deployment reminders

- Add `app.set("trust proxy", 1)` before deploying behind Render's proxy, and test the rate limits there.
- Do not set `AUTH_RATE_LIMIT`, `AI_RATE_LIMIT` or `APPT_RATE_LIMIT` on the host.
- Set `NODE_ENV=production` and an exact `CLIENT_ORIGIN`.
- Use a new strong `JWT_SECRET` and database password for production.
- Restrict the Atlas database user to `hospital_booking`.
- Never run the seed script with production credentials unless demo accounts are intended and use strong passwords.


## Production deployment status (October 27, 2026)

| Area | State |
|---|---|
| Hosting | Frontend on Vercel, API on Render (free tier), database on MongoDB Atlas |
| Node version | Pinned to 22 on Render with the NODE_VERSION variable |
| Proxy | `trust proxy` is set to 1 hop when NODE_ENV is production, so rate limits see real client addresses |
| Rate limits in production | Login and register: 30 attempts per 15 minutes per IP. AI assistant: 10 per hour per user. Appointments: 300 per 15 minutes. The local test values (200) are not set on the host |
| CORS | The API allows exactly one origin, the production Vercel address. No wildcard and no cookies |
| Secrets | Production uses its own JWT secret, its own database password and its own AI key. None are in the repository, and the production build was searched for secret-like text |
| Database users | Development user: readWrite on hospital_booking only. Production user: readWrite on hospital_booking_prod only. Both verified with a connection-status check and a refused cross-database read |
| Seeding | The seed script refuses to run when NODE_ENV is production. Production demo accounts were seeded once from a local session with new passwords |
| Atlas network access | The developer's address plus two shared regional ranges published by Render |

### Accepted risks specific to the deployment

1. **Shared network ranges.** Atlas allows Render's outbound ranges, which are shared by other Render customers in the region. A dedicated address needs a paid plan. The strong password and the least-privilege user are the real protection.
2. **Ranges can change.** Render moved to new outbound ranges in November 2025. If the API stops connecting to the database, re-copy the ranges from the Render dashboard (Connect, then Outbound) into Atlas.
3. **Free-tier behaviour.** The API sleeps after about 15 minutes of inactivity, and the first request afterwards can take up to a minute. In-memory rate limits reset when it restarts.
4. **Public demo accounts.** The demo patient and doctor accounts exist in production so reviewers can try both roles. Their passwords are not published in the repository.
5. **Credential hygiene.** Database passwords were rotated during setup after some values appeared in terminal output.
