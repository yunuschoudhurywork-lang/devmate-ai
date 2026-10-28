# DevMate AI — Code Analysis Platform

DevMate AI is an AI-assisted automated code-review system with persistent analysis history. This repository contains a working Express backend with PostgreSQL database and Vue frontend that analyze JavaScript and TypeScript source code, returning deterministic error, security, and performance findings with optional AI-powered explanations and review summaries.

## Install and run

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (for Phase 4 persistence features)

### Backend Setup

```bash
npm install

# Install Prisma (if not already installed)
npm install prisma@latest @prisma/client@latest

# Setup database
cp .env.example .env
# Edit .env and configure DATABASE_URL

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# Start development server
npm run dev
```

The development server listens on `http://localhost:3000`. Build and run the compiled service with:

```bash
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend development server listens on `http://localhost:5173` by default.

## Database Setup

### PostgreSQL Installation

**Windows:** Download from https://www.postgresql.org/download/windows/

**macOS:** `brew install postgresql@14`

**Linux:** `sudo apt-get install postgresql-14`

### Database Configuration

Create database and user:

```sql
CREATE DATABASE devmate_dev;
CREATE USER devmate WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE devmate_dev TO devmate;
```

Configure `.env`:

```bash
DATABASE_URL=postgresql://devmate:your_secure_password@localhost:5432/devmate_dev
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Deploy migrations in production
npm run db:migrate:deploy

# Open Prisma Studio (database GUI)
npm run db:studio
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

Get analysis history:

```bash
curl http://localhost:3000/api/reports
```

Get specific report:

```bash
curl http://localhost:3000/api/reports/{reportId}
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

### Phase 4: Persistent analysis reports and history
- **PostgreSQL database** with Prisma ORM
- **Complete persistence layer:**
  - Analysis reports with findings and quality scores
  - AI review summaries linked to reports
  - Individual AI explanations linked to findings
  - Automatic foreign key relationships with CASCADE delete
- **History API endpoints:**
  - `GET /api/reports` - Paginated list of saved reports
  - `GET /api/reports/:reportId` - Retrieve complete report with all data
  - `DELETE /api/reports/:reportId` - Delete report and associated data
- **Updated analysis workflow:**
  - `POST /api/analyze` now returns `reportId`
  - `POST /api/explain` accepts `reportId` for persistence
  - `POST /api/review-summary` accepts `reportId` for persistence
- **History UI:**
  - Browse saved analysis reports
  - View historical findings without re-analysis
  - Access saved AI summaries and explanations
  - Delete unwanted reports
  - Pagination support
- **Database schema:**
  - Report model: metadata, summary counts, quality scores
  - Finding model: individual findings with all details
  - ReviewSummary model: AI-generated summaries
  - Explanation model: AI-generated explanations per finding
- **Migration system:** Reproducible database schema versioning

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
The `/api/explain` endpoint accepts a JavaScript or TypeScript code context plus one validated existing finding, requests structured JSON from Gemini, validates the response, and returns an explanation, potential fix, and caveats. When a `reportId` is provided, the explanation is persisted to the database. It does not execute, apply, or verify suggested fixes.

### Review summaries
The `/api/review-summary` endpoint accepts the complete analysis result and generates an overall review summary including:
- Concise overview of code quality
- Key risks based on actual findings
- Prioritized remediation recommendations
- Relevant caveats and limitations

When a `reportId` is provided, the summary is persisted to the database.

**Important:** AI features complement but never modify the deterministic analysis results. Findings, severities, and quality scores remain unchanged regardless of AI responses.

## Data privacy and retention

**Phase 4 persistence behavior:**
- Analysis reports store metadata, findings, and quality scores
- Source code is **not** persisted to the database
- AI summaries and explanations are stored when generated
- All data is stored locally in your PostgreSQL database
- No data is sent to external services except:
  - Gemini API for AI features (when explicitly requested)
  - Code snippets sent to Gemini are limited to finding context

**Deletion:**
- `DELETE /api/reports/:reportId` removes all associated data
- Foreign key CASCADE ensures complete cleanup
- Deleted reports cannot be recovered

**Current limitations:**
- No user authentication - all reports are accessible locally
- No user ownership - reports belong to the application
- No automatic cleanup or retention policies

These limitations are addressed in Phase 5 (Authentication).

## Troubleshooting

### Database Connection Issues

**"Connection refused":**
- Ensure PostgreSQL is running: `pg_ctl status` or `sudo service postgresql status`
- Verify DATABASE_URL in `.env`
- Check PostgreSQL is listening on port 5432

**"Prisma Client not generated":**
```bash
npx prisma generate
```

**Migration errors:**
```bash
# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Or manually drop and recreate
dropdb devmate_dev
createdb devmate_dev
npx prisma migrate dev
```

### Test Database

For isolated testing, create a separate database:

```sql
CREATE DATABASE devmate_test;
GRANT ALL PRIVILEGES ON DATABASE devmate_test TO devmate;
```

Set `DATABASE_URL` to test database before running tests.

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

### ✅ Phase 4: Database and history
- [x] PostgreSQL integration with Prisma ORM
- [x] Analysis report persistence
- [x] AI results persistence
- [x] History API endpoints
- [x] History UI with pagination
- [x] Report deletion
- [x] Database migrations

### 🔜 Phase 5: Authentication
- [ ] User registration and login
- [ ] Session management
- [ ] Per-user report ownership
- [ ] Access control

### 🔜 Phase 6: GitHub integration
- [ ] Repository connection
- [ ] Branch analysis
- [ ] Commit history integration

### 🔜 Phase 7: PR review automation
- [ ] Automated pull request analysis
- [ ] Comment generation
- [ ] Review status updates

## Architecture

### Backend Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5
- **Static Analysis:** ESLint 9
- **AI Provider:** Google Gemini via `@google/genai`

### Frontend Stack
- **Framework:** Vue 3 with TypeScript
- **Build Tool:** Vite 6
- **Code Editor:** Monaco Editor
- **Styling:** Scoped CSS

### Database Schema
- **Report:** Analysis metadata and scores
- **Finding:** Individual code issues
- **ReviewSummary:** AI-generated summaries (1:1 with Report)
- **Explanation:** AI-generated explanations (many:1 with Finding)

## License

Private project.


