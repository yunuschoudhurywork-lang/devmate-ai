import { Router } from "express";
import { login, callback, logout, getCurrentUser } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

// Public routes
authRouter.get("/login", login);
authRouter.get("/callback", callback);

// Protected routes
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, getCurrentUser);
