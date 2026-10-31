import "dotenv/config";
import express from "express";
import { Express } from "express";
import cors from "cors";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { staffRoutes } from "./modules/staff/staff.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { quotationTemplateRoutes } from "./modules/subscriptions/quotation-template.routes.js";
import { subscriptionRoutes } from "./modules/subscriptions/subscription.routes.js";
import { invoiceRoutes } from "./modules/invoicing/invoice.routes.js";
import { discountRoutes } from "./modules/invoicing/discount.routes.js";
import { paymentRoutes } from "./modules/invoicing/payment.routes.js";
import { dashboardRoutes } from "./modules/invoicing/dashboard.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const app: Express = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(authRoutes);
app.use(staffRoutes);
app.use(productRoutes);
app.use(quotationTemplateRoutes);
app.use(subscriptionRoutes);
app.use(invoiceRoutes);
app.use(discountRoutes);
app.use(paymentRoutes);
app.use(dashboardRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Brightloop API running on port ${port}`);
});

export default app;
