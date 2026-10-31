import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as discountController from "./discount.controller.js";

const router: Router = Router();

router.post(
  "/api/discounts",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(discountController.createDiscountController)
);

router.get(
  "/api/discounts",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(discountController.getDiscountsController)
);

router.get(
  "/api/discounts/:discountId",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(discountController.getDiscountByIdController)
);

router.patch(
  "/api/discounts/:discountId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(discountController.updateDiscountController)
);

router.post(
  "/api/invoices/:invoiceId/apply-discount",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(discountController.applyDiscountController)
);

export const discountRoutes = router;
