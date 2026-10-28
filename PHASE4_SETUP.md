# Phase 4 Setup Instructions

## Required Manual Steps

Due to network timeouts during the automated setup, you need to manually install Prisma:

```powershell
# Install Prisma and PostgreSQL client
npm install prisma@latest @prisma/client@latest

# Generate Prisma client from schema
npx prisma generate

# Create and run database migrations
npx prisma migrate dev --name init
```

## PostgreSQL Setup

### 1. Install PostgreSQL

Download and install PostgreSQL from https://www.postgresql.org/download/windows/

### 2. Create Database

```powershell
# Connect to PostgreSQL (default user: postgres)
psql -U postgres

# Create database and user
CREATE DATABASE devmate_dev;
CREATE USER devmate WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE devmate_dev TO devmate;
\q
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:

```
DATABASE_URL=postgresql://devmate:your_password@localhost:5432/devmate_dev
```

### 4. Run Migrations

```powershell
npx prisma migrate dev
```

### 5. Verify Setup

```powershell
# Check database connection
npx prisma db pull

# Open Prisma Studio to inspect database
npx prisma studio
```

## Testing

After setup, run the full test suite:

```powershell
npm test
npm run typecheck
npm run build
```

## Troubleshooting

**Connection refused:**
- Ensure PostgreSQL is running
- Check DATABASE_URL credentials
- Verify firewall allows port 5432

**Migration errors:**
- Drop and recreate database if needed
- Check Prisma schema syntax
- Ensure user has correct permissions

**Test database:**
For tests, use a separate database: `devmate_test`

