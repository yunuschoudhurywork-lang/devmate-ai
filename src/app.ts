import express from "express";
import { analysisRouter } from "./routes/analysisRoutes";
import { reportsRouter } from "./routes/reportsRoutes";

export const app = express();

app.use((request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.status(200).json({ success: true, status: "ok" });
});

app.use("/api", analysisRouter);
app.use("/api/reports", reportsRouter);

app.use((_request, response) => {
  response.status(404).json({ success: false, error: "Route not found." });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ success: false, error: "Invalid JSON request body." });
    return;
  }

  response.status(500).json({ success: false, error: "Internal server error." });
});
