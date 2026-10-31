import { Router } from "express";
import { createStaffController } from "./staff.controller.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";

const router:Router = Router();

// Only ADMIN can create staff accounts
router.post("/api/staff", requireAuth, requireRole("ADMIN"), catchAsync(createStaffController));

export const staffRoutes = router;
