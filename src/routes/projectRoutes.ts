import { Router } from "express";
import {
  createProjectHandler,
  deleteProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  updateProjectHandler
} from "../controllers/projectController";

export const projectRouter = Router();

projectRouter.get("/", listProjectsHandler);
projectRouter.post("/", createProjectHandler);
projectRouter.get("/:projectId", getProjectHandler);
projectRouter.patch("/:projectId", updateProjectHandler);
projectRouter.delete("/:projectId", deleteProjectHandler);
