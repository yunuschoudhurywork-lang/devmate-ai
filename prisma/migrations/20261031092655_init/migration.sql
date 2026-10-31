-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "filename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalFindings" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "warningCount" INTEGER NOT NULL,
    "securityCount" INTEGER NOT NULL,
    "performanceCount" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "correctnessScore" INTEGER NOT NULL,
    "securityScore" INTEGER NOT NULL,
    "performanceScore" INTEGER NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "suggestion" TEXT,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSummary" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyRisks" TEXT[],
    "priorities" TEXT[],
    "caveats" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Explanation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFix" TEXT NOT NULL,
    "caveats" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Explanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Finding_reportId_idx" ON "Finding"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSummary_reportId_key" ON "ReviewSummary"("reportId");

-- CreateIndex
CREATE INDEX "Explanation_reportId_idx" ON "Explanation"("reportId");

-- CreateIndex
CREATE INDEX "Explanation_findingId_idx" ON "Explanation"("findingId");

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_reportId_findingId_key" ON "Explanation"("reportId", "findingId");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSummary" ADD CONSTRAINT "ReviewSummary_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
