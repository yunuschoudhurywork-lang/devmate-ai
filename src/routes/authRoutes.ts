import { Router } from "express";
import {
  deleteAccount,
  getAuthConfig,
  getCurrentUser,
  githubCallback,
  githubStart,
  login,
  logout,
  signup,
  updateCurrentUser,
  updatePassword
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

// Public routes
authRouter.get("/config", getAuthConfig);
authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);

// GitHub OAuth
authRouter.get("/github", githubStart);
authRouter.get("/github/callback", githubCallback);

// Protected routes
authRouter.get("/me", requireAuth, getCurrentUser);
authRouter.patch("/me", requireAuth, updateCurrentUser);
authRouter.delete("/me", requireAuth, deleteAccount);
authRouter.post("/password", requireAuth, updatePassword);
