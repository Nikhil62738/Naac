import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user || !user.isActive || user.approvalStatus !== "Approved") return res.status(401).json({ message: "Invalid or pending account" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
