# DevMate AI — Code Analysis Platform

DevMate AI is an AI-assisted automated code-review system. This repository contains a working Express backend and Vue frontend that analyze JavaScript and TypeScript source code, returning deterministic error, security, and performance findings with optional AI-powered explanations and review summaries.

## Install and run

### Backend

```bash
npm install
npm run dev
```

The development server listens on `http://localhost:3000`. Build and run the compiled service with:

```bash
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend development server listens on `http://localhost:5173` by default.

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
# Backend
npm test
npm run typecheck

# Frontend
cd frontend
npm test
npm run typecheck
```

## Completed features

### Phase 1: Deterministic analysis engine
- Node.js, TypeScript, and Express backend
- `GET /health` and `POST /api/analyze` endpoints
- ESLint-based JavaScript and TypeScript error analysis
- Deterministic security and performance pattern analysis
- Quality score calculation based only on normalized findings
- Shared analyzer and finding contracts

### Phase 2: Frontend analysis interface
- Vue 3 with TypeScript frontend
- Monaco code editor with syntax highlighting
- Real-time language selection (JavaScript/TypeScript)
- Analysis results display with quality scores
- Findings organized by category (errors, security, performance)
- Responsive design

### Phase 3A: Individual AI explanations
- `POST /api/explain` endpoint
- Gemini API integration using `@google/genai` SDK
- Structured JSON output with server-side validation
- Per-finding "Explain with AI" action in the UI
- Detailed explanations, suggested fixes, and caveats
- Loading states and duplicate-request prevention
- Comprehensive error handling

### Phase 3B: AI review summary
- `POST /api/review-summary` endpoint
- Overall code review summary generation from analysis results
- Structured summary with overview, key risks, priorities, and caveats
- UI integration with dedicated "Generate AI Review Summary" button
- Deterministic analysis results remain unchanged by AI features
- No findings or quality scores modified by AI
- Comprehensive backend and frontend test coverage

## Quality scoring

Every analysis starts each category at 100, subtracts deductions for findings in that category, and clamps each category to `0–100`. The final overall score is rounded to the nearest integer.

| Category | Weight | Deductions |
| --- | ---: | --- |
| Correctness (`error`) | 40% | high: 15, medium: 8, low: 3 |
| Security (`security`) | 35% | critical: 25, high: 15, medium: 8, low: 3 |
| Performance (`performance`) | 25% | high: 10, medium: 6, low: 2 |

`overall = correctness × 0.40 + security × 0.35 + performance × 0.25`.

Critical correctness or performance findings are not emitted in the current implementation. If added later, they receive that category's strongest listed deduction.

## AI features configuration

DevMate can optionally provide AI-powered explanations and review summaries through Gemini. The backend keeps the API key secure—it never reaches the browser. Copy `.env.example` to `.env` and configure the backend before starting it:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

`gemini-3.5-flash-lite` is the default stable, low-cost model.

### Individual explanations
The `/api/explain` endpoint accepts a JavaScript or TypeScript code context plus one validated existing finding, requests structured JSON from Gemini, validates the response, and returns an explanation, potential fix, and caveats. It does not execute, apply, or verify suggested fixes.

### Review summaries
The `/api/review-summary` endpoint accepts the complete analysis result and generates an overall review summary including:
- Concise overview of code quality
- Key risks based on actual findings
- Prioritized remediation recommendations
- Relevant caveats and limitations

**Important:** AI features complement but never modify the deterministic analysis results. Findings, severities, and quality scores remain unchanged regardless of AI responses.

## Project roadmap

### ✅ Phase 1: Deterministic analysis engine
- [x] Backend API with ESLint integration
- [x] Error, security, and performance analyzers
- [x] Quality score calculation

### ✅ Phase 2: Frontend analysis interface
- [x] Vue 3 frontend with Monaco editor
- [x] Real-time code analysis
- [x] Results visualization

### ✅ Phase 3: AI-powered insights
- [x] **Phase 3A:** Individual finding explanations
- [x] **Phase 3B:** Overall review summaries
- [x] Gemini API integration
- [x] Final validation and testing

### 🔜 Phase 4: Database and history
- [ ] PostgreSQL integration
- [ ] Analysis history storage
- [ ] Historical trend analysis

### 🔜 Phase 5: Authentication
- [ ] User authentication
- [ ] Session management
- [ ] Access control

### 🔜 Phase 6: GitHub integration
- [ ] Repository connection
- [ ] Branch analysis
- [ ] Commit history integration

### 🔜 Phase 7: PR review automation
- [ ] Automated pull request analysis
- [ ] Comment generation
- [ ] Review status updates

## Not included yet
- Database persistence
- User authentication
- GitHub integration
- PR review automation
- Autonomous code modifications

## License

Private project.
