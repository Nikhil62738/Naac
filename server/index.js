import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { connectDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import submissionRoutes from "./routes/submissions.js";
import exportRoutes from "./routes/exports.js";
import logRoutes from "./routes/logs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env"), override: true });

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/uploads", (_req, res) => res.status(403).json({ message: "Files require authenticated download" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api", submissionRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/logs", logRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ message: err.message || "Request failed" });
});

connectDb().then(() => {
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
});
