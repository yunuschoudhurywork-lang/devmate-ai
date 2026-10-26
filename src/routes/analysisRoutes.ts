import { Router } from "express";
import { analyzeCode } from "../controllers/analysisController";
import { createExplainController } from "../controllers/explanationController";
import { createReviewSummaryController } from "../controllers/reviewSummaryController";
import { ExplanationService } from "../services/explanationService";
import { ReviewSummaryService } from "../services/reviewSummaryService";

export const analysisRouter = Router();

analysisRouter.post("/analyze", analyzeCode);
analysisRouter.post("/explain", createExplainController(new ExplanationService()));
analysisRouter.post("/review-summary", createReviewSummaryController(new ReviewSummaryService()));
