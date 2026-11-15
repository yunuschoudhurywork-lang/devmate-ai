import { Router } from "express";
import {
  createAiTaskHandler,
  deleteArtifactHandler,
  getArtifactHandler,
  listArtifactsHandler
} from "../controllers/aiController";
import { requireAuth } from "../middleware/auth";

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.get("/artifacts", listArtifactsHandler);
aiRouter.get("/artifacts/:artifactId", getArtifactHandler);
aiRouter.delete("/artifacts/:artifactId", deleteArtifactHandler);

aiRouter.post("/review", createAiTaskHandler("review"));
aiRouter.post("/pr-comments", createAiTaskHandler("pr-comments"));
aiRouter.post("/security-fixes", createAiTaskHandler("security-fixes"));
aiRouter.post("/refactor", createAiTaskHandler("refactor"));
aiRouter.post("/bug-explanations", createAiTaskHandler("bug-explanations"));
