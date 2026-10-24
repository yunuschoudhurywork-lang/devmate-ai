import { Router } from "express";
import { analyzeCode } from "../controllers/analysisController";
import { createExplainController } from "../controllers/explanationController";
import { ExplanationService } from "../services/explanationService";

export const analysisRouter = Router();

analysisRouter.post("/analyze", analyzeCode);
analysisRouter.post("/explain", createExplainController(new ExplanationService()));
