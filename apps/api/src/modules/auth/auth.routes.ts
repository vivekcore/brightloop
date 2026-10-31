import { Router } from "express";
import { handleBetterAuth, registerCustomer, getCurrentUser } from "./auth.controller.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { catchAsync } from "../../utils/async_api.js";

const router:Router = Router();

//  all better-auth standard routes 
router.all("/api/auth/*splat", catchAsync(handleBetterAuth));

// Custom customer registration endpoint 
router.post("/api/auth/register", catchAsync(registerCustomer));

// Current user profile route
router.get("/api/me", requireAuth, catchAsync(getCurrentUser));

export const authRoutes = router;
