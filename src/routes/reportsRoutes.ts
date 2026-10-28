import { Router } from "express";
import { listReports, getReport, removeReport } from "../controllers/reportsController";

export const reportsRouter = Router();

reportsRouter.get("/", listReports);
reportsRouter.get("/:reportId", getReport);
reportsRouter.delete("/:reportId", removeReport);
