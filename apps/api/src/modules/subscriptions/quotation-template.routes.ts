import { Router } from "express";
import { requireAuth } from "../../middleware/require-auth.js";
import { requireRole } from "../../middleware/require-role.js";
import { catchAsync } from "../../utils/async_api.js";
import * as templateController from "./quotation-template.controller.js";

const router: Router = Router();

router.post(
  "/api/quotation-templates",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(templateController.createQuotationTemplateController)
);

router.get(
  "/api/quotation-templates",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(templateController.getQuotationTemplatesController)
);

router.get(
  "/api/quotation-templates/:templateId",
  requireAuth,
  requireRole("ADMIN", "STAFF"),
  catchAsync(templateController.getQuotationTemplateByIdController)
);

router.patch(
  "/api/quotation-templates/:templateId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(templateController.updateQuotationTemplateController)
);

router.delete(
  "/api/quotation-templates/:templateId",
  requireAuth,
  requireRole("ADMIN"),
  catchAsync(templateController.archiveQuotationTemplateController)
);

export const quotationTemplateRoutes = router;
