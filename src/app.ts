import express from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/authRoutes";
import { analysisRouter } from "./routes/analysisRoutes";
import { reportsRouter } from "./routes/reportsRoutes";
import { requireAuth, optionalAuth } from "./middleware/auth";

export const app = express();

// CORS configuration
app.use((request, response, next) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174", // Alternative Vite port
  ];
  
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

// Auth routes (public)
app.use("/auth", authRouter);

// Analysis routes with optional auth (allows both authenticated and anonymous usage)
app.use("/api", optionalAuth, analysisRouter);

// Report routes (require authentication)
app.use("/api/reports", requireAuth, reportsRouter);

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

  response.status(500).json({ success: false, error: "Internal server error." });
});
