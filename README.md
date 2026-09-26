# DevMate AI — Phase 1

DevMate AI is an AI-assisted automated code-review system. This repository currently contains only the Phase 1 backend foundation: an Express API that analyzes JavaScript and TypeScript source and returns normalized error, security, and performance findings.

## Install and run

```bash
npm install
npm run dev
```

The development server listens on `http://localhost:3000`. Build and run the compiled service with:

```bash
npm run build
npm start
```

## Test the API

Check the service:

```bash
curl http://localhost:3000/health
```

Analyze JavaScript:

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","filename":"example.js","code":"const value = 1;"}'
```

Run the automated tests and type checker:

```bash
npm test
npm run typecheck
```

## Phase 1 scope

- Node.js, TypeScript, and Express backend
- `GET /health` and `POST /api/analyze`
- ESLint-based JavaScript and TypeScript error analysis
- Minimal deterministic security and performance pattern analysis
- Deterministic quality score based only on normalized findings
- Shared analyzer and finding contracts for future expansion

## Quality scoring

Every analysis starts each category at 100, subtracts deductions for findings in that category, and clamps each category to `0–100`. The final overall score is rounded to the nearest integer.

| Category | Weight | Deductions |
| --- | ---: | --- |
| Correctness (`error`) | 40% | high: 15, medium: 8, low: 3 |
| Security (`security`) | 35% | critical: 25, high: 15, medium: 8, low: 3 |
| Performance (`performance`) | 25% | high: 10, medium: 6, low: 2 |

`overall = correctness × 0.40 + security × 0.35 + performance × 0.25`.

Critical correctness or performance findings are not emitted in Phase 1. If added later, they receive that category's strongest listed deduction.

Not included yet: frontend, database, GitHub integration, LLM features, authentication, or AI-generated reviews.
