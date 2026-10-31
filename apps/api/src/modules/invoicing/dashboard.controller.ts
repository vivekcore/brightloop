import { Request, Response } from "express";
import * as dashboardService from "./dashboard.service.js";

export async function getDashboardController(req: Request, res: Response) {
  try {
    const data = await dashboardService.getDashboardMetrics();
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
