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
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const normalizedOrigin = origin?.replace(/\/$/, "");
    if (
      !origin ||
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin?.endsWith(".netlify.app") ||
      normalizedOrigin?.startsWith("http://localhost:")
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/uploads", (_req, res) => res.status(403).json({ message: "Files require authenticated download" }));

app.get("/", (_req, res) => res.json({ ok: true, service: "NAAC File Management API" }));
app.get("/favicon.ico", (_req, res) => res.status(204).end());
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
