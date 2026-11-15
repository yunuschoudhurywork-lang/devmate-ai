# DevMate AI — Code Review Platform

DevMate AI analyzes JavaScript/TypeScript with deterministic ESLint-based rules, stores every analysis per user, organises repositories into projects, and layers an AI review engine (OpenAI, Azure OpenAI, Claude or Gemini) on top for human-like reviews, PR comments, security remediation, refactoring plans and bug explanations.

## Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js 18+, TypeScript, Express 5 |
| Database | SQLite via Prisma (zero setup, file-based) |
| Auth | JWT (HS256, http-only cookie + bearer token), scrypt password hashing, GitHub OAuth |
| AI | Provider-agnostic: OpenAI, Azure OpenAI, Anthropic Claude, Google Gemini |
| Frontend | Vue 3, Vite 6, Monaco Editor |

## Quick start

```bash
# backend
npm install
cp .env.example .env        # set JWT_SECRET (and optionally an AI key)
npx prisma migrate deploy   # creates prisma/dev.db
npm run dev                 # http://localhost:3000

# frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173, create an account and run an analysis. The SQLite database file lives at `prisma/dev.db` and is git-ignored.

If you delete the database, recreate it with:

```bash
npx prisma migrate deploy
```

## Configuration

All variables live in `.env` (see `.env.example`).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite path, default `file:./dev.db` (relative to `prisma/`) |
| `JWT_SECRET` | Signing secret for sessions — use a long random value |
| `JWT_TTL_SECONDS` | Token lifetime, default 7 days |
| `FRONTEND_URL` | Allowed CORS origin and post-login redirect |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional GitHub OAuth app |
| `GITHUB_CALLBACK_URL` | Defaults to `http://localhost:3000/auth/github/callback` |
| `AI_PROVIDER` | `openai`, `azure-openai`, `anthropic` or `gemini` (auto-detected when blank) |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` | OpenAI |
| `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION` | Azure OpenAI |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Claude |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini |

AI keys stay on the backend and never reach the browser. Without a key everything except the AI features works, and AI endpoints return a clear `503` instead of failing silently.

### GitHub OAuth

Create an OAuth App at https://github.com/settings/developers and set the authorization callback URL to `http://localhost:3000/auth/github/callback`, then fill in the client ID and secret. The sign-in button appears automatically once both are set. GitHub accounts are linked to an existing account when the email matches.

## Features

### Deterministic analysis
- `POST /api/analyze` runs ESLint plus security and performance pattern analyzers
- Quality score per category (correctness 40%, security 35%, performance 25%)
- Findings are stored with the report for signed-in users

### Accounts and sessions
- Email/password signup and login with scrypt hashes and JWT sessions
- GitHub OAuth sign-in with state validation
- Profile updates, password changes and account deletion
- Every report, project and AI artifact is scoped to its owner

### Projects and repositories
- Create, edit and delete projects (name, repo, branch, language, visibility)
- Analyses can be attached to a project, which aggregates report counts and average scores
- Dashboard shows totals, category averages, a 14-day quality trend and recent activity

### History
- Paginated report list with quality scores, project labels and AI-summary badges
- Full report view with findings and stored AI explanations/summaries
- Report deletion cascades to findings, summaries, explanations and artifacts

### AI review engine
Five tasks, each persisted as an `AiArtifact`:

| Endpoint | Output |
| --- | --- |
| `POST /api/ai/review` | Overall review with verdict, strengths, concerns, next steps |
| `POST /api/ai/pr-comments` | Inline, line-anchored PR comments |
| `POST /api/ai/security-fixes` | Exploit path and remediation per security issue |
| `POST /api/ai/refactor` | Refactoring recommendations with ordered steps |
| `POST /api/ai/bug-explanations` | Root cause, fix and test suggestion per finding |

Plus the original per-finding explanation (`POST /api/explain`) and review summary (`POST /api/review-summary`). AI output never modifies deterministic findings or scores.

## API summary

```
GET    /health

POST   /auth/signup              POST /auth/login        POST /auth/logout
GET    /auth/me                  PATCH /auth/me          DELETE /auth/me
POST   /auth/password            GET /auth/config
GET    /auth/github              GET /auth/github/callback

POST   /api/analyze              POST /api/explain       POST /api/review-summary
GET    /api/reports              GET  /api/reports/:id   DELETE /api/reports/:id

GET    /api/projects             POST /api/projects
GET    /api/projects/:id         PATCH /api/projects/:id DELETE /api/projects/:id

GET    /api/dashboard
POST   /api/ai/review            POST /api/ai/pr-comments
POST   /api/ai/security-fixes    POST /api/ai/refactor
POST   /api/ai/bug-explanations
GET    /api/ai/artifacts/:id     DELETE /api/ai/artifacts/:id
```

Authenticated requests use the `devmate_session` http-only cookie or `Authorization: Bearer <token>`.

## Quality scoring

Every category starts at 100, subtracts deductions per finding and is clamped to `0–100`.

| Category | Weight | Deductions |
| --- | ---: | --- |
| Correctness (`error`) | 40% | high: 15, medium: 8, low: 3 |
| Security (`security`) | 35% | critical: 25, high: 15, medium: 8, low: 3 |
| Performance (`performance`) | 25% | high: 10, medium: 6, low: 2 |

`overall = correctness × 0.40 + security × 0.35 + performance × 0.25`.

## Tests

```bash
npm test             # backend: 49 tests
npm run typecheck
cd frontend && npm test && npm run build
```

## Data and privacy

- Source code is not stored; only metadata, findings and quality scores
- AI requests send the submitted code to the configured provider, and only when you trigger an AI task
- Deleting a report or account removes its dependent rows via cascading foreign keys

## Project layout

```
src/
  analyzers/        ESLint, security and performance analyzers
  services/ai/      AI task prompts, validators and review engine
  services/llm/     OpenAI / Azure / Anthropic / Gemini providers
  controllers/      HTTP handlers
  db/               Prisma client and repositories
  middleware/       JWT auth
prisma/             schema and migrations
frontend/src/       Vue app (views, components, API client)
```
