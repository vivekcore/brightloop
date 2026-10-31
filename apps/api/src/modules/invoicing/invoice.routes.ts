import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as invoiceController from "./invoice.controller.js";

const router: Router = Router();

// Customer Portal routes
router.get(
  "/api/me/invoices",
  requireAuth,
  requireRole("CUSTOMER"),
  catchAsync(invoiceController.getMyInvoicesController)
);

router.get(
  "/api/me/invoices/:invoiceId",
  requireAuth,
  requireRole("CUSTOMER"),
  catchAsync(invoiceController.getInvoiceByIdController)
);

// Internal Invoice routes
router.post(
  "/api/invoices/generate",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(invoiceController.generateInvoiceController)
);

router.get(
  "/api/invoices",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(invoiceController.getInvoicesController)
);

router.get(
  "/api/invoices/:invoiceId",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(invoiceController.getInvoiceByIdController)
);

export const invoiceRoutes = router;
