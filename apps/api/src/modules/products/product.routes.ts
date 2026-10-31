import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as productController from "./product.controller.ts";

const router: Router = Router();

// Product routes
router.post(
  "/api/products",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.createProductController)
);

router.get(
  "/api/products",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(productController.getProductsController)
);

router.get(
  "/api/products/:productId",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(productController.getProductByIdController)
);

router.patch(
  "/api/products/:productId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.updateProductController)
);

router.delete(
  "/api/products/:productId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.archiveProductController)
);

// Variant routes (nested under product)
router.post(
  "/api/products/:productId/variants",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.createVariantController)
);

router.get(
  "/api/products/:productId/variants",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(productController.getVariantsController)
);

router.patch(
  "/api/products/:productId/variants/:variantId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.updateVariantController)
);

router.delete(
  "/api/products/:productId/variants/:variantId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.deactivateVariantController)
);

// Plan routes
router.post(
  "/api/plans",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.createPlanController)
);

router.get(
  "/api/plans",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(productController.getPlansController)
);

router.get(
  "/api/plans/:planId",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(productController.getPlanByIdController)
);

router.patch(
  "/api/plans/:planId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.updatePlanController)
);

router.delete(
  "/api/plans/:planId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(productController.archivePlanController)
);

export const productRoutes = router;
