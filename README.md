# BookLeaf Author Support & Communication Portal

Author portal + admin portal with AI-assisted ticket triage and reply drafting.
**Stack:** React (Vite) · Node.js/Express · MongoDB (Mongoose) · Google Gemini.

> Confidential assignment: keep the repository **private** and never commit `.env`.

## 1. Run locally

Prerequisites: Node 18+, MongoDB running locally (or an Atlas URI).

```bash
# Backend
cd server
cp .env.example .env        # set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run seed                # loads the 10 authors / 18 books + admin users (wipes users/books/tickets)
npm run dev                 # http://localhost:5000

# Frontend (second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```

The app works without `GEMINI_API_KEY`: tickets are classified by keyword rules and admins write replies manually.

### Test credentials (created by `npm run seed`)
| Role | Email | Password 
|---|---|---|
| Admin | admin@bookleaf.com | Admin@123 |
| Author (any of the 10) | priya.sharma@email.com, rohit.kapoor@email.com, … | Author@123 |

Good authors to test edge cases: `sneha.kulkarni@email.com` (book in production), `kavita.deshmukh@email.com` (production + zero payout), `ananya.reddy@email.com` (zero payout), `arjun.malhotra@email.com` (zero payout).

### Deploy (single service)
`cd client && npm run build` — Express serves `client/dist` automatically when it exists. On Render/Railway: build command `cd client && npm i && npm run build && cd ../server && npm i`, start command `cd server && npm start`, env vars as in `.env.example` (use MongoDB Atlas) and `NODE_ENV=production`, `CLIENT_ORIGIN=<your url>`. Run `npm run seed` once against the production DB.

## 2. Architecture

```
server/src
  config/        env validation (fails fast), db, constants (enums shared by schema + validation)
  models/        User (author|admin), Book, Ticket (messages + internalNotes embedded), Counter
  middleware/    authenticate (JWT), requireRole (RBAC), validate (zod), error (uniform JSON errors)
  controllers/   auth, books, tickets  (thin HTTP layer, serialisers per role)
  services/
    ai/          aiClient (SDK wrapper + circuit breaker), classifier, drafter, knowledgeBase, fallbackClassifier
    ticketAI.js  orchestration: background classification, draft generation + caching
  routes/        route table with auth/role/validation per endpoint
  seed/          seed script + the provided JSON
client/src       pages (author: books/new ticket/tickets; admin: queue/ticket), api.js, auth, polling hook
```

Key decisions
- **MongoDB schema:** books reference their owner; tickets reference author + book. Messages and internal notes are *embedded* in the ticket (always read together, bounded size) → one query per ticket view. `priorityRank` and `isActive` are denormalised in a `pre('save')` hook so the queue can sort "active → highest priority → oldest" with a single indexed query.
- **RBAC & data isolation:** every ticket/book query for an author is filtered by `author: req.user._id`; other people's IDs return `404` (not 403) so IDs can't be probed. Admin-only fields (`internalNotes`, `aiDraft`, `priority`, classification metadata) are stripped by the author serialiser.
- **Real-time:** short polling (5s author tickets, 6s admin ticket, 8s queue), paused when the tab is hidden. The detail endpoint accepts `?since=<updatedAt>` and returns `{changed:false}` when nothing changed, so idle polling is nearly free. Chosen over WebSockets for simplicity/deploy-friendliness; SSE or change streams are the upgrade path.
- **Validation/errors:** zod schemas per endpoint; all errors share `{ "error": { code, message, details? } }` with correct status codes (401/403/404/409/422/503) — no generic 500s for client mistakes.
- **Security:** bcrypt password hashes (never selected by default), JWT, helmet, login rate limiting, body size limit, regex-escaped search input.

## 3. AI integration

**Model choice:** Google Gemini (`AI_MODEL`, configurable to the Gemini model you prefer). Both tasks (4-way structured classification, short policy-grounded reply) are well within the capability of a lightweight Gemini model, keeping triage latency low and cost per ticket modest. It follows tone/format instructions reliably and returns clean JSON. Swap models by changing one env var.

**Two separate calls, sized differently**
1. **Classification + priority (one call)** — runs in the background after the ticket is saved. Input: subject, description (truncated to 1,200 chars), book title/status. No KB, no history. `max_tokens=120`, `temperature=0`. The prompt contains an explicit priority rubric derived from the brief (ISBN errors → High; long-overdue money → Critical; bio updates → Low). Output is JSON, parsed and **validated against the category/priority enums** — anything off-schema is discarded.
2. **Draft reply** — runs when an admin opens a ticket (cached on the ticket; "Regenerate" forces a refresh).

**Prompt strategy (drafter)**
- *System prompt* = hard rules (use only supplied data, never invent numbers/dates, acknowledge first, own mistakes, concrete timeline, clear next step, 100–180 words, plain text) + a **category-specific slice of the knowledge base** + tone guidelines + one calibrated example approach for that category.
- *User prompt* = today's date, the computed royalty cycle (`payout.js` → "last quarter ended 2026-09-30, payout due by 2026-11-14"), the author's real data for the referenced book (copies sold, earned/paid/pending, last payout, status, platforms), the ticket, and the last 4 messages.
- Edge cases are handled in the prompt data: books in production have no royalty fields (the AI is told to explain the production stage); pending royalty < ₹1,000 is flagged as rolling over; zero-payout authors get the quarterly-cycle explanation with the real date.

**Cost awareness**
- Only the relevant KB sections are sent (~1.5k characters for a printing ticket instead of the whole KB).
- Classification never sees the KB or thread; drafting sees only the last 4 messages (each truncated to 600 chars) and only the relevant books' data.
- Drafts are generated on demand and cached; the system prompt is marked `cache_control` so the provider can cache the static portion.
- `max_tokens` is capped per call; token usage is logged and stored per draft (`aiDraft.inputTokens/outputTokens`).

**Graceful degradation**
- Ticket creation never depends on AI: a **rule-based classifier** assigns category/priority synchronously, then the AI refines it in the background (UI shows whether classification came from AI, rules, or an admin).
- `aiClient` uses a 20s timeout, 1 retry, and a **circuit breaker** (3 consecutive failures → AI paused for 60s) so an outage doesn't slow every request. Rate limits (429) and 5xx are normalised into `AIUnavailableError`.
- Draft endpoint returns `503 AI_UNAVAILABLE`; the admin UI shows a notice and an empty editor to write manually.
- **Admin overrides always win:** once an admin edits category/priority, `classification.source = "admin"` and a late AI result will not overwrite it.

**API key security:** `GEMINI_API_KEY` is read only in `server/src/config/env.js` from the environment; the browser never receives it or calls the LLM directly. `.env` is git-ignored.

## 4. Brief Write-Up
**Prioritised:** the core ticket lifecycle and the AI layer (highest-weighted). Authors raise tickets → rules classify instantly → AI refines category/priority in the background → admin opens a ticket and gets a policy-grounded draft built from the author's real numbers → admin edits and sends → author sees it within seconds.

**Trade-offs:** polling over sockets; embedded messages over a separate collection; a deliberately plain UI; no file storage; one cheap model for everything instead of routing by complexity. The goal was to keep the system fast, understandable, and easy to deploy while still proving the value of AI-assisted support.

**Reliability by design:** AI is an enhancement, never a dependency — rule fallback, circuit breaker, manual replies, and admin overrides that AI cannot clobber. This kept the portal usable even when the model was unavailable or underperforming.

**To productionise:** I would evolve this into a queue-based, event-driven platform with SSE/WebSockets, retries and DLQ handling for AI jobs, per-author rate limits and budget alerts, an eval harness for classification and draft quality, SLA timers and escalation rules by priority, structured observability, and stronger secret management. In a larger system, I would also add role-based access beyond the current admin/author split, richer audit trails, and a robust attachment pipeline using object storage and signed uploads.

## 5. API reference
Base URL `/api`. All routes except `POST /auth/login` and `GET /health` require `Authorization: Bearer <jwt>`.
Errors: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field", "message" }] } }`.

| Method & path | Role | Description |
|---|---|---|
| `GET /health` | public | Liveness + whether AI is configured |
| `POST /auth/login` | public | `{email,password}` → `{token,user}` (rate limited) |
| `GET /auth/me` | any | Current user |
| `GET /books` | any | Author: own books. Admin: all (`?owner=<userId>`) |
| `GET /books/:id` | any | One book (authors only their own, else 404) |
| `POST /tickets` | author | `{bookId|null, subject, description, attachments:[{name,size}]}` → 201. Instantly classified by rules; AI refines async |
| `GET /tickets` | any | Author: own tickets (full thread). Admin: summaries, filters `status, category, priority, assigned=me\|unassigned, from, to, q, sort=urgency\|oldest\|newest` |
| `GET /tickets/:id` | any | Full ticket (role-specific fields). `?since=<ISO>` → `{changed:false}` if unchanged |
| `POST /tickets/:id/messages` | any | `{body, fromDraft?, status?}`. Admin reply → status In Progress (or given status), auto-assign. Author reply reopens Resolved; blocked (409) on Closed |
| `PATCH /tickets/:id` | admin | Any of `status, category, priority, assignedTo ("me"\|null)`; category/priority edits mark the ticket as admin-overridden |
| `POST /tickets/:id/notes` | admin | `{body}` internal note (never shown to authors) |
| `POST /tickets/:id/draft` | admin | AI draft (cached). `?refresh=true` regenerates. `503 AI_UNAVAILABLE` if AI is down |

Status codes: 400 invalid id/book, 401 unauthenticated, 403 wrong role, 404 not found/not yours, 409 closed ticket, 422 validation, 429 rate-limited, 503 AI unavailable.

## 6. Known limitations / next steps
- Attachments are UI-only (names recorded); next: S3-style signed uploads.
- Polling instead of push; next: SSE/WebSocket or MongoDB change streams.
- Classification accuracy is not yet measured; next: a labelled eval set and prompt regression tests.
- No automated tests yet (suggested: supertest for RBAC/validation, mocked LLM for degradation paths).
- Passwords are seeded; production would need password reset, admin user management and audit logs.
- AI draft sends author data to a third-party LLM; production needs a data-processing agreement and PII minimisation (phone/email are already excluded from prompts).


