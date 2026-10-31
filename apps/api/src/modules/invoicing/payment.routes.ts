import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as paymentController from "./payment.controller.js";

const router: Router = Router();

router.post(
  "/api/invoices/:invoiceId/payments",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(paymentController.recordPaymentController)
);

router.get(
  "/api/payments",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(paymentController.getPaymentsController)
);

export const paymentRoutes = router;
