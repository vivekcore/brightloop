import "dotenv/config";
import express from "express";
import { Express } from "express";
import cors from "cors";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { staffRoutes } from "./modules/staff/staff.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
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
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Brightloop API running on port ${port}`);
});

export default app;
