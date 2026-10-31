import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as dashboardController from "./dashboard.controller.js";

const router: Router = Router();

router.get(
  "/api/finance/dashboard",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(dashboardController.getDashboardController)
);

export const dashboardRoutes = router;
