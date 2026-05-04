import { Router } from "express";
import AuditLog from "../models/AuditLog.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", auth, requireRole("hod", "iqac"), async (_req, res) => {
  const logs = await AuditLog.find().populate("actor", "name email role").sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

export default router;
