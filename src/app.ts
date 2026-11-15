import express from "express";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { authRouter } from "./routes/authRoutes";
import { analysisRouter } from "./routes/analysisRoutes";
import { reportsRouter } from "./routes/reportsRoutes";
import { projectRouter } from "./routes/projectRoutes";
import { dashboardRouter } from "./routes/dashboardRoutes";
import { aiRouter } from "./routes/aiRoutes";
import { optionalAuth, requireAuth } from "./middleware/auth";

export const app = express();

// CORS configuration
app.use((request, response, next) => {
  const allowedOrigins = [
    env.frontendUrl,
    "http://localhost:5173",
    "http://localhost:5174" // Alternative Vite port
  ];

  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Credentials", "true");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Public routes
app.get("/health", (_request, response) => {
  response.status(200).json({ success: true, status: "ok" });
});

// Auth routes (mixed public/protected)
app.use("/auth", authRouter);

// Attach the optional authenticated user to every API request
app.use("/api", optionalAuth);

// AI review engine (requires authentication)
app.use("/api/ai", aiRouter);

// Project / repository management (requires authentication)
app.use("/api/projects", requireAuth, projectRouter);

// Dashboard statistics (requires authentication)
app.use("/api/dashboard", requireAuth, dashboardRouter);

// Report history (requires authentication)
app.use("/api/reports", requireAuth, reportsRouter);

// Analysis routes (authenticated results are persisted, anonymous ones are not)
app.use("/api", analysisRouter);

// 404 handler
app.use((_request, response) => {
  response.status(404).json({ success: false, error: "Route not found." });
});

// Error handler
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ success: false, error: "Invalid JSON request body." });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    response.status(413).json({ success: false, error: "Request body is too large." });
    return;
  }

  console.error("Unhandled request error:", error);
  response.status(500).json({ success: false, error: "Internal server error." });
});
