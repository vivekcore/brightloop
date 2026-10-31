import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as subController from "./subscription.controller.js";

const router: Router = Router();

// Customer Portal routes
router.get(
  "/api/me/subscriptions",
  requireAuth,
  requireRole("CUSTOMER"),
  catchAsync(subController.getMySubscriptionsController)
);

router.get(
  "/api/me/subscriptions/:subscriptionId",
  requireAuth,
  requireRole("CUSTOMER"),
  catchAsync(subController.getSubscriptionByIdController)
);

router.post(
  "/api/me/subscriptions/:subscriptionId/accept",
  requireAuth,
  requireRole("CUSTOMER"),
  catchAsync(subController.acceptQuotationController)
);

// Internal Subscription routes
router.post(
  "/api/subscriptions",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.createSubscriptionController)
);

router.post(
  "/api/subscriptions/from-template",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.createSubscriptionFromTemplateController)
);

router.get(
  "/api/subscriptions",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.getSubscriptionsController)
);

router.get(
  "/api/subscriptions/:subscriptionId",
  requireAuth,
  requireRole("ADMIN", "STAFF", "CUSTOMER"),
  catchAsync(subController.getSubscriptionByIdController)
);

router.post(
  "/api/subscriptions/:subscriptionId/issue-quotation",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.issueQuotationController)
);

router.post(
  "/api/subscriptions/:subscriptionId/confirm",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.confirmQuotationController)
);

router.post(
  "/api/subscriptions/:subscriptionId/activate",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.activateSubscriptionController)
);

router.post(
  "/api/subscriptions/:subscriptionId/close",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.closeSubscriptionController)
);

router.post(
  "/api/subscriptions/:subscriptionId/pause",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.pauseSubscriptionController)
);

router.post(
  "/api/subscriptions/:subscriptionId/resume",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.resumeSubscriptionController)
);

router.post(
  "/api/subscriptions/:subscriptionId/renew",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(subController.renewSubscriptionController)
);

export const subscriptionRoutes = router;
