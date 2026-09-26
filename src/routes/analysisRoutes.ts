import { Router } from "express";
import { analyzeCode } from "../controllers/analysisController";

export const analysisRouter = Router();

analysisRouter.post("/analyze", analyzeCode);
